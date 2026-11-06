import { useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  readBiletEventsSessionCache,
  writeBiletEventsSessionCache,
} from '@/utils/biletEventsSessionCache';
import { format, parseISO, isValid } from 'date-fns';
import { ru } from 'date-fns/locale';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import {
  AFISHA_DATE_RESULTS_ID,
  TicketsHomeSections,
} from '@/components/tickets/TicketsHomeSections';
import {
  dedupeBiletEventsByShow,
  fetchBiletHome,
  fetchBiletEventsLite,
  isEventActual,
  normalizeBiletEventsPayload,
  type NormalizedBiletEvent,
} from '@/services/biletPublicApi';
import { fetchPublicTicketsVitrine } from '@/services/ticketsVitrineApi';
import { mergeTicketsVitrine } from '@/utils/ticketsVitrineDefaults';
import { directionsForHomeCarousels } from '@/utils/ticketsDirectionsFilter';
import { buildHeroSlides } from '@/utils/buildHeroSlides';
import { useTicketsCityId } from '@/hooks/useTicketsCityId';
import { useTicketRecentRepertoires } from '@/hooks/useTicketRecentRepertoires';

export function HomePage() {
  const [searchParams] = useSearchParams();
  const dateFilter = searchParams.get('date');

  useEffect(() => {
    document.body.setAttribute('data-page', '/');
  }, []);

  const cityId = useTicketsCityId();

  const sessionEvents = useMemo(() => readBiletEventsSessionCache(cityId), [cityId]);

  const { data: raw, isPending: eventsPending, isError } = useQuery({
    queryKey: ['bilet-home-public', cityId],
    queryFn: () => fetchBiletHome(),
    staleTime: 120_000,
    gcTime: 30 * 60_000,
    retry: 1,
    initialData: sessionEvents?.data,
    initialDataUpdatedAt: sessionEvents?.updatedAt,
  });

  /** Полный lite-каталог: фильтр по дате и спорт — не урезанный /home (≤120). */
  const { data: rawSportLite, isPending: sportEventsPending } = useQuery({
    queryKey: ['bilet-events-lite-public', cityId, 'sport-home'],
    queryFn: () => fetchBiletEventsLite(500),
    staleTime: 120_000,
    gcTime: 30 * 60_000,
    retry: 1,
  });

  useEffect(() => {
    if (raw != null) writeBiletEventsSessionCache(raw, cityId);
  }, [raw, cityId]);

  const { data: vitrineRes, isPending: vitrinePending } = useQuery({
    queryKey: ['tickets-vitrine'],
    queryFn: fetchPublicTicketsVitrine,
    staleTime: 120_000,
  });

  const vitrine = useMemo(() => mergeTicketsVitrine(vitrineRes?.content), [vitrineRes]);

  const normalized = useMemo(
    () => normalizeBiletEventsPayload(raw).filter(isEventActual),
    [raw],
  );
  const normalizedSportLite = useMemo(
    () => normalizeBiletEventsPayload(rawSportLite).filter(isEventActual),
    [rawSportLite],
  );

  /** По дате — весь lite (иначе «одно событие» из урезанного home). */
  const catalogForDate = useMemo(() => {
    const byId = new Map<string, NormalizedBiletEvent>();
    for (const e of [...normalizedSportLite, ...normalized]) {
      byId.set(e.id, e);
    }
    return Array.from(byId.values());
  }, [normalized, normalizedSportLite]);

  const filtered = useMemo(() => {
    if (!dateFilter) return normalized;
    return catalogForDate.filter((e) => {
      if (e.isoDate?.startsWith(dateFilter)) return true;
      return false;
    });
  }, [normalized, catalogForDate, dateFilter]);

  const displayEvents = useMemo((): NormalizedBiletEvent[] => {
    const pending = dateFilter
      ? eventsPending && sportEventsPending
      : eventsPending && sportEventsPending;
    if (pending || isError) return [];
    if (dateFilter) return filtered;
    // Рубрики/ленты — полный lite+home, не урезанный /home (≤120), иначе «Большой театр» = 1 карточка
    return catalogForDate;
  }, [
    eventsPending,
    sportEventsPending,
    isError,
    normalized,
    catalogForDate,
    dateFilter,
    filtered,
  ]);
  const recentIds = useTicketRecentRepertoires(undefined);
  const recentEvents = useMemo(() => {
    if (recentIds.length === 0) return [];
    const pool = dedupeBiletEventsByShow([...normalized, ...normalizedSportLite]);
    const out: NormalizedBiletEvent[] = [];
    for (const rid of recentIds) {
      const hit = pool.find(
        (e) => e.repertoireId === rid || e.id === rid || e.id.startsWith(`${rid}:`),
      );
      if (hit) out.push(hit);
      if (out.length >= 8) break;
    }
    return out;
  }, [recentIds, normalized, normalizedSportLite]);

  const selectedDateLabel = useMemo(() => {
    if (!dateFilter) return null;
    try {
      if (/^\d{4}-\d{2}$/.test(dateFilter)) {
        const d = parseISO(`${dateFilter}-01`);
        if (!isValid(d)) return dateFilter;
        return format(d, 'LLLL yyyy', { locale: ru });
      }
      const d = parseISO(dateFilter);
      if (!isValid(d)) return dateFilter;
      return format(d, 'd MMMM yyyy', { locale: ru });
    } catch {
      return dateFilter;
    }
  }, [dateFilter]);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const emptyDateFilter =
    !eventsPending &&
    !sportEventsPending &&
    !isError &&
    catalogForDate.length > 0 &&
    Boolean(dateFilter) &&
    filtered.length === 0;

  const eventsForUi = useMemo(() => {
    if (emptyDateFilter) return [];
    // По дате не схлопываем сеансы одного спектакля в одну карточку раньше списка —
    // dedupe ок, но режем лимит только без фильтра даты (см. TicketsHomeSections).
    return dedupeBiletEventsByShow(displayEvents);
  }, [emptyDateFilter, displayEvents]);

  const sportEventsForUi = useMemo(() => {
    const source = dateFilter
      ? normalizedSportLite.filter((e) => e.isoDate?.startsWith(dateFilter))
      : normalizedSportLite;
    return dedupeBiletEventsByShow(source);
  }, [dateFilter, normalizedSportLite]);

  const eventsForHero = useMemo(
    () => dedupeBiletEventsByShow([...eventsForUi, ...sportEventsForUi]),
    [eventsForUi, sportEventsForUi],
  );

  const heroSlides = useMemo(
    () => buildHeroSlides(vitrine.heroSlides, eventsForHero),
    [vitrine.heroSlides, eventsForHero],
  );

  /** Пока грузится витрина — не решаем, есть ли CMS hero; затем hero либо из CMS, либо ждём афишу (+ lite для спорта). */
  const heroLoading =
    vitrinePending ||
    ((vitrine.heroSlides?.length ?? 0) === 0 && (eventsPending || sportEventsPending));
  const listLoading = eventsPending || sportEventsPending;
  const scrolledForDateRef = useRef<string | null>(null);

  useEffect(() => {
    if (!dateFilter) {
      scrolledForDateRef.current = null;
      return;
    }
    if (listLoading) return;
    if (scrolledForDateRef.current === dateFilter) return;
    scrolledForDateRef.current = dateFilter;
    const el = document.getElementById(AFISHA_DATE_RESULTS_ID);
    if (!el) return;

    let raf = 0;
    const t = window.setTimeout(() => {
      const header = document.querySelector<HTMLElement>('[data-tickets-nav]');
      const headerH = header?.getBoundingClientRect().height ?? 120;
      // sticky-хедер + небольшой зазор; без этого уезжаем ~100px ниже нужного
      const offset = Math.round(headerH + 12);
      const startY = window.scrollY;
      const targetY = Math.max(0, el.getBoundingClientRect().top + window.scrollY - offset);
      const dist = targetY - startY;
      if (Math.abs(dist) < 2) return;
      const durationMs = Math.min(1100, Math.max(520, Math.abs(dist) * 0.55));
      const t0 = performance.now();
      const easeInOutCubic = (p: number) =>
        p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / durationMs);
        window.scrollTo(0, startY + dist * easeInOutCubic(p));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, 80);

    return () => {
      window.clearTimeout(t);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [dateFilter, listLoading, eventsForUi.length]);

  return (
    <>
      <SeoMetaTags
        title="Билеты на концерты, театр и шоу - афиша и лучшие места"
        description="Актуальная афиша мероприятий, удобный выбор мест и покупка билетов онлайн за пару минут."
        keywords="билеты, афиша, театр, концерт, спорт, мероприятия"
        url={`${origin}/`}
      />

      <TicketsHomeSections
        heroSlides={heroSlides}
        events={eventsForUi}
        sportEvents={sportEventsForUi}
        recentEvents={dateFilter ? [] : recentEvents}
        directions={dateFilter ? [] : directionsForHomeCarousels(vitrine.directions)}
        heroLoading={heroLoading}
        listLoading={listLoading}
        catalogError={isError}
        selectedDateLabel={dateFilter ? selectedDateLabel : null}
        dateFilterActive={Boolean(dateFilter)}
        telegramUrl={vitrine.contacts?.telegramUrl}
        vkUrl={vitrine.contacts?.vkUrl}
      />
    </>
  );
}
