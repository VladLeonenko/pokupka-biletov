import { isValid, parseISO } from 'date-fns';
import { getApiBase } from '@/utils/apiBase';
import { deriveBiletEventDateParts } from '@/utils/eventDateLabels';
import { getTicketsCityId } from '@/utils/ticketsCity';
import {
  classifyEventTitle,
  type EventTitleKind,
} from '@/utils/eventTitleHeuristics';

export type BiletMeta = {
  protocol: string;
  cityIdRequired: boolean;
  restV2?: boolean;
};

let metaCache: BiletMeta | null = null;

/** Согласование с backend/.env без ручного VITE_GETBILET_PROTOCOL. */
export async function getBiletMeta(): Promise<BiletMeta> {
  if (metaCache) return metaCache;
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/api/bilet/meta`, { headers: { Accept: 'application/json' } });
    if (res.ok) {
      const j = (await res.json()) as Record<string, unknown>;
      metaCache = {
        protocol: typeof j.protocol === 'string' ? j.protocol : 'bil24_json',
        cityIdRequired: Boolean(j.cityIdRequired),
        restV2: Boolean(j.restV2),
      };
      return metaCache;
    }
  } catch {
    /* старый бэкенд */
  }
  const v = import.meta.env.VITE_GETBILET_PROTOCOL?.trim().toLowerCase();
  const restV2 = v === 'rest_v2' || v === 'restv2';
  metaCache = {
    protocol: restV2 ? 'rest_v2' : 'bil24_json',
    cityIdRequired: !restV2,
    restV2,
  };
  return metaCache;
}

export function clearBiletMetaCache() {
  metaCache = null;
}

/**
 * Если VITE_GETBILET_PROTOCOL совпадает с бэкендом — не делаем лишний GET /api/bilet/meta
 * перед /events и /venues.
 */
function biletMetaFromViteEnv(): BiletMeta | null {
  const v = import.meta.env.VITE_GETBILET_PROTOCOL?.trim().toLowerCase();
  if (!v) return null;
  if (v === 'rest_v2' || v === 'restv2') {
    return { protocol: 'rest_v2', cityIdRequired: false, restV2: true };
  }
  if (v === 'rest') {
    return { protocol: 'rest', cityIdRequired: false, restV2: false };
  }
  if (v === 'bil24_json' || v === 'bil24') {
    return { protocol: 'bil24_json', cityIdRequired: true, restV2: false };
  }
  return null;
}

async function resolveBiletMetaForFetch(): Promise<BiletMeta> {
  const fromEnv = biletMetaFromViteEnv();
  if (fromEnv) return fromEnv;
  return getBiletMeta();
}

function cityId(): string {
  return getTicketsCityId();
}

export type NormalizedBiletEvent = {
  id: string;
  /** Репертуар GetBilet (для /ticket/:repertoireId), если id — составной сеансовый ключ */
  repertoireId?: string;
  title: string;
  subtitle?: string;
  dateLabel?: string;
  isoDate?: string;
  venue?: string;
  genre?: string;
  /** Категория по эвристике названия (см. backend eventTitleHeuristics), если API не даёт жанр */
  inferredCategoryLabel?: string;
  inferredKind?: EventTitleKind;
  age?: string;
  /** Постер (квадрат/афиша) */
  imageUrl?: string;
  /** Широкий баннер / hero */
  bannerUrl?: string;
  /** Сцена GetBilet (для схемы зала) */
  stageId?: string;
  author?: string;
  director?: string;
  /** Премьера из поля API или из названия */
  isPremiere?: boolean;
  /** Витрина: «14.04» и «ВТОРНИК» — если заданы в данных / демо */
  displayDate?: string;
  weekday?: string;
  /** Время начала «19:00», если известно */
  timeLabel?: string;
};

/**
 * Ссылка на страницу выбора мест.
 * Локальные `/uploads/...` добавляются в query как подстраховка до загрузки контекста из API.
 */
export function ticketCheckoutHref(
  ev: Pick<NormalizedBiletEvent, 'id' | 'title' | 'stageId'> & {
    imageUrl?: string;
    bannerUrl?: string;
    repertoireId?: string;
    isoDate?: string;
  },
): string {
  const rep =
    ev.repertoireId?.trim() ||
    (ev.id.includes('::') ? ev.id.split('::')[0]?.trim() : '') ||
    ev.id;
  const q = new URLSearchParams({ title: ev.title });
  if (ev.stageId?.trim()) q.set('stageId', ev.stageId.trim());
  if (ev.isoDate?.trim()) q.set('eventDateTime', ev.isoDate.trim());
  const poster = ev.imageUrl?.trim();
  if (poster && poster.startsWith('/uploads/') && poster.length < 512) {
    q.set('poster', poster);
  }
  const ban = ev.bannerUrl?.trim();
  if (ban && ban.startsWith('/uploads/') && ban.length < 512) {
    q.set('banner', ban);
  }
  return `/ticket/${encodeURIComponent(rep)}?${q.toString()}`;
}

export type NormalizedVenue = {
  id: string;
  name: string;
};

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  }
  return undefined;
}

/** Mongo ObjectId в поле «категория» — не показываем как жанр */
export function looksLikeMongoId(s: string): boolean {
  return /^[a-f0-9]{24}$/i.test(s.trim());
}

/** Шаблонные SEO-строки вместо площадки — не показываем как подзаголовок карточки */
export function isTicketsSeoPlaceholderSubtitle(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  if (/Билеты на событие/i.test(t)) return true;
  if (/в продаже онлайн/i.test(t)) return true;
  if (/выберите дату/i.test(t)) return true;
  return false;
}

function truncateCardLine(s: string, max = 320): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 3).trimEnd()}…`;
}

