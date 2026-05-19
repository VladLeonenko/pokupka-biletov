import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Autocomplete,
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
  fetchBiletResolveSlug,
  fetchRepertoirePageBundle,
  fetchStageMap,
  type NormalizedBiletEvent,
} from '@/services/biletPublicApi';
import { posterGradientFromId } from '@/utils/ticketsPlaceholders';
import {
  isLuzhnikiFootballRepertoire,
  isLuzhnikiStadiumCheckoutLayout,
  LUZHNIKI_FOOTBALL_STAGE_MAP_KEY,
} from '@/utils/luzhnikiStadiumMap';
import {
  getOfferSeatList,
  isNamedTicketOfferRow,
  isOfferListedOnCheckout,
  isSeatlessOfferRow,
} from '@/utils/ticketOfferSeats';
import {
  type OfferFilterState,
  filterOffers,
  priceBounds,
  ZONE_OPTIONS,
  type ZoneFilterId,
  type OfferRowLike,
} from '@/utils/ticketOfferFilters';
import type { HallSelectedSeat } from '@/components/tickets/TicketHallInteractiveBlock';
import {
  TicketPriceFilterCarousel,
  type PriceFilterChip,
} from '@/components/tickets/TicketPriceFilterCarousel';
import { buildPriceColorMap, colorForPriceIndex } from '@/utils/ticketPriceColors';
import { normalizeSectorLabel } from '@/utils/ticketHallSectorNormalize';

const TicketHallInteractiveBlock = lazy(() =>
  import('@/components/tickets/TicketHallInteractiveBlock').then((m) => ({
    default: m.TicketHallInteractiveBlock,
  })),
);
const TicketCheckoutPageExtras = lazy(() =>
  import('@/components/tickets/TicketCheckoutPageExtras').then((m) => ({
    default: m.TicketCheckoutPageExtras,
  })),
);
import {
  heroSublineWithoutDuplicateVenue,
  resolveHeroSublineForTicketPage,
} from '@/utils/ticketHeroSubline';
import { slugify } from '@/utils/slugify';
import { submitForm } from '@/services/cmsApi';
import { reachMetrikaGoal } from '@/utils/yandexMetrika';
import {
  FAN_ID_NOTICE,
  isBlockedTicketSlug,
  isFanIdRequiredForRepertoire,
  isFanIdRequiredForSlug,
  isNamedTicketUxEnabledForRepertoire,
  isNamedTicketUxEnabledForSlug,
  repertoireIdForTicketSlug,
} from '@/utils/fanIdRequiredEvents';
import { useTicketCart } from '@/context/TicketCartContext';
import styles from './TicketCheckoutPage.module.css';

const OFFER_ROWS_PREVIEW = 5;
/** Лужники: не обрезать список до 5 строк офферов — иначе «11 мест в API», в UI только d227/c143…. */
const LUZHNIKI_OFFER_ROWS_PREVIEW = 500;

function HallMapLoadingPane() {
  return (
    <div
      className={styles.hallMapLoading}
      role="status"
      aria-live="polite"
      aria-label="Загрузка схемы"
    >
      <div className={styles.hallMapLoadingCard}>
        <span className={styles.hallMapLoadingSpinner} aria-hidden="true" />
        <span>Загрузка схемы</span>
      </div>
    </div>
  );
}

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
  Address?: string;
  address?: string;
  PlaceAddress?: string;
  placeAddress?: string;
  Extra?: string[];
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

