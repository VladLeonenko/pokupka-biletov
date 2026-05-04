import type { TicketsVitrineContent } from '@/types/ticketsVitrine';

export type DirectionRow = NonNullable<TicketsVitrineContent['directions']>[number];

/** По умолчанию оба true; false явно скрывает блок */
export function directionsForHeader(dirs: TicketsVitrineContent['directions'] | undefined): DirectionRow[] {
  return (dirs ?? []).filter((d) => d.showInHeader !== false);
}

export function directionsForHomeCarousels(
  dirs: TicketsVitrineContent['directions'] | undefined,
): DirectionRow[] {
  const rows = (dirs ?? []).filter((d) => d.showOnHome !== false);
  const sportIdx = rows.findIndex((d) => d.genre?.trim().toLowerCase() === 'спорт' || d.label.trim().toLowerCase() === 'спорт');
  const theaterIdx = rows.findIndex((d) => d.genre?.trim().toLowerCase() === 'театр' || d.label.trim().toLowerCase() === 'театр');
  const hasSport = sportIdx >= 0;
  if (hasSport) {
    if (theaterIdx < 0 || sportIdx === theaterIdx + 1) return rows;
    const sport = rows[sportIdx];
    const rest = rows.filter((_, idx) => idx !== sportIdx);
    const nextTheaterIdx = rest.findIndex((d) => d.genre?.trim().toLowerCase() === 'театр' || d.label.trim().toLowerCase() === 'театр');
    return [...rest.slice(0, nextTheaterIdx + 1), sport, ...rest.slice(nextTheaterIdx + 1)];
  }

  const sport: DirectionRow = { label: 'Спорт', genre: 'Спорт' };
  if (theaterIdx < 0) return [sport, ...rows];
  return [...rows.slice(0, theaterIdx + 1), sport, ...rows.slice(theaterIdx + 1)];
}
