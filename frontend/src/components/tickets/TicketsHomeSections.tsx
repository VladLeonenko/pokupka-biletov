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
  /** Направления из витрины — секции с горизонтальными подборками */
  directions?: CategoryDirection[] | null;
  /** Скелетон hero (витрина или афиша) */
  heroLoading: boolean;
  /** Скелетон списка событий */
  listLoading: boolean;
  error: boolean;
  selectedDateLabel?: string | null;
  /** Показать компактное предупреждение про демо / API */
  demoMode?: boolean;
};

export function TicketsHomeSections({
  heroSlides,
  events,
  directions,
  heroLoading,
  listLoading,
  error,
  selectedDateLabel,
  demoMode,
}: Props) {
  const list = events ?? [];
  const dir = directions ?? [];
  const hero = heroSlides ?? [];
  /** На главной — не более 12 позиций в списке рядов. */
  const rowEvents = list.slice(0, 12);

  return (
    <div className={styles.page}>
      {demoMode && !listLoading && (
        <div className={styles.demoBanner}>
          {error ? (
            <>
              Не удалось загрузить афишу из GetBilet — показан <strong>демо-макет</strong> в стиле театральной
              витрины. Проверьте переменные окружения на сервере.
            </>
          ) : (
            <>Показана демо-афиша: подключите API, чтобы вывести реальные события.</>
          )}
          <details className={styles.details}>
            <summary>Технические подсказки</summary>
            <p>
              BIL24: <code>GETBILET_API_KEY</code>, <code>GETBILET_INTERFACE_FID</code>, во фронте{' '}
              <code>VITE_GETBILET_CITY_ID</code>. REST v2.2: <code>GETBILET_PROTOCOL=rest_v2</code>,{' '}
              <code>GETBILET_V2_STAGE_IDS</code> и учётные данные из документации GetBilet.
            </p>
          </details>
        </div>
      )}

      <NeglinkaHero slides={hero} loading={heroLoading} />

      <TicketsTrustStrip />

      {selectedDateLabel && !listLoading && list.length > 0 && (
        <p className={styles.dateFilter}>
          Фильтр по дате: <strong>{selectedDateLabel}</strong>
        </p>
      )}

      {dir.length > 0 && (
        <TicketsCategoryCarousels directions={dir} events={list} listLoading={listLoading} />
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
