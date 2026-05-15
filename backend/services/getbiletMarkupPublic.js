/**
 * Публичное применение наценки getbilet_markup_rules (event > group > global).
 */
import ticketPool from '../ticketDb.js';

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
 * @returns {Promise<GetbiletMarkupRule | null>}
 */
async function getGlobalMarkupRuleOnly() {
  const r = await ticketPool.query(
    `SELECT markup_kind::text AS markup_kind, markup_value::numeric AS markup_value
     FROM getbilet_markup_rules
     WHERE scope = 'global'
     LIMIT 1`,
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
  try {
    const r = await ticketPool.query(
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
      [rid],
    );
    return rowToMarkupRule(r.rows[0]);
  } catch (e) {
    if (e && typeof e === 'object' && 'code' in e && (e.code === '42P01' || e.code === '42703')) {
      console.warn(
        '[getbilet] markup: schema incomplete, fallback to global only:',
        e.code,
        e instanceof Error ? e.message : e,
      );
      try {
        return await getGlobalMarkupRuleOnly();
      } catch (e2) {
        if (e2 && typeof e2 === 'object' && 'code' in e2 && (e2.code === '42P01' || e2.code === '42703')) {
          return null;
        }
        throw e2;
      }
    }
    throw e;
  }
}

/**
 * @param {Record<string, unknown>} row
 * @param {GetbiletMarkupRule | null | undefined} rule
 */
function applyMarkupToOfferRow(row, rule) {
  if (!rule || !row || typeof row !== 'object') return row;
  const o = /** @type {Record<string, unknown>} */ ({ ...row });
  const supplier = Number(o.AgentPrice ?? o.NominalPrice ?? o.agentPrice ?? o.nominalPrice ?? 0);
  if (!Number.isFinite(supplier) || supplier < 0) return o;
  const retail = applyGetbiletMarkupToSupplierUnit(supplier, rule);
  const s = String(retail);
  o.AgentPrice = s;
  o.NominalPrice = s;
  if ('agentPrice' in o) o.agentPrice = s;
  if ('nominalPrice' in o) o.nominalPrice = s;
  return o;
}

/**
 * @param {unknown} data — ответ GetOfferList / GetOfferById
 * @param {GetbiletMarkupRule | null | undefined} rule
 */
export function applyGetbiletMarkupToOfferPayload(data, rule) {
  if (!rule || data == null || typeof data !== 'object') return data;
  const d = /** @type {Record<string, unknown>} */ ({ .../** @type {Record<string, unknown>} */ (data) });
  const rd = d.ResultData;
  if (Array.isArray(rd)) {
    d.ResultData = rd.map((row) =>
      row && typeof row === 'object' ? applyMarkupToOfferRow(/** @type {Record<string, unknown>} */ (row), rule) : row,
    );
    return d;
  }
  if (rd && typeof rd === 'object' && !Array.isArray(rd)) {
    d.ResultData = applyMarkupToOfferRow(/** @type {Record<string, unknown>} */ (rd), rule);
    return d;
  }
  return d;
}
