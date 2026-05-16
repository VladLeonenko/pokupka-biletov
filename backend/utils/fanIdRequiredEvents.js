/**
 * Мероприятия, где обязателен FAN ID (карта болельщика).
 * Дополнительно: GETBILET_FAN_ID_REPERTOIRE_IDS=id1,id2
 */

const DEFAULT_FAN_ID_REPERTOIRE_IDS = new Set([
  '6a05d17b46a4d000309ecf4e', // Суперфинал Фонбет Кубка России — Спартак / Краснодар
]);

const DEFAULT_FAN_ID_SLUGS = new Set([
  'superfinal-fonbet-kubka-rossii-spartak-krasnodar',
]);

/** Маркетинговые ЧПУ → repertoire id (РК, Директ), если slug не в compact /events. */
const TICKET_SLUG_TO_REPERTOIRE = Object.freeze({
  'superfinal-fonbet-kubka-rossii-spartak-krasnodar': '6a05d17b46a4d000309ecf4e',
});

/** @param {string | null | undefined} slug */
export function repertoireIdForTicketSlug(slug) {
  const s = String(slug || '').trim().toLowerCase();
  if (!s) return null;
  if (TICKET_SLUG_TO_REPERTOIRE[s]) return TICKET_SLUG_TO_REPERTOIRE[s];
  const raw = process.env.GETBILET_TICKET_SLUG_ALIASES?.trim();
  if (!raw) return null;
  for (const part of raw.split(/[,;]/)) {
    const [slugPart, repPart] = part.split(':').map((x) => x.trim().toLowerCase());
    if (slugPart && repPart && slugPart === s) return repPart;
  }
  return null;
}

function parseEnvIds() {
  const raw = process.env.GETBILET_FAN_ID_REPERTOIRE_IDS?.trim();
  if (!raw) return new Set();
  return new Set(
    raw
      .split(/[,;\s]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** @param {string | null | undefined} repertoireId */
export function isFanIdRequiredForRepertoire(repertoireId) {
  const id = String(repertoireId || '').trim().toLowerCase();
  if (!id) return false;
  if (DEFAULT_FAN_ID_REPERTOIRE_IDS.has(id)) return true;
  return parseEnvIds().has(id);
}

/** @param {string | null | undefined} slug */
export function isFanIdRequiredForSlug(slug) {
  const s = String(slug || '').trim().toLowerCase();
  if (!s) return false;
  if (DEFAULT_FAN_ID_SLUGS.has(s)) return true;
  return isFanIdRequiredForRepertoire(s);
}

/** @param {string | null | undefined} raw */
export function normalizeFanId(raw) {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

/** @param {string | null | undefined} raw */
export function isValidFanId(raw) {
  const v = normalizeFanId(raw);
  if (v.length < 8 || v.length > 20) return false;
  return /^[A-Z0-9]+$/.test(v);
}

/** @param {string | null | undefined} raw */
export function requireValidFanId(raw) {
  const v = normalizeFanId(raw);
  if (!isValidFanId(v)) {
    const err = new Error('Укажите корректный номер FAN ID (карта болельщика), 8–20 символов');
    err.name = 'FanIdValidationError';
    throw err;
  }
  return v;
}
