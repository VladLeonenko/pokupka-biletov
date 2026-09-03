/**
 * Цены конкурентов GetBilet: снимок из кэша офферов, динамика по дням, подсказка наценки.
 * Имена агентов только в админке.
 */
import ticketPool from '../ticketDb.js';
import { restV2GetAgentList } from './getbiletRestV2.js';
import {
  applyGetbiletMarkupToSupplierUnit,
  getGetbiletMarkupRuleForRepertoire,
  resolveOfferSupplierRub,
} from './getbiletMarkupPublic.js';
import {
  getOwnAgentIdSet,
  getOwnMinMarkupPercent,
  getOwnUndercutRub,
  isOwnOfferRow,
  markupRuleForOwnOffer,
} from './getbiletOwnOffers.js';
import {
  competitorSeatKey,
  offerEventDateTime,
  offerSeatTokens,
} from '../utils/getbiletOfferSeatKey.js';

/** @typedef {{ markup_kind: 'percent' | 'fixed'; markup_value: number }} GetbiletMarkupRule */

export function moscowTodayYmd(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * @param {unknown} payload
 * @returns {Record<string, unknown>[]}
 */
export function parseOfferRows(payload) {
  const rd = payload && typeof payload === 'object' ? payload.ResultData : null;
  return Array.isArray(rd) ? rd.filter((r) => r && typeof r === 'object') : [];
}

function agentIdOf(row) {
  return String(row.AgentId ?? row.agentId ?? '').trim() || (isOwnOfferRow(row) ? '__own__' : '__unknown__');
}

function numOrNull(n) {
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {Record<string, unknown>} row
 * @param {GetbiletMarkupRule | null | undefined} rule
 */
export function retailForCompetitorRow(row, rule) {
  if (row.ManualOffer === true || row.manualOffer === true) {
    const p = Number(row.AgentPrice ?? row.NominalPrice);
    return Number.isFinite(p) && p > 0 ? p : null;
  }
  const supplier = resolveOfferSupplierRub(row);
  if (!Number.isFinite(supplier) || supplier <= 0) return null;
  const effective = isOwnOfferRow(row) ? markupRuleForOwnOffer(rule) ?? rule : rule;
  if (!effective) return supplier;
  return applyGetbiletMarkupToSupplierUnit(supplier, effective);
}

/**
 * @param {unknown} payload
 * @param {GetbiletMarkupRule | null | undefined} rule
 */
export function analyzeCompetitorOffers(payload, rule) {
  const rows = parseOfferRows(payload);
  const undercutRub = getOwnUndercutRub();
  const minPct = getOwnMinMarkupPercent();

  /** @type {Map<string, { own: { supplier: number, retail: number } | null, rivals: { agentId: string, supplier: number, retail: number }[] }>} */
  const bySeat = new Map();
  /** @type {Map<string, { agentId: string, eventDt: string, offerCount: number, seatCount: number, minSupplier: number | null, maxSupplier: number | null, minRetail: number | null, isOwn: boolean, seats: Set<string> }>} */
  const byAgentSession = new Map();

  for (const row of rows) {
    const agentId = agentIdOf(row);
    const isOwn = isOwnOfferRow(row);
    const eventDt = offerEventDateTime(row);
    const supplier = resolveOfferSupplierRub(row);
    const retail = retailForCompetitorRow(row, rule);
    const seats = offerSeatTokens(row);
    const tokens = seats.length > 0 ? seats : [];
    const aggKey = `${agentId}\t${eventDt}`;
    let agg = byAgentSession.get(aggKey);
    if (!agg) {
      agg = {
        agentId,
        eventDt,
        offerCount: 0,
        seatCount: 0,
        minSupplier: null,
        maxSupplier: null,
        minRetail: null,
        isOwn,
        seats: new Set(),
      };
      byAgentSession.set(aggKey, agg);
    }
    agg.offerCount += 1;
    if (Number.isFinite(supplier) && supplier > 0) {
      agg.minSupplier = agg.minSupplier == null ? supplier : Math.min(agg.minSupplier, supplier);
      agg.maxSupplier = agg.maxSupplier == null ? supplier : Math.max(agg.maxSupplier, supplier);
    }
    if (retail != null) {
      agg.minRetail = agg.minRetail == null ? retail : Math.min(agg.minRetail, retail);
    }

    for (const seat of tokens) {
      const key = competitorSeatKey(row, seat);
      agg.seats.add(key);
      agg.seatCount += 1;
      let slot = bySeat.get(key);
      if (!slot) {
        slot = { own: null, rivals: [] };
        bySeat.set(key, slot);
      }
      if (isOwn) {
        if (
          slot.own == null ||
          (retail != null && retail < slot.own.retail) ||
          (retail != null && retail === slot.own.retail && supplier < slot.own.supplier)
        ) {
          slot.own = { supplier: Number.isFinite(supplier) ? supplier : 0, retail: retail ?? 0 };
        }
      } else if (retail != null) {
        slot.rivals.push({ agentId, supplier: Number.isFinite(supplier) ? supplier : 0, retail });
      }
    }
  }

  let ownSeats = 0;
  let rivalSeats = 0;
  let overlapSeats = 0;
  let seatsWeLose = 0;
  let seatsCannotBeat = 0;
  let ownMinRetail = null;
  let rivalMinRetail = null;
  /** @type {number[]} */
  const suggestedMarkups = [];

  /** @type {Map<string, { overlap: number, cheaper: number }>} */
  const rivalVsOwn = new Map();

  for (const slot of bySeat.values()) {
    if (slot.own) {
      ownSeats += 1;
      ownMinRetail = ownMinRetail == null ? slot.own.retail : Math.min(ownMinRetail, slot.own.retail);
    }
    if (slot.rivals.length > 0) {
      rivalSeats += 1;
      const cheapestRival = Math.min(...slot.rivals.map((r) => r.retail));
      rivalMinRetail = rivalMinRetail == null ? cheapestRival : Math.min(rivalMinRetail, cheapestRival);
    }
    if (slot.own && slot.rivals.length > 0) {
      overlapSeats += 1;
      const cheapestRival = Math.min(...slot.rivals.map((r) => r.retail));
      if (slot.own.retail > cheapestRival - undercutRub) {
        seatsWeLose += 1;
        const floor = slot.own.supplier * (1 + minPct / 100);
        const target = cheapestRival - undercutRub;
        if (target < floor) seatsCannotBeat += 1;
        else if (slot.own.supplier > 0) {
          suggestedMarkups.push(((target - slot.own.supplier) / slot.own.supplier) * 100);
        }
      }
      for (const r of slot.rivals) {
        let st = rivalVsOwn.get(r.agentId);
        if (!st) {
          st = { overlap: 0, cheaper: 0 };
          rivalVsOwn.set(r.agentId, st);
        }
        st.overlap += 1;
        if (r.retail < slot.own.retail) st.cheaper += 1;
      }
    }
  }

  const suggestedOwnMarkupPercent =
    suggestedMarkups.length > 0 ? Math.round(Math.min(...suggestedMarkups) * 100) / 100 : null;

  const agentRows = [...byAgentSession.values()].map((agg) => {
    const vs = rivalVsOwn.get(agg.agentId) || { overlap: 0, cheaper: 0 };
    return {
      agentId: agg.agentId,
      eventDatetime: agg.eventDt,
      isOwn: agg.isOwn,
      offerCount: agg.offerCount,
      seatCount: agg.seatCount || agg.seats.size,
      minSupplierRub: numOrNull(agg.minSupplier),
      maxSupplierRub: numOrNull(agg.maxSupplier),
      minRetailRub: numOrNull(agg.minRetail),
      overlapSeats: agg.isOwn ? overlapSeats : vs.overlap,
      seatsCheaperThanOwn: agg.isOwn ? 0 : vs.cheaper,
    };
  });

  return {
    ownSeats,
    rivalSeats,
    overlapSeats,
    seatsWeLose,
    seatsCannotBeat,
    ownMinRetailRub: numOrNull(ownMinRetail),
    rivalMinRetailRub: numOrNull(rivalMinRetail),
    suggestedOwnMarkupPercent,
    agentRows,
  };
}

function parseAgentListPayload(data) {
  const rd = data && typeof data === 'object' ? data.ResultData : null;
  const rows = Array.isArray(rd) ? rd : rd && typeof rd === 'object' ? [rd] : [];
  return rows
    .filter((r) => r && typeof r === 'object')
    .map((r) => {
      const id = String(r.Id ?? r.id ?? r.AgentId ?? '').trim();
      return {
        agent_id: id,
        code: r.Code != null ? String(r.Code) : r.code != null ? String(r.code) : null,
        company: r.Company != null ? String(r.Company) : r.company != null ? String(r.company) : null,
        phone: r.Phone != null ? String(r.Phone) : r.phone != null ? String(r.phone) : null,
        payload_json: r,
      };
    })
    .filter((r) => r.agent_id);
}

export async function refreshGetbiletAgentsCache() {
  const data = await restV2GetAgentList();
  const agents = parseAgentListPayload(data);
  for (const a of agents) {
    await ticketPool.query(
      `INSERT INTO getbilet_agents_cache (agent_id, code, company, phone, payload_json, fetched_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
       ON CONFLICT (agent_id) DO UPDATE SET
         code = EXCLUDED.code,
         company = EXCLUDED.company,
         phone = EXCLUDED.phone,
         payload_json = EXCLUDED.payload_json,
         fetched_at = NOW()`,
      [a.agent_id, a.code, a.company, a.phone, JSON.stringify(a.payload_json)],
    );
  }
  return { count: agents.length };
}

async function loadAgentsMap() {
  try {
    const r = await ticketPool.query(
      `SELECT agent_id, code, company FROM getbilet_agents_cache`,
    );
    /** @type {Map<string, { code: string | null, company: string | null }>} */
    const map = new Map();
    for (const row of r.rows) {
      map.set(String(row.agent_id), { code: row.code, company: row.company });
    }
    return map;
  } catch (e) {
    if (e && typeof e === 'object' && 'code' in e && e.code === '42P01') return new Map();
    throw e;
  }
}

async function resolveEventTitle(repertoireId) {
  try {
    const r = await ticketPool.query(
      `SELECT COALESCE(
         NULLIF(TRIM(e.title_manual), ''),
         NULLIF(TRIM(c.payload_json->>'Name'), ''),
         NULLIF(TRIM(c.payload_json->>'name'), ''),
         $1
       ) AS title
       FROM (SELECT $1::text AS id) x
       LEFT JOIN getbilet_events e ON e.getbilet_external_id = x.id
       LEFT JOIN getbilet_catalog_cache c ON c.repertoire_external_id = x.id
       LIMIT 1`,
      [repertoireId],
    );
    return r.rows[0]?.title ? String(r.rows[0].title) : repertoireId;
  } catch {
    return repertoireId;
  }
}

/**
 * @param {string} repertoireId
 * @param {unknown} payload
 * @param {{ snapshotDate?: string, rule?: GetbiletMarkupRule | null }} [opts]
 */
export async function recordCompetitorSnapshot(repertoireId, payload, opts = {}) {
  const rid = String(repertoireId || '').trim();
  if (!rid || !payload) return { ok: false, reason: 'empty' };
  const snapshotDate = opts.snapshotDate || moscowTodayYmd();
  const rule = opts.rule !== undefined ? opts.rule : await getGetbiletMarkupRuleForRepertoire(rid);
  const analysis = analyzeCompetitorOffers(payload, rule);
  const agents = await loadAgentsMap();
  const title = await resolveEventTitle(rid);

  try {
    await ticketPool.query(
      `DELETE FROM getbilet_competitor_price_daily
       WHERE snapshot_date = $1::date AND repertoire_external_id = $2`,
      [snapshotDate, rid],
    );
    for (const row of analysis.agentRows) {
      const meta = agents.get(row.agentId) || {};
      await ticketPool.query(
        `INSERT INTO getbilet_competitor_price_daily (
           snapshot_date, repertoire_external_id, event_datetime, agent_id,
           agent_code, agent_company, is_own, offer_count, seat_count,
           min_supplier_rub, max_supplier_rub, min_retail_rub,
           overlap_seats, seats_cheaper_than_own, updated_at
         ) VALUES (
           $1::date, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW()
         )`,
        [
          snapshotDate,
          rid,
          row.eventDatetime || '',
          row.agentId,
          meta.code ?? null,
          meta.company ?? null,
          row.isOwn,
          row.offerCount,
          row.seatCount,
          row.minSupplierRub,
          row.maxSupplierRub,
          row.minRetailRub,
          row.overlapSeats,
          row.seatsCheaperThanOwn,
        ],
      );
    }
    await ticketPool.query(
      `INSERT INTO getbilet_competitor_event_daily (
         snapshot_date, repertoire_external_id, event_title,
         own_seats, rival_seats, overlap_seats, seats_we_lose, seats_cannot_beat,
         own_min_retail_rub, rival_min_retail_rub, suggested_own_markup_percent, updated_at
       ) VALUES (
         $1::date, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()
       )
       ON CONFLICT (snapshot_date, repertoire_external_id) DO UPDATE SET
         event_title = EXCLUDED.event_title,
         own_seats = EXCLUDED.own_seats,
         rival_seats = EXCLUDED.rival_seats,
         overlap_seats = EXCLUDED.overlap_seats,
         seats_we_lose = EXCLUDED.seats_we_lose,
         seats_cannot_beat = EXCLUDED.seats_cannot_beat,
         own_min_retail_rub = EXCLUDED.own_min_retail_rub,
         rival_min_retail_rub = EXCLUDED.rival_min_retail_rub,
         suggested_own_markup_percent = EXCLUDED.suggested_own_markup_percent,
         updated_at = NOW()`,
      [
        snapshotDate,
        rid,
        title,
        analysis.ownSeats,
        analysis.rivalSeats,
        analysis.overlapSeats,
        analysis.seatsWeLose,
        analysis.seatsCannotBeat,
        analysis.ownMinRetailRub,
        analysis.rivalMinRetailRub,
        analysis.suggestedOwnMarkupPercent,
      ],
    );
  } catch (e) {
    if (e && typeof e === 'object' && 'code' in e && e.code === '42P01') {
      return { ok: false, reason: 'no_table' };
    }
    throw e;
  }
  return { ok: true, ownSeats: analysis.ownSeats, seatsWeLose: analysis.seatsWeLose };
}

export function scheduleCompetitorSnapshot(repertoireId, payload) {
  const rid = String(repertoireId || '').trim();
  if (!rid || !payload) return;
  void recordCompetitorSnapshot(rid, payload).catch((e) => {
    console.error('[getbilet] competitor snapshot:', rid, e instanceof Error ? e.message : e);
  });
}

export async function scanCompetitorPricesFromOffersCache({ refreshAgents = true } = {}) {
  if (refreshAgents) {
    try {
      await refreshGetbiletAgentsCache();
    } catch (e) {
      console.warn('[getbilet] GetAgentList for competitor scan:', e instanceof Error ? e.message : e);
    }
  }
  const r = await ticketPool.query(
    `SELECT repertoire_external_id, payload_json FROM getbilet_repertoire_offers_cache`,
  );
  let scanned = 0;
  let withOwn = 0;
  let losing = 0;
  for (const row of r.rows) {
    const res = await recordCompetitorSnapshot(row.repertoire_external_id, row.payload_json);
    if (res.ok) {
      scanned += 1;
      if ((res.ownSeats || 0) > 0) withOwn += 1;
      if ((res.seatsWeLose || 0) > 0) losing += 1;
    }
  }
  return { scanned, withOwn, losing, snapshotDate: moscowTodayYmd() };
}

function ownMeta() {
  const ids = [...getOwnAgentIdSet()];
  return {
    ownAgentIds: ids,
    undercutRub: getOwnUndercutRub(),
    minMarkupPercent: getOwnMinMarkupPercent(),
  };
}

export async function getCompetitorOverview({ days = 14 } = {}) {
  const dayCount = Math.max(1, Math.min(90, Number(days) || 14));
  const latest = await ticketPool.query(
    `SELECT * FROM getbilet_competitor_event_daily
     WHERE snapshot_date = (
       SELECT MAX(snapshot_date) FROM getbilet_competitor_event_daily
     )
     ORDER BY seats_we_lose DESC, own_seats DESC, event_title NULLS LAST`,
  );
  const ownIds = getOwnAgentIdSet();
  let ownCompany = null;
  let ownCode = null;
  if (ownIds.size > 0) {
    const a = await ticketPool.query(
      `SELECT agent_id, code, company FROM getbilet_agents_cache WHERE agent_id = ANY($1::text[]) LIMIT 1`,
      [[...ownIds]],
    );
    ownCompany = a.rows[0]?.company ?? null;
    ownCode = a.rows[0]?.code ?? null;
  }
  const history = await ticketPool.query(
    `SELECT snapshot_date::text AS snapshot_date,
            SUM(own_seats)::int AS own_seats,
            SUM(overlap_seats)::int AS overlap_seats,
            SUM(seats_we_lose)::int AS seats_we_lose,
            SUM(seats_cannot_beat)::int AS seats_cannot_beat
     FROM getbilet_competitor_event_daily
     WHERE snapshot_date >= (CURRENT_DATE - $1::int)
     GROUP BY snapshot_date
     ORDER BY snapshot_date`,
    [dayCount],
  );
  return {
    ...ownMeta(),
    ownCompany,
    ownCode,
    snapshotDate: latest.rows[0]?.snapshot_date ?? null,
    events: latest.rows,
    history: history.rows,
  };
}

export async function getCompetitorEventDetail(repertoireId, { days = 14 } = {}) {
  const rid = String(repertoireId || '').trim();
  const dayCount = Math.max(1, Math.min(90, Number(days) || 14));
  const daily = await ticketPool.query(
    `SELECT snapshot_date::text AS snapshot_date, event_title, own_seats, rival_seats,
            overlap_seats, seats_we_lose, seats_cannot_beat,
            own_min_retail_rub, rival_min_retail_rub, suggested_own_markup_percent
     FROM getbilet_competitor_event_daily
     WHERE repertoire_external_id = $1
       AND snapshot_date >= (CURRENT_DATE - $2::int)
     ORDER BY snapshot_date`,
    [rid, dayCount],
  );
  const latestDate = daily.rows.length ? daily.rows[daily.rows.length - 1].snapshot_date : moscowTodayYmd();
  const agents = await ticketPool.query(
    `SELECT event_datetime, agent_id, agent_code, agent_company, is_own,
            offer_count, seat_count, min_supplier_rub, max_supplier_rub, min_retail_rub,
            overlap_seats, seats_cheaper_than_own
     FROM getbilet_competitor_price_daily
     WHERE repertoire_external_id = $1 AND snapshot_date = $2::date
     ORDER BY is_own DESC, min_retail_rub NULLS LAST, agent_company, agent_id, event_datetime`,
    [rid, latestDate],
  );
  return {
    ...ownMeta(),
    repertoireId: rid,
    snapshotDate: latestDate,
    daily: daily.rows,
    agents: agents.rows,
  };
}