function firstAddressFromOffers(rows: OfferRow[]): string | null {
  for (const o of rows) {
    const cands = [o.Address, o.address, o.PlaceAddress, o.placeAddress];
    for (const v of cands) {
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
  }
  return null;
}

function parseOffers(raw: unknown): OfferRow[] {
  if (!raw || typeof raw !== 'object') return [];
  const o = raw as Record<string, unknown>;
  const arr = o.ResultData;
  if (!Array.isArray(arr)) return [];
  return arr.map((row) => {
    if (!row || typeof row !== 'object') return row as OfferRow;
    const r = row as OfferRow;
    return { ...r, SeatList: getOfferSeatList(r) };
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

function absoluteUrl(origin: string, pathOrUrl: string | null | undefined): string | undefined {
  if (!pathOrUrl?.trim()) return undefined;
  const s = pathOrUrl.trim();
  if (/^https?:\/\//i.test(s)) return s;
  return `${origin}${s.startsWith('/') ? '' : '/'}${s}`;
}

function looksLikeGetbiletId(s: string): boolean {
  return /^[a-f0-9]{24}$/i.test(s.trim());
}

/**
 * Репертуарный ключ из URL (`luzhniki-cup-final-2026`): есть в getbilet_catalog_cache, но может отсутствовать в общей выдаче /events (кэш, только что засидили).
 */
function looksLikeManualTicketRouteKey(s: string): boolean {
  const t = s.trim();
  if (t.length < 8 || t.length > 130) return false;
  if (looksLikeGetbiletId(t)) return false;
  return /^[a-z0-9][a-z0-9-]*$/i.test(t) && t.includes('-');
}

/** Совпадает с TBANK_DEMO_REPERTOIRE_ID на backend (seed-tbank-demo-event). */
const demoRepEnv = import.meta.env.VITE_TBANK_DEMO_REPERTOIRE_ID;
const DEMO_REPERTOIRE_ID =
  typeof demoRepEnv === 'string' && demoRepEnv.trim() ? demoRepEnv.trim() : 'tbank-demo-event';

/** Репертуарный id для API: mongo GetBilet или ручной ключ (seed luzhniki-cup-final-2026 и т.п.). */
function eventRepId(ev: NormalizedBiletEvent | null | undefined): string {
  if (!ev) return '';
  const rep = ev.repertoireId?.trim() || '';
  if (looksLikeGetbiletId(rep)) return rep;
  if (rep && looksLikeManualTicketRouteKey(rep)) return rep;
  const head = ev.id.includes('::') ? ev.id.split('::')[0]?.trim() || '' : '';
  if (looksLikeGetbiletId(head)) return head;
  if (head && looksLikeManualTicketRouteKey(head)) return head;
  const bareId = ev.id.trim();
  if (bareId && looksLikeManualTicketRouteKey(bareId)) return bareId;
  return '';
}

export function TicketCheckoutPage() {
  const { eventSlug = '', repertoireId: legacyRepertoireId = '', slug: legacySlug } = useParams<{
    eventSlug?: string;
    repertoireId?: string;
    slug?: string;
  }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { cart, purchaseOpen, setCart, clearCart, setPurchaseOpen } = useTicketCart();
  const routeKey = legacyRepertoireId || eventSlug;
  const routeKeyIsId = looksLikeGetbiletId(routeKey);
  const routeSlug = routeKeyIsId ? legacySlug?.trim() || '' : routeKey.trim();
  const routeSlugIsManual = looksLikeManualTicketRouteKey(routeSlug);
  const slugAliasRep = useMemo(() => repertoireIdForTicketSlug(routeSlug), [routeSlug]);

  const { data: resolvedSlugApi, isFetched: slugResolveFetched } = useQuery({
    queryKey: ['bilet-resolve-slug', routeSlug],
    queryFn: () => fetchBiletResolveSlug(routeSlug),
    enabled: Boolean(routeSlug && !routeKeyIsId),
    staleTime: 120_000,
    retry: 1,
  });

  const resolvedEventFromSlug = useMemo((): NormalizedBiletEvent | null => {
    if (resolvedSlugApi?.repertoireId) {
      return {
        id: resolvedSlugApi.repertoireId,
        repertoireId: resolvedSlugApi.repertoireId,
        title: resolvedSlugApi.title ?? 'Мероприятие',
        stageId: resolvedSlugApi.stageId ?? undefined,
        imageUrl: resolvedSlugApi.posterUrl ?? undefined,
        bannerUrl: resolvedSlugApi.bannerUrl ?? undefined,
        isoDate: resolvedSlugApi.beginDateTime ?? undefined,
      };
    }
    if (slugAliasRep) {
      return {
        id: slugAliasRep,
        repertoireId: slugAliasRep,
        title: routeSlug.replace(/-/g, ' '),
      };
    }
    return null;
  }, [resolvedSlugApi, slugAliasRep, routeSlug]);

  const repertoireId = useMemo(() => {
    const rk = routeKey.trim();
    if (!rk) return '';
    if (looksLikeGetbiletId(rk)) return rk;
    const leg = legacyRepertoireId.trim();
    if (leg) return leg;
    if (rk === DEMO_REPERTOIRE_ID) return rk;
    if (slugAliasRep) return slugAliasRep;
    const fromSlug = eventRepId(resolvedEventFromSlug);
    if (fromSlug) return fromSlug;
    return '';
  }, [routeKey, legacyRepertoireId, resolvedEventFromSlug, slugAliasRep]);

  const titleHint =
    searchParams.get('title') ??
    resolvedEventFromSlug?.title ??
    (routeSlug && !routeSlugIsManual ? routeSlug.replace(/-/g, ' ') : null) ??
    'Мероприятие';
  const posterQ = searchParams.get('poster')?.trim() || null;
  const bannerQ = searchParams.get('banner')?.trim() || null;
  const sessionHint = searchParams.get('eventDateTime')?.trim() || null;
  const paymentFailed = searchParams.get('payment') === 'failed';

  const {
    data: pageBundle,
    isLoading: pageLoading,
    isError: pageError,
    error: pageErrorObj,
    isSuccess: pageSuccess,
  } = useQuery({
    queryKey: ['bilet-repertoire-page', repertoireId, 'markup-v2'],
    queryFn: () => fetchRepertoirePageBundle(repertoireId),
    enabled: Boolean(repertoireId),
    staleTime: 0,
    gcTime: 5 * 60_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const slugResolving = Boolean(routeSlug && !routeKeyIsId && !slugResolveFetched);
  const ctx = pageBundle?.context;
  const ctxLoading = pageLoading || slugResolving;
  const ctxError = pageError;
  const raw = pageBundle?.offers;
  const isLoading = pageLoading;
  const isError = pageError;
  const error = pageErrorObj;
  const isSuccess = pageSuccess;

  const stageIdEff =
    searchParams.get('stageId')?.trim() || ctx?.stageId?.trim() || null;
  const contextHallSvgTrimmed =
    ctx?.stageId === stageIdEff ? ctx?.stageMap?.svg_markup?.trim() ?? '' : '';
  const svgDeferred = Boolean(ctx?.stageMap?.svg_markup_deferred);
  const hasUsableHallSvgFromContext = Boolean(contextHallSvgTrimmed);
  const isLuzhnikiFootballStageEarly = useMemo(() => {
    if (isLuzhnikiFootballRepertoire(repertoireId)) return true;
    if (stageIdEff === LUZHNIKI_FOOTBALL_STAGE_MAP_KEY) return true;
    if (isLuzhnikiStadiumCheckoutLayout(ctx?.stageMap?.layout_json)) return true;
    return false;
  }, [repertoireId, stageIdEff, ctx?.stageMap?.layout_json]);

  const stageMapQueryId =
    stageIdEff === LUZHNIKI_FOOTBALL_STAGE_MAP_KEY || isLuzhnikiFootballStageEarly
      ? LUZHNIKI_FOOTBALL_STAGE_MAP_KEY
      : stageIdEff;

  const { data: mapByStageId, isFetched: stageMapFetched } = useQuery({
    queryKey: ['bilet-stage-map', stageMapQueryId, repertoireId ?? ''],
    queryFn: () => fetchStageMap(stageMapQueryId!, repertoireId),
    enabled:
      Boolean(stageMapQueryId) &&
      !ctxLoading &&
      (svgDeferred ||
        ctx?.stageId !== stageIdEff ||
        !hasUsableHallSvgFromContext ||
        (isLuzhnikiFootballStageEarly && Boolean(repertoireId?.trim()))),
    staleTime: isLuzhnikiFootballStageEarly ? 30_000 : 120_000,
  });

  const isLuzhnikiFootballStage = useMemo(() => {
    if (isLuzhnikiFootballStageEarly) return true;
    if (isLuzhnikiStadiumCheckoutLayout(mapByStageId?.layout_json)) return true;
    return false;
  }, [isLuzhnikiFootballStageEarly, mapByStageId?.layout_json]);

  /** Все офферы GetBilet как пришли — без среза по сеансу/цене на фронте (сеанс → выбор даты, сектор → только список). */
  const offers = useMemo(() => parseOffers(raw), [raw]);
  const namedTicketUxEnabled = useMemo(
    () =>
      isNamedTicketUxEnabledForRepertoire(repertoireId) &&
      isNamedTicketUxEnabledForSlug(routeSlug),
    [repertoireId, routeSlug],
  );
  const listableOffers = useMemo(
    () => offers.filter((row) => isOfferListedOnCheckout(row, namedTicketUxEnabled)),
    [offers, namedTicketUxEnabled],
  );
  const pb = useMemo(() => priceBounds(listableOffers as OfferRowLike[]), [listableOffers]);

  /** Площадка: офферы GetBilet → контекст репертуара → строка из афиши (slug), чтобы герой не был пустым. */
  const venueFromCatalog = useMemo(
    () => resolvedEventFromSlug?.venue?.trim() || null,
    [resolvedEventFromSlug],
  );

  const venueAddressFromCatalog = useMemo(
    () => resolvedEventFromSlug?.venueAddress?.trim() || null,
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

  const mergedVenueAddress = useMemo(() => {
    const a = firstAddressFromOffers(offers as OfferRow[]);
    if (a) return a;
    const c = ctx?.venueAddress?.trim();
    if (c) return c;
    if (venueAddressFromCatalog) return venueAddressFromCatalog;
    return null;
  }, [offers, ctx?.venueAddress, venueAddressFromCatalog]);

  /** Все сеансы по полному каталогу (расписание не зависит от фильтра цены/зоны). */
  const allSessionsSorted = useMemo(() => {
    const m = new Map<string, OfferRow[]>();
    for (const o of listableOffers as OfferRow[]) {
      const k = o.EventDateTime ?? '_';
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(o);
    }
    const entries = Array.from(m.entries());
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
  }, [listableOffers, sessionHint]);

  const [filterState, setFilterState] = useState<OfferFilterState>({
    zone: 'all',
    priceRange: [0, 1],
    adjacent: 0,
    hidePassage: false,
  });
  /** Лужники: фильтр по сектору стадиона (A101, C143…), не театральные «Партер/Балкон». */
  const [stadiumSectorFilter, setStadiumSectorFilter] = useState<string>('all');
  /** Фильтр ценовой группы на схеме (карусель над картой, как portalbilet). */
  const [mapSelectedPriceKey, setMapSelectedPriceKey] = useState<string | null>(null);
  const [showAllOfferRows, setShowAllOfferRows] = useState(false);

  const filterInitRepRef = useRef<string | null>(null);
  useEffect(() => {
    filterInitRepRef.current = null;
    setStadiumSectorFilter('all');
  }, [repertoireId]);

  const stadiumSectorOptions = useMemo(() => {
    if (!isLuzhnikiFootballStage) return [];
    const byNorm = new Map<string, string>();
    for (const o of listableOffers as OfferRow[]) {
      const raw = String(o.Sector ?? '').trim();
      if (!raw) continue;
      const norm = normalizeSectorLabel(raw);
      if (!byNorm.has(norm)) byNorm.set(norm, raw);
    }
    return [...byNorm.entries()]
      .sort((a, b) => a[1].localeCompare(b[1], 'ru'))
      .map(([norm, label]) => ({ norm, label }));
  }, [isLuzhnikiFootballStage, listableOffers]);

  useEffect(() => {
    if (!isSuccess || !repertoireId) return;
    if (listableOffers.length === 0) {
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
  }, [repertoireId, isSuccess, listableOffers.length, pb.min, pb.max]);

  const filteredOffers = useMemo(() => {
    if (isLuzhnikiFootballStage) {
      if (stadiumSectorFilter === 'all') return listableOffers as OfferRow[];
      return (listableOffers as OfferRow[]).filter(
        (o) => normalizeSectorLabel(o.Sector) === stadiumSectorFilter,
      );
    }
    return filterOffers(listableOffers as OfferRowLike[], filterState) as OfferRow[];
  }, [isLuzhnikiFootballStage, listableOffers, filterState, stadiumSectorFilter]);

  const priceColorMap = useMemo(() => {
    const sorted = Array.from(new Set(listableOffers.map(priceKey))).sort(
      (a, b) => Number(a) - Number(b),
    );
    return buildPriceColorMap(sorted);
  }, [listableOffers]);

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
  const [scheduleCollapsed, setScheduleCollapsed] = useState(false);
  const [offerId, setOfferId] = useState<string | null>(null);
  const [seats, setSeats] = useState<string[]>([]);
  const [mapSelectedSeats, setMapSelectedSeats] = useState<HallSelectedSeat[]>([]);
  const [ticketRequest, setTicketRequest] = useState({
    name: '',
    phone: '',
    email: '',
    comment: '',
  });
  const [ticketRequestStatus, setTicketRequestStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [ticketRequestError, setTicketRequestError] = useState<string | null>(null);
  const viewedGoalKeyRef = useRef<string | null>(null);
  const addToCartSnapshotRef = useRef<string | null>(null);
  const theme = useTheme();
  const fullScreenMap = useMediaQuery(theme.breakpoints.down('sm'));
  useEffect(() => {
    setSelectedSessionKey(defaultSessionKey);
  }, [repertoireId, defaultSessionKey]);

  const flatSessionRows = useMemo(() => {
    const sessionKey = selectedSessionKey ?? defaultSessionKey;
    const out: { dt: string; row: OfferRow }[] = [];
    for (const [dt, rows] of sessionEntriesSorted) {
      if (sessionKey && dt !== sessionKey) continue;
      for (const row of rows) {
        out.push({ dt, row });
      }
    }
    return out;
  }, [sessionEntriesSorted, selectedSessionKey, defaultSessionKey]);

  const offerRowsPreviewLimit = isLuzhnikiFootballStage ? LUZHNIKI_OFFER_ROWS_PREVIEW : OFFER_ROWS_PREVIEW;

  const groupedOfferRowsForList = useMemo(() => {
    const sliced = showAllOfferRows
      ? flatSessionRows
      : flatSessionRows.slice(0, offerRowsPreviewLimit);
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
  }, [flatSessionRows, showAllOfferRows, offerRowsPreviewLimit]);

  const prevSessionKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (selectedSessionKey === null) return;
    if (prevSessionKeyRef.current !== null && prevSessionKeyRef.current !== selectedSessionKey) {
      setOfferId(null);
      setSeats([]);
      setMapSelectedSeats([]);
      clearCart();
    }
    prevSessionKeyRef.current = selectedSessionKey;
  }, [selectedSessionKey, clearCart]);

  useEffect(() => {
    ensurePublicSessionForCheckout().catch(() => {});
  }, []);

  const toggleSeat = (oid: string, seat: string, available: string[]) => {
    setMapSelectedSeats([]);
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

  const handleMapSelectionChange = useCallback((details: HallSelectedSeat[]) => {
    setMapSelectedSeats(details);
    if (details.length === 0) {
      setOfferId(null);
      setSeats([]);
      setPurchaseOpen(false);
      return;
    }
    const primaryOfferId = details[0].offerId;
    setOfferId(primaryOfferId);
    setSeats(details.filter((d) => d.offerId === primaryOfferId).map((d) => d.seat));
  }, []);

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
        venueAddress: mergedVenueAddress,
        pageUrl: typeof window !== 'undefined' ? window.location.href : '',
        source: 'ticket_empty_offers',
      });
      reachMetrikaGoal('no_ticket_submit', {
        repertoire_id: repertoireId || undefined,
        event_title: displayTitle,
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
    if (mapSelectedSeats.length > 0) {
      return mapSelectedSeats.reduce((sum, seat) => {
        const price = Number(seat.priceKey);
        return Number.isFinite(price) ? sum + price : sum;
      }, 0);
    }
    if (!offerId || seats.length === 0) return 0;
    const row = (offers as OfferRow[]).find((o) => String(o.Id ?? '') === offerId);
    if (!row) return 0;
    const u = Number(priceKey(row));
    if (!Number.isFinite(u)) return 0;
    return u * seats.length;
  }, [mapSelectedSeats, offerId, seats, offers]);

  const mapOfferSelections = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const item of mapSelectedSeats) {
      const list = groups.get(item.offerId) ?? [];
      if (!list.includes(item.seat)) list.push(item.seat);
      groups.set(item.offerId, list);
    }
    return [...groups.entries()].map(([selectionOfferId, selectionSeats]) => ({
      offerId: selectionOfferId,
      seats: selectionSeats,
    }));
  }, [mapSelectedSeats]);

  const purchaseSeats = useMemo(
    () => (mapSelectedSeats.length > 0 ? mapSelectedSeats.map((s) => s.seat) : seats),
    [mapSelectedSeats, seats],
  );

  const purchaseSeatLabels = useMemo(
    () =>
      mapSelectedSeats.length > 0
        ? mapSelectedSeats.map((s) => `${s.sector ? `${s.sector}, ` : ''}${s.row ? `${s.row} ряд, ` : ''}место ${s.seat}`)
        : undefined,
    [mapSelectedSeats],
  );

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

  const ticketHref = `${location.pathname}${location.search}`;
  const requiresFanId = useMemo(
    () =>
      ctx?.requiresFanId === true ||
      isFanIdRequiredForRepertoire(repertoireId) ||
      isFanIdRequiredForSlug(routeSlug),
    [ctx?.requiresFanId, repertoireId, routeSlug],
  );
  const cartRestoreRef = useRef(false);

  useEffect(() => {
    cartRestoreRef.current = false;
  }, [repertoireId]);

  useEffect(() => {
    if (!repertoireId || cartRestoreRef.current) return;
    if (cart?.repertoireId === repertoireId && cart.seats.length > 0) {
      setOfferId(cart.offerId);
      setSeats(cart.seats);
      setMapSelectedSeats(cart.mapSelectedSeats ?? []);
      cartRestoreRef.current = true;
    }
  }, [repertoireId, cart]);

  useEffect(() => {
    if (cart !== null) return;
    if (!offerId && seats.length === 0 && mapSelectedSeats.length === 0) return;
    setOfferId(null);
    setSeats([]);
    setMapSelectedSeats([]);
    setPurchaseOpen(false);
  }, [cart, offerId, seats.length, mapSelectedSeats.length, setPurchaseOpen]);

  useEffect(() => {
    if (!repertoireId || !offerId || purchaseSeats.length === 0) return;
    setCart({
      repertoireId,
      offerId,
      seats: purchaseSeats,
      mapSelectedSeats,
      eventTitle: displayTitle,
      baseTotalRub,
      sessionLabel: purchaseSessionLabel,
      seatLabels: purchaseSeatLabels,
      mapOfferSelections: mapOfferSelections.length > 0 ? mapOfferSelections : undefined,
      descriptionLead:
        heroLeadDisplay ??
        (mergedVenue
          ? `Площадка: ${mergedVenue}${mergedVenueAddress ? `, ${mergedVenueAddress}` : ''}`
          : null),
      ticketHref,
      requiresFanId,
    });
  }, [
    repertoireId,
    offerId,
    purchaseSeats,
    mapSelectedSeats,
    displayTitle,
    baseTotalRub,
    purchaseSessionLabel,
    purchaseSeatLabels,
    mapOfferSelections,
    heroLeadDisplay,
    mergedVenue,
    mergedVenueAddress,
    ticketHref,
    requiresFanId,
    setCart,
  ]);

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
    listableOffers.length > 0 && Number.isFinite(pb.min) && pb.min > 0 ? pb.min : null;

  const hallSvg = useMemo(() => {
    if (!stageIdEff) return ctx?.stageMap?.svg_markup ?? null;
    if (ctx?.stageId === stageIdEff && ctx?.stageMap?.svg_markup) {
      return ctx.stageMap.svg_markup;
    }
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
    ctx?.stageMap,
    ctx?.stageMap?.svg_markup,
  ]);

  const layoutJsonForStage = useMemo(() => {
    if (!stageIdEff) return ctx?.stageMap?.layout_json;
    const ctxLayout =
      ctx?.stageId === stageIdEff ? (ctx?.stageMap?.layout_json as Record<string, unknown> | null) : null;
    const mapLayout = mapByStageId?.layout_json as Record<string, unknown> | undefined;

    /** Лужники: sellableSeats с GET /map (adaptLuzhniki + live offers), тяжёлое — из контекста. */
    if (isLuzhnikiFootballStage && mapLayout && stageMapFetched) {
      return {
        ...(ctxLayout ?? mapLayout),
        ...mapLayout,
        sellableSeats: Array.isArray(mapLayout.sellableSeats) ? mapLayout.sellableSeats : [],
        sellableSeatsFromLiveOffers: mapLayout.sellableSeatsFromLiveOffers === true,
        allSeatCoordinates: ctxLayout?.allSeatCoordinates ?? mapLayout.allSeatCoordinates,
        seats: ctxLayout?.seats ?? mapLayout.seats,
        sectorMode: ctxLayout?.sectorMode ?? mapLayout.sectorMode,
        svg_markup: ctxLayout?.svg_markup ?? mapLayout.svg_markup,
      };
    }

    if (ctxLayout) return ctxLayout;
    if (!stageMapFetched) {
      return ctx?.stageId === stageIdEff ? ctx?.stageMap?.layout_json ?? null : null;
    }
    return mapLayout ?? (ctx?.stageId === stageIdEff ? ctx?.stageMap?.layout_json ?? null : null);
  }, [
    stageIdEff,
    stageMapFetched,
    isLuzhnikiFootballStage,
    mapByStageId?.layout_json,
    ctx?.stageId,
    ctx?.stageMap,
    ctx?.stageMap?.layout_json,
  ]);

  const seatSelectionDisabledUi = useMemo(() => {
    const lj = layoutJsonForStage;
    if (!lj || typeof lj !== 'object') return false;
    return (lj as Record<string, unknown>).seatSelectionDisabled === true;
  }, [layoutJsonForStage]);

  const externalPlanUrl = useMemo(() => {
    const t = (s: string | null | undefined) =>
      s != null && String(s).trim() ? String(s).trim() : null;
    if (!stageIdEff) return t(ctx?.externalPlanUrl);
    if (ctx?.stageId === stageIdEff && ctx?.stageMap) {
      return t(ctx.externalPlanUrl);
    }
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
    ctx?.stageMap,
    ctx?.externalPlanUrl,
  ]);

  /** Не показывать «план недоступен», пока ждём контекст или fetch карты по stageId (избегаем ложной заглушки). */
  const hallMapLoadSettled = useMemo(() => {
    if (ctxLoading) return false;
    if (!stageIdEff) return true;
    if (hasUsableHallSvgFromContext) return true;
    return stageMapFetched;
  }, [ctxLoading, stageIdEff, hasUsableHallSvgFromContext, stageMapFetched]);

  const showHallMissingCard =
    Boolean(!hallSvg && !externalPlanUrl && hallMapLoadSettled);

  /** Блок схемы сразу, пока тянем SVG/layout (Лужники deferred и т.п.). */
  const showHallMapShell = useMemo(() => {
    if (!stageIdEff || showHallMissingCard) return false;
    if (hallMapLoadSettled && !hallSvg && externalPlanUrl) return false;
    return Boolean(hallSvg) || !hallMapLoadSettled || svgDeferred || isLuzhnikiFootballStage;
  }, [
    stageIdEff,
    showHallMissingCard,
    hallMapLoadSettled,
    hallSvg,
    externalPlanUrl,
    svgDeferred,
    isLuzhnikiFootballStage,
  ]);

  /** После ответа API офферов нет (конец продажи / пусто) — всё равно можно показать схему зала. */
  const noOffersAfterFetch = !isLoading && (isSuccess || isError) && offers.length === 0;

  /** Ключ сеанса для карты: без офферов используем «_», чтобы отрисовать подложку без выбора даты. */
  const hallMapSessionKey = useMemo(() => {
    const key = selectedSessionKey ?? defaultSessionKey;
    if (key) return key;
    if (noOffersAfterFetch) return '_';
    return null;
  }, [selectedSessionKey, defaultSessionKey, noOffersAfterFetch]);

  const hallMapReady = Boolean(hallSvg?.trim() && hallMapSessionKey);

  /** Офферы выбранного сеанса для схемы (при архивном событии список пустой, секторный режим остаётся ориентиром). */
  const offersForMap = useMemo(() => {
    if (!hallMapSessionKey) return [];
    return (listableOffers as OfferRow[]).filter(
      (o) => (o.EventDateTime ?? '_') === hallMapSessionKey,
    );
  }, [hallMapSessionKey, listableOffers]);

  /** Фокус карты — только клик по сектору на схеме, не фильтр списка. */
  const mapFocusSectorNorm: string | null = null;

  useEffect(() => {
    setMapSelectedPriceKey(null);
  }, [hallMapSessionKey]);

  const priceChipsForMap = useMemo((): PriceFilterChip[] => {
    const keys = Array.from(new Set(offersForMap.map(priceKey)))
      .filter((pk) => Number.isFinite(Number(pk)) && Number(pk) > 0)
      .sort((a, b) => Number(a) - Number(b));
    return keys.map((pk, i) => ({
      priceKey: pk,
      price: Number(pk),
      color: priceColorMap.get(pk) ?? colorForPriceIndex(i),
      showPlus: i === keys.length - 1 && keys.length > 1,
    }));
  }, [offersForMap, priceColorMap]);

  const offersForMapDisplay = useMemo(() => {
    if (!mapSelectedPriceKey) return offersForMap;
    return offersForMap.filter((o) => priceKey(o) === mapSelectedPriceKey);
  }, [offersForMap, mapSelectedPriceKey]);

  const handleMapPriceSelect = useCallback(
    (pk: string) => {
      if (mapSelectedPriceKey === pk) {
        setMapSelectedPriceKey(null);
        if (!isLuzhnikiFootballStage) {
          setFilterState((s) => ({ ...s, priceRange: [pb.min, pb.max] }));
        }
        return;
      }
      const n = Number(pk);
      setMapSelectedPriceKey(pk);
      if (!isLuzhnikiFootballStage && Number.isFinite(n)) {
        setFilterState((s) => ({ ...s, priceRange: [n, n] }));
      }
    },
    [isLuzhnikiFootballStage, mapSelectedPriceKey, pb.min, pb.max],
  );

  const handleMapPriceReset = useCallback(() => {
    setMapSelectedPriceKey(null);
    if (!isLuzhnikiFootballStage) {
      setFilterState((s) => ({ ...s, priceRange: [pb.min, pb.max] }));
    }
  }, [isLuzhnikiFootballStage, pb.min, pb.max]);

  const hallSchemeSubtitle = useMemo(() => {
    if (seatSelectionDisabledUi) {
      const lj = layoutJsonForStage as Record<string, unknown> | undefined;
      const pbilet = lj?.pbilet as Record<string, unknown> | undefined;
      const seatsArr = Array.isArray(lj?.seats) ? lj.seats : [];
      if (String(pbilet?.previewMode ?? '') === 'coordinates_background_only') {
        return 'План трибун для ориентира (как у билетного оператора). Отметки отдельных мест появятся после выгрузки координат из билетной системы или сохранения снимка API pbilet.';
      }
      if (
        seatsArr.length >= 2 &&
        lj?.grayHallWhenNoOffers !== false &&
        offersForMap.length === 0
      ) {
        return 'Все места на схеме показаны серым для ориентира. Когда появятся данные GetBilet, доступность и цены подсветятся на этих же координатах.';
      }
      return 'Схема для ориентира: при включённой модели мест — точки могут быть упрощёнными; выбор мест и покупка появятся после запуска продаж.';
    }
    if (noOffersAfterFetch) {
      return 'Продажа билетов по этому мероприятию сейчас недоступна — схема мест проведения для ориентира.';
    }
    return 'Кликните по свободному месту на схеме, затем нажмите «Забронировать».';
  }, [layoutJsonForStage, noOffersAfterFetch, offersForMap.length, seatSelectionDisabledUi]);

  useEffect(() => {
    if (!offerId) return;
    const still = offersForMap.some((o) => String(o.Id ?? '') === offerId);
    if (!still) {
      setOfferId(null);
      setSeats([]);
      setMapSelectedSeats([]);
    }
  }, [offersForMap, offerId]);

  const colorSeat = useCallback(
    (p: string) => priceColorMap.get(p) ?? colorForPriceIndex(0),
    [priceColorMap],
  );

  const selectedOfferForMap = useMemo(
    () => (offerId ? (offersForMap.find((o) => String(o.Id ?? '') === offerId) ?? null) : null),
    [offerId, offersForMap],
  );

  const resetSelectedSeats = useCallback(() => {
    setOfferId(null);
    setSeats([]);
    setMapSelectedSeats([]);
    setPurchaseOpen(false);
    clearCart();
  }, [clearCart, setPurchaseOpen]);

  const navigateToPlacesList = useCallback(() => {
    setMapDialogOpen(false);
    requestAnimationFrame(() => {
      document.getElementById('ticket-places-and-prices')?.scrollIntoView({ behavior: 'smooth' });
    });
  }, []);

  const ogImage = absoluteUrl(origin, coverUrl || posterSideUrl);

  const canonicalSourceTitle = useMemo(
    () => ctx?.title?.trim() || resolvedEventFromSlug?.title?.trim() || '',
    [ctx?.title, resolvedEventFromSlug],
  );

  const canonicalSlug = useMemo(() => slugify(canonicalSourceTitle) || 'event', [canonicalSourceTitle]);

  const canonicalTicketPath = useMemo(() => {
    if (!canonicalSlug || canonicalSlug === 'event') return '/events';
    return `/ticket/${canonicalSlug}`;
  }, [canonicalSlug]);

  const searchStrForCanonical = useMemo(() => searchParams.toString(), [searchParams]);

  useEffect(() => {
    if (!displayTitle) return;
    const key = `${repertoireId || 'no-rep'}::${displayTitle}`;
    if (viewedGoalKeyRef.current === key) return;
    reachMetrikaGoal('view_event_page', {
      repertoire_id: repertoireId || undefined,
      event_title: displayTitle,
    });
    viewedGoalKeyRef.current = key;
  }, [repertoireId, displayTitle]);

  useEffect(() => {
    if (!purchaseOpen || purchaseSeats.length === 0) return;
    const snapshot = `${repertoireId || 'no-rep'}::${offerId || 'no-offer'}::${purchaseSeats.join(',')}`;
    if (addToCartSnapshotRef.current === snapshot) return;
    reachMetrikaGoal('add_to_cart', {
      repertoire_id: repertoireId || undefined,
      offer_id: offerId || undefined,
      items_count: purchaseSeats.length,
      total_rub: baseTotalRub,
    });
    addToCartSnapshotRef.current = snapshot;
  }, [purchaseOpen, purchaseSeats, repertoireId, offerId, baseTotalRub]);

  useEffect(() => {
    document.body.setAttribute('data-page', '/ticket');
    return () => document.body.removeAttribute('data-page');
  }, []);

  useEffect(() => {
    if (routeKeyIsId || !routeSlug || !slugResolveFetched) return;
    if (legacyRepertoireId.trim() && legacySlug.trim()) return;
    if (routeSlug === DEMO_REPERTOIRE_ID) return;
    if (repertoireId) return;
    if (isBlockedTicketSlug(routeSlug)) {
      navigate('/events', { replace: true });
      return;
    }
    if (!resolvedEventFromSlug) {
      navigate('/events', { replace: true });
    }
  }, [
    navigate,
    resolvedEventFromSlug,
    repertoireId,
    routeKeyIsId,
    routeSlug,
    slugResolveFetched,
    legacyRepertoireId,
    legacySlug,
  ]);

  useEffect(() => {
    setShowAllOfferRows(false);
  }, [repertoireId]);

  /** Канонический URL: только /ticket/:slug, без id GetBilet в пути. */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!routeKey || !canonicalSourceTitle || canonicalSlug === 'event') return;
    if (!routeKeyIsId && !resolvedEventFromSlug && !repertoireId) return;
    if (routeKeyIsId && !ctx?.title?.trim()) return;
    const wantSlug = canonicalSlug;
    const target = `/ticket/${wantSlug}`;
    const cur = `${window.location.pathname}${window.location.search}`;
    if (cur !== target) {
      navigate(target, { replace: true });
    }
  }, [
    routeKey,
    canonicalSourceTitle,
    canonicalSlug,
    searchStrForCanonical,
    routeKeyIsId,
    resolvedEventFromSlug,
    ctx?.title,
    navigate,
  ]);

  return (
    <>
      <SeoMetaTags
        title={`Купить билеты на ${displayTitle} - выбор мест онлайн`}
        description={
          (ctx?.heroLead?.trim() || ctx?.descriptionSnippet?.trim())?.slice(0, 160) ||
          'Выберите лучшие места на схеме зала, оформите заказ онлайн и получите электронный билет сразу после оплаты.'
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
                {mergedVenue || mergedVenueAddress ? (
                  <div className={styles.heroVenueBlock}>
                    <Typography variant="caption" component="p" className={styles.heroVenueKicker}>
                      Площадка проведения
                    </Typography>
                    {mergedVenue ? (
                      <Typography variant="body2" component="p" className={styles.heroVenue}>
                        {mergedVenue}
                      </Typography>
                    ) : null}
                    {mergedVenueAddress ? (
                      <Typography variant="body2" component="p" className={styles.heroVenueAddress}>
                        {mergedVenueAddress}
                      </Typography>
                    ) : null}
                  </div>
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
          {paymentFailed ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Оплата не завершилась. Деньги не списаны: можно выбрать места ещё раз или попробовать другую карту.
            </Alert>
          ) : null}

          {requiresFanId ? (
            <Alert severity="info" sx={{ mb: 2 }} icon={false}>
              <strong>FAN ID обязателен.</strong> {FAN_ID_NOTICE}
            </Alert>
          ) : null}

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
              <div className={styles.scheduleHeader}>
                <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '0.04em' }}>
                  Расписание
                </Typography>
                <button
                  type="button"
                  className={styles.scheduleToggle}
                  onClick={() => setScheduleCollapsed((v) => !v)}
                  aria-expanded={!scheduleCollapsed}
                >
                  {scheduleCollapsed ? 'Показать календарь' : 'Скрыть календарь'}
                </button>
              </div>
              {!scheduleCollapsed ? (
                <>
                  {mergedVenue || mergedVenueAddress ? (
                    <Box sx={{ mb: 1.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                        Площадка проведения
                      </Typography>
                      {mergedVenue ? (
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                          {mergedVenue}
                        </Typography>
                      ) : null}
                      {mergedVenueAddress ? (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {mergedVenueAddress}
                        </Typography>
                      ) : null}
                    </Box>
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
                </>
              ) : null}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center', mt: 2 }}>
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
              Выберите места
            </Typography>
          </Box>

          {showHallMapShell ? (
            <Paper className={styles.primaryHallMap} elevation={0}>
              <Box className={styles.primaryHallMapHead}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                    Схема зала
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {hallMapReady ? hallSchemeSubtitle : 'Загрузка схемы…'}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<EventSeatIcon />}
                  onClick={() => setMapDialogOpen(true)}
                  disabled={!hallMapReady}
                >
                  На весь экран
                </Button>
              </Box>
              {hallMapReady ? (
                <>
                  {priceChipsForMap.length > 0 ? (
                    <TicketPriceFilterCarousel
                      chips={priceChipsForMap}
                      selectedPriceKey={mapSelectedPriceKey}
                      onSelect={handleMapPriceSelect}
                      onReset={handleMapPriceReset}
                    />
                  ) : null}
                  <Suspense fallback={<HallMapLoadingPane />}>
                    <TicketHallInteractiveBlock
                      hallSvgHtml={hallSvg!}
                      layoutJson={layoutJsonForStage}
                      offers={offersForMap}
                      getPriceKey={(o) => priceKey(o as OfferRow)}
                      colorForSeat={colorSeat}
                      activeOfferId={offerId}
                      selectedSeats={seats}
                      onToggleSeat={toggleSeat}
                      selectedOffer={selectedOfferForMap}
                      onReserveFromMap={() => setPurchaseOpen(true)}
                      onClearSelection={resetSelectedSeats}
                      onSelectionChange={handleMapSelectionChange}
                      reservePending={false}
                      onNavigateToList={navigateToPlacesList}
                      hideSelectionBar
                      showFanIdNotice={requiresFanId}
                      focusSectorNorm={mapFocusSectorNorm}
                    />
                  </Suspense>
                </>
              ) : (
                <HallMapLoadingPane />
              )}
            </Paper>
          ) : null}

          {!isLoading && !isError && listableOffers.length > 0 && (
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
                {isLuzhnikiFootballStage ? (
                  <Autocomplete
                    size="small"
                    sx={{ minWidth: 280, flex: '1 1 280px', maxWidth: 420 }}
                    options={[
                      { norm: 'all', label: 'Все сектора' },
                      ...stadiumSectorOptions,
                    ]}
                    getOptionLabel={(o) => o.label}
                    isOptionEqualToValue={(a, b) => a.norm === b.norm}
                    value={
                      stadiumSectorOptions.find((s) => s.norm === stadiumSectorFilter) ??
                      (stadiumSectorFilter === 'all'
                        ? { norm: 'all', label: 'Все сектора' }
                        : { norm: stadiumSectorFilter, label: stadiumSectorFilter })
                    }
                    onChange={(_, v) => setStadiumSectorFilter(v?.norm ?? 'all')}
                    filterOptions={(options, { inputValue }) => {
                      const q = inputValue.trim().toLowerCase();
                      if (!q) return options;
                      return options.filter(
                        (o) =>
                          o.norm === 'all' ||
                          o.label.toLowerCase().includes(q) ||
                          o.norm.includes(q.replace(/\s+/g, '')),
                      );
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Поиск сектора"
                        placeholder="A101, C143, D228…"
                      />
                    )}
                  />
                ) : (
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
                )}
                {!isLuzhnikiFootballStage ? (
                  <>
                    <Box sx={{ flex: '1 1 260px', minWidth: 200, px: 0.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
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
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
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
                  </>
                ) : null}
              </Box>
              {filteredOffers.length < listableOffers.length ? (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
                  Показано {filteredOffers.length} из {listableOffers.length} предложений
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
              defaultExpanded={!hallSvg}
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
                  {hallSvg ? 'Список мест (дополнительно)' : 'Список мест'}
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
                        const bg = priceColorMap.get(pk) ?? colorForPriceIndex(0);
                        const seatList = getOfferSeatList(row);
                        const seatless = isSeatlessOfferRow(row);
                        const namedTicket = namedTicketUxEnabled && isNamedTicketOfferRow(row);
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
                              {seatless ? (
                                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.45 }}>
                                  {namedTicket
                                    ? 'Именной билет: в каталоге нет номеров мест — выберите соседние места на схеме зала.'
                                    : 'Номера мест в выгрузке нет — выберите место на схеме зала или укажите ряд в комментарии при оплате.'}
                                  {hallSvg ? (
                                    <>
                                      {' '}
                                      <Button
                                        type="button"
                                        size="small"
                                        variant="text"
                                        sx={{ p: 0, minWidth: 0, verticalAlign: 'baseline' }}
                                        onClick={() => setMapDialogOpen(true)}
                                      >
                                        Открыть схему
                                      </Button>
                                    </>
                                  ) : null}
                                </Typography>
                              ) : (
                                seatList.map((seat) => {
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
                                })
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Paper>
                ))}
                {flatSessionRows.length > offerRowsPreviewLimit ? (
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

          <Suspense fallback={null}>
            <TicketCheckoutPageExtras
              repertoireId={repertoireId}
              displayTitle={displayTitle}
            descriptionSnippet={ctx?.descriptionSnippet}
            venueLabel={mergedVenue}
              venueAddress={mergedVenueAddress}
              hasDescriptionInHero={Boolean(heroLeadDisplay?.trim())}
            />
          </Suspense>
        </Box>

        <Dialog
          open={Boolean(mapDialogOpen && hallSvg && hallMapSessionKey)}
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
              ) : noOffersAfterFetch ? (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                  Нет доступных предложений — показана схема площадки.
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
            {showHallMapShell ? (
              <Box sx={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', px: 0 }}>
                {hallMapReady ? (
                  <>
                    {priceChipsForMap.length > 0 ? (
                      <TicketPriceFilterCarousel
                        chips={priceChipsForMap}
                        selectedPriceKey={mapSelectedPriceKey}
                        onSelect={handleMapPriceSelect}
                        onReset={handleMapPriceReset}
                      />
                    ) : null}
                    <Suspense fallback={<HallMapLoadingPane />}>
                      <TicketHallInteractiveBlock
                        variant="dialog"
                        hallSvgHtml={hallSvg!}
                        layoutJson={layoutJsonForStage}
                        offers={offersForMap}
                        getPriceKey={(o) => priceKey(o as OfferRow)}
                        colorForSeat={colorSeat}
                        activeOfferId={offerId}
                        selectedSeats={seats}
                        onToggleSeat={toggleSeat}
                        selectedOffer={selectedOfferForMap}
                        onReserveFromMap={() => setPurchaseOpen(true)}
                        onClearSelection={resetSelectedSeats}
                        onSelectionChange={handleMapSelectionChange}
                        reservePending={false}
                        onNavigateToList={navigateToPlacesList}
                        hideSelectionBar
                        showFanIdNotice={requiresFanId}
                        focusSectorNorm={mapFocusSectorNorm}
                      />
                    </Suspense>
                  </>
                ) : (
                  <HallMapLoadingPane />
                )}
              </Box>
            ) : null}
          </DialogContent>
        </Dialog>
      </Box>
    </>
  );
}