/**
 * Под заголовком карточки: площадка (театр / сцена), иначе короткое описание из API без SEO-заглушек.
 */
export function biletEventCardSubtitle(
  venue: string | undefined,
  apiSubtitle: string | undefined,
): string | undefined {
  const v = venue?.trim();
  if (v) return truncateCardLine(v);
  const sub = apiSubtitle?.trim();
  if (sub && !isTicketsSeoPlaceholderSubtitle(sub)) return truncateCardLine(sub);
  return undefined;
}

function pickBool(obj: Record<string, unknown>, keys: string[]): boolean | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'boolean') return v;
    if (v === 1 || v === '1' || v === 'true') return true;
    if (v === 0 || v === '0' || v === 'false') return false;
  }
  return undefined;
}

function extractArray(raw: unknown): unknown[] {
  if (!raw || typeof raw !== 'object') return [];
  const o = raw as Record<string, unknown>;
  const candidates = [
    'actions',
    'Actions',
    'data',
    'events',
    'Events',
    'items',
    'Items',
    'ResultData',
    'venues',
    'Venues',
  ];
  for (const k of candidates) {
    const v = o[k];
    if (Array.isArray(v)) return v;
  }
  if (Array.isArray(raw)) return raw;
  return [];
}

/**
 * Нормализация ответа GET_ACTIONS_V2 / REST …/events / rest_v2 каталог.
 */
