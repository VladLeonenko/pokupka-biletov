import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Slider,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EventSeatIcon from '@mui/icons-material/EventSeat';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { TicketEventPosterImg } from '@/components/tickets/TicketEventPosterImg';
import {
  ensurePublicSessionForCheckout,
  fetchBiletEvents,
  fetchRepertoireContext,
  fetchRepertoireOffers,
  fetchStageMap,
  normalizeBiletEventsPayload,
  type NormalizedBiletEvent,
} from '@/services/biletPublicApi';
import { posterGradientFromId } from '@/utils/ticketsPlaceholders';
import {
  type OfferFilterState,
  filterOffers,
  priceBounds,
  ZONE_OPTIONS,
  type ZoneFilterId,
  type OfferRowLike,
} from '@/utils/ticketOfferFilters';
import { TicketHallInteractiveBlock } from '@/components/tickets/TicketHallInteractiveBlock';
import { TicketPurchaseDialog } from '@/components/tickets/TicketPurchaseDialog';
import { TicketCheckoutPageExtras } from '@/components/tickets/TicketCheckoutPageExtras';
import {
  heroSublineWithoutDuplicateVenue,
  resolveHeroSublineForTicketPage,
} from '@/utils/ticketHeroSubline';
import { slugify } from '@/utils/slugify';
import { submitForm } from '@/services/cmsApi';
import styles from './TicketCheckoutPage.module.css';

const OFFER_ROWS_PREVIEW = 5;

const PRICE_COLORS = ['#1a237e', '#2e7d32', '#f9a825', '#0277bd', '#e65100', '#6a1b9a', '#37474f'];

type OfferRow = {
  Id?: string;
  RepertoireId?: string;
  EventDateTime?: string;
  Sector?: string;
  Row?: string;
  SeatList?: string[];
  NominalPrice?: string;
  AgentPrice?: string;
  PlaceName?: string;
  placeName?: string;
  VenueName?: string;
  venueName?: string;
  StageName?: string;
  stageName?: string;
};

