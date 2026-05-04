import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  readBiletEventsSessionCache,
  writeBiletEventsSessionCache,
} from '@/utils/biletEventsSessionCache';
import { format, parseISO, isValid } from 'date-fns';
import { ru } from 'date-fns/locale';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { TicketsHomeSections } from '@/components/tickets/TicketsHomeSections';
import { NEGLINKA_DEMO_EVENTS } from '@/components/tickets/neglinkaDemoData';
import {
  attachInferredEventFields,
  dedupeBiletEventsByShow,
  fetchBiletHome,
  fetchBiletEventsLite,
  normalizeBiletEventsPayload,
  type NormalizedBiletEvent,
} from '@/services/biletPublicApi';
import { fetchPublicTicketsVitrine } from '@/services/ticketsVitrineApi';
import { mergeTicketsVitrine } from '@/utils/ticketsVitrineDefaults';
import { directionsForHomeCarousels } from '@/utils/ticketsDirectionsFilter';
import { buildHeroSlides } from '@/utils/buildHeroSlides';
import { useTicketsCityId } from '@/hooks/useTicketsCityId';

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

  const { data: rawSportLite } = useQuery({
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

  const normalized = useMemo(() => normalizeBiletEventsPayload(raw), [raw]);
  const normalizedSportLite = useMemo(() => normalizeBiletEventsPayload(rawSportLite), [rawSportLite]);

  const filtered = useMemo(() => {
    if (!dateFilter) return normalized;
    return normalized.filter((e) => {
      if (e.isoDate?.startsWith(dateFilter)) return true;
      return false;
    });
  }, [normalized, dateFilter]);

  const displayEvents = useMemo((): NormalizedBiletEvent[] => {
    if (eventsPending) return [];
    if (isError) return NEGLINKA_DEMO_EVENTS.map(attachInferredEventFields);
    if (normalized.length === 0) return NEGLINKA_DEMO_EVENTS.map(attachInferredEventFields);
    if (dateFilter) return filtered;
    return normalized;
  }, [eventsPending, isError, normalized, dateFilter, filtered]);

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
    !isError &&
    normalized.length > 0 &&
    dateFilter &&
    filtered.length === 0;

  const eventsForUi = useMemo(() => {
    if (emptyDateFilter) return [];
    return dedupeBiletEventsByShow(displayEvents);
  }, [emptyDateFilter, displayEvents]);

  const sportEventsForUi = useMemo(() => {
    const source = dateFilter
      ? normalizedSportLite.filter((e) => e.isoDate?.startsWith(dateFilter))
      : normalizedSportLite;
    return dedupeBiletEventsByShow(source);
  }, [dateFilter, normalizedSportLite]);

  const heroSlides = useMemo(
    () => buildHeroSlides(vitrine.heroSlides, eventsForUi),
    [vitrine.heroSlides, eventsForUi]
  );

  /** Пока грузится витрина — не решаем, есть ли CMS hero; затем hero либо из CMS, либо ждём афишу. */
  const heroLoading =
    vitrinePending || ((vitrine.heroSlides?.length ?? 0) === 0 && eventsPending);
  const listLoading = eventsPending;

  return (
    <>
      <SeoMetaTags
        title="Афиша — билеты на мероприятия"
        description="Календарь событий, поиск по площадкам и жанрам. Покупка билетов онлайн."
        keywords="билеты, афиша, театр, концерт, спорт, мероприятия"
        url={`${origin}/`}
      />

      <TicketsHomeSections
        heroSlides={heroSlides}
        events={eventsForUi}
        sportEvents={sportEventsForUi}
        directions={directionsForHomeCarousels(vitrine.directions)}
        heroLoading={heroLoading}
        listLoading={listLoading}
        selectedDateLabel={dateFilter ? selectedDateLabel : null}
      />
    </>
  );
}