export function normalizeBiletEventsPayload(raw: unknown): NormalizedBiletEvent[] {
  const arr = extractArray(raw);
  const out: NormalizedBiletEvent[] = [];

  for (const item of arr) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const id =
      pickString(row, [
        'vitrineRowId',
        'VitrineRowId',
        'actionId',
        'id',
        'Id',
        'ID',
        'eventId',
        'EventId',
        'RepertoireId',
      ]) ?? '';
    const repertoireId = pickString(row, ['RepertoireId', 'repertoireId', 'repertoireID']);
    const title =
      pickString(row, [
        'actionName',
        'name',
        'Name',
        'title',
        'Title',
        'eventName',
        'subject',
      ]) ?? 'Без названия';
    let subtitle = pickString(row, [
      'shortDescription',
      'ShortDescription',
      'description',
      'Description',
      'subtitle',
      'Subtitle',
    ]);
    if (subtitle && looksLikeMongoId(subtitle)) subtitle = undefined;
    const venue = pickString(row, [
      'venueName',
      'placeName',
      'hallName',
      'venue',
      'Venue',
      'PlaceName',
      'StageName',
    ]);
    let genre = pickString(row, ['genreName', 'genre', 'Genre', 'categoryName', 'Category']);
    if (genre && looksLikeMongoId(genre)) genre = undefined;
    let age = pickString(row, ['age', 'ageLimit', 'Age', 'restriction', 'AgeLimit']);
    if (age && looksLikeMongoId(age)) age = undefined;
    const dateLabel =
      pickString(row, [
        'beginDateTime',
        'beginDate',
        'dateTime',
        'date',
        'Date',
        'startDate',
        'eventDate',
        'EventDateTime',
        'eventDateTime',
      ]) ?? undefined;
    const isoRaw = pickString(row, [
      'beginDateTimeISO',
      'startDateTime',
      'isoDate',
      'BeginDateTime',
      'beginDateTime',
      'EventDateTime',
      'eventDateTime',
      'StartDateTime',
      'DateTimeUTC',
      'beginDateTimeUtc',
    ]);
    const imageUrl = pickString(row, [
      'posterUrl',
      'poster',
      'Poster',
      'imageUrl',
      'ImageUrl',
      'imageURL',
      'image',
      'Image',
      'coverImage',
      'CoverImage',
      'smallImage',
      'LargeImage',
      'PhotoUrl',
      'photoUrl',
      'MainImageUrl',
    ]);
    const bannerUrl = pickString(row, ['BannerUrl', 'bannerUrl', 'BannerURL']);
    const stageId = pickString(row, ['stageId', 'StageId']);
    const author = pickString(row, ['authorName', 'Author', 'author', 'playwright', 'AuthorName']);
    const director = pickString(row, ['directorName', 'director', 'Director', 'regisseur', 'DirectorName']);
    const premiereField = pickBool(row, ['isPremiere', 'premiere', 'IsPremiere']);
    const titleLower = title.toLowerCase();
    const isPremiere =
      premiereField === true || titleLower.includes('премьер') || titleLower.includes('premiere');

    if (!id && !title) continue;
    const derived = deriveBiletEventDateParts(isoRaw, dateLabel);
    const displayDate = pickString(row, ['displayDate']) ?? derived.displayDate;
    const weekday = pickString(row, ['weekday']) ?? derived.weekday;
    const timeLabel = pickString(row, ['timeLabel']) ?? derived.timeLabel;
    const { categoryLabel: inferredCategoryLabel, kind: inferredKind } = classifyEventTitle(title, {
      subtitle: subtitle?.trim(),
      genre,
    });
    const subtitleEff = biletEventCardSubtitle(venue, subtitle);

    out.push({
      id: id || `anon-${out.length}`,
      repertoireId: repertoireId || undefined,
      title,
      subtitle: subtitleEff,
      dateLabel,
      isoDate: isoRaw,
      displayDate,
      weekday,
      timeLabel,
      venue,
      genre,
      inferredCategoryLabel,
      inferredKind,
      age,
      imageUrl,
      bannerUrl,
      stageId,
      author,
      director,
      isPremiere: isPremiere || undefined,
    });
  }

  return out;
}

function extractCityRows(raw: unknown): unknown[] {
  if (!raw || typeof raw !== 'object') return [];
  const o = raw as Record<string, unknown>;
  for (const k of ['ResultData', 'resultData', 'data', 'cities', 'Cities', 'items', 'Items']) {
    const v = o[k];
    if (Array.isArray(v)) return v;
  }
  if (Array.isArray(raw)) return raw;
  return [];
}

/** Ответ GET /api/bilet/cities (BIL24 GET_CITIES / REST) → пары для селектора. */
export function normalizeBiletCitiesPayload(raw: unknown): { id: string; label: string }[] {
  const arr = extractCityRows(raw);
  const out: { id: string; label: string }[] = [];
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    const id = pickString(r, ['id', 'Id', 'ID', 'cityId', 'CityId']);
    const label = pickString(r, ['name', 'Name', 'title', 'Title', 'cityName', 'CityName', 'label', 'Label']);
    if (!id?.trim() || !label?.trim()) continue;
    out.push({ id: id.trim(), label: label.trim() });
  }
  return out;
}

export async function fetchBiletCities(): Promise<{ id: string; label: string }[]> {
  const meta = await getBiletMeta();
  if (meta.restV2) return [];
  const base = getApiBase();
  const res = await fetch(`${base}/api/bilet/cities`, { headers: { Accept: 'application/json' } });
  if (res.status === 501 || res.status === 404) return [];
  if (!res.ok) return [];
  const raw = await res.json().catch(() => null);
  return normalizeBiletCitiesPayload(raw);
}

