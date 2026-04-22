import type { TicketsVitrineContent } from '@/types/ticketsVitrine';

export type DirectionRow = NonNullable<TicketsVitrineContent['directions']>[number];

/** По умолчанию оба true; false явно скрывает блок */
export function directionsForHeader(dirs: TicketsVitrineContent['directions'] | undefined): DirectionRow[] {
  return (dirs ?? []).filter((d) => d.showInHeader !== false);
}

export function directionsForHomeCarousels(
  dirs: TicketsVitrineContent['directions'] | undefined,
): DirectionRow[] {
  return (dirs ?? []).filter((d) => d.showOnHome !== false);
}
