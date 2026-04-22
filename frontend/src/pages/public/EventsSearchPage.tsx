import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  TextField,
  MenuItem,
  Box,
  CircularProgress,
  Chip,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { EventPosterCard } from '@/components/tickets/EventPosterCard';
import { NEGLINKA_DEMO_EVENTS } from '@/components/tickets/neglinkaDemoData';
import {
  attachInferredEventFields,
  dedupeBiletEventsByShow,
  fetchBiletEvents,
  fetchBiletVenues,
  normalizeBiletEventsPayload,
  normalizeVenuesPayload,
  filterEventsClient,
  uniqueVenuesFromEvents,
} from '@/services/biletPublicApi';
import styles from './EventsSearchPage.module.css';
import {
  MHT_CHEKHOV_MAIN_STAGE_ID,
  MHT_MAIN_HALL_SCHEME_SVG_PATH,
} from '@/constants/getbiletStages';
import { useTicketsCityId } from '@/hooks/useTicketsCityId';

const GENRE_CHIPS = ['Театр', 'Концерт', 'Драма', 'Комедия', 'Детям', 'Спорт'];

export function EventsSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const qUrl = searchParams.get('q') ?? '';
  const venueUrl = searchParams.get('venue') ?? '';
  const genreUrl = searchParams.get('genre') ?? '';
  const stageUrl = searchParams.get('stageId') ?? '';

  const [qInput, setQInput] = useState(qUrl);
  const [venueInput, setVenueInput] = useState(venueUrl);

  useEffect(() => {
    setQInput(qUrl);
    setVenueInput(venueUrl);
  }, [qUrl, venueUrl]);

  useEffect(() => {
    document.body.setAttribute('data-page', '/events');
  }, []);

  const cityId = useTicketsCityId();

  const { data: raw, isLoading, isError } = useQuery({
    queryKey: ['bilet-events-public', cityId],
    queryFn: () => fetchBiletEvents(),
    staleTime: 60_000,
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
    if (isError) return NEGLINKA_DEMO_EVENTS.map(attachInferredEventFields);
    return normalizeBiletEventsPayload(raw);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (qInput.trim()) p.set('q', qInput.trim());
    if (venueInput.trim()) p.set('venue', venueInput.trim());
    if (genreUrl.trim()) p.set('genre', genreUrl.trim());
    if (stageUrl.trim()) p.set('stageId', stageUrl.trim());
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

  return (
    <>
      <SeoMetaTags
        title="Поиск мероприятий"
        description="Поиск событий по названию, площадке и жанру."
        url={`${origin}/events`}
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
              setStageFilter(stageUrl === MHT_CHEKHOV_MAIN_STAGE_ID ? null : MHT_CHEKHOV_MAIN_STAGE_ID)
            }
            sx={{
              bgcolor: stageUrl === MHT_CHEKHOV_MAIN_STAGE_ID ? 'var(--neg-orange, #ff4e18)' : 'rgba(0,0,0,0.06)',
              color: stageUrl === MHT_CHEKHOV_MAIN_STAGE_ID ? '#fff' : '#111',
              border: stageUrl === MHT_CHEKHOV_MAIN_STAGE_ID ? 'none' : '1px solid rgba(0,0,0,0.1)',
              fontWeight: 700,
              '&:hover': {
                bgcolor: stageUrl === MHT_CHEKHOV_MAIN_STAGE_ID ? '#e64514' : 'rgba(0,0,0,0.09)',
              },
            }}
          />
          {stageUrl === MHT_CHEKHOV_MAIN_STAGE_ID && (
            <a
              className={styles.hallSchemeLink}
              href={MHT_MAIN_HALL_SCHEME_SVG_PATH}
              target="_blank"
              rel="noopener noreferrer"
            >
              Схема зала
            </a>
          )}
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

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={36} sx={{ color: 'var(--neg-orange, #ff4e18)' }} />
          </Box>
        )}

        {isError && !isLoading && (
          <p className={styles.warn}>
            Не удалось загрузить список из GetBilet — показан <strong>демо-каталог</strong> для проверки
            вёрстки.
          </p>
        )}

        {!isLoading && (
          <p className={styles.count}>
            Найдено: {uniqueFiltered.length} из {uniqueCatalogTotal.length}
          </p>
        )}

        {!isLoading && uniqueFiltered.length === 0 && (
          <p className={styles.empty}>
            {isError
              ? 'Нет результатов с такими фильтрами — очистите поля поиска.'
              : 'Ничего не найдено — смените запрос или сбросьте фильтры.'}
          </p>
        )}

        {!isLoading && uniqueFiltered.length > 0 && (
          <div className={styles.grid}>
            {uniqueFiltered.map((ev) => (
              <EventPosterCard key={ev.id} event={ev} />
            ))}
          </div>
        )}
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