export function normalizeVenuesPayload(raw: unknown): NormalizedVenue[] {
  const arr = extractArray(raw);
  const out: NormalizedVenue[] = [];
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const id = pickString(row, ['id', 'Id', 'ID', 'venueId', 'VenueId']) ?? '';
    const name = pickString(row, ['name', 'Name', 'venueName', 'VenueName', 'title', 'Title']);
    if (!name) continue;
    out.push({ id: id || name, name });
  }
  return out;
}

export async function fetchBiletEvents(query?: Record<string, string>): Promise<unknown> {
  const base = getApiBase();
  const meta = await resolveBiletMetaForFetch();
  const params = new URLSearchParams({ ...(query || {}) });
  if (meta.cityIdRequired) {
    params.set('cityId', cityId());
  }
  const url = `${base}/api/bilet/events?${params}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || `HTTP ${res.status}`);
  }
  return res.json();
}

/** Площадки (GET_VENUES / REST / rest_v2 GetPlaceList). */
export async function fetchBiletVenues(): Promise<unknown> {
  const base = getApiBase();
  const meta = await resolveBiletMetaForFetch();
  const params = new URLSearchParams();
  if (meta.cityIdRequired) {
    params.set('cityId', cityId());
  }
  const url = `${base}/api/bilet/venues?${params}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || `HTTP ${res.status}`);
  }
  return res.json();
}

export function uniqueVenuesFromEvents(events: NormalizedBiletEvent[]): string[] {
  const s = new Set<string>();
  for (const e of events) {
    if (e.venue?.trim()) s.add(e.venue.trim());
  }
  return Array.from(s).sort((a, b) => a.localeCompare(b, 'ru'));
}

function eventSortTimeMs(ev: NormalizedBiletEvent): number {
  const raw = ev.isoDate?.trim();
  if (raw) {
    const d = parseISO(raw);
    if (isValid(d)) return d.getTime();
  }
  return Number.MAX_SAFE_INTEGER;
}

/** Ключ одного спектакля: репертуар API, префикс составного id (`rep::…`) или название. */
export function biletEventShowKey(ev: NormalizedBiletEvent): string {
  const rep = ev.repertoireId?.trim();
  if (rep) return `rep:${rep}`;
  if (ev.id.includes('::')) {
    const head = ev.id.split('::')[0]?.trim();
    if (head) return `rep:${head}`;
  }
  return `title:${ev.title.trim().replace(/\s+/g, ' ').toLowerCase()}`;
}

/**
 * Один ряд на спектакль: при нескольких датах оставляем ближайшую по isoDate.
 * Порядок входа не важен — сортируем по дате, затем уникализируем по ключу.
 */
export function dedupeBiletEventsByShow(events: NormalizedBiletEvent[]): NormalizedBiletEvent[] {
  const sorted = [...events].sort((a, b) => eventSortTimeMs(a) - eventSortTimeMs(b));
  const seen = new Set<string>();
  const out: NormalizedBiletEvent[] = [];
  for (const ev of sorted) {
    const k = biletEventShowKey(ev);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(ev);
  }
  return out;
}

