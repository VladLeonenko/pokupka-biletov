import { isFanIdRequiredForRepertoire } from '@/utils/fanIdRequiredEvents';

/** Каноническая дата суперфинала: вс 24.05.2026 18:00 МСК. */
export const SUPERFINAL_MOSCOW_DATE_KEY = '2026-05-24';

function moscowDateKey(iso: string | null | undefined): string | null {
  if (!iso?.trim()) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Europe/Moscow' });
}

/** GetBilet иногда отдаёт офферы с другим EventDateTime в том же repertoireId — убираем лишние сеансы. */
export function filterOffersForSuperfinalSession<T extends { EventDateTime?: string }>(
  offers: T[],
  repertoireId: string | null | undefined,
): T[] {
  if (!isFanIdRequiredForRepertoire(repertoireId)) return offers;
  const filtered = offers.filter((o) => moscowDateKey(o.EventDateTime) === SUPERFINAL_MOSCOW_DATE_KEY);
  return filtered.length > 0 ? filtered : offers;
}
