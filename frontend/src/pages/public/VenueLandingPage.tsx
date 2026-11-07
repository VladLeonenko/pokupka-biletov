import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { EventPosterCard } from '@/components/tickets/EventPosterCard';
import {
  BILET_EVENTS_LITE_LIMIT,
  biletEventsLiteQueryKey,
  dedupeBiletEventsByShow,
  fetchBiletEventsLite,
  fetchBiletVenues,
  filterEventsClient,
  isEventActual,
  normalizeBiletEventsPayload,
  normalizeVenuesPayload,
  uniqueVenuesFromEvents,
} from '@/services/biletPublicApi';
import { useTicketsCityId } from '@/hooks/useTicketsCityId';
import {
  canonicalizeVenueSlug,
  resolveVenueNameFromSlug,
  VENUE_SLUG_LABELS,
} from '@/utils/venueSlug';
import { buildVenueLandingCopy } from '@/utils/venueLandingCopy';
import styles from './VenueLandingPage.module.css';

const PAGE_SIZE = 24;

export function VenueLandingPage() {
  const { venueSlug = '' } = useParams();
  const cityId = useTicketsCityId();
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    document.body.setAttribute('data-page', '/events/venue');
    return () => document.body.removeAttribute('data-page');
  }, []);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [venueSlug]);

  const { data: raw, isLoading, isError, isFetching } = useQuery({
    queryKey: biletEventsLiteQueryKey(cityId),
    queryFn: () => fetchBiletEventsLite(BILET_EVENTS_LITE_LIMIT),
    staleTime: 120_000,
    gcTime: 30 * 60_000,
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

  const venueName = useMemo(() => {
    return (
      resolveVenueNameFromSlug(venueSlug, venueNames) ||
      VENUE_SLUG_LABELS[canonicalizeVenueSlug(venueSlug)] ||
      VENUE_SLUG_LABELS[venueSlug] ||
      null
    );
  }, [venueSlug, venueNames]);

  const venueAddress = useMemo(() => {
    if (!venueName) return null;
    const hit = allEvents.find((e) => e.venue?.trim() === venueName && e.venueAddress?.trim());
    return hit?.venueAddress?.trim() || null;
  }, [allEvents, venueName]);

  const filtered = useMemo(() => {
    if (!venueName) return [];
    return filterEventsClient(allEvents, { venue: venueName });
  }, [allEvents, venueName]);

  const uniqueEvents = useMemo(() => dedupeBiletEventsByShow(filtered), [filtered]);
  const visibleEvents = useMemo(
    () => uniqueEvents.slice(0, visibleCount),
    [uniqueEvents, visibleCount],
  );
  const hasMore = visibleCount < uniqueEvents.length;

  const loadMore = useCallback(() => {
    setVisibleCount((n) => Math.min(n + PAGE_SIZE, uniqueEvents.length));
  }, [uniqueEvents.length]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) loadMore();
      },
      { rootMargin: '600px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loadMore, visibleEvents.length]);

  const copy = useMemo(
    () =>
      buildVenueLandingCopy(venueName || 'Площадка', {
        slug: canonicalizeVenueSlug(venueSlug) || venueSlug,
        address: venueAddress,
      }),
    [venueName, venueSlug, venueAddress],
  );

  const path = `/events/venue/${venueSlug}`;
  const jsonLd = useMemo(() => {
    const placeName = venueName || copy.h1;
    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Главная', item: `${origin}/` },
            { '@type': 'ListItem', position: 2, name: 'Площадки', item: `${origin}/events/venues` },
            { '@type': 'ListItem', position: 3, name: placeName, item: `${origin}${path}` },
          ],
        },
        {
          '@type': 'Place',
          name: placeName,
          ...(venueAddress ? { address: venueAddress } : {}),
          url: `${origin}${path}`,
        },
        {
          '@type': 'CollectionPage',
          name: copy.title,
          description: copy.description,
          url: `${origin}${path}`,
          about: { '@type': 'Place', name: placeName },
        },
      ],
    };
  }, [origin, path, venueName, venueAddress, copy]);

  const showSkeleton = isLoading && !raw;

  return (
    <>
      <SeoMetaTags
        title={copy.title}
        description={copy.description}
        keywords={copy.keywords}
        url={`${origin}${path}`}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className={styles.main}>
        <nav className={styles.crumbs} aria-label="Навигация">
          <Link to="/">Главная</Link>
          <span aria-hidden>/</span>
          <Link to="/events/venues">Площадки</Link>
          <span aria-hidden>/</span>
          <span>{venueName || '…'}</span>
        </nav>

        <header className={styles.hero}>
          <p className={styles.overline}>
            {copy.city || 'Москва'}
            {copy.metro ? ` · м. ${copy.metro}` : ''} · билеты онлайн
            {copy.minPrice != null ? ` · от ${copy.minPrice.toLocaleString('ru-RU')} ₽` : ''}
          </p>
          <h1 className={styles.h1}>{copy.h1}</h1>
          {(venueAddress || copy.address) && (
            <p className={styles.address}>{venueAddress || copy.address}</p>
          )}
          <p className={styles.lead}>{copy.about}</p>
          <div className={styles.heroLinks}>
            <Link to="/events/venues" className={styles.link}>
              Все площадки →
            </Link>
            <Link to="/events" className={styles.link}>
              Общая афиша →
            </Link>
          </div>
        </header>

        <section className={styles.afisha} aria-labelledby="venue-afisha-title">
          <div className={styles.afishaHead}>
            <h2 id="venue-afisha-title" className={styles.h2}>
              Афиша
            </h2>
            {!showSkeleton && !isError && (
              <p className={styles.count}>
                {uniqueEvents.length > 0
                  ? `${uniqueEvents.length} ${uniqueEvents.length === 1 ? 'событие' : 'событий'}`
                  : isFetching
                    ? 'Обновляем…'
                    : 'Пока нет дат'}
              </p>
            )}
          </div>

          {showSkeleton && (
            <div className={styles.grid} aria-busy="true" aria-label="Загрузка афиши">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className={styles.cardSkeleton} />
              ))}
            </div>
          )}

          {isError && !isLoading && (
            <p className={styles.warn}>
              Не удалось загрузить афишу.{' '}
              <button type="button" className={styles.retry} onClick={() => window.location.reload()}>
                Обновить
              </button>
            </p>
          )}

          {!showSkeleton && !isError && uniqueEvents.length === 0 && venueName && (
            <p className={styles.empty}>
              Сейчас нет доступных дат на «{venueName}». Смотрите{' '}
              <Link to="/events">общую афишу</Link> или другие{' '}
              <Link to="/events/venues">площадки</Link>.
            </p>
          )}

          {!showSkeleton && visibleEvents.length > 0 && (
            <>
              <div className={styles.grid}>
                {visibleEvents.map((ev, i) => (
                  <EventPosterCard key={ev.id} event={ev} priority={i < 4} />
                ))}
              </div>
              {hasMore ? (
                <div ref={loadMoreRef} className={styles.loadMore} aria-hidden>
                  Загружаем ещё…
                </div>
              ) : (
                <p className={styles.endHint}>Показаны все {uniqueEvents.length} событий</p>
              )}
            </>
          )}
        </section>

        <section className={styles.seoBlock} aria-labelledby="venue-how-title">
          <h2 id="venue-how-title" className={styles.h2}>
            Как купить билет в {copy.h1}
          </h2>
          <ol className={styles.steps}>
            <li>Выберите спектакль или концерт в афише выше.</li>
            <li>Откройте карточку, выберите места на схеме зала.</li>
            <li>Оплатите онлайн — электронный билет придёт на e-mail.</li>
          </ol>
          <p className={styles.seoNote}>
            Это неофициальная витрина продажи билетов. Возврат и обмен — по правилам организатора; детали на странице{' '}
            <Link to="/returns">«Возврат и обмен»</Link>.
          </p>
        </section>

        {copy.faq?.length > 0 && (
          <section className={styles.faq} aria-labelledby="venue-faq-title">
            <h2 id="venue-faq-title" className={styles.h2}>
              Частые вопросы
            </h2>
            <div className={styles.faqList}>
              {copy.faq.map((item) => (
                <details key={item.q} className={styles.faqItem}>
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
