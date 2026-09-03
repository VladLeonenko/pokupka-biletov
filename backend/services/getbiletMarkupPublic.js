/**
 * Публичное применение наценки getbilet_markup_rules (event > group > global).
 */
import mainPool from '../db.js';
import ticketPool from '../ticketDb.js';
import {
  isOwnOfferRow,
  markupRuleForOwnOffer,
  isOwnUndercutEnabled,
  getOwnUndercutRub,
  getOwnMinMarkupPercent,
} from './getbiletOwnOffers.js';
import { competitorSeatKeysForRow } from '../utils/getbiletOfferSeatKey.js';

/** @type {import('pg').Pool[]} */
const markupPools = ticketPool === mainPool ? [ticketPool] : [ticketPool, mainPool];

/**
 * @typedef {{ markup_kind: 'percent' | 'fixed'; markup_value: number }} GetbiletMarkupRule
 */

/**
 * @param {number} supplierRub
 * @param {GetbiletMarkupRule | null | undefined} rule
 * @returns {number}
 */
export function applyGetbiletMarkupToSupplierUnit(supplierRub, rule) {
  const base = Number(supplierRub);
  if (!Number.isFinite(base) || base < 0) return base;
  if (!rule || (rule.markup_kind !== 'percent' && rule.markup_kind !== 'fixed')) return base;
  const v = Number(rule.markup_value);
  if (!Number.isFinite(v) || v < 0) return base;
  let out = base;
  if (rule.markup_kind === 'percent') {
    out = base * (1 + v / 100);
  } else {
    out = base + v;
  }
  if (!Number.isFinite(out) || out < 0) out = base;
  return Math.round(out * 100) / 100;
}

/**
 * @param {unknown} row
 * @returns {GetbiletMarkupRule | null}
 */
function rowToMarkupRule(row) {
  if (!row || typeof row !== 'object') return null;
  const kind = row.markup_kind === 'fixed' ? 'fixed' : 'percent';
  const val = Number(row.markup_value);
  if (!Number.isFinite(val) || val < 0) return null;
  return { markup_kind: kind, markup_value: val };
}

/**
 * @param {import('pg').Pool} pool
 * @param {string} sql
 * @param {unknown[]} params
 */
async function poolQuery(pool, sql, params) {
  return pool.query(sql, params);
}

/**
 * @returns {Promise<GetbiletMarkupRule | null>}
 */
async function getGlobalMarkupRuleOnly(pool = ticketPool) {
  const r = await poolQuery(
    pool,
    `SELECT markup_kind::text AS markup_kind, markup_value::numeric AS markup_value
     FROM getbilet_markup_rules
     WHERE scope = 'global'
     LIMIT 1`,
  );
  return rowToMarkupRule(r.rows[0]);
}

/**
 * @param {import('pg').Pool} pool
 * @param {string} repertoireId
 * @returns {Promise<GetbiletMarkupRule | null>}
 */
async function fetchMarkupRuleFromPool(pool, repertoireId) {
  const r = await poolQuery(
    pool,
    `WITH ev AS (
         SELECT e.id AS event_id,
                (SELECT gm.group_id FROM getbilet_event_group_members gm WHERE gm.event_id = e.id LIMIT 1) AS group_id
         FROM getbilet_events e
         WHERE e.getbilet_external_id = $1
         LIMIT 1
       ),
       revent AS (
         SELECT r.markup_kind::text AS markup_kind, r.markup_value::numeric AS markup_value, 3 AS prio
         FROM getbilet_markup_rules r
         CROSS JOIN ev
         WHERE r.scope = 'event' AND r.event_id = ev.event_id
       ),
       rgroup AS (
         SELECT r.markup_kind::text AS markup_kind, r.markup_value::numeric AS markup_value, 2 AS prio
         FROM getbilet_markup_rules r
         CROSS JOIN ev
         WHERE r.scope = 'group' AND ev.group_id IS NOT NULL AND r.group_id = ev.group_id
       ),
       rglobal AS (
         SELECT r.markup_kind::text AS markup_kind, r.markup_value::numeric AS markup_value, 1 AS prio
         FROM getbilet_markup_rules r
         WHERE r.scope = 'global'
       )
       SELECT markup_kind, markup_value FROM (
         SELECT * FROM revent
         UNION ALL
         SELECT * FROM rgroup
         UNION ALL
         SELECT * FROM rglobal
       ) x
       ORDER BY prio DESC
       LIMIT 1`,
    [repertoireId],
  );
  return rowToMarkupRule(r.rows[0]);
}

