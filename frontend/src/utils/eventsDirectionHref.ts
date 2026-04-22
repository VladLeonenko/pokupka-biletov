/** Ссылка из витрины «Направления» → /events с жанром или полнотекстовым q */
export function buildEventsDirectionHref(d: { q?: string; genre?: string }): string {
  const genre = d.genre?.trim();
  if (genre) {
    return `/events?genre=${encodeURIComponent(genre)}`;
  }
  const q = d.q?.trim() ?? '';
  return q ? `/events?q=${encodeURIComponent(q)}` : '/events';
}

export function directionRowKey(d: { q?: string; genre?: string; label: string }): string {
  return d.genre?.trim() || d.q?.trim() || d.label;
}
