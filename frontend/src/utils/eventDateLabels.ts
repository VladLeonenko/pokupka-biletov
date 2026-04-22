import { format, isValid, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

export type DerivedEventDates = {
  displayDate?: string;
  weekday?: string;
  timeLabel?: string;
};

function tryParseDate(isoDate?: string, dateLabel?: string): Date | null {
  if (isoDate?.trim()) {
    const a = parseISO(isoDate.trim());
    if (isValid(a)) return a;
    const n = Date.parse(isoDate.trim());
    if (Number.isFinite(n)) return new Date(n);
  }
  if (dateLabel?.trim()) {
    const s = dateLabel.trim();
    const b = parseISO(s);
    if (isValid(b)) return b;
    const n = Date.parse(s);
    if (Number.isFinite(n)) return new Date(n);
    const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?/);
    if (m) {
      const d = Number(m[1]);
      const mo = Number(m[2]);
      let y = Number(m[3]);
      if (y < 100) y += 2000;
      const hh = m[4] != null ? Number(m[4]) : 0;
      const mm = m[5] != null ? Number(m[5]) : 0;
      const dt = new Date(y, mo - 1, d, hh, mm, 0, 0);
      if (isValid(dt)) return dt;
    }
  }
  return null;
}

/**
 * Дата/время для афиши: из ISO и/или человекочитаемого поля от API.
 * GetBilet/rest_v2 часто отдаёт BeginDateTime, EventDateTime и т.п. в normalize как iso/dateLabel.
 */
export function deriveBiletEventDateParts(
  isoDate?: string,
  dateLabel?: string,
): DerivedEventDates {
  const d = tryParseDate(isoDate, dateLabel);
  if (!d) {
    const raw = dateLabel?.trim();
    if (raw && /^\d{1,2}:\d{2}/.test(raw)) {
      return { timeLabel: raw.slice(0, 5) };
    }
    return {};
  }

  const displayDate = format(d, 'dd.MM');
  const weekday = format(d, 'EEEE', { locale: ru }).toUpperCase();
  const midnight = d.getHours() === 0 && d.getMinutes() === 0;
  const explicitTime =
    /\d{1,2}:\d{2}/.test(dateLabel || '') || /T\d{2}:\d{2}/.test(isoDate || '');
  const timeLabel = !midnight || explicitTime ? format(d, 'HH:mm') : undefined;

  return { displayDate, weekday, timeLabel };
}

/**
 * Полная дата для афиши: «14 апреля 2026».
 * Берётся из ISO/поля даты API; иначе из displayDate вида dd.MM (год — текущий).
 */
export function formatEventFullCalendarDate(ev: {
  isoDate?: string;
  dateLabel?: string;
  displayDate?: string;
}): string | null {
  let d = tryParseDate(ev.isoDate, ev.dateLabel);
  if (d && !isValid(d)) d = null;
  if (!d && ev.displayDate?.trim()) {
    const ds = ev.displayDate.trim();
    const m2 = ds.match(/^(\d{1,2})\.(\d{1,2})$/);
    if (m2) {
      const day = Number(m2[1]);
      const month = Number(m2[2]);
      const y = new Date().getFullYear();
      const candidate = new Date(y, month - 1, day);
      d = isValid(candidate) ? candidate : null;
    }
    const m4 = ds.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (!d && m4) {
      const day = Number(m4[1]);
      const month = Number(m4[2]);
      const y = Number(m4[3]);
      const candidate = new Date(y, month - 1, day);
      d = isValid(candidate) ? candidate : null;
    }
  }
  if (!d || !isValid(d)) return null;
  return format(d, 'd MMMM yyyy', { locale: ru });
}

/** Строка для бейджа на постере: «14.04 · 19:00» */
export function formatEventPosterDateBadge(ev: DerivedEventDates & { dateLabel?: string }): string {
  const { displayDate, timeLabel, dateLabel } = ev;
  if (displayDate && timeLabel) return `${displayDate} · ${timeLabel}`;
  if (displayDate) return displayDate;
  if (dateLabel?.trim()) return dateLabel.trim();
  if (timeLabel) return timeLabel;
  return '';
}
