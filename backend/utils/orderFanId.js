import { normalizeFanId } from './fanIdRequiredEvents.js';

/** @param {unknown} raw */
export function parsePaymentMetadata(raw) {
  if (!raw) return null;
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** FAN ID из payment_metadata или notes заказа. */
export function extractFanIdFromOrder(row) {
  if (!row || typeof row !== 'object') return null;
  const pm = parsePaymentMetadata(row.payment_metadata);
  const fromMeta = pm?.fanId ?? pm?.fan_id;
  if (fromMeta != null && String(fromMeta).trim()) {
    return normalizeFanId(fromMeta);
  }
  const notes = String(row.notes || '');
  const m = notes.match(/FAN\s*ID\s+([A-Z0-9]{8,20})/i);
  if (m?.[1]) return normalizeFanId(m[1]);
  return null;
}
