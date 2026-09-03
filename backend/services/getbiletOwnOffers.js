/**
 * Свои офферы GetBilet (AgentId = кабинет) — меньше наценка, флаг OwnOffer на витрине.
 *
 * GETBILET_OWN_MARKUP_REDUCTION_PERCENT=25 при глобальных 70% даёт 45%.
 * Это минус 25 пунктов (70 − 25), а не «на 25% меньше наценки» (70 × 0.75 = 52,5).
 */

/** @typedef {{ markup_kind: 'percent' | 'fixed'; markup_value: number }} GetbiletMarkupRule */

export const DEFAULT_OWN_MARKUP_REDUCTION_PERCENT = 25;

/**
 * @param {unknown} row
 */
export function isManualOfferRowLite(row) {
  if (!row || typeof row !== 'object') return false;
  const o = /** @type {Record<string, unknown>} */ (row);
  if (o.ManualOffer === true || o.manualOffer === true) return true;
  const extra = o.Extra;
  if (Array.isArray(extra) && extra.some((x) => String(x).toLowerCase() === 'manual-offer')) {
    return true;
  }
  return String(o.Id ?? o.id ?? '').startsWith('manual-');
}

/**
 * @returns {Set<string>}
 */
export function getOwnAgentIdSet() {
  const ids = new Set();
  const primary = process.env.GETBILET_USER_ID?.trim();
  if (primary) ids.add(primary);
  const extra = process.env.GETBILET_OWN_AGENT_IDS?.trim();
  if (extra) {
    for (const part of extra.split(',')) {
      const id = part.trim();
      if (id) ids.add(id);
    }
  }
  return ids;
}

/**
 * @param {unknown} row
 */
export function isOwnOfferRow(row) {
  if (!row || typeof row !== 'object') return false;
  const o = /** @type {Record<string, unknown>} */ (row);
  if (o.OwnOffer === true || o.ownOffer === true) return true;
  if (isManualOfferRowLite(o)) return true;
  const agentId = String(o.AgentId ?? o.agentId ?? '').trim();
  if (!agentId) return false;
  return getOwnAgentIdSet().has(agentId);
}

/**
 * Сколько пунктов снять с процентной наценки (70 − 25 = 45).
 */
export function getOwnMarkupReductionPoints() {
  const raw = Number(process.env.GETBILET_OWN_MARKUP_REDUCTION_PERCENT);
  const pct = Number.isFinite(raw) ? raw : DEFAULT_OWN_MARKUP_REDUCTION_PERCENT;
  if (pct <= 0) return 0;
  return pct;
}

export function isOwnUndercutEnabled() {
  const v = (process.env.GETBILET_OWN_UNDERCUT_ENABLED ?? '1').trim().toLowerCase();
  return v !== '0' && v !== 'false' && v !== 'off' && v !== 'no';
}

/** На сколько рублей быть дешевле самой низкой чужой розницы на том же месте. */
export function getOwnUndercutRub() {
  const n = Number(process.env.GETBILET_OWN_UNDERCUT_RUB);
  if (!Number.isFinite(n) || n < 0) return 100;
  return Math.round(n * 100) / 100;
}

/** Пол не даём: свои места не уходят ниже закупа + этот процент. */
export function getOwnMinMarkupPercent() {
  const n = Number(process.env.GETBILET_OWN_MIN_MARKUP_PERCENT);
  if (!Number.isFinite(n) || n < 0) return 5;
  return n;
}

/**
 * @param {GetbiletMarkupRule | null | undefined} rule
 * @returns {GetbiletMarkupRule | null | undefined}
 */
export function markupRuleForOwnOffer(rule) {
  if (!rule) return rule;
  const points = getOwnMarkupReductionPoints();
  if (points <= 0) return rule;
  const base = Number(rule.markup_value);
  if (!Number.isFinite(base) || base < 0) return rule;
  let value = base;
  if (rule.markup_kind === 'percent') {
    value = Math.max(0, base - points);
  } else {
    value = Math.max(0, base * (1 - Math.min(points, 100) / 100));
  }
  return {
    markup_kind: rule.markup_kind,
    markup_value: Math.round(value * 10000) / 10000,
  };
}

/**
 * Публичный JSON: свои места помечаем, чужие AgentId не отдаём.
 * @param {unknown} data
 */
export function sanitizePublicOffersPayload(data) {
  if (!data || typeof data !== 'object') return data;
  const d = /** @type {Record<string, unknown>} */ ({ .../** @type {object} */ (data) });
  const rd = d.ResultData;
  if (Array.isArray(rd)) {
    d.ResultData = rd.map((row) => sanitizePublicOfferRow(row));
    return d;
  }
  if (rd && typeof rd === 'object') {
    d.ResultData = sanitizePublicOfferRow(rd);
  }
  return d;
}

/**
 * @param {unknown} row
 */
export function sanitizePublicOfferRow(row) {
  if (!row || typeof row !== 'object') return row;
  const o = /** @type {Record<string, unknown>} */ ({ .../** @type {object} */ (row) });
  const own = isOwnOfferRow(o);
  delete o.AgentId;
  delete o.agentId;
  delete o.UndercutToBeatRival;
  if (own) o.OwnOffer = true;
  else delete o.OwnOffer;
  delete o.ownOffer;
  return o;
}
