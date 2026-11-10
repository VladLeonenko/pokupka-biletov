import { useEffect, useMemo, useRef, useState, useCallback, type CSSProperties, type FormEvent } from 'react';
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
  fetchMinPrices,
  fetchVenueReviews,
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
  buildVenueLandingList,
} from '@/utils/venueSlug';
import { buildVenueLandingCopy } from '@/utils/venueLandingCopy';
import { resolveVenueCoverUrl, VENUE_COVER_FALLBACK } from '@/data/venueBuildingCovers';
import { ratingZone } from '@/utils/eventRating';
import { OPERATOR } from '@/utils/operatorLegalInfo';
import { submitForm } from '@/services/cmsApi';
import styles from './VenueLandingPage.module.css';

const PAGE_SIZE = 24;

function formatReviewDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function VenueLandingPage() {
  const { venueSlug = '' } = useParams();
  const cityId = useTicketsCityId();
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [cbName, setCbName] = useState('');
  const [cbPhone, setCbPhone] = useState('');
  const [cbBusy, setCbBusy] = useState(false);
  const [cbMsg, setCbMsg] = useState<string | null>(null);

  useEffect(() => {
    document.body.setAttribute('data-page', '/events/venue');
    return () => document.body.removeAttribute('data-page');
  }, []);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    setCbMsg(null);
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

  const repertoireIds = useMemo(() => {
    const ids: string[] = [];
    for (const ev of uniqueEvents.slice(0, 12)) {
      const id = String(ev.repertoireId || ev.id || '').trim();
      if (id && !ids.includes(id)) ids.push(id);
    }
    return ids;
  }, [uniqueEvents]);

  const { data: minPricesRes } = useQuery({
    queryKey: ['venue-min-prices', venueSlug, repertoireIds.join(',')],
    queryFn: () => fetchMinPrices(repertoireIds),
    enabled: repertoireIds.length > 0,
    staleTime: 180_000,
    retry: 1,
  });

  const { data: reviewsRes } = useQuery({
    queryKey: ['venue-reviews', venueSlug, venueName],
    queryFn: () =>
      fetchVenueReviews({
        venue: venueName || undefined,
        slug: canonicalizeVenueSlug(venueSlug) || venueSlug,
        limit: 8,
      }),
    enabled: Boolean(venueName || venueSlug),
    staleTime: 180_000,
    retry: 1,
  });

  const topShows = useMemo(
    () => uniqueEvents.slice(0, 3).map((e) => e.title).filter(Boolean),
    [uniqueEvents],
  );

  const venueCoverUrl = useMemo(
    () => resolveVenueCoverUrl(canonicalizeVenueSlug(venueSlug) || venueSlug),
    [venueSlug],
  );

  /** OG / hero: здание площадки, не афиша случайного спектакля. */
  const ogImage = venueCoverUrl;

  const similarVenues = useMemo(() => {
    const cityHint = (venueAddress || '').includes('Санкт-Петербург')
      ? 'Санкт-Петербург'
      : 'Москва';
    const list = buildVenueLandingList(venueNames).filter((v) => {
      if (canonicalizeVenueSlug(v.slug) === canonicalizeVenueSlug(venueSlug)) return false;
      const sample = allEvents.find((e) => e.venue === v.label);
      const addr = sample?.venueAddress || '';
      if (cityHint === 'Санкт-Петербург') return addr.includes('Санкт-Петербург');
      return !addr.includes('Санкт-Петербург');
    });
    return list.slice(0, 6);
  }, [venueNames, venueSlug, allEvents, venueAddress]);

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
        minPrice: minPricesRes?.minPrice ?? null,
        eventCount: uniqueEvents.length,
        topShows,
      }),
    [venueName, venueSlug, venueAddress, minPricesRes?.minPrice, uniqueEvents.length, topShows],
  );

  const path = `/events/venue/${venueSlug}`;
  const jsonLd = useMemo(() => {
    const placeName = venueName || copy.h1;
    const place: Record<string, unknown> = {
      '@type': 'Place',
      name: placeName,
      ...(venueAddress || copy.address ? { address: venueAddress || copy.address } : {}),
      url: `${origin}${path}`,
    };
    if (reviewsRes?.score != null && reviewsRes.count > 0) {
      place.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: reviewsRes.score,
        bestRating: 10,
        worstRating: 0,
        ratingCount: reviewsRes.count,
      };
      if (reviewsRes.reviews?.length) {
        place.review = reviewsRes.reviews.slice(0, 5).map((rev) => ({
          '@type': 'Review',
          reviewRating: { '@type': 'Rating', ratingValue: rev.stars, bestRating: 5 },
          author: { '@type': 'Person', name: rev.author },
          reviewBody: rev.body,
        }));
      }
    }
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
        place,
        {
          '@type': 'CollectionPage',
          name: copy.title,
          description: copy.description,
          url: `${origin}${path}`,
          about: { '@type': 'Place', name: placeName },
        },
      ],
    };
  }, [origin, path, venueName, venueAddress, copy, reviewsRes]);

  const showSkeleton = isLoading && !raw;

  const onCallback = async (e: FormEvent) => {
    e.preventDefault();
    if (cbBusy) return;
    const phone = cbPhone.trim();
    if (phone.replace(/\D/g, '').length < 10) {
      setCbMsg('Укажите телефон');
      return;
    }
    setCbBusy(true);
    setCbMsg(null);
    try {
      await submitForm('venue-callback', {
        name: cbName.trim() || 'Зритель',
        phone,
        tel: phone,
        venue: venueName || venueSlug,
        page_path: path,
      });
      setCbMsg('Заявка принята — перезвоним в рабочие часы.');
      setCbName('');
      setCbPhone('');
    } catch {
      setCbMsg('Не удалось отправить. Позвоните нам напрямую.');
    } finally {
      setCbBusy(false);
    }
  };

  const firstTicketHref =
    uniqueEvents[0] && venueName
      ? `/ticket/${encodeURIComponent(String(uniqueEvents[0].repertoireId || uniqueEvents[0].id))}`
      : '/events';

  return (
    <>
      <SeoMetaTags
        title={copy.title}
        description={copy.description}
        keywords={copy.keywords}
        url={`${origin}${path}`}
        image={ogImage}
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
          <div className={styles.heroVisual}>
            <img
              src={venueCoverUrl}
              alt=""
              className={styles.heroImg}
              loading="eager"
              decoding="async"
              onError={(e) => {
                const el = e.currentTarget;
                if (el.src !== VENUE_COVER_FALLBACK) el.src = VENUE_COVER_FALLBACK;
              }}
            />
          </div>
          <div className={styles.heroCopy}>
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

          <p className={styles.trustRow} aria-label="Преимущества">
            Электронный билет · Схема зала · Поддержка
          </p>

          <div className={styles.heroCta}>
            <a className={styles.phoneBtn} href={`tel:${OPERATOR.phoneTel}`}>
              {OPERATOR.phone}
            </a>
            <span className={styles.hours}>{OPERATOR.hours}</span>
          </div>

          <form className={styles.callback} onSubmit={onCallback}>
            <p className={styles.callbackTitle}>Перезвоните мне</p>
            <div className={styles.callbackRow}>
              <input
                className={styles.input}
                name="name"
                placeholder="Имя"
                value={cbName}
                onChange={(ev) => setCbName(ev.target.value)}
                autoComplete="name"
              />
              <input
                className={styles.input}
                name="phone"
                placeholder="Телефон"
                value={cbPhone}
                onChange={(ev) => setCbPhone(ev.target.value)}
                autoComplete="tel"
                required
              />
              <button type="submit" className={styles.callbackBtn} disabled={cbBusy}>
                {cbBusy ? '…' : 'Жду звонка'}
              </button>
            </div>
            {cbMsg ? <p className={styles.callbackMsg}>{cbMsg}</p> : null}
          </form>

          <div className={styles.heroLinks}>
            <Link to="/events/venues" className={styles.link}>
              Все площадки →
            </Link>
            <Link to="/events" className={styles.link}>
              Общая афиша →
            </Link>
          </div>
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

        <section className={styles.reviews} aria-labelledby="venue-reviews-title">
          <h2 id="venue-reviews-title" className={styles.h2}>
            Отзывы о событиях на площадке
          </h2>
          <div className={styles.reviewsLayout}>
            <div className={styles.reviewsAside}>
              {reviewsRes?.scoreLabel && reviewsRes.zone ? (
                <div className={styles.reviewsScoreRow}>
                  <span className={`${styles.reviewsScoreBadge} ${styles[`zone_${reviewsRes.zone}`]}`}>
                    ★ {reviewsRes.scoreLabel}
                  </span>
                  <span className={styles.reviewsScoreMeta}>
                    {reviewsRes.count}{' '}
                    {reviewsRes.count === 1 ? 'отзыв' : reviewsRes.count < 5 ? 'отзыва' : 'отзывов'}
                  </span>
                </div>
              ) : null}
              <p className={styles.reviewsHint}>
                Публикуем только проверенные отзывы зрителей (со сканом билета) и редакционные
                материалы. Оставить отзыв можно на странице конкретного события.
              </p>
              {uniqueEvents[0] ? (
                <Link to={firstTicketHref} className={styles.link}>
                  Оставить отзыв к событию →
                </Link>
              ) : null}
            </div>
            <div className={styles.reviewsList}>
              {reviewsRes?.reviews?.length ? (
                reviewsRes.reviews.map((rev) => (
                  <article key={rev.id} className={styles.reviewCard}>
                    <div
                      className={styles.reviewStars}
                      aria-label={`${rev.stars} из 5`}
                      style={
                        {
                          '--star-color':
                            ratingZone(rev.stars * 2) === 'green'
                              ? '#2fbf5a'
                              : ratingZone(rev.stars * 2) === 'yellow'
                                ? '#e6b800'
                                : ratingZone(rev.stars * 2) === 'orange'
                                  ? '#f09020'
                                  : '#e23b2f',
                        } as CSSProperties
                      }
                    >
                      {'★★★★★'.slice(0, rev.stars)}
                      <span className={styles.reviewStarsEmpty}>{'★★★★★'.slice(rev.stars)}</span>
                    </div>
                    {rev.ticketVerified ? (
                      <span className={styles.verifiedBadge}>Билет проверен</span>
                    ) : null}
                    {rev.eventTitle ? <p className={styles.reviewEvent}>{rev.eventTitle}</p> : null}
                    <p className={styles.reviewBody}>{rev.body}</p>
                    <div className={styles.reviewMeta}>
                      <span>{rev.author}</span>
                      <span>{formatReviewDate(rev.reviewedOn || rev.createdAt)}</span>
                    </div>
                  </article>
                ))
              ) : (
                <p className={styles.emptyReviews}>
                  Пока нет опубликованных отзывов по этой площадке. Станьте первым — откройте
                  событие и приложите билет к отзыву.
                </p>
              )}
            </div>
          </div>
        </section>

        {similarVenues.length > 0 && (
          <section className={styles.similar} aria-labelledby="venue-similar-title">
            <h2 id="venue-similar-title" className={styles.h2}>
              Похожие площадки
            </h2>
            <ul className={styles.similarList}>
              {similarVenues.map((v) => (
                <li key={v.slug}>
                  <Link to={`/events/venue/${v.slug}`}>{v.label}</Link>
                </li>
              ))}
            </ul>
          </section>
        )}

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
            Это неофициальная витрина продажи билетов. Возврат и обмен — по правилам организатора;
            детали на странице <Link to="/returns">«Возврат и обмен»</Link>. Тел.{' '}
            <a href={`tel:${OPERATOR.phoneTel}`}>{OPERATOR.phone}</a>.
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
