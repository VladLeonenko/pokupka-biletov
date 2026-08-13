/**
 * Мероприятия, где обязателен FAN ID (карта болельщика).
 * Дополнительно: GETBILET_FAN_ID_REPERTOIRE_IDS=id1,id2
 */

const DEFAULT_FAN_ID_REPERTOIRE_IDS = new Set([
  '6a05d17b46a4d000309ecf4e', // Суперфинал Фонбет Кубка России — Спартак / Краснодар
  '6a46656d46a4d000309ed0a2', // Суперкубок России 2026 — Спартак / Зенит (НН)
]);

const DEFAULT_FAN_ID_SLUGS = new Set([
  'superfinal-fonbet-kubka-rossii-spartak-krasnodar',
  'olimpbet-superkubok-rossii',
  'superkubok-rossii-po-futbolu',
]);

/** Маркетинговые ЧПУ → repertoire id (РК, Директ), если slug не в compact /events. */
const TICKET_SLUG_TO_REPERTOIRE = Object.freeze({
  /** Старый ЧПУ суперфинала Лужники → живой Суперкубок НН (не отдавать майское событие). */
  'superfinal-fonbet-kubka-rossii-spartak-krasnodar': '6a46656d46a4d000309ed0a2',
  'olimpbet-superkubok-rossii': '6a46656d46a4d000309ed0a2',
  'superkubok-rossii-po-futbolu': '6a46656d46a4d000309ed0a2',
  'match-spartak-zenit-superkubok-rossii-po-futbolu-2026': '6a46656d46a4d000309ed0a2',
  /** Баста — Guf (Лужники, концерт) — стабильный ЧПУ для рекламы. */
  'basta-guf': '69ac1c5246a4d000309ecd5c',
  'basta-i-guf': '69ac1c5246a4d000309ecd5c',
  /** Кабала святош (МХТ) — ЧПУ для Директа / медиаплана. */
  'kabala-svyatosh': '686cd69c58f79d0030278b9d',
  'kabala-svjatosch': '686cd69c58f79d0030278b9d',
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
