/**
 * Публичная витрина: только сеансы с датой сегодня и позже (Europe/Moscow, календарный день).
 * Прошедшие дни на витрину не отдаём.
 */

const MOSCOW_TZ = 'Europe/Moscow';

/** @param {unknown} raw */
function parseCatalogDateMs(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const nativeMs = new Date(s).getTime();
  if (Number.isFinite(nativeMs)) return nativeMs;
  const m = s.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:\D+(\d{1,2}):(\d{2}))?/);
  if (!m) return null;
  // dd.mm.yyyy[ HH:MM] — интерпретируем как московское локальное время
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const hour = m[4] ? Number(m[4]) : 0;
  const minute = m[5] ? Number(m[5]) : 0;
  const iso = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+03:00`;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Полуночь текущего календарного дня в Europe/Moscow → UTC ms.
 * @param {Date} [now]
 */
export function startOfMoscowDayMs(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: MOSCOW_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const d = parts.find((p) => p.type === 'day')?.value;
  if (!y || !m || !d) return now.setHours(0, 0, 0, 0);
  const ms = Date.parse(`${y}-${m}-${d}T00:00:00+03:00`);
  return Number.isFinite(ms) ? ms : new Date(now).setHours(0, 0, 0, 0);
}

/** @param {Record<string, unknown>} row */
export function pickCatalogActionEventMs(row) {
  const candidates = [
    row.EventDateTime,
    row.eventDateTime,
    row.beginDateTimeISO,
    row.startDateTime,
    row.BeginDateTime,
    row.beginDateTime,
    row.beginDate,
    row.dateTime,
    row.date,
    row.Date,
    row.startDate,
    row.eventDate,
  ];
  for (const c of candidates) {
    const ms = parseCatalogDateMs(c);
    if (ms != null) return ms;
  }
  return null;
}

/** @param {Record<string, unknown>} row */
export function isUpcomingCatalogAction(row, now = new Date()) {
  const eventMs = pickCatalogActionEventMs(row);
  if (eventMs == null) return false;
  return eventMs >= startOfMoscowDayMs(now);
}

/**
 * @param {Record<string, unknown>[] | null | undefined} actions
 * @param {Date} [now]
 * @returns {Record<string, unknown>[]}
 */
export function filterUpcomingCatalogActions(actions, now = new Date()) {
  if (!Array.isArray(actions)) return [];
  return actions.filter((row) => row && typeof row === 'object' && isUpcomingCatalogAction(row, now));
}
