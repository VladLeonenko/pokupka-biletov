import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  TextField,
  MenuItem,
  Chip,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { EventPosterCard } from '@/components/tickets/EventPosterCard';
import {
  BILET_EVENTS_LITE_LIMIT,
  biletEventsLiteQueryKey,
  dedupeBiletEventsByShow,
  fetchBiletEventsLite,
  fetchBiletVenues,
  isEventActual,
  normalizeBiletEventsPayload,
  normalizeVenuesPayload,
  filterEventsClient,
  uniqueVenuesFromEvents,
} from '@/services/biletPublicApi';
import styles from './EventsSearchPage.module.css';
import {
  MHT_CHEKHOV_MAIN_STAGE_ID,
  MHT_CHEKHOV_MAIN_STAGE_ID_ALIASES,
} from '@/constants/getbiletStages';
import { useTicketsCityId } from '@/hooks/useTicketsCityId';

const GENRE_CHIPS = ['Театр', 'Концерт', 'Драма', 'Комедия', 'Детям', 'Спорт'];
const LANDING_CITIES = [
  { slug: 'moskva', label: 'Москва' },
  { slug: 'sankt-peterburg', label: 'Санкт-Петербург' },
  { slug: 'kazan', label: 'Казань' },
  { slug: 'ekaterinburg', label: 'Екатеринбург' },
  { slug: 'novosibirsk', label: 'Новосибирск' },
];
const LANDING_GENRES = [
  { slug: 'teatr', label: 'Театр' },
  { slug: 'koncert', label: 'Концерт' },
  { slug: 'komediya', label: 'Комедия' },
  { slug: 'detyam', label: 'Детям' },
  { slug: 'sport', label: 'Спорт' },
];
const LANDING_VENUES = [
  { slug: 'teatr-na-taganke', label: 'Театр на Таганке' },
  { slug: 'mht-chehova', label: 'МХТ Чехова' },
  { slug: 'krokus-siti-holl', label: 'Крокус Сити Холл' },
  { slug: 'vtb-arena', label: 'ВТБ Арена' },
];

const LANDING_CITY_TO_Q: Record<string, string> = {
  moskva: 'Москва',
  'sankt-peterburg': 'Санкт-Петербург',
  kazan: 'Казань',
  ekaterinburg: 'Екатеринбург',
  novosibirsk: 'Новосибирск',
};
const LANDING_GENRE_TO_FILTER: Record<string, string> = {
  teatr: 'Театр',
  koncert: 'Концерт',
  komediya: 'Комедия',
  detyam: 'Детям',
  sport: 'Спорт',
};
const LANDING_VENUE_TO_FILTER: Record<string, string> = {
  'teatr-na-taganke': 'Театр на Таганке',
  'mht-chehova': 'МХТ Чехова',
  'krokus-siti-holl': 'Крокус Сити Холл',
  'vtb-arena': 'ВТБ Арена',
};

/** Первая порция + догрузка при скролле (не монтируем сотни карточек сразу). */
const PAGE_SIZE = 24;

