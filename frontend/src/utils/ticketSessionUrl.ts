import { isValid, parseISO } from 'date-fns';

/** Компактный сегмент пути: YYYYMMDDHHmm (локальные компоненты даты из ISO, как в афише). */
export function compactSessionPathFromIso(iso: string): string | null {
  const raw = iso?.trim();
  if (!raw) return null;
  const d = parseISO(raw);
  if (!isValid(d)) return null;
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${y}${mo}${da}${h}${mi}`;
}

/**
 * Строка для сопоставления с EventDateTime офферов (без Z — как часто отдаёт GetBilet).
 */
export function isoLocalFromCompactSession(compact: string | undefined): string | null {
  const s = compact?.trim();
  if (!s) return null;
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(s);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00`;
}
