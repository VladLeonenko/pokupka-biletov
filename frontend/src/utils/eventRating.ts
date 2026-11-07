/** Зоны рейтинга 0–10 (карточки, как Ticketland). */
export type RatingZone = 'green' | 'yellow' | 'orange' | 'red';

export function ratingZone(score: number | null | undefined): RatingZone | null {
  const n = Number(score);
  if (!Number.isFinite(n)) return null;
  if (n >= 8) return 'green';
  if (n >= 6.5) return 'yellow';
  if (n >= 5) return 'orange';
  return 'red';
}

export function formatRatingScore(score: number | null | undefined): string | null {
  const n = Number(score);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