/**
 * @param {string} repertoireId
 * @returns {Promise<GetbiletMarkupRule | null>}
 */
export async function getGetbiletMarkupRuleForRepertoire(repertoireId) {
  const rid = typeof repertoireId === 'string' ? repertoireId.trim() : '';
  if (!rid) return null;

  for (let i = 0; i < markupPools.length; i++) {
    const pool = markupPools[i];
    try {
      const rule = await fetchMarkupRuleFromPool(pool, rid);
      if (rule) {
        if (i > 0) {
          console.warn('[getbilet] markup rule resolved from fallback DB pool');
        }
        return rule;
      }
    } catch (e) {
      if (e && typeof e === 'object' && 'code' in e && (e.code === '42P01' || e.code === '42703')) {
        console.warn(
          '[getbilet] markup: schema incomplete on pool, try global only:',
          e.code,
          e instanceof Error ? e.message : e,
        );
        try {
          const globalOnly = await getGlobalMarkupRuleOnly(pool);
          if (globalOnly) {
            if (i > 0) console.warn('[getbilet] markup global rule from fallback DB pool');
            return globalOnly;
          }
        } catch (e2) {
          if (!(e2 && typeof e2 === 'object' && 'code' in e2 && (e2.code === '42P01' || e2.code === '42703'))) {
            throw e2;
          }
        }
        continue;
      }
      throw e;
    }
  }
  return null;
}

/**
 * База для наценки: max(AgentPrice, NominalPrice).
 * GetBilet часто отдаёт AgentPrice=закуп, NominalPrice=номинал витрины (выше) — наценка % должна
 * считаться от номинала, иначе на сайте остаётся «голый» номинал без нашей наценки (d230: 5950 вместо 10115).
 * @param {Record<string, unknown>} row
 */
export function resolveOfferSupplierRub(row) {
  const agent = Number(row.AgentPrice ?? row.agentPrice);
  const nominal = Number(row.NominalPrice ?? row.nominalPrice);
  const candidates = [agent, nominal].filter((n) => Number.isFinite(n) && n > 0);
  if (candidates.length === 0) return 0;
  return Math.max(...candidates);
}

/**
 * @param {Record<string, unknown>} row
 * @param {GetbiletMarkupRule | null | undefined} rule
 */
function applyMarkupToOfferRow(row, rule) {
  if (!rule || !row || typeof row !== 'object') return row;
  /** Ручные VIP/офферы уже с розницей (себестоимость + своя наценка). */
  if (row.ManualOffer === true || row.manualOffer === true) return row;
  const extra = row.Extra;
  if (Array.isArray(extra) && extra.some((x) => String(x).toLowerCase() === 'manual-offer')) {
    return row;
  }
  const o = /** @type {Record<string, unknown>} */ ({ ...row });
  const supplier = resolveOfferSupplierRub(o);
  if (!Number.isFinite(supplier) || supplier < 0) return o;
  const effectiveRule = isOwnOfferRow(o) ? markupRuleForOwnOffer(rule) ?? rule : rule;
  const retail = applyGetbiletMarkupToSupplierUnit(supplier, effectiveRule);
  const s = String(retail);
  o.SupplierPrice = String(supplier);
  o.AgentPrice = s;
  o.NominalPrice = s;
  if ('agentPrice' in o) o.agentPrice = s;
  if ('nominalPrice' in o) o.nominalPrice = s;
  return o;
}

