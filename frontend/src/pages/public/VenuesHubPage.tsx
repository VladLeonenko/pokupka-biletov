import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import {
  BILET_EVENTS_LITE_LIMIT,
  biletEventsLiteQueryKey,
  fetchBiletEventsLite,
  fetchBiletVenues,
  isEventActual,
  normalizeBiletEventsPayload,
  normalizeVenuesPayload,
  uniqueVenuesFromEvents,
} from '@/services/biletPublicApi';
import { useTicketsCityId } from '@/hooks/useTicketsCityId';
import { buildVenueLandingList } from '@/utils/venueSlug';
import { buildVenueCardsFromEvents } from '@/utils/venueCoverFromEvents';
import { eventPlaceholderUrl } from '@/utils/ticketsPlaceholders';
import { SITE_PAGE_SEO } from '@/seo/siteSeoCatalog';
import styles from './VenuesHubPage.module.css';

const SEO = SITE_PAGE_SEO['/events/venues'];

export function VenuesHubPage() {
  const cityId = useTicketsCityId();
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const { data: raw, isLoading, isError } = useQuery({
    queryKey: biletEventsLiteQueryKey(cityId),
    queryFn: () => fetchBiletEventsLite(BILET_EVENTS_LITE_LIMIT),
    staleTime: 120_000,
    retry: 1,
  });

  const { data: venuesRaw } = useQuery({
    queryKey: ['bilet-venues-public', cityId],
    queryFn: async () => {
      try {
        return await fetchBiletVenues();
      } catch {
        return null;
      }
    },
    staleTime: 300_000,
    retry: false,
  });

  const allEvents = useMemo(() => {
    if (isError) return [];
    return normalizeBiletEventsPayload(raw).filter(isEventActual);
  }, [raw, isError]);

  const cardsFromEvents = useMemo(() => buildVenueCardsFromEvents(allEvents), [allEvents]);

  /** Площадки из GetPlaceList без дат — тоже в списке, с заглушкой. */
  const venues = useMemo(() => {
    const bySlug = new Map(cardsFromEvents.map((v) => [v.slug, v]));
    const fromApi = venuesRaw ? normalizeVenuesPayload(venuesRaw).map((v) => v.name) : [];
    const fromEvents = uniqueVenuesFromEvents(allEvents);
    const allNames = Array.from(new Set([...fromApi, ...fromEvents]));
    for (const item of buildVenueLandingList(allNames)) {
      if (bySlug.has(item.slug)) continue;
      bySlug.set(item.slug, {
        slug: item.slug,
        label: item.label,
        count: 0,
        coverUrl: eventPlaceholderUrl('theater'),
        address: null,
      });
    }
    return [...bySlug.values()].sort(
      (a, b) => b.count - a.count || a.label.localeCompare(b.label, 'ru'),
    );
  }, [cardsFromEvents, venuesRaw, allEvents]);

  const withEvents = venues.filter((v) => v.count > 0).length;

  return (
    <>
      <SeoMetaTags
        title={SEO.title}
        description={SEO.description}
        url={`${origin}/events/venues`}
      />
      <main className={styles.main}>
        <header className={styles.header}>
          <p className={styles.overline}>Афиша</p>
          <h1 className={styles.h1}>{SEO.h1}</h1>
          <p className={styles.intro}>
            Все театры, концертные залы и стадионы из каталога. Откройте площадку — афиша, цены и
            схема зала.
          </p>
          <Link to="/events" className={styles.backLink}>
            ← К общей афише
          </Link>
        </header>

        {isLoading && (
          <div className={styles.grid} aria-busy="true" aria-label="Загрузка площадок">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className={styles.skeleton} />
            ))}
          </div>
        )}
        {isError && <p className={styles.warn}>Не удалось загрузить афишу. Обновите страницу.</p>}

        {!isLoading && !isError && (
          <p className={styles.count}>
            Площадок: {venues.length}
            {withEvents > 0 ? ` · с событиями: ${withEvents}` : ''}
          </p>
        )}

        {!isLoading && !isError && (
          <ul className={styles.grid}>
            {venues.map((v) => (
              <li key={v.slug}>
                <Link className={styles.card} to={`/events/venue/${v.slug}`}>
                  <div className={styles.media}>
                    <img
                      src={v.coverUrl}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className={styles.img}
                      onError={(e) => {
                        const el = e.currentTarget;
                        const fallback = eventPlaceholderUrl('theater');
                        if (el.src !== fallback) el.src = fallback;
                      }}
                    />
                  </div>
                  <div className={styles.body}>
                    <span className={styles.name}>{v.label}</span>
                    {v.address ? <span className={styles.addr}>{v.address}</span> : null}
                    {v.count > 0 ? (
                      <span className={styles.meta}>{v.count} в афише</span>
                    ) : (
                      <span className={styles.metaMuted}>нет дат</span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