function firstVenueFromOffers(rows: OfferRow[]): string | null {
  for (const o of rows) {
    const cands = [o.PlaceName, o.placeName, o.VenueName, o.venueName, o.StageName, o.stageName];
    for (const v of cands) {
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
  }
  return null;
}

function normalizeSeatList(row: OfferRow): string[] {
  const sl = row.SeatList;
  if (Array.isArray(sl)) return sl.map(String);
  if (typeof sl === 'string' && sl.trim()) {
    return sl
      .split(/[,\s;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function parseOffers(raw: unknown): OfferRow[] {
  if (!raw || typeof raw !== 'object') return [];
  const o = raw as Record<string, unknown>;
  const arr = o.ResultData;
  if (!Array.isArray(arr)) return [];
  return arr.map((row) => {
    if (!row || typeof row !== 'object') return row as OfferRow;
    const r = row as OfferRow;
    return { ...r, SeatList: normalizeSeatList(r) };
  }) as OfferRow[];
}

function priceKey(o: OfferRow): string {
  return String(o.AgentPrice ?? o.NominalPrice ?? '0');
}

function minPriceForOffers(rows: OfferRow[]): number | null {
  const nums = rows.map((r) => Number(priceKey(r))).filter((n) => Number.isFinite(n));
  if (nums.length === 0) return null;
  return Math.min(...nums);
}

function normSessionHintSeg(s: string) {
  return s.replace(/\s+/g, '').trim();
}

function sessionMatchesHint(entryKey: string, hint: string | null | undefined): boolean {
  if (!hint) return false;
  if (entryKey === hint || normSessionHintSeg(entryKey) === normSessionHintSeg(hint)) return true;
  const ta = new Date(entryKey).getTime();
  const tb = new Date(hint).getTime();
  return Number.isFinite(ta) && Number.isFinite(tb) && ta === tb;
}

function formatSessionCard(dt: string): { time: string; dateLine: string } {
  if (dt === '_') return { time: '—', dateLine: 'Дата уточняется' };
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return { time: '—', dateLine: dt };
  return {
    time: d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    dateLine: d
      .toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' })
      .replace(/\.$/, ''),
  };
}

function colorForPrice(priceMap: Map<string, number>, p: string): string {
  const idx = priceMap.get(p) ?? 0;
  return PRICE_COLORS[idx % PRICE_COLORS.length];
}

function absoluteUrl(origin: string, pathOrUrl: string | null | undefined): string | undefined {
  if (!pathOrUrl?.trim()) return undefined;
  const s = pathOrUrl.trim();
  if (/^https?:\/\//i.test(s)) return s;
  return `${origin}${s.startsWith('/') ? '' : '/'}${s}`;
}

function looksLikeGetbiletId(s: string): boolean {
  return /^[a-f0-9]{24}$/i.test(s.trim());
}

function eventRepId(ev: NormalizedBiletEvent | null | undefined): string {
  if (!ev) return '';
  return (
    ev.repertoireId?.trim() ||
    (ev.id.includes('::') ? ev.id.split('::')[0]?.trim() : '') ||
    ev.id
  );
}

export function TicketCheckoutPage() {
  const { eventSlug = '', repertoireId: legacyRepertoireId = '', slug: legacySlug } = useParams<{
    eventSlug?: string;
    repertoireId?: string;
    slug?: string;
  }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const routeKey = legacyRepertoireId || eventSlug;
  const routeKeyIsId = looksLikeGetbiletId(routeKey);
  const routeSlug = routeKeyIsId ? legacySlug?.trim() || '' : routeKey.trim();

  const { data: rawEventsForSlug } = useQuery({
    queryKey: ['bilet-events-public', 'ticket-slug-resolve'],
    queryFn: () => fetchBiletEvents(),
    enabled: Boolean(routeKey && !routeKeyIsId),
    staleTime: 60_000,
    retry: 1,
  });

  const resolvedEventFromSlug = useMemo(() => {
    if (!routeSlug || routeKeyIsId) return null;
    const target = routeSlug.toLowerCase();
    return normalizeBiletEventsPayload(rawEventsForSlug).find((ev) => slugify(ev.title) === target) ?? null;
  }, [rawEventsForSlug, routeSlug, routeKeyIsId]);

  const repertoireId = routeKeyIsId ? routeKey : eventRepId(resolvedEventFromSlug);
  const titleHint = searchParams.get('title') ?? resolvedEventFromSlug?.title ?? 'Мероприятие';
  const posterQ = searchParams.get('poster')?.trim() || null;
  const bannerQ = searchParams.get('banner')?.trim() || null;
  const sessionHint = searchParams.get('eventDateTime')?.trim() || null;

  const { data: ctx, isLoading: ctxLoading, isError: ctxError } = useQuery({
    queryKey: ['bilet-repertoire-context', repertoireId],
    queryFn: () => fetchRepertoireContext(repertoireId),
    enabled: Boolean(repertoireId),
    staleTime: 60_000,
    retry: 1,
  });

  const stageIdEff =
    searchParams.get('stageId')?.trim() || ctx?.stageId?.trim() || null;

  const { data: mapByStageId, isFetched: stageMapFetched } = useQuery({
    queryKey: ['bilet-stage-map', stageIdEff],
    queryFn: () => fetchStageMap(stageIdEff!),
    enabled: Boolean(stageIdEff),
    staleTime: 120_000,
  });

  const { data: raw, isLoading, isError, error, isSuccess } = useQuery({
    queryKey: ['bilet-offers', repertoireId],
    queryFn: () => fetchRepertoireOffers(repertoireId),
    enabled: Boolean(repertoireId),
    staleTime: 120_000,
  });

  const offers = useMemo(() => parseOffers(raw), [raw]);
  const pb = useMemo(() => priceBounds(offers as OfferRowLike[]), [offers]);

  /** Площадка: офферы GetBilet → контекст репертуара → строка из афиши (slug), чтобы герой не был пустым. */
  const venueFromCatalog = useMemo(
    () => resolvedEventFromSlug?.venue?.trim() || null,
    [resolvedEventFromSlug],
  );

  const mergedVenue = useMemo(() => {
    const o = firstVenueFromOffers(offers as OfferRow[]);
    if (o) return o;
    const c = ctx?.venueLabel?.trim();
    if (c) return c;
    if (venueFromCatalog) return venueFromCatalog;
    return null;
  }, [offers, ctx?.venueLabel, venueFromCatalog]);

  /** Все сеансы по полному каталогу (расписание не зависит от фильтра цены/зоны). */
  const allSessionsSorted = useMemo(() => {
    const m = new Map<string, OfferRow[]>();
    for (const o of offers as OfferRow[]) {
      const k = o.EventDateTime ?? '_';
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(o);
    }
    const entries = Array.from(m.entries());
    const norm = (s: string) => s.replace(/\s+/g, '').trim();
    entries.sort((a, b) => {
      if (a[0] === '_') return 1;
      if (b[0] === '_') return -1;
      const ta = new Date(a[0]).getTime();
      const tb = new Date(b[0]).getTime();
      if (Number.isFinite(ta) && Number.isFinite(tb) && ta !== tb) return ta - tb;
      return String(a[0]).localeCompare(String(b[0]));
    });
    if (sessionHint) {
      const idx = entries.findIndex(([e]) => sessionMatchesHint(e, sessionHint));
      if (idx > 0) {
        const [hit] = entries.splice(idx, 1);
        entries.unshift(hit);
      }
    }
    return entries;
  }, [offers, sessionHint]);

  const [filterState, setFilterState] = useState<OfferFilterState>({
    zone: 'all',
    priceRange: [0, 1],
    adjacent: 0,
    hidePassage: false,
  });
  const [showAllOfferRows, setShowAllOfferRows] = useState(false);

  const filterInitRepRef = useRef<string | null>(null);
  useEffect(() => {
    filterInitRepRef.current = null;
  }, [repertoireId]);

  useEffect(() => {
    if (!isSuccess || !repertoireId) return;
    if (offers.length === 0) {
      setFilterState({
        zone: 'all',
        priceRange: [0, 1],
        adjacent: 0,
        hidePassage: false,
      });
      return;
    }
    if (filterInitRepRef.current === repertoireId) return;
    filterInitRepRef.current = repertoireId;
    setFilterState({
      zone: 'all',
      priceRange: [pb.min, pb.max],
      adjacent: 0,
      hidePassage: false,
    });
  }, [repertoireId, isSuccess, offers.length, pb.min, pb.max]);

  const filteredOffers = useMemo(
    () => filterOffers(offers as OfferRowLike[], filterState),
    [offers, filterState],
  );

  const priceMap = useMemo(() => {
    const sorted = Array.from(new Set(offers.map(priceKey))).sort(
      (a, b) => Number(a) - Number(b),
    );
    const m = new Map<string, number>();
    sorted.forEach((p, i) => m.set(p, i));
    return m;
  }, [offers]);

  const bySession = useMemo(() => {
    const m = new Map<string, OfferRow[]>();
    for (const o of filteredOffers as OfferRow[]) {
      const k = o.EventDateTime ?? '_';
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(o);
    }
    return m;
  }, [filteredOffers]);

  const sessionEntriesSorted = useMemo(() => {
    const entries = Array.from(bySession.entries());
    if (!sessionHint) return entries;
    return [...entries].sort((a, b) => {
      const ma = sessionMatchesHint(a[0], sessionHint) ? 0 : 1;
      const mb = sessionMatchesHint(b[0], sessionHint) ? 0 : 1;
      return ma - mb;
    });
  }, [bySession, sessionHint]);

  const flatSessionRows = useMemo(() => {
    const out: { dt: string; row: OfferRow }[] = [];
    for (const [dt, rows] of sessionEntriesSorted) {
      for (const row of rows) {
        out.push({ dt, row });
      }
    }
    return out;
  }, [sessionEntriesSorted]);

  const groupedOfferRowsForList = useMemo(() => {
    const sliced = showAllOfferRows
      ? flatSessionRows
      : flatSessionRows.slice(0, OFFER_ROWS_PREVIEW);
    const order: string[] = [];
    const m = new Map<string, OfferRow[]>();
    for (const { dt, row } of sliced) {
      if (!m.has(dt)) {
        order.push(dt);
        m.set(dt, []);
      }
      m.get(dt)!.push(row);
    }
    return order.map((dt) => [dt, m.get(dt)!] as [string, OfferRow[]]);
  }, [flatSessionRows, showAllOfferRows]);

  const defaultSessionKey = useMemo(() => {
    if (allSessionsSorted.length === 0) return null;
    if (sessionHint) {
      const hit = allSessionsSorted.find(([e]) => sessionMatchesHint(e, sessionHint));
      if (hit) return hit[0];
    }
    return allSessionsSorted[0][0];
  }, [allSessionsSorted, sessionHint]);

  const [selectedSessionKey, setSelectedSessionKey] = useState<string | null>(null);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [offerId, setOfferId] = useState<string | null>(null);
  const [seats, setSeats] = useState<string[]>([]);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [ticketRequest, setTicketRequest] = useState({
    name: '',
    phone: '',
    email: '',
    comment: '',
  });
  const [ticketRequestStatus, setTicketRequestStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [ticketRequestError, setTicketRequestError] = useState<string | null>(null);
  const theme = useTheme();
  const fullScreenMap = useMediaQuery(theme.breakpoints.down('sm'));
  useEffect(() => {
    setSelectedSessionKey(defaultSessionKey);
  }, [repertoireId, defaultSessionKey]);

  /** Все офферы выбранного сеанса — для схемы зала (фильтр списка места на схеме не скрывает). */
  const offersForMap = useMemo(() => {
    if (!selectedSessionKey) return [];
    return (offers as OfferRow[]).filter(
      (o) => (o.EventDateTime ?? '_') === selectedSessionKey,
    );
  }, [offers, selectedSessionKey]);

  useEffect(() => {
    setOfferId(null);
    setSeats([]);
  }, [selectedSessionKey]);

  useEffect(() => {
    ensurePublicSessionForCheckout().catch(() => {});
  }, []);

  useEffect(() => {
    if (!offerId) return;
    const still = filteredOffers.some((o) => String(o.Id ?? '') === offerId);
    if (!still) {
      setOfferId(null);
      setSeats([]);
    }
  }, [filteredOffers, offerId]);

  const toggleSeat = (oid: string, seat: string, available: string[]) => {
    if (offerId !== oid) {
      setOfferId(oid);
      setSeats([seat]);
      return;
    }
    setSeats((prev) => {
      if (prev.includes(seat)) return prev.filter((s) => s !== seat);
      if (!available.includes(seat)) return prev;
      return [...prev, seat];
    });
  };

  const submitTicketRequest = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = ticketRequest.name.trim();
    const phone = ticketRequest.phone.trim();
    const email = ticketRequest.email.trim();
    const comment = ticketRequest.comment.trim();
    if (!phone && !email) {
      setTicketRequestStatus('error');
      setTicketRequestError('Оставьте телефон или email, чтобы мы могли ответить.');
      return;
    }
    setTicketRequestStatus('sending');
    setTicketRequestError(null);
    try {
      await submitForm('ticket-request', {
        name,
        phone,
        email,
        comment,
        eventTitle: displayTitle,
        repertoireId,
        venue: mergedVenue,
        pageUrl: typeof window !== 'undefined' ? window.location.href : '',
        source: 'ticket_empty_offers',
      });
      setTicketRequestStatus('sent');
      setTicketRequest({ name: '', phone: '', email: '', comment: '' });
    } catch (err) {
      setTicketRequestStatus('error');
      setTicketRequestError(err instanceof Error ? err.message : 'Не удалось отправить заявку');
    }
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const displayTitle = useMemo(
    () => ctx?.title?.trim() || titleHint,
    [ctx?.title, titleHint],
  );

  const baseTotalRub = useMemo(() => {
    if (!offerId || seats.length === 0) return 0;
    const row = (offers as OfferRow[]).find((o) => String(o.Id ?? '') === offerId);
    if (!row) return 0;
    const u = Number(priceKey(row));
    if (!Number.isFinite(u)) return 0;
    return u * seats.length;
  }, [offerId, seats, offers]);

  /** Дата/время выбранного оффера — для модалки оформления. */
  const purchaseSessionLabel = useMemo(() => {
    if (!offerId) return null;
    const row = (offers as OfferRow[]).find((o) => String(o.Id ?? '') === offerId);
    const dt = row?.EventDateTime;
    if (!dt || dt === '_') return 'Дата сеанса уточняется';
    const { dateLine, time } = formatSessionCard(dt);
    return `${dateLine} · ${time}`;
  }, [offerId, offers]);

  /** Лид героя: только смысловой текст, не склейка заголовков из полного описания. */
  const heroLeadDisplay = useMemo(() => {
    const s = ctx?.heroLead?.trim() || ctx?.descriptionSnippet?.trim();
    if (!s) return null;
    if (s.length <= 360) return s;
    const cut = s.slice(0, 357).trimEnd();
    const lastSpace = cut.lastIndexOf(' ');
    const base = lastSpace > 220 ? cut.slice(0, lastSpace) : cut;
    return `${base}…`;
  }, [ctx?.heroLead, ctx?.descriptionSnippet]);

  const heroKickerDisplay = ctx?.heroKicker?.trim() || null;
  const heroSublineDisplay = useMemo(
    () => resolveHeroSublineForTicketPage(ctx?.heroSubline, mergedVenue),
    [ctx?.heroSubline, mergedVenue],
  );
  const heroDateSublineOnly = useMemo(
    () => heroSublineWithoutDuplicateVenue(heroSublineDisplay, mergedVenue),
    [heroSublineDisplay, mergedVenue],
  );

  const coverUrl = useMemo(() => {
    return ctx?.bannerUrl || ctx?.posterUrl || bannerQ || posterQ || null;
  }, [ctx?.bannerUrl, ctx?.posterUrl, bannerQ, posterQ]);

  const posterSideUrl = useMemo(() => {
    return ctx?.posterUrl || posterQ || ctx?.bannerUrl || bannerQ || null;
  }, [ctx?.posterUrl, ctx?.bannerUrl, posterQ, bannerQ]);

  /** Отдельный «билетный» постер справа — только если отличается от фона баннера (как на афишных лендингах). */
  const showPosterAside = useMemo(() => {
    if (!posterSideUrl) return false;
    const norm = (s: string) => s.trim().replace(/\?[^#]*$/, '').replace(/\/$/, '');
    if (!coverUrl) return true;
    return norm(posterSideUrl) !== norm(coverUrl);
  }, [posterSideUrl, coverUrl]);

  const sessionChipLabel = useMemo(() => {
    const n = allSessionsSorted.length;
    if (n <= 0) return null;
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return `${n} сеанс`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} сеанса`;
    return `${n} сеансов`;
  }, [allSessionsSorted.length]);

  const minPriceHero =
    offers.length > 0 && Number.isFinite(pb.min) && pb.min > 0 ? pb.min : null;

  const hallSvg = useMemo(() => {
    if (!stageIdEff) return ctx?.stageMap?.svg_markup ?? null;
    if (!stageMapFetched) {
      return ctx?.stageId === stageIdEff ? ctx?.stageMap?.svg_markup ?? null : null;
    }
    return (
      mapByStageId?.svg_markup ??
      (ctx?.stageId === stageIdEff ? ctx?.stageMap?.svg_markup ?? null : null)
    );
  }, [
    stageIdEff,
    stageMapFetched,
    mapByStageId?.svg_markup,
    ctx?.stageId,
    ctx?.stageMap?.svg_markup,
  ]);

  const layoutJsonForStage = useMemo(() => {
    if (!stageIdEff) return ctx?.stageMap?.layout_json;
    if (!stageMapFetched) {
      return ctx?.stageId === stageIdEff ? ctx?.stageMap?.layout_json : null;
    }
    return (
      mapByStageId?.layout_json ??
      (ctx?.stageId === stageIdEff ? ctx?.stageMap?.layout_json : null)
    );
  }, [
    stageIdEff,
    stageMapFetched,
    mapByStageId?.layout_json,
    ctx?.stageId,
    ctx?.stageMap?.layout_json,
  ]);

  const externalPlanUrl = useMemo(() => {
    const t = (s: string | null | undefined) =>
      s != null && String(s).trim() ? String(s).trim() : null;
    if (!stageIdEff) return t(ctx?.externalPlanUrl);
    if (!stageMapFetched) {
      return ctx?.stageId === stageIdEff ? t(ctx?.externalPlanUrl) : null;
    }
    return (
      t(mapByStageId?.external_plan_url) ??
      (ctx?.stageId === stageIdEff ? t(ctx?.externalPlanUrl) : null)
    );
  }, [
    stageIdEff,
    stageMapFetched,
    mapByStageId?.external_plan_url,
    ctx?.stageId,
    ctx?.externalPlanUrl,
  ]);

  const showHallMissingCard =
    Boolean(!hallSvg && !externalPlanUrl && (!stageIdEff || stageMapFetched));

  const colorSeat = useCallback(
    (p: string) => colorForPrice(priceMap, p),
    [priceMap],
  );

  const navigateToPlacesList = useCallback(() => {
    setMapDialogOpen(false);
    requestAnimationFrame(() => {
      document.getElementById('ticket-places-and-prices')?.scrollIntoView({ behavior: 'smooth' });
    });
  }, []);

  const ogImage = absoluteUrl(origin, coverUrl || posterSideUrl);

  const canonicalSlug = useMemo(() => slugify(displayTitle) || 'event', [displayTitle]);

  const canonicalTicketPath = useMemo(() => {
    if (!canonicalSlug || canonicalSlug === 'event') return '/events';
    return `/ticket/${canonicalSlug}`;
  }, [canonicalSlug]);

  const searchStrForCanonical = useMemo(() => searchParams.toString(), [searchParams]);

  useEffect(() => {
    document.body.setAttribute('data-page', '/ticket');
    return () => document.body.removeAttribute('data-page');
  }, []);

  useEffect(() => {
    setShowAllOfferRows(false);
  }, [repertoireId]);

  /** Канонический URL: только /ticket/:slug, без id GetBilet и query-параметров. */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!routeKey || canonicalSlug === 'event') return;
    const wantSlug = canonicalSlug;
    const target = `/ticket/${wantSlug}`;
    const cur = `${window.location.pathname}${window.location.search}`;
    if (cur !== target) {
      navigate(target, { replace: true });
    }
  }, [
    routeKey,
    canonicalSlug,
    searchStrForCanonical,
    navigate,
  ]);

  return (
    <>
      <SeoMetaTags
        title={`Билеты — ${displayTitle}`}
        description={
          (ctx?.heroLead?.trim() || ctx?.descriptionSnippet?.trim())?.slice(0, 160) ||
          'Выбор мест и бронирование через GetBilet.'
        }
        image={ogImage}
        url={origin ? `${origin}${canonicalTicketPath}` : canonicalTicketPath}
      />
      <Box className={styles.page}>
        <div className={styles.hero}>
          <div className={styles.heroMedia}>
            {coverUrl ? (
              <TicketEventPosterImg
                src={coverUrl}
                gradientId={repertoireId || 'x'}
                className={styles.heroImg}
                loading="eager"
                decoding="async"
              />
            ) : (
              <div
                className={styles.heroImg}
                style={{ background: posterGradientFromId(repertoireId || 'x') }}
                aria-hidden
              />
            )}
            <div className={styles.heroVignette} />
            <div className={styles.heroGradientBottom} />
          </div>
          <div className={styles.heroShell}>
            <div className={styles.heroGrid}>
              <div className={styles.heroCopy}>
                <Link to="/events" className={styles.heroCrumb}>
                  ← К афише
                </Link>
                {heroKickerDisplay ? <p className={styles.heroKicker}>{heroKickerDisplay}</p> : null}
                <Typography variant="h4" component="h1" className={styles.heroTitle}>
                  {displayTitle}
                </Typography>
                {mergedVenue ? (
                  <Typography variant="body2" component="p" className={styles.heroVenue}>
                    {mergedVenue}
                  </Typography>
                ) : null}
                {heroDateSublineOnly ? (
                  <Typography variant="body2" component="p" className={styles.heroSubline}>
                    {heroDateSublineOnly}
                  </Typography>
                ) : null}
                {heroLeadDisplay ? (
                  <Typography variant="body2" component="p" className={styles.heroLead}>
                    {heroLeadDisplay}
                  </Typography>
                ) : null}
                {(minPriceHero != null || sessionChipLabel) && (
                  <div className={styles.heroChips}>
                    {minPriceHero != null ? (
                      <span className={`${styles.heroChip} ${styles.heroChipAccent}`}>
                        от {minPriceHero.toLocaleString('ru-RU')} ₽
                      </span>
                    ) : null}
                    {sessionChipLabel ? (
                      <span className={styles.heroChip}>{sessionChipLabel}</span>
                    ) : null}
                  </div>
                )}
              </div>
              {showPosterAside && posterSideUrl ? (
                <div className={styles.heroPosterWrap}>
                  <TicketEventPosterImg
                    src={posterSideUrl}
                    gradientId={repertoireId || 'x'}
                    className={styles.heroPosterImg}
                    loading="eager"
                    decoding="async"
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <Box className={styles.wrap} sx={{ maxWidth: 960, mx: 'auto', p: 2, pb: 4 }}>
          {ctxLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={28} />
            </Box>
          )}

          {ctxError && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Часть данных о событии не загрузилась. Выбор мест и цен ниже по-прежнему доступен.
            </Alert>
          )}

          {allSessionsSorted.length > 0 && (
            <Box component="section" className={styles.scheduleSection} sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, letterSpacing: '0.04em' }}>
                Расписание
              </Typography>
              {mergedVenue ? (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  {mergedVenue}
                </Typography>
              ) : null}
              <div className={styles.scheduleStrip}>
                {allSessionsSorted.map(([dt, rows]) => {
                  const minP = minPriceForOffers(rows);
                  const { time, dateLine } = formatSessionCard(dt);
                  const selected = selectedSessionKey === dt;
                  return (
                    <button
                      key={dt}
                      type="button"
                      className={`${styles.scheduleCard} ${selected ? styles.scheduleCardSelected : ''}`}
                      onClick={() => setSelectedSessionKey(dt)}
                    >
                      <div className={styles.scheduleCardDate}>{dateLine}</div>
                      <div className={styles.scheduleCardTime}>{time}</div>
                      {minP != null ? (
                        <div className={styles.scheduleCardPrice}>от {minP.toLocaleString('ru-RU')} ₽</div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center', mt: 2 }}>
                {hallSvg ? (
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<EventSeatIcon />}
                    disabled={!selectedSessionKey}
                    onClick={() => setMapDialogOpen(true)}
                  >
                    Схема зала — выбрать места
                  </Button>
                ) : null}
                {!hallSvg && externalPlanUrl ? (
                  <Button
                    variant="contained"
                    size="large"
                    href={externalPlanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Схема на сайте театра
                  </Button>
                ) : null}
                {hallSvg && externalPlanUrl ? (
                  <Button size="small" variant="text" href={externalPlanUrl} target="_blank" rel="noopener noreferrer">
                    Схема залов на сайте организатора
                  </Button>
                ) : null}
              </Box>
            </Box>
          )}

          {showHallMissingCard ? (
            <Paper
              className={styles.hallPlaceholder}
              elevation={0}
              sx={{ mb: 3, p: 2.5, bgcolor: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.08)' }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65, m: 0 }}>
                План зала для этого события временно недоступен в сервисе. Выберите зону и места в списке ниже. Если
                нужна схема рассадки — уточните у организатора или{' '}
                <Link to="/contacts">напишите нам</Link>.
              </Typography>
            </Paper>
          ) : null}
        </Box>

        <Box id="ticket-places-and-prices" className={styles.wrap} sx={{ maxWidth: 960, mx: 'auto', px: 2, pb: 4 }}>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              mb: 1,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '0.04em' }}>
              Места и цены
            </Typography>
            {hallSvg && selectedSessionKey ? (
              <Button
                size="small"
                variant="outlined"
                startIcon={<EventSeatIcon />}
                onClick={() => setMapDialogOpen(true)}
              >
                Схема зала
              </Button>
            ) : null}
          </Box>

          {!isLoading && !isError && offers.length > 0 && (
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                Фильтр
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 2,
                  alignItems: 'flex-end',
                }}
              >
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel id="ticket-zone-label">Зона</InputLabel>
                  <Select
                    labelId="ticket-zone-label"
                    label="Зона"
                    value={filterState.zone}
                    onChange={(e) =>
                      setFilterState((s) => ({
                        ...s,
                        zone: e.target.value as ZoneFilterId,
                      }))
                    }
                  >
                    {ZONE_OPTIONS.map((z) => (
                      <MenuItem key={z.id} value={z.id}>
                        {z.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Box sx={{ flex: '1 1 260px', minWidth: 200, px: 0.5 }}>
                  <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 0.5 }}>
                    Цена, ₽
                  </Typography>
                  <Slider
                    size="small"
                    value={filterState.priceRange}
                    onChange={(_, v) => {
                      const t = v as number[];
                      setFilterState((s) => ({
                        ...s,
                        priceRange: [t[0], t[1]] as [number, number],
                      }));
                    }}
                    min={pb.min}
                    max={pb.max}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(x) => `${Math.round(x).toLocaleString('ru-RU')}`}
                    disabled={pb.max <= pb.min}
                  />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 0.5 }}>
                    Подряд на ряду
                  </Typography>
                  <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={filterState.adjacent === 0 ? 'any' : String(filterState.adjacent)}
                    onChange={(_, val) => {
                      if (val == null) return;
                      if (val === 'any') {
                        setFilterState((s) => ({ ...s, adjacent: 0 }));
                      } else {
                        setFilterState((s) => ({
                          ...s,
                          adjacent: Number(val) as 2 | 3,
                        }));
                      }
                    }}
                  >
                    <ToggleButton value="any">Любое</ToggleButton>
                    <ToggleButton value="2">2</ToggleButton>
                    <ToggleButton value="3">3</ToggleButton>
                  </ToggleButtonGroup>
                </Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={filterState.hidePassage}
                      onChange={(_, c) =>
                        setFilterState((s) => ({ ...s, hidePassage: c }))
                      }
                    />
                  }
                  label="Не у прохода"
                  sx={{ ml: 0 }}
                />
              </Box>
              {filteredOffers.length < offers.length ? (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
                  Показано {filteredOffers.length} из {offers.length} предложений
                </Typography>
              ) : null}
              {filteredOffers.length === 0 ? (
                <Alert severity="info" sx={{ mt: 1.5 }}>
                  Нет предложений по фильтрам — измените зону, цену или условия «подряд» / «проход».
                </Alert>
              ) : null}
            </Paper>
          )}

          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          )}
          {isError && (
            <Alert severity="error">
              {(error as Error)?.message || 'Не удалось загрузить предложения'}
            </Alert>
          )}

          {!isLoading && !isError && offers.length === 0 && (
            <Paper className={styles.ticketRequestCard} elevation={0}>
              <div className={styles.ticketRequestCopy}>
                <Typography variant="h6" component="h2" sx={{ fontWeight: 800, mb: 1 }}>
                  Запросить билеты
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(28,27,25,0.68)', lineHeight: 1.65 }}>
                  Сейчас на сайте нет доступных предложений по этому мероприятию. Это не всегда значит, что
                  билетов нет: мы можем уточнить наличие и вернуться с вариантами по цене и местам.
                </Typography>
              </div>

              {ticketRequestStatus === 'sent' ? (
                <Alert severity="success" sx={{ mt: 2 }}>
                  Заявка отправлена. Мы проверим наличие билетов и свяжемся с вами.
                </Alert>
              ) : (
                <Box component="form" className={styles.ticketRequestForm} onSubmit={submitTicketRequest}>
                  <TextField
                    label="Имя"
                    size="small"
                    value={ticketRequest.name}
                    onChange={(e) => setTicketRequest((v) => ({ ...v, name: e.target.value }))}
                    fullWidth
                  />
                  <TextField
                    label="Телефон"
                    size="small"
                    value={ticketRequest.phone}
                    onChange={(e) => setTicketRequest((v) => ({ ...v, phone: e.target.value }))}
                    fullWidth
                    placeholder="+7"
                  />
                  <TextField
                    label="Email"
                    size="small"
                    type="email"
                    value={ticketRequest.email}
                    onChange={(e) => setTicketRequest((v) => ({ ...v, email: e.target.value }))}
                    fullWidth
                  />
                  <TextField
                    label="Комментарий"
                    size="small"
                    value={ticketRequest.comment}
                    onChange={(e) => setTicketRequest((v) => ({ ...v, comment: e.target.value }))}
                    fullWidth
                    multiline
                    minRows={2}
                    placeholder="Сколько билетов нужно, желаемая зона или бюджет"
                  />
                  {ticketRequestStatus === 'error' && ticketRequestError ? (
                    <Alert severity="error" sx={{ gridColumn: '1 / -1' }}>
                      {ticketRequestError}
                    </Alert>
                  ) : null}
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={ticketRequestStatus === 'sending'}
                    sx={{
                      bgcolor: 'var(--neg-orange, #ff4e18)',
                      color: '#fff',
                      fontWeight: 800,
                      boxShadow: 'none',
                      '&:hover': { bgcolor: '#e54414', boxShadow: 'none' },
                    }}
                  >
                    {ticketRequestStatus === 'sending' ? 'Отправляем…' : 'Запросить билеты'}
                  </Button>
                </Box>
              )}
            </Paper>
          )}

          {bySession.size > 0 && (
            <Accordion
              defaultExpanded
              sx={{
                mb: 2,
                boxShadow: 'none',
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: 2,
                '&:before': { display: 'none' },
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Список по рядам (дополнительно)
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                {groupedOfferRowsForList.map(([dt, rows]) => (
                  <Paper key={dt} className={styles.session} elevation={0} sx={{ mb: 1.5 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                      {dt === '_' ? 'Дата уточняется' : new Date(dt).toLocaleString('ru-RU')}
                    </Typography>
                    <div className={styles.mapGrid}>
                      {rows.map((row) => {
                        const oid = String(row.Id ?? '');
                        const pk = priceKey(row);
                        const bg = colorForPrice(priceMap, pk);
                        const seatList = Array.isArray(row.SeatList) ? row.SeatList.map(String) : [];
                        const active = offerId === oid;
                        return (
                          <div key={oid} className={styles.offerBlock}>
                            <div className={styles.offerHead}>
                              <span>
                                <strong>{row.Sector ?? '—'}</strong> · ряд {row.Row ?? '—'}
                              </span>
                              <span className={styles.priceTag} style={{ backgroundColor: bg }}>
                                {Number(pk).toLocaleString('ru-RU')} ₽
                              </span>
                            </div>
                            <div className={styles.seatRow}>
                              {seatList.map((seat) => {
                                const selected = active && seats.includes(seat);
                                return (
                                  <button
                                    key={seat}
                                    type="button"
                                    className={`${styles.seatBtn} ${selected ? styles.seatBtnOn : ''}`}
                                    style={{
                                      borderColor: bg,
                                      backgroundColor: selected ? bg : 'rgba(255,255,255,0.9)',
                                      color: selected ? '#fff' : '#111',
                                    }}
                                    onClick={() => toggleSeat(oid, seat, seatList)}
                                  >
                                    {seat}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Paper>
                ))}
                {flatSessionRows.length > OFFER_ROWS_PREVIEW ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1, pb: 0.5 }}>
                    <Button
                      type="button"
                      variant="outlined"
                      size="medium"
                      onClick={() => setShowAllOfferRows((v) => !v)}
                    >
                      {showAllOfferRows ? 'Свернуть' : 'Смотреть все билеты'}
                    </Button>
                  </Box>
                ) : null}
              </AccordionDetails>
            </Accordion>
          )}

          {offerId && seats.length > 0 && !mapDialogOpen && (
            <Paper className={styles.stickyBar} elevation={3}>
              <Typography variant="body2">Выбрано мест: {seats.join(', ')}</Typography>
              <Button variant="contained" color="primary" onClick={() => setPurchaseOpen(true)}>
                Забронировать
              </Button>
            </Paper>
          )}

          <TicketPurchaseDialog
            open={purchaseOpen}
            onClose={() => setPurchaseOpen(false)}
            repertoireId={repertoireId}
            offerId={offerId ?? ''}
            seats={seats}
            eventTitle={displayTitle}
            baseTotalRub={baseTotalRub}
            sessionLabel={purchaseSessionLabel}
            descriptionLead={
              heroLeadDisplay ?? (mergedVenue ? `Площадка: ${mergedVenue}` : null)
            }
          />

          <TicketCheckoutPageExtras
            repertoireId={repertoireId}
            displayTitle={displayTitle}
            descriptionSnippet={ctx?.descriptionSnippet}
            descriptionSections={ctx?.descriptionSections}
            venueLabel={mergedVenue}
            hasDescriptionInHero={Boolean(heroLeadDisplay?.trim())}
          />
        </Box>

        <Dialog
          open={Boolean(mapDialogOpen && hallSvg && selectedSessionKey)}
          onClose={() => setMapDialogOpen(false)}
          fullScreen={fullScreenMap}
          maxWidth="lg"
          fullWidth
          scroll="paper"
          slotProps={{
            paper: {
              sx: {
                display: 'flex',
                flexDirection: 'column',
                maxHeight: fullScreenMap ? '100%' : '95vh',
              },
            },
          }}
        >
          <DialogTitle
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 1,
              pr: 1,
              py: 1.5,
            }}
          >
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                План рассадки
              </Typography>
              {selectedSessionKey && selectedSessionKey !== '_' ? (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                  {new Date(selectedSessionKey).toLocaleString('ru-RU')}
                </Typography>
              ) : null}
            </Box>
            <IconButton aria-label="Закрыть" onClick={() => setMapDialogOpen(false)} edge="end" size="small">
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent
            sx={{
              flex: '1 1 auto',
              minHeight: 0,
              p: 0,
              display: 'flex',
              flexDirection: 'column',
              bgcolor: '#fafafa',
            }}
          >
            {allSessionsSorted.length > 1 && selectedSessionKey ? (
              <Box
                sx={{
                  px: 2,
                  py: 1.5,
                  bgcolor: '#fff',
                  borderBottom: '1px solid rgba(0,0,0,0.06)',
                }}
              >
                <FormControl size="small" sx={{ minWidth: 280, maxWidth: '100%' }}>
                  <InputLabel id="ticket-session-map-dialog">Сеанс</InputLabel>
                  <Select
                    labelId="ticket-session-map-dialog"
                    label="Сеанс"
                    value={selectedSessionKey}
                    onChange={(e) => setSelectedSessionKey(e.target.value)}
                  >
                    {allSessionsSorted.map(([dt]) => (
                      <MenuItem key={dt} value={dt}>
                        {dt === '_' ? 'Дата уточняется' : new Date(dt).toLocaleString('ru-RU')}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            ) : null}
            <Box
              sx={{
                px: 2,
                py: 1.5,
                bgcolor: '#fafafa',
                borderBottom: '1px solid rgba(0,0,0,0.06)',
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                Легенда цен — свободные места из каталога. Клик по точке — выбор; бронь идёт с идентификаторами мест, как
                в списке оффера.
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {Array.from(priceMap.entries())
                  .sort((a, b) => Number(a[0]) - Number(b[0]))
                  .map(([p]) => (
                    <Chip
                      key={p}
                      size="small"
                      label={`${Number(p).toLocaleString('ru-RU')} ₽`}
                      sx={{
                        backgroundColor: colorForPrice(priceMap, p),
                        color: '#fff',
                      }}
                    />
                  ))}
              </Box>
            </Box>
            {hallSvg && selectedSessionKey ? (
              <Box sx={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', px: 0 }}>
                <TicketHallInteractiveBlock
                  variant="dialog"
                  hallSvgHtml={hallSvg}
                  layoutJson={layoutJsonForStage}
                  offers={offersForMap}
                  getPriceKey={(o) => priceKey(o as OfferRow)}
                  colorForSeat={colorSeat}
                  activeOfferId={offerId}
                  selectedSeats={seats}
                  onToggleSeat={toggleSeat}
                  selectedOffer={
                    offerId ? (offersForMap.find((o) => String(o.Id ?? '') === offerId) ?? null) : null
                  }
                  onReserveFromMap={() => setPurchaseOpen(true)}
                  reservePending={false}
                  onNavigateToList={navigateToPlacesList}
                />
              </Box>
            ) : null}
          </DialogContent>
          <DialogActions
            sx={{
              flexWrap: 'wrap',
              gap: 1,
              px: 2,
              py: 1.5,
              borderTop: '1px solid rgba(0,0,0,0.08)',
              bgcolor: 'background.paper',
            }}
          >
            {offerId && seats.length > 0 ? (
              <>
                <Typography variant="body2" sx={{ flex: '1 1 200px', mr: 'auto' }}>
                  Выбрано: {seats.join(', ')}
                </Typography>
                <Button variant="contained" onClick={() => setPurchaseOpen(true)}>
                  Забронировать
                </Button>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ width: '100%' }}>
                Выберите места на схеме или в списке ниже на странице.
              </Typography>
            )}
          </DialogActions>
        </Dialog>
      </Box>
    </>
  );
}
