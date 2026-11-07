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
import { buildVenueLandingList, venueSlugFromName } from '@/utils/venueSlug';
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

  const venueNames = useMemo(() => {
    const fromEvents = uniqueVenuesFromEvents(allEvents);
    const fromApi = venuesRaw ? normalizeVenuesPayload(venuesRaw).map((v) => v.name) : [];
    return Array.from(new Set([...fromApi, ...fromEvents]));
  }, [allEvents, venuesRaw]);

  const venues = useMemo(() => {
    const list = buildVenueLandingList(venueNames);
    const counts = new Map<string, number>();
    for (const ev of allEvents) {
      const name = ev.venue?.trim();
      if (!name) continue;
      const slug = venueSlugFromName(name);
      if (!slug) continue;
      counts.set(slug, (counts.get(slug) || 0) + 1);
    }
    return list
      .map((v) => ({ ...v, count: counts.get(v.slug) || 0 }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'ru'));
  }, [venueNames, allEvents]);

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
            Все театры, концертные залы и стадионы из каталога. Откройте площадку — увидите афишу,
            цены и схему зала.
          </p>
          <Link to="/events" className={styles.backLink}>
            ← К общей афише
          </Link>
        </header>

        {isLoading && <p className={styles.hint}>Загружаем площадки…</p>}
        {isError && <p className={styles.warn}>Не удалось загрузить афишу. Обновите страницу.</p>}

        {!isLoading && !isError && (
          <p className={styles.count}>
            Площадок: {venues.length}
            {venues.some((v) => v.count > 0)
              ? ` · с событиями: ${venues.filter((v) => v.count > 0).length}`
              : ''}
          </p>
        )}

        <ul className={styles.list}>
          {venues.map((v) => (
            <li key={v.slug}>
              <Link className={styles.item} to={`/events/venue/${v.slug}`}>
                <span className={styles.name}>{v.label}</span>
                {v.count > 0 ? (
                  <span className={styles.meta}>{v.count} в афише</span>
                ) : (
                  <span className={styles.metaMuted}>нет дат</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
