/**
 * Кэш GetOfferListByRepertoireId в PostgreSQL: быстрый ответ с диска + фоновое обновление (SWR).
 */
import ticketPool from '../ticketDb.js';
import { restV2GetOfferListByRepertoireId } from './getbiletRestV2.js';

const DEMO_REPERTOIRE_ID = process.env.TBANK_DEMO_REPERTOIRE_ID?.trim() || 'tbank-demo-event';

function isDemoRepertoireId(repertoireId) {
  return String(repertoireId || '').trim() === DEMO_REPERTOIRE_ID;
}

/** @type {Map<string, Promise<unknown>>} */
const inflight = new Map();

function cacheEnabled() {
  const v = (process.env.GETBILET_OFFERS_CACHE || '1').trim().toLowerCase();
  return v !== '0' && v !== 'false' && v !== 'off';
}

function softTtlMs() {
  const n = parseInt(process.env.GETBILET_OFFERS_CACHE_SOFT_SEC || '45', 10);
  return Math.max(5, n) * 1000;
}

function inflightKey(repertoireId) {
  return `offers:${repertoireId}`;
}

/**
 * @param {string} repertoireId
 * @param {unknown} data
 */
async function upsert(repertoireId, data) {
  await ticketPool.query(
    `INSERT INTO getbilet_repertoire_offers_cache (repertoire_external_id, payload_json, fetched_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (repertoire_external_id) DO UPDATE SET
       payload_json = EXCLUDED.payload_json,
       fetched_at = NOW()`,
    [repertoireId, JSON.stringify(data)],
  );
}

/**
 * Один исходящий запрос на репертуар (дедуп при параллельных GET).
 * @param {string} repertoireId
 */
async function fetchUpsert(repertoireId) {
  if (isDemoRepertoireId(repertoireId)) {
    const r = await ticketPool.query(
      `SELECT payload_json FROM getbilet_repertoire_offers_cache WHERE repertoire_external_id = $1`,
      [repertoireId],
    );
    return r.rows[0]?.payload_json ?? { Success: true, Method: 'GetOfferListByRepertoireId', ResultData: [] };
  }
  const k = inflightKey(repertoireId);
  if (inflight.has(k)) return inflight.get(k);
  const p = (async () => {
    const data = await restV2GetOfferListByRepertoireId(repertoireId);
    try {
      await upsert(repertoireId, data);
    } catch (e) {
      console.error(
        '[getbilet] offers cache upsert failed (ответ GetBilet отдан без записи в БД):',
        repertoireId,
        e instanceof Error ? e.message : e
      );
    }
    return data;
  })().finally(() => {
    inflight.delete(k);
  });
  inflight.set(k, p);
  return p;
}

function scheduleBackgroundRefresh(repertoireId) {
  fetchUpsert(repertoireId).catch((e) => {
    console.error('[getbilet] offers cache background refresh:', repertoireId, e instanceof Error ? e.message : e);
  });
}

/**
 * @param {string} repertoireId
 */
export async function invalidateOffersCache(repertoireId) {
  await ticketPool.query(`DELETE FROM getbilet_repertoire_offers_cache WHERE repertoire_external_id = $1`, [
    repertoireId,
  ]);
}

/**
 * @param {string} repertoireId
 * @param {{ forceRefresh?: boolean }} [opts]
 * @returns {Promise<{ data: unknown, meta: { cache: string, ageMs?: number } }>}
 */
export async function getOfferListByRepertoireIdCached(repertoireId, opts = {}) {
  const forceRefresh = Boolean(opts.forceRefresh);

  if (isDemoRepertoireId(repertoireId)) {
    const r = await ticketPool.query(
      `SELECT payload_json, fetched_at FROM getbilet_repertoire_offers_cache WHERE repertoire_external_id = $1`,
      [repertoireId],
    );
    const row = r.rows[0];
    if (row?.payload_json) {
      return { data: row.payload_json, meta: { cache: 'demo', ageMs: Date.now() - new Date(row.fetched_at).getTime() } };
    }
    const empty = { Success: true, Method: 'GetOfferListByRepertoireId', ResultData: [] };
    return { data: empty, meta: { cache: 'demo_empty' } };
  }

  if (!cacheEnabled()) {
    const data = await restV2GetOfferListByRepertoireId(repertoireId);
    return { data, meta: { cache: 'bypass' } };
  }

  let row;
  try {
    const r = await ticketPool.query(
      `SELECT payload_json, fetched_at FROM getbilet_repertoire_offers_cache WHERE repertoire_external_id = $1`,
      [repertoireId],
    );
    row = r.rows[0];
  } catch (e) {
    if (e && typeof e === 'object' && 'code' in e && e.code === '42P01') {
      const data = await restV2GetOfferListByRepertoireId(repertoireId);
      return { data, meta: { cache: 'no_table' } };
    }
    throw e;
  }

  if (forceRefresh) {
    const data = await fetchUpsert(repertoireId);
    return { data, meta: { cache: 'force' } };
  }

  if (!row) {
    const data = await fetchUpsert(repertoireId);
    return { data, meta: { cache: 'miss' } };
  }

  const ageMs = Date.now() - new Date(row.fetched_at).getTime();
  if (ageMs < softTtlMs()) {
    return { data: row.payload_json, meta: { cache: 'hit', ageMs } };
  }

  scheduleBackgroundRefresh(repertoireId);
  return { data: row.payload_json, meta: { cache: 'stale', ageMs } };
}
