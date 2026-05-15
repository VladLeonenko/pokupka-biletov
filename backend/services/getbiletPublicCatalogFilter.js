/**
 * Публичная витрина: только сеансы с датой сегодня и позже (Europe/Moscow, календарный день).
 */

/** @param {unknown} raw */
function parseCatalogDateMs(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const nativeMs = new Date(s).getTime();
  if (Number.isFinite(nativeMs)) return nativeMs;
  const m = s.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:\D+(\d{1,2}):(\d{2}))?/);
  if (!m) return null;
  const dt = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), m[4] ? Number(m[4]) : 0, m[5] ? Number(m[5]) : 0, 0, 0);
  const ms = dt.getTime();
  return Number.isFinite(ms) ? ms : null;
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
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return eventMs >= today.getTime();
}

/**
 * @param {Record<string, unknown>[] | null | undefined} actions
 * @returns {Record<string, unknown>[]}
 */
export function filterUpcomingCatalogActions(actions) {
  if (!Array.isArray(actions)) return [];
  return actions.filter((row) => row && typeof row === 'object' && isUpcomingCatalogAction(row));
}