function retailOfMarkedRow(row) {
  const n = Number(row?.AgentPrice ?? row?.NominalPrice ?? 0);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function setMarkedRetail(row, retail) {
  const s = String(Math.round(retail * 100) / 100);
  const o = /** @type {Record<string, unknown>} */ ({ ...row });
  o.AgentPrice = s;
  o.NominalPrice = s;
  if ('agentPrice' in o) o.agentPrice = s;
  if ('nominalPrice' in o) o.nominalPrice = s;
  o.UndercutToBeatRival = true;
  return o;
}

function ownRetailFloorRub(row) {
  const supplier = Number(row?.SupplierPrice);
  if (!Number.isFinite(supplier) || supplier < 0) return 0;
  return Math.round(supplier * (1 + getOwnMinMarkupPercent() / 100) * 100) / 100;
}

/**
 * Свои места на том же сеансе/секторе/ряду/месте — не дороже чужих (минус N ₽), но не ниже пола.
 * @param {unknown[]} rows
 * @param {unknown[]} [peerRows] — сырые/уже наценённые соседи, если ResultData — один оффер
 */
export function undercutOwnOffersAgainstRivals(rows, peerRows) {
  if (!isOwnUndercutEnabled() || !Array.isArray(rows) || rows.length === 0) return rows;
  const undercutRub = getOwnUndercutRub();
  const peers = Array.isArray(peerRows)
    ? peerRows.filter((r) => r && typeof r === 'object')
    : [];
  const universe = peers.length > 0 ? [...rows, ...peers] : rows;

  /** @type {Map<string, number>} */
  const rivalMinBySeat = new Map();
  for (const row of universe) {
    if (!row || typeof row !== 'object') continue;
    const o = /** @type {Record<string, unknown>} */ (row);
    if (isOwnOfferRow(o)) continue;
    const retail = retailOfMarkedRow(o);
    if (retail == null) continue;
    for (const key of competitorSeatKeysForRow(o)) {
      const prev = rivalMinBySeat.get(key);
      if (prev == null || retail < prev) rivalMinBySeat.set(key, retail);
    }
  }
  if (rivalMinBySeat.size === 0) return rows;

  return rows.map((row) => {
    if (!row || typeof row !== 'object') return row;
    const o = /** @type {Record<string, unknown>} */ (row);
    if (!isOwnOfferRow(o)) return row;
    const retail = retailOfMarkedRow(o);
    if (retail == null) return row;
    const keys = competitorSeatKeysForRow(o);
    if (keys.length === 0) return row;
    let beat = null;
    for (const key of keys) {
      const rival = rivalMinBySeat.get(key);
      if (rival == null) continue;
      const target = Math.round((rival - undercutRub) * 100) / 100;
      if (beat == null || target < beat) beat = target;
    }
    if (beat == null || beat >= retail) return row;
    const floor = ownRetailFloorRub(o);
    const next = Math.max(floor, beat);
    if (!(next < retail)) return row;
    return setMarkedRetail(o, next);
  });
}

function isExternalFromUndercutEnabled() {
  const v = (process.env.GETBILET_EXTERNAL_UNDERCUT_ENABLED ?? '1').trim().toLowerCase();
  return v !== '0' && v !== 'false' && v !== 'off' && v !== 'no';
}

function retailFloorRub(row) {
  const supplier = Number(row?.SupplierPrice);
  if (Number.isFinite(supplier) && supplier >= 0) {
    return Math.round(supplier * (1 + getOwnMinMarkupPercent() / 100) * 100) / 100;
  }
  return ownRetailFloorRub(row);
}

/**
 * «От N ₽» на нашей витрине не выше, чем на Афише/Портбилете (минус N ₽), с полом по закупу.
 * Режем сначала свои офферы (самый низкий закуп), иначе самый дешёвый чужой.
 * @param {unknown[]} rows
 * @param {number | null | undefined} externalMinRub
 */
export function beatExternalFromPrice(rows, externalMinRub) {
  if (!isExternalFromUndercutEnabled() || !Array.isArray(rows) || rows.length === 0) return rows;
  const ext = Number(externalMinRub);
  if (!Number.isFinite(ext) || ext <= 0) return rows;
  const target = Math.round((ext - getOwnUndercutRub()) * 100) / 100;
  let ourMin = null;
  for (const row of rows) {
    const p = retailOfMarkedRow(row);
    if (p == null) continue;
    if (ourMin == null || p < ourMin) ourMin = p;
  }
  if (ourMin == null || ourMin <= target) return rows;

  const own = [];
  const rest = [];
  for (const row of rows) {
    if (row && typeof row === 'object' && isOwnOfferRow(row)) own.push(row);
    else rest.push(row);
  }
  const ordered = [...own, ...rest].sort((a, b) => {
    const fa = retailFloorRub(a);
    const fb = retailFloorRub(b);
    return fa - fb;
  });

  const drop = new Map();
  for (const row of ordered) {
    const retail = retailOfMarkedRow(row);
    if (retail == null) continue;
    const next = Math.max(retailFloorRub(row), target);
    if (next < retail) {
      drop.set(row, next);
      if (next <= target) break;
    }
  }
  if (drop.size === 0) return rows;
  return rows.map((row) => (drop.has(row) ? setMarkedRetail(row, drop.get(row)) : row));
}

/**
 * @param {unknown} data
 * @param {number | null | undefined} externalMinRub
 */
export function applyExternalFromPriceToOfferPayload(data, externalMinRub) {
  if (data == null || typeof data !== 'object') return data;
  const d = /** @type {Record<string, unknown>} */ ({ .../** @type {object} */ (data) });
  const rd = d.ResultData;
  if (Array.isArray(rd)) {
    d.ResultData = beatExternalFromPrice(rd, externalMinRub);
    return d;
  }
  if (rd && typeof rd === 'object') {
    const [one] = beatExternalFromPrice([rd], externalMinRub);
    d.ResultData = one ?? rd;
  }
  return d;
}

/**
 * @param {unknown} data — ответ GetOfferList / GetOfferById
 * @param {GetbiletMarkupRule | null | undefined} rule
 * @param {unknown[]} [peerRows] — остальные офферы репертуара (для GetOfferById)
 */
export function applyGetbiletMarkupToOfferPayload(data, rule, peerRows) {
  if (!rule || data == null || typeof data !== 'object') return data;
  const d = /** @type {Record<string, unknown>} */ ({ .../** @type {Record<string, unknown>} */ (data) });
  const rd = d.ResultData;
  if (Array.isArray(rd)) {
    const marked = rd.map((row) =>
      row && typeof row === 'object' ? applyMarkupToOfferRow(/** @type {Record<string, unknown>} */ (row), rule) : row,
    );
    const peerMarked = Array.isArray(peerRows)
      ? peerRows.map((row) =>
          row && typeof row === 'object'
            ? applyMarkupToOfferRow(/** @type {Record<string, unknown>} */ (row), rule)
            : row,
        )
      : undefined;
    d.ResultData = undercutOwnOffersAgainstRivals(marked, peerMarked);
    return d;
  }
  if (rd && typeof rd === 'object' && !Array.isArray(rd)) {
    const marked = applyMarkupToOfferRow(/** @type {Record<string, unknown>} */ (rd), rule);
    const peerMarked = Array.isArray(peerRows)
      ? peerRows.map((row) =>
          row && typeof row === 'object'
            ? applyMarkupToOfferRow(/** @type {Record<string, unknown>} */ (row), rule)
            : row,
        )
      : [];
    const [undercut] = undercutOwnOffersAgainstRivals([marked], peerMarked);
    d.ResultData = undercut ?? marked;
    return d;
  }
  return d;
}
