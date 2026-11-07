import { NeglinkaHero } from './NeglinkaHero';
import { NeglinkaEventRows } from './NeglinkaEventRows';
import { TicketsCategoryCarousels } from './TicketsCategoryCarousels';
import type { CategoryDirection } from './TicketsCategoryCarousels';
import { TicketsHomeExtras } from './TicketsHomeBlocks';
import { HomeVenuesBlock } from './HomeVenuesBlock';
import { EventPosterCard } from './EventPosterCard';
import type { NormalizedBiletEvent } from '@/services/biletPublicApi';
import type { HeroSlideView } from '@/types/ticketsVitrine';
import styles from './TicketsHomeSections.module.css';

export const AFISHA_DATE_RESULTS_ID = 'afisha-date-results';

type Props = {
  heroSlides?: HeroSlideView[] | null;
  events?: NormalizedBiletEvent[] | null;
  sportEvents?: NormalizedBiletEvent[] | null;
  recentEvents?: NormalizedBiletEvent[] | null;
  /** Направления из витрины — секции с горизонтальными подборками */
  directions?: CategoryDirection[] | null;
  /** Скелетон hero (витрина или афиша) */
  heroLoading: boolean;
  /** Скелетон списка событий */
  listLoading: boolean;
  catalogError?: boolean;
  selectedDateLabel?: string | null;
  /** Выбрана дата в календаре — на мобилке сворачиваем hero, показываем полную выдачу */
  dateFilterActive?: boolean;
  telegramUrl?: string | null;
  vkUrl?: string | null;
};

export function TicketsHomeSections({
  heroSlides,
  events,
  sportEvents,
  recentEvents,
  directions,
  heroLoading,
  listLoading,
  catalogError,
  selectedDateLabel,
  dateFilterActive = false,
  telegramUrl,
  vkUrl,
}: Props) {
  const list = events ?? [];
  const dir = directions ?? [];
  const hero = heroSlides ?? [];
  const recent = recentEvents ?? [];
  /** Без даты — 12 рядов; с датой — плитка всей выдачи дня. */
  const rowEvents = dateFilterActive ? list : list.slice(0, 12);

  return (
    <div
      className={`${styles.page}${dateFilterActive ? ` ${styles.pageDateFilter}` : ''}`.trim()}
      data-date-filter={dateFilterActive ? '1' : undefined}
    >
      <div className={styles.heroSlot}>
        <NeglinkaHero slides={hero} loading={heroLoading} telegramUrl={telegramUrl} vkUrl={vkUrl} />
      </div>

      {catalogError && !listLoading ? (
        <p className={styles.catalogError}>
          Не удалось загрузить афишу.{' '}
          <button type="button" className={styles.retryBtn} onClick={() => window.location.reload()}>
            Обновить
          </button>
        </p>
      ) : null}

      <div id={AFISHA_DATE_RESULTS_ID} className={styles.dateResultsAnchor}>
        {dateFilterActive && (
          /* div, не section: legacy index.css — section { margin: Xem 0 !important } убивает margin:auto */
          <div className={styles.dateResults} aria-labelledby="home-date-results-title">
            <div className={styles.dateResultsHead}>
              <h2 id="home-date-results-title" className={styles.dateResultsTitle}>
                {selectedDateLabel ? `Афиша на ${selectedDateLabel}` : 'Афиша на выбранную дату'}
              </h2>
              {!listLoading && (
                <p className={styles.dateResultsMeta}>
                  {list.length > 0 ? `Найдено: ${list.length}` : 'Ничего не найдено'}
                </p>
              )}
            </div>

            {listLoading && (
              <div className={styles.dateGridSkeleton} aria-busy="true" aria-label="Загрузка афиши">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className={styles.dateGridSkeletonCard} />
                ))}
              </div>
            )}

            {!listLoading && list.length > 0 && (
              <div className={styles.dateGrid}>
                {list.map((ev) => (
                  <div key={ev.id} className={styles.dateGridItem}>
                    <EventPosterCard event={ev} variant="poster" />
                  </div>
                ))}
              </div>
            )}

            {!listLoading && list.length === 0 && (
              <p className={styles.dateResultsEmpty}>
                На эту дату пока нет событий. Выберите другой день или{' '}
                <a href="/">сбросьте календарь</a>.
              </p>
            )}
          </div>
        )}
      </div>

      {!dateFilterActive && dir.length > 0 && (
        <TicketsCategoryCarousels
          directions={dir}
          events={list}
          sportEvents={sportEvents ?? undefined}
          listLoading={listLoading}
          insertAfterLabel="Детям"
          insertAfterSlot={
            !listLoading && recent.length > 0 ? (
              <section className={styles.recentSection} aria-labelledby="home-recent-title">
                <h2 id="home-recent-title" className={styles.recentTitle}>
                  Вы смотрели
                </h2>
                <div className={styles.recentStripBleed}>
                  <div className={styles.recentStrip}>
                    {recent.map((ev) => (
                      <div key={ev.id} className={styles.recentCard}>
                        <EventPosterCard event={ev} variant="compact" />
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ) : null
          }
        />
      )}

      {!dateFilterActive && !listLoading && (
        <HomeVenuesBlock events={[...list, ...(sportEvents ?? [])]} />
      )}

      {!dateFilterActive && listLoading && rowEvents.length === 0 && (
        <section className={styles.rowsSkeleton} aria-busy="true" aria-label="Загрузка афиши">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className={styles.rowSkeleton} />
          ))}
        </section>
      )}

      {!dateFilterActive && !listLoading && rowEvents.length > 0 && <NeglinkaEventRows events={rowEvents} />}

      {!dateFilterActive && !listLoading && <TicketsHomeExtras events={list} />}
    </div>
  );
}
