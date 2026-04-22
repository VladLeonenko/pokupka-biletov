import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { parseISO, isValid } from 'date-fns';
import {
  filterEventsClient,
  type NormalizedBiletEvent,
} from '@/services/biletPublicApi';
import { EventPosterCard } from '@/components/tickets/EventPosterCard';
import { buildEventsDirectionHref, directionRowKey } from '@/utils/eventsDirectionHref';
import styles from './TicketsCategoryCarousels.module.css';

const MAX_PER_ROW = 10;

export type CategoryDirection = { label: string; q?: string; genre?: string };

type Props = {
  directions: CategoryDirection[];
  events: NormalizedBiletEvent[];
  listLoading: boolean;
};

function timeMs(ev: NormalizedBiletEvent): number {
  const raw = ev.isoDate?.trim();
  if (raw) {
    const d = parseISO(raw);
    if (isValid(d)) return d.getTime();
  }
  return Number.MAX_SAFE_INTEGER;
}

/** Премьеры выше, внутри — ближайшие даты. */
function sortCategoryEvents(rows: NormalizedBiletEvent[]): NormalizedBiletEvent[] {
  return [...rows].sort((a, b) => {
    if (a.isPremiere && !b.isPremiere) return -1;
    if (!a.isPremiere && b.isPremiere) return 1;
    return timeMs(a) - timeMs(b);
  });
}

export function TicketsCategoryCarousels({ directions, events, listLoading }: Props) {
  const rows = useMemo(() => {
    return directions
      .map((d) => {
        const genre = d.genre?.trim();
        const q = d.q?.trim();
        if (!genre && !q) return { dir: d, items: [] as NormalizedBiletEvent[] };
        const filtered = filterEventsClient(
          events,
          genre ? { genre } : { q: q! },
        );
        const sorted = sortCategoryEvents(filtered).slice(0, MAX_PER_ROW);
        return { dir: d, items: sorted };
      })
      .filter((r) => r.items.length > 0);
  }, [directions, events]);

  if (listLoading) {
    return (
      <>
        {directions.slice(0, 3).map((d, i) => (
          <section key={`sk-${directionRowKey(d)}-${i}`} className={styles.block} aria-busy="true">
            <div className={styles.skelTitle} />
            <div className={styles.skeletonStrip}>
              {[0, 1, 2, 3].map((j) => (
                <div key={j} className={styles.skelCard} />
              ))}
            </div>
          </section>
        ))}
      </>
    );
  }

  if (rows.length === 0) return null;

  return (
    <>
      {rows.map(({ dir, items }) => (
        <section
          key={directionRowKey(dir)}
          className={styles.block}
          aria-labelledby={`cat-${encodeURIComponent(directionRowKey(dir))}`}
        >
          <div className={styles.head}>
            <h2 id={`cat-${encodeURIComponent(directionRowKey(dir))}`} className={styles.title}>
              {dir.label}
            </h2>
            <Link
              className={styles.seeAll}
              to={buildEventsDirectionHref(dir)}
            >
              Все события →
            </Link>
          </div>
          <div className={styles.stripBleed}>
            <div className={styles.strip} role="list">
              {items.map((ev) => (
                <div key={ev.id} className={styles.cardSlot} role="listitem">
                  <EventPosterCard event={ev} variant="compact" />
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}
    </>
  );
}