export function EventsSearchPage() {
  const { citySlug, genreSlug, venueSlug } = useParams();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const qUrl = searchParams.get('q') ?? '';
  const venueUrl = searchParams.get('venue') ?? '';
  const genreUrl = searchParams.get('genre') ?? '';
  const stageUrl = searchParams.get('stageId') ?? '';

  const [qInput, setQInput] = useState(qUrl);
  const [venueInput, setVenueInput] = useState(venueUrl);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setQInput(qUrl);
    setVenueInput(venueUrl);
  }, [qUrl, venueUrl]);

  useEffect(() => {
    document.body.setAttribute('data-page', '/events');
  }, []);

  useEffect(() => {
    if (!citySlug && !genreSlug && !venueSlug) return;
    const next = new URLSearchParams(searchParams);
    if (citySlug) {
      const cityQuery = LANDING_CITY_TO_Q[citySlug] || '';
      if (cityQuery) next.set('q', cityQuery);
    }
    if (genreSlug) {
      const genreFilter = LANDING_GENRE_TO_FILTER[genreSlug] || '';
      if (genreFilter) next.set('genre', genreFilter);
    }
    if (venueSlug) {
      const venueFilter = LANDING_VENUE_TO_FILTER[venueSlug] || '';
      if (venueFilter) next.set('venue', venueFilter);
    }
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [citySlug, genreSlug, venueSlug, searchParams, setSearchParams]);

  const cityId = useTicketsCityId();

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
  const apiVenues = useMemo(() => {
    if (!venuesRaw) return [];
    return normalizeVenuesPayload(venuesRaw);
  }, [venuesRaw]);

  const venueOptions = useMemo(() => {
    const fromEvents = uniqueVenuesFromEvents(allEvents);
    const fromApi = apiVenues.map((v) => v.name);
    return Array.from(new Set([...fromApi, ...fromEvents])).sort((a, b) =>
      a.localeCompare(b, 'ru'),
    );
  }, [allEvents, apiVenues]);

  const filtered = useMemo(
    () =>
      filterEventsClient(allEvents, {
        q: qUrl || undefined,
        venue: venueUrl || undefined,
        genre: genreUrl || undefined,
        stageId: stageUrl || undefined,
      }),
    [allEvents, qUrl, venueUrl, genreUrl, stageUrl],
  );

  const uniqueFiltered = useMemo(() => dedupeBiletEventsByShow(filtered), [filtered]);
  const uniqueCatalogTotal = useMemo(() => dedupeBiletEventsByShow(allEvents), [allEvents]);

  // Сброс окна при смене фильтра
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [qUrl, venueUrl, genreUrl, stageUrl, citySlug, genreSlug, venueSlug]);

  const visibleEvents = useMemo(
    () => uniqueFiltered.slice(0, visibleCount),
    [uniqueFiltered, visibleCount],
  );
  const hasMore = visibleCount < uniqueFiltered.length;

  const loadMore = useCallback(() => {
    setVisibleCount((n) => Math.min(n + PAGE_SIZE, uniqueFiltered.length));
  }, [uniqueFiltered.length]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (qInput.trim()) p.set('q', qInput.trim());
    if (venueInput.trim()) p.set('venue', venueInput.trim());
    if (genreUrl.trim()) p.set('genre', genreUrl.trim());
    if (!qInput.trim() && stageUrl.trim()) p.set('stageId', stageUrl.trim());
    setSearchParams(p, { replace: true });
  };

  const setStageFilter = (id: string | null) => {
    const p = new URLSearchParams(searchParams);
    if (id) p.set('stageId', id);
    else p.delete('stageId');
    setSearchParams(p, { replace: true });
  };

  const toggleGenre = (g: string) => {
    const p = new URLSearchParams(searchParams);
    if (p.get('genre') === g) {
      p.delete('genre');
    } else {
      p.set('genre', g);
    }
    setSearchParams(p, { replace: true });
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const seo = useMemo(() => {
    if (citySlug && LANDING_CITY_TO_Q[citySlug]) {
      const city = LANDING_CITY_TO_Q[citySlug];
      return {
        title: `Афиша ${city} — билеты на мероприятия`,
        description: `События в ${city}: театр, концерты и шоу с онлайн-покупкой билетов.`,
      };
    }
    if (genreSlug && LANDING_GENRE_TO_FILTER[genreSlug]) {
      const genre = LANDING_GENRE_TO_FILTER[genreSlug];
      return {
        title: `${genre} — афиша и билеты`,
        description: `Подборка событий в жанре «${genre}»: актуальные мероприятия и покупка билетов онлайн.`,
      };
    }
    if (venueSlug && LANDING_VENUE_TO_FILTER[venueSlug]) {
      const venue = LANDING_VENUE_TO_FILTER[venueSlug];
      return {
        title: `${venue} — афиша площадки и билеты`,
        description: `Расписание событий на площадке «${venue}», выбор мест и покупка билетов онлайн.`,
      };
    }
    return {
      title: 'Поиск мероприятий',
      description: 'Поиск событий по названию, площадке и жанру.',
    };
  }, [citySlug, genreSlug, venueSlug]);

  const showInitialSkeleton = isLoading && !raw;

  return (
    <>
      <SeoMetaTags
        title={seo.title}
        description={seo.description}
        url={`${origin}${location.pathname}`}
      />

      <main className={styles.main}>
        <header className={styles.header}>
          <p className={styles.overline}>Каталог событий</p>
          <h1 className={styles.h1}>Мероприятия</h1>
          <p className={styles.intro}>
            Поиск по названию, площадке и жанру. Быстрые направления в шапке ведут сюда; фильтр
            «Спорт» включает футбол, хоккей, матчи и турниры — в том числе когда в категории из API
            указано «Футбол», а в названии нет слова «спорт».
          </p>
          <Link to="/events/map" className={styles.mapLink}>
            На карте — что рядом на этой неделе →
          </Link>
        </header>

        <form className={styles.filters} onSubmit={handleSubmit}>
          <TextField
            fullWidth
            size="small"
            placeholder="Название, автор, площадка…"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'rgba(0,0,0,0.35)' }} />
                </InputAdornment>
              ),
            }}
            sx={searchFieldSx}
          />
          <TextField
            select
            size="small"
            label="Площадка"
            value={venueInput}
            onChange={(e) => setVenueInput(e.target.value)}
            sx={{ ...fieldSx, flex: { xs: '1 1 100%', sm: '0 0 auto' }, minWidth: { xs: '100%', sm: 220 } }}
          >
            <MenuItem value="">Все площадки</MenuItem>
            {venueOptions.map((name) => (
              <MenuItem key={name} value={name}>
                {name}
              </MenuItem>
            ))}
          </TextField>
          <button type="submit" className={styles.submit}>
            Найти
          </button>
        </form>

        <div className={styles.chips}>
          <span className={styles.chipsLabel}>Зал:</span>
          <Chip
            label="Основной зал МХТ"
            size="small"
            onClick={() =>
              setStageFilter(
                (MHT_CHEKHOV_MAIN_STAGE_ID_ALIASES as readonly string[]).includes(stageUrl)
                  ? null
                  : MHT_CHEKHOV_MAIN_STAGE_ID,
              )
            }
            sx={{
              bgcolor: (MHT_CHEKHOV_MAIN_STAGE_ID_ALIASES as readonly string[]).includes(stageUrl)
                ? 'var(--neg-orange, #ff4e18)'
                : 'rgba(0,0,0,0.06)',
              color: (MHT_CHEKHOV_MAIN_STAGE_ID_ALIASES as readonly string[]).includes(stageUrl)
                ? '#fff'
                : '#111',
              border: (MHT_CHEKHOV_MAIN_STAGE_ID_ALIASES as readonly string[]).includes(stageUrl)
                ? 'none'
                : '1px solid rgba(0,0,0,0.1)',
              fontWeight: 700,
              '&:hover': {
                bgcolor: (MHT_CHEKHOV_MAIN_STAGE_ID_ALIASES as readonly string[]).includes(stageUrl)
                  ? '#e64514'
                  : 'rgba(0,0,0,0.09)',
              },
            }}
          />
        </div>

        {genreUrl === 'Спорт' && (
          <p className={styles.genreHint} role="note">
            В «Спорт» входят события с категорией «Футбол» и другие игровые форматы — отбор по афише и
            названию, не только по полю жанра из билетной системы.
          </p>
        )}

        <div className={styles.chips}>
          <span className={styles.chipsLabel}>Жанр:</span>
          {GENRE_CHIPS.map((g) => (
            <Chip
              key={g}
              label={g}
              size="small"
              onClick={() => toggleGenre(g)}
              sx={{
                bgcolor: genreUrl === g ? 'var(--neg-orange, #ff4e18)' : 'rgba(0,0,0,0.06)',
                color: genreUrl === g ? '#fff' : '#111',
                border: genreUrl === g ? 'none' : '1px solid rgba(0,0,0,0.1)',
                fontWeight: 700,
                '&:hover': {
                  bgcolor: genreUrl === g ? '#e64514' : 'rgba(0,0,0,0.09)',
                },
              }}
            />
          ))}
        </div>

        {showInitialSkeleton && (
          <div className={styles.grid} aria-busy="true" aria-label="Загрузка каталога">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className={styles.cardSkeleton} />
            ))}
          </div>
        )}

        {isError && !isLoading && (
          <p className={styles.warn}>
            Не удалось загрузить афишу. Проверьте соединение и{' '}
            <button type="button" className={styles.retryBtn} onClick={() => window.location.reload()}>
              обновите страницу
            </button>
            .
          </p>
        )}

        {!showInitialSkeleton && !isError && (
          <p className={styles.count}>
            Найдено: {uniqueFiltered.length} из {uniqueCatalogTotal.length}
            {isFetching && uniqueFiltered.length === 0 ? ' · обновляем…' : ''}
          </p>
        )}

        {!showInitialSkeleton && !isError && uniqueFiltered.length === 0 && (
          <p className={styles.empty}>Ничего не найдено — смените запрос или сбросьте фильтры.</p>
        )}

        {!showInitialSkeleton && visibleEvents.length > 0 && (
          <>
            <div className={styles.grid}>
              {visibleEvents.map((ev, i) => (
                <EventPosterCard key={ev.id} event={ev} priority={i < 4} />
              ))}
            </div>
            {hasMore ? (
              <div ref={loadMoreRef} className={styles.loadMoreSentinel} aria-hidden>
                <div className={styles.loadMoreHint}>Загружаем ещё…</div>
              </div>
            ) : (
              <p className={styles.endHint}>Показаны все {uniqueFiltered.length} событий</p>
            )}
          </>
        )}

        <section className={styles.seoLinksSection} aria-labelledby="seo-links-title">
          <h2 id="seo-links-title" className={styles.seoLinksTitle}>
            Популярные подборки
          </h2>
          <p className={styles.seoLinksIntro}>
            Быстрые переходы к тематическим подборкам по городам, жанрам и площадкам.
          </p>
          <div className={styles.seoLinksGrid}>
            <div>
              <p className={styles.seoLinksLabel}>Города</p>
              <div className={styles.seoLinksList}>
                {LANDING_CITIES.map((item) => (
                  <Link key={item.slug} className={styles.seoLink} to={`/events/city/${item.slug}`}>
                    Афиша {item.label}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <p className={styles.seoLinksLabel}>Жанры</p>
              <div className={styles.seoLinksList}>
                {LANDING_GENRES.map((item) => (
                  <Link key={item.slug} className={styles.seoLink} to={`/events/genre/${item.slug}`}>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <p className={styles.seoLinksLabel}>Площадки</p>
              <div className={styles.seoLinksList}>
                {LANDING_VENUES.map((item) => (
                  <Link key={item.slug} className={styles.seoLink} to={`/events/venue/${item.slug}`}>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

const fieldSx = {
  minWidth: 0,
  '& .MuiOutlinedInput-root': {
    bgcolor: '#fff !important',
    color: '#111',
    borderRadius: '8px',
    '& fieldset': { borderColor: 'rgba(0,0,0,0.2)' },
    '&:hover fieldset': { borderColor: 'rgba(0,0,0,0.35)' },
    '&.Mui-focused fieldset': {
      borderColor: 'var(--neg-orange, #ff4e18)',
      borderWidth: '1px',
    },
  },
  '& .MuiInputLabel-root': { color: 'rgba(0,0,0,0.55)' },
  '& .MuiInputBase-input': {
    color: '#111',
  },
};

const searchFieldSx = {
  ...fieldSx,
  flex: '1 1 260px',
  minWidth: { xs: '100%', sm: 200 },
};
