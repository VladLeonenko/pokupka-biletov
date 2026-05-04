import { NeglinkaHero } from './NeglinkaHero';
import { NeglinkaEventRows } from './NeglinkaEventRows';
import { TicketsCategoryCarousels } from './TicketsCategoryCarousels';
import type { CategoryDirection } from './TicketsCategoryCarousels';
import { TicketsTrustStrip, TicketsHomeExtras } from './TicketsHomeBlocks';
import type { NormalizedBiletEvent } from '@/services/biletPublicApi';
import type { HeroSlideView } from '@/types/ticketsVitrine';
import styles from './TicketsHomeSections.module.css';

type Props = {
  heroSlides?: HeroSlideView[] | null;
  events?: NormalizedBiletEvent[] | null;
  sportEvents?: NormalizedBiletEvent[] | null;
  /** Направления из витрины — секции с горизонтальными подборками */
  directions?: CategoryDirection[] | null;
  /** Скелетон hero (витрина или афиша) */
  heroLoading: boolean;
  /** Скелетон списка событий */
  listLoading: boolean;
  selectedDateLabel?: string | null;
};

export function TicketsHomeSections({
  heroSlides,
  events,
  sportEvents,
  directions,
  heroLoading,
  listLoading,
  selectedDateLabel,
}: Props) {
  const list = events ?? [];
  const dir = directions ?? [];
  const hero = heroSlides ?? [];
  /** На главной — не более 12 позиций в списке рядов. */
  const rowEvents = list.slice(0, 12);

  return (
    <div className={styles.page}>
      <NeglinkaHero slides={hero} loading={heroLoading} />

      <TicketsTrustStrip />

      {selectedDateLabel && !listLoading && list.length > 0 && (
        <p className={styles.dateFilter}>
          Фильтр по дате: <strong>{selectedDateLabel}</strong>
        </p>
      )}

      {dir.length > 0 && (
        <TicketsCategoryCarousels directions={dir} events={list} sportEvents={sportEvents ?? undefined} listLoading={listLoading} />
      )}

      {listLoading && rowEvents.length === 0 && (
        <section className={styles.rowsSkeleton} aria-busy="true" aria-label="Загрузка афиши">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className={styles.rowSkeleton} />
          ))}
        </section>
      )}

      {!listLoading && rowEvents.length > 0 && <NeglinkaEventRows events={rowEvents} />}

      {!listLoading && <TicketsHomeExtras events={list} />}
    </div>
  );
}
