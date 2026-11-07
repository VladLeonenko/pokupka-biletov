/**
 * Цветовые зоны рейтинга 0–10 (карточки афиши, стиль Ticketland).
 * green ≥ 8 · yellow ≥ 6.5 · orange ≥ 5 · red < 5
 */

export function ratingZone(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return null;
  if (n >= 8) return 'green';
  if (n >= 6.5) return 'yellow';
  if (n >= 5) return 'orange';
  return 'red';
}

export function formatRatingScore(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** stars 1–5 → вклад в шкалу 0–10 */
export function starsToScore10(stars) {
  const s = Number(stars);
  if (!Number.isFinite(s)) return null;
  return Math.min(10, Math.max(0, s * 2));
}

export async function recomputeEventRating(ticketPool, repertoireExternalId) {
  const id = String(repertoireExternalId || '').trim();
  if (!id) return null;
  const r = await ticketPool.query(
    `SELECT
       COUNT(*)::int AS n,
       AVG(stars * 2.0)::numeric(3,1) AS score
     FROM event_reviews
     WHERE repertoire_external_id = $1 AND is_published = TRUE`,
    [id],
  );
  const n = r.rows[0]?.n || 0;
  const score = n > 0 ? Number(r.rows[0].score) : null;
  await ticketPool.query(
    `UPDATE getbilet_events
     SET rating_score = $2, rating_count = $3, updated_at = NOW()
     WHERE getbilet_external_id = $1`,
    [id, score, n],
  );
  return { score, count: n, zone: ratingZone(score) };
}
