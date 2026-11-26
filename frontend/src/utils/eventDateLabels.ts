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

/** Бейдж на постере: «7 дек · 19:00», без числового 07.12. */
export function formatEventPosterDateBadge(
  ev: DerivedEventDates & { dateLabel?: string; isoDate?: string },
): string {
  const d = tryParseDate(ev.isoDate, ev.dateLabel);
  const derived = d ? deriveBiletEventDateParts(ev.isoDate, ev.dateLabel) : {};
  const time = ev.timeLabel?.trim() || derived.timeLabel;
  if (d) {
    const short = format(d, 'd MMM', { locale: ru }).replace(/\./g, '');
    if (short && time) return `${short} · ${time}`;
    if (short) return short;
  }
  const { displayDate, dateLabel } = ev;
  if (displayDate && time) return `${displayDate} · ${time}`;
  if (displayDate) return displayDate;
  if (dateLabel?.trim()) return dateLabel.trim();
  if (time) return time;
  return '';
}

export type EventCardDateCopy = {
  /** Дата этого сеанса словами: «понедельник, 7 декабря · 19:00». */
  sessionLine: string | null;
  /** Период проката, если он не совпадает с сеансом карточки. */
  runLine: string | null;
  /** Обычное описание, если подзаголовок — не дата. */
  prose: string | null;
};

const MONTH_BY_PREFIX: { prefix: string; month: number; label: string }[] = [
  { prefix: 'янв', month: 0, label: 'января' },
  { prefix: 'фев', month: 1, label: 'февраля' },
  { prefix: 'мар', month: 2, label: 'марта' },
  { prefix: 'апр', month: 3, label: 'апреля' },
  { prefix: 'май', month: 4, label: 'мая' },
  { prefix: 'мая', month: 4, label: 'мая' },
  { prefix: 'июн', month: 5, label: 'июня' },
  { prefix: 'июл', month: 6, label: 'июля' },
  { prefix: 'авг', month: 7, label: 'августа' },
  { prefix: 'сен', month: 8, label: 'сентября' },
  { prefix: 'окт', month: 9, label: 'октября' },
  { prefix: 'ноя', month: 10, label: 'ноября' },
  { prefix: 'дек', month: 11, label: 'декабря' },
];

function monthFromToken(token: string): { month: number; label: string } | null {
  const t = token.toLowerCase().replace(/\./g, '');
  if (t.startsWith('мар')) return { month: 2, label: 'марта' };
  for (const row of MONTH_BY_PREFIX) {
    if (t.startsWith(row.prefix)) return row;
  }
  return null;
}

function looksLikeScheduleNote(s: string): boolean {
  const t = s.trim();
  if (t.length < 4 || t.length > 96) return false;
  const words = t.toLowerCase().split(/[^a-zа-яё0-9]+/i).filter(Boolean);
  if (words.some((w) => monthFromToken(w))) return true;
  return /\d{1,2}[./]\d{1,2}/.test(t);
}

function stripTrailingAge(s: string): string {
  return s.replace(/\s*·\s*\d{1,2}\+\s*$/i, '').trim();
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function noteCalendarDate(day: number, month: number, session: Date | null): Date {
  const year = session?.getFullYear() ?? new Date().getFullYear();
  let note = new Date(year, month, day);
  if (session && note.getTime() < startOfDay(session).getTime() - 14 * 86400000) {
    note = new Date(year + 1, month, day);
  }
  return note;
}

function parseSingleShowDate(raw: string): { day: number; month: number; label: string } | null {
  const m = raw.trim().match(/^(\d{1,2})\s+([а-яё]+)/i);
  if (!m) return null;
  const month = monthFromToken(m[2]);
  if (!month) return null;
  const day = Number(m[1]);
  if (day < 1 || day > 31) return null;
  return { day, month: month.month, label: month.label };
}

/**
 * Дата карточки — ближайший показ. Подзаголовок проката («31 янв», «26–28 ноября»)
 * — остальные даты, их нельзя оставлять без подписи: иначе кажется, что показ один.
 */
export function explainEventCardDates(ev: {
  subtitle?: string;
  isoDate?: string;
  dateLabel?: string;
  displayDate?: string;
  weekday?: string;
  timeLabel?: string;
}): EventCardDateCopy {
  const sessionDate = tryParseDate(ev.isoDate, ev.dateLabel);
  let sessionLine: string | null = null;
  if (sessionDate) {
    const wd = format(sessionDate, 'EEEE', { locale: ru });
    const day = format(sessionDate, 'd MMMM', { locale: ru });
    const derived = deriveBiletEventDateParts(ev.isoDate, ev.dateLabel);
    const time = ev.timeLabel?.trim() || derived.timeLabel;
    sessionLine = time ? `${wd}, ${day} · ${time}` : `${wd}, ${day}`;
  } else {
    const fallback = [ev.weekday, ev.displayDate, ev.timeLabel]
      .map((s) => (typeof s === 'string' ? s.trim() : ''))
      .filter(Boolean);
    sessionLine = fallback.length ? fallback.join(' · ') : null;
  }

  const raw = ev.subtitle?.trim() || '';
  if (!raw) return { sessionLine, runLine: null, prose: null };
  if (!looksLikeScheduleNote(raw)) return { sessionLine, runLine: null, prose: raw };

  const cleaned = stripTrailingAge(raw);
  const span = /[–—]|\s-\s/.test(raw);
  if (span) return { sessionLine, runLine: `Ещё даты: ${raw}`, prose: null };

  const one = parseSingleShowDate(cleaned);
  if (!one || !sessionDate) {
    return { sessionLine, runLine: `Ещё даты: ${cleaned}`, prose: null };
  }

  const note = noteCalendarDate(one.day, one.month, sessionDate);
  if (startOfDay(note).getTime() === startOfDay(sessionDate).getTime()) {
    return { sessionLine, runLine: null, prose: null };
  }

  const when = `${one.day} ${one.label}`;
  if (startOfDay(note).getTime() > startOfDay(sessionDate).getTime()) {
    return { sessionLine, runLine: `Ещё даты до ${when}`, prose: null };
  }
  return { sessionLine, runLine: `Ещё даты: ${when}`, prose: null };
}