export async function fetchRepertoireOffers(repertoireId: string): Promise<unknown> {
  const base = getApiBase();
  const res = await fetch(
    `${base}/api/bilet/repertoire/${encodeURIComponent(repertoireId)}/offers`,
    { headers: { Accept: 'application/json' } },
  );
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function reserveGetbiletSeats(
  offerId: string,
  seats: string[],
  repertoireId?: string,
): Promise<unknown> {
  const base = getApiBase();
  const body: Record<string, unknown> = { offerId, seats };
  if (repertoireId?.trim()) body.repertoireId = repertoireId.trim();
  const res = await fetch(`${base}/api/bilet/reserve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg =
      data && typeof data === 'object' && 'message' in data
        ? String((data as { message: unknown }).message)
        : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

/** Ответ `GET /api/bilet/stage/:stageId/map` — строка из `getbilet_stage_maps`. */
export type StageMapRow = {
  id?: number;
  stage_external_id: string;
  place_external_id?: string | null;
  title?: string | null;
  svg_markup: string | null;
  /** Страница со схемой на сайте театра (если SVG не задан). */
  external_plan_url?: string | null;
  /** Область для условной сетки мест: `{ overlayRect: { x,y,w,h } }` в долях 0–1. */
  layout_json?: unknown;
};

/** Секции развёрнутого описания (публичная страница билета). */
export type RepertoireDescriptionSection = {
  id: string;
  title: string;
  paragraphs: string[];
};

/** Постер, баннер, stageId и SVG схемы из БД кэша + getbilet_events (без лишнего запроса к GetBilet). */
export type RepertoireContext = {
  repertoireId: string;
  stageId: string | null;
  title: string;
  descriptionSnippet: string | null;
  /** Лид героя (без заголовков секций). */
  heroLead?: string | null;
  heroKicker?: string | null;
  heroSubline?: string | null;
  eventMeta?: { label: string; value: string }[];
  /** Разбивка длинного текста по подзаголовкам (≥ ~3000 символов суммарно). */
  descriptionSections?: RepertoireDescriptionSection[];
  descriptionTotalChars?: number;
  posterUrl: string | null;
  bannerUrl: string | null;
  stageMap: (StageMapRow & { external_plan_url?: string | null }) | null;
  /** Ссылка на схемы залов на сайте театра (если задана в админке для сцены). */
  externalPlanUrl?: string | null;
};

export async function fetchRepertoireContext(repertoireId: string): Promise<RepertoireContext> {
  const base = getApiBase();
  const res = await fetch(
    `${base}/api/bilet/repertoire/${encodeURIComponent(repertoireId)}/context`,
    { headers: { Accept: 'application/json' } },
  );
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || `HTTP ${res.status}`);
  }
  return res.json() as Promise<RepertoireContext>;
}

/** Схема зала из БД (админ вставляет SVG). */
export async function fetchStageMap(stageId: string): Promise<StageMapRow | null> {
  const base = getApiBase();
  const res = await fetch(
    `${base}/api/bilet/stage/${encodeURIComponent(stageId)}/map`,
    { headers: { Accept: 'application/json' } },
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || `HTTP ${res.status}`);
  }
  return res.json() as Promise<StageMapRow>;
}

/** Флаги: включены ли шаблоны URL в `.env` (сами шаблоны не отдаются). */
export async function fetchMediaConfig(): Promise<{
  posterTemplateEnabled?: boolean;
  bannerTemplateEnabled?: boolean;
}> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/bilet/media-config`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return {};
  return res.json();
}

function normalizeSearchText(s: string): string {
  return s
    .toLowerCase()
    .replace(/\u00a0/g, ' ')
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Демо-афиша и кэш без прохода через normalize — подставить эвристики по названию. */
export function attachInferredEventFields(ev: NormalizedBiletEvent): NormalizedBiletEvent {
  const rawSub = ev.subtitle?.trim();
  const { categoryLabel, kind, descriptionBlurb } = classifyEventTitle(ev.title, {
    subtitle: rawSub,
    genre: ev.genre,
  });
  const subtitle =
    rawSub && rawSub.length > 0
      ? rawSub.length > 320
        ? `${rawSub.slice(0, 317).trimEnd()}…`
        : rawSub
      : descriptionBlurb;
  return { ...ev, inferredCategoryLabel: categoryLabel, inferredKind: kind, subtitle };
}

function eventMatchesGenreChip(ev: NormalizedBiletEvent, g: string): boolean {
  const gNorm = normalizeSearchText(g);
  /* Ошибочная метка «Спорт» в API — эвристика концерта/театра важнее */
  if (gNorm === 'спорт') {
    if (ev.inferredKind === 'concert' || ev.inferredKind === 'theater') return false;
  }
  if (ev.genre && normalizeSearchText(ev.genre).includes(g)) return true;
  const ic = ev.inferredCategoryLabel ? normalizeSearchText(ev.inferredCategoryLabel) : '';
  if (ic.includes(g)) return true;
  const titleBlob = normalizeSearchText([ev.title, ev.subtitle].filter(Boolean).join(' '));
  if (titleBlob.includes(g)) return true;
  if (g === 'спорт') {
    if (ev.inferredKind === 'sport' || ev.inferredKind === 'football') return true;
    if (ic === 'футбол' || ic === 'хоккей') return true;
  }
  if (g === 'театр') {
    if (ev.inferredKind === 'theater') return true;
    if (/(балет|мюзикл|опера|театр)/i.test(ic)) return true;
  }
  return false;
}

/** Токены запроса: буквы/цифры по языкам + латиница */
function searchTokens(q: string): string[] {
  const norm = normalizeSearchText(q);
  if (!norm) return [];
  return norm.split(/[^\p{L}\p{N}]+/u).filter((t) => t.length > 0);
}

export function filterEventsClient(
  events: NormalizedBiletEvent[],
  opts: { q?: string; venue?: string; genre?: string; stageId?: string },
): NormalizedBiletEvent[] {
  let out = [...events];
  const stage = opts.stageId?.trim();
  if (stage) {
    out = out.filter((e) => (e.stageId?.trim() ?? '') === stage);
  }
  const rawQ = opts.q?.trim();
  if (rawQ) {
    const tokens = searchTokens(rawQ);
    out = out.filter((e) => {
      const blob = normalizeSearchText(
        [e.title, e.subtitle, e.venue, e.genre, e.inferredCategoryLabel, e.author, e.director]
          .filter(Boolean)
          .join(' '),
      );
      if (tokens.length === 0) return true;
      if (tokens.length === 1) return blob.includes(tokens[0]);
      return tokens.every((t) => blob.includes(t));
    });
  }
  if (opts.venue?.trim()) {
    const v = normalizeSearchText(opts.venue);
    out = out.filter((e) => e.venue && normalizeSearchText(e.venue).includes(v));
  }
  if (opts.genre?.trim()) {
    const g = normalizeSearchText(opts.genre);
    out = out.filter((e) => eventMatchesGenreChip(e, g));
  }
  return out;
}

// --- Оформление билетов (сессия как у корзины) ---
function getSessionId(): string | null {
  try {
    return sessionStorage.getItem('session.id') || localStorage.getItem('session.id');
  } catch {
    return null;
  }
}

function setSessionId(id: string) {
  try {
    sessionStorage.setItem('session.id', id);
    localStorage.setItem('session.id', id);
  } catch {
    /* ignore */
  }
}

async function sessionFetch(input: string, init?: RequestInit): Promise<Response> {
  const sid = getSessionId();
  const res = await fetch(input, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(sid ? { 'x-session-id': sid } : {}),
      ...(init?.headers || {}),
    },
  });
  const next = res.headers.get('x-session-id');
  if (next) setSessionId(next);
  return res;
}

/** Подтянуть session.id (как /api/public/cart) до чекаута гостя */
export async function ensurePublicSessionForCheckout(): Promise<void> {
  const base = getApiBase();
  await sessionFetch(`${base}/api/public/cart`);
}

export async function validateBiletTicketPromo(
  code: string,
  amountRub: number,
): Promise<
  { ok: true; finalRub: number; discountRub: number } | { ok: false; error?: string }
> {
  const res = await sessionFetch(`${getApiBase()}/api/bilet/validate-promo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, amountRub }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    finalRub?: number;
    discountRub?: number;
  };
  if (!res.ok || !data.ok) {
    return { ok: false, error: data.error || 'Промокод недоступен' };
  }
  return {
    ok: true,
    finalRub: Number(data.finalRub),
    discountRub: Number(data.discountRub) || 0,
  };
}

export type BiletCheckoutPayload = {
  offerId: string;
  seats: string[];
  repertoireId: string;
  eventTitle: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  promoCode?: string;
};

export async function checkoutBiletTickets(payload: BiletCheckoutPayload): Promise<{
  ok: boolean;
  paymentUrl?: string;
  orderNumber?: string;
}> {
  const res = await sessionFetch(`${getApiBase()}/api/bilet/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    paymentUrl?: string;
    orderNumber?: string;
    message?: string;
    error?: string;
  };
  if (!res.ok) {
    const msg = data.message || data.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as { ok: boolean; paymentUrl?: string; orderNumber?: string };
}
