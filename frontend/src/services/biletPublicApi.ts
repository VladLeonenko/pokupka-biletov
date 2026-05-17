import { isValid, parseISO } from 'date-fns';
import { getApiBase } from '@/utils/apiBase';
import { deriveBiletEventDateParts } from '@/utils/eventDateLabels';
import { getTicketsCityId } from '@/utils/ticketsCity';
import {
  classifyEventTitle,
  type EventTitleKind,
} from '@/utils/eventTitleHeuristics';
import {
  isBlockedTicketSlug,
  repertoireIdForTicketSlug,
} from '@/utils/fanIdRequiredEvents';
import { slugify } from '@/utils/slugify';

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
  /** Первый абзац развёрнутого описания — для hero на главной. */
  heroDescription?: string;
  dateLabel?: string;
  isoDate?: string;
  venue?: string;
  /** Адрес площадки (GetStageListByPlaceId / enrich). */
  venueAddress?: string;
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

/** Публичная ссылка на страницу выбора мест: ID репертуара + человекочитаемый slug, чтобы однотипные названия не склеивались. */
export function ticketCheckoutHref(
  ev: Pick<NormalizedBiletEvent, 'id' | 'title' | 'stageId'> & {
    imageUrl?: string;
    bannerUrl?: string;
    repertoireId?: string;
    isoDate?: string;
  },
): string {
  const pathSlug = slugify(ev.title) || 'event';
  return `/ticket/${pathSlug}`;
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

/**
 * Родительская площадка (театр / стадион) для строки «когда · где».
 * Без подписи сцены («Малая сцена», «Стадион») — её даёт бэкенд в PlaceName после обогащения.
 */
function extractVenueFromCatalogRow(row: Record<string, unknown>): string | undefined {
  const flat = pickString(row, [
    'PlaceName',
    'placeName',
    'venueName',
    'VenueName',
    'HallName',
    'hallName',
    'PlaceTitle',
    'placeTitle',
    'BuildingName',
    'buildingName',
    'LocationName',
    'locationName',
    'StageName',
    'stageName',
    'venue',
    'Venue',
  ]);
  if (flat) return flat;
  for (const key of ['Place', 'place', 'Venue', 'venue', 'Building', 'building', 'Location', 'location']) {
    const o = row[key];
    if (o && typeof o === 'object' && !Array.isArray(o)) {
      const nm = pickString(o as Record<string, unknown>, ['Name', 'name', 'Title', 'title']);
      if (nm) return nm;
    }
  }
  return undefined;
}

function extractVenueAddressFromCatalogRow(row: Record<string, unknown>): string | undefined {
  const flat = pickString(row, [
    'PlaceAddress',
    'placeAddress',
    'venueAddress',
    'VenueAddress',
    'Address',
    'address',
  ]);
  if (flat) return flat;
  for (const key of ['Place', 'place', 'Venue', 'venue', 'Location', 'location']) {
    const o = row[key];
    if (o && typeof o === 'object' && !Array.isArray(o)) {
      const a = pickString(o as Record<string, unknown>, ['Address', 'address']);
      if (a) return a;
    }
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
 * Под заголовком карточки: короткое описание из API; при пустом / SEO-заглушке — эвристический blurb.
 * Площадка не подставляется сюда (она в `venue` и в нижней строке карточки).
 */
export function biletEventCardSubtitle(
  apiSubtitle: string | undefined,
  descriptionBlurb?: string | undefined,
): string | undefined {
  const sub = apiSubtitle?.trim();
  if (sub && !isTicketsSeoPlaceholderSubtitle(sub)) return truncateCardLine(sub);
  const b = descriptionBlurb?.trim();
  if (b) return truncateCardLine(b);
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
    const heroDescription = pickString(row, ['HeroDescription', 'heroDescription']);
    const venue = extractVenueFromCatalogRow(row) ?? undefined;
    const venueAddress = extractVenueAddressFromCatalogRow(row) ?? undefined;
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
    const { categoryLabel: inferredCategoryLabel, kind: inferredKind, descriptionBlurb } =
      classifyEventTitle(title, {
        subtitle: subtitle?.trim(),
        genre,
      });
    const subtitleEff = biletEventCardSubtitle(subtitle, descriptionBlurb);

    out.push({
      id: id || `anon-${out.length}`,
      repertoireId: repertoireId || undefined,
      title,
      subtitle: subtitleEff,
      heroDescription,
      dateLabel,
      isoDate: isoRaw,
      displayDate,
      weekday,
      timeLabel,
      venue,
      venueAddress,
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

export async function fetchBiletHome(): Promise<unknown> {
  const base = getApiBase();
  const meta = await resolveBiletMetaForFetch();
  const params = new URLSearchParams();
  if (meta.cityIdRequired) {
    params.set('cityId', cityId());
  }
  const suffix = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${base}/api/bilet/home${suffix}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchBiletEventsLite(limit = 200): Promise<unknown> {
  const base = getApiBase();
  const meta = await resolveBiletMetaForFetch();
  const params = new URLSearchParams();
  params.set('limit', String(Math.max(1, Math.min(limit, 500))));
  if (meta.cityIdRequired) {
    params.set('cityId', cityId());
  }
  const res = await fetch(`${base}/api/bilet/events-lite?${params.toString()}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || `HTTP ${res.status}`);
  }
  return res.json();
}

export type BiletResolvedSlug = {
  repertoireId: string;
  title?: string;
  stageId?: string | null;
  posterUrl?: string | null;
  bannerUrl?: string | null;
  beginDateTime?: string | null;
};

function compactActionToResolvedSlug(row: Record<string, unknown>, target: string): BiletResolvedSlug | null {
  const title = String(row.title || '').trim();
  const rep = String(row.repertoireId || row.id || '').trim();
  if (!rep) return null;
  const t = target.toLowerCase();
  if (slugify(title) !== t && rep.toLowerCase() !== t) return null;
  return {
    repertoireId: rep,
    title: title || undefined,
    stageId: row.stageId != null ? String(row.stageId) : null,
    posterUrl: row.posterUrl != null ? String(row.posterUrl) : null,
    bannerUrl: row.bannerUrl != null ? String(row.bannerUrl) : null,
    beginDateTime:
      row.beginDateTime != null
        ? String(row.beginDateTime)
        : row.startDateTime != null
          ? String(row.startDateTime)
          : null,
  };
}

async function resolveSlugFromEventsLite(target: string): Promise<BiletResolvedSlug | null> {
  const raw = await fetchBiletEventsLite(500);
  const actions = extractArray(raw);
  for (const item of actions) {
    if (!item || typeof item !== 'object') continue;
    const hit = compactActionToResolvedSlug(item as Record<string, unknown>, target);
    if (hit) return hit;
  }
  return null;
}

/** ЧПУ → repertoireId: алиас → API → fallback по events-lite. */
export async function fetchBiletResolveSlug(slug: string): Promise<BiletResolvedSlug | null> {
  const s = slug.trim();
  if (!s) return null;
  if (isBlockedTicketSlug(s)) return null;

  const aliasRep = repertoireIdForTicketSlug(s);
  if (aliasRep) {
    return { repertoireId: aliasRep, title: s.replace(/-/g, ' ') };
  }

  const base = getApiBase();
  const res = await fetch(`${base}/api/bilet/resolve-slug/${encodeURIComponent(s)}`, {
    headers: { Accept: 'application/json' },
  });
  if (res.ok) {
    return (await res.json()) as BiletResolvedSlug;
  }
  if (res.status !== 404) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || `HTTP ${res.status}`);
  }

  return resolveSlugFromEventsLite(s);
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

function startOfTodayLocalMs(): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.getTime();
}

function parseRuDateToMs(raw: string): number | null {
  const m = raw.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:\D+(\d{1,2}):(\d{2}))?/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const hour = m[4] ? Number(m[4]) : 0;
  const minute = m[5] ? Number(m[5]) : 0;
  const dt = new Date(year, month - 1, day, hour, minute, 0, 0);
  const ms = dt.getTime();
  return Number.isFinite(ms) ? ms : null;
}

function eventDateMs(ev: NormalizedBiletEvent): number | null {
  const candidates = [ev.isoDate, ev.dateLabel, ev.displayDate]
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter(Boolean);
  for (const raw of candidates) {
    const dIso = parseISO(raw);
    if (isValid(dIso)) return dIso.getTime();
    const nativeMs = new Date(raw).getTime();
    if (Number.isFinite(nativeMs)) return nativeMs;
    const ruMs = parseRuDateToMs(raw);
    if (ruMs != null) return ruMs;
  }
  return null;
}

/** Актуально ли событие для публичной афиши (прошедшие отправляем в архив). */
export function isEventActual(ev: NormalizedBiletEvent): boolean {
  const parsedMs = eventDateMs(ev);
  if (parsedMs == null) return true;
  const todayMs = startOfTodayLocalMs();
  return parsedMs >= todayMs;
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
    { headers: { Accept: 'application/json' }, cache: 'no-store' },
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
  /** Площадка из каталога (без запроса офферов). */
  venueLabel?: string | null;
  /** Адрес площадки (GetStageList / payload). */
  venueAddress?: string | null;
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
  stageMap: (StageMapRow & { external_plan_url?: string | null; svg_markup_deferred?: boolean }) | null;
  /** Ссылка на схемы залов на сайте театра (если задана в админке для сцены). */
  externalPlanUrl?: string | null;
  /** Продажа только с FAN ID (карта болельщика). */
  requiresFanId?: boolean;
};

export type RepertoirePageBundle = {
  context: RepertoireContext;
  offers: unknown;
};

/** Контекст + офферы одним запросом (страница /ticket). */
export async function fetchRepertoireDescriptionSections(
  repertoireId: string,
): Promise<{ sections: RepertoireDescriptionSection[]; totalChars: number }> {
  const base = getApiBase();
  const res = await fetch(
    `${base}/api/bilet/repertoire/${encodeURIComponent(repertoireId)}/description-sections`,
    { headers: { Accept: 'application/json' } },
  );
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || `HTTP ${res.status}`);
  }
  return res.json() as Promise<{ sections: RepertoireDescriptionSection[]; totalChars: number }>;
}

export async function fetchRepertoirePageBundle(repertoireId: string): Promise<RepertoirePageBundle> {
  const base = getApiBase();
  const res = await fetch(
    `${base}/api/bilet/repertoire/${encodeURIComponent(repertoireId)}/page`,
    {
      headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
      cache: 'no-store',
    },
  );
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || `HTTP ${res.status}`);
  }
  return res.json() as Promise<RepertoirePageBundle>;
}

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

/** Схема зала из БД (админ вставляет SVG). `repertoireId` — для алиасов (напр. Лужники+футбол → канонический ключ схемы). */
export async function fetchStageMap(
  stageId: string,
  repertoireId?: string | null,
): Promise<StageMapRow | null> {
  const base = getApiBase();
  const rid = repertoireId?.trim();
  const q = rid ? `?repertoireId=${encodeURIComponent(rid)}` : '';
  const res = await fetch(
    `${base}/api/bilet/stage/${encodeURIComponent(stageId)}/map${q}`,
    { headers: { Accept: 'application/json' } },
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || `HTTP ${res.status}`);
  }
  return res.json() as Promise<StageMapRow>;
}

/** Превью Лужники (футбол): GET /api/bilet/preview/luzhniki-football-stadium — для /test/luzhniki-cup-final-scheme */
export type LuzhnikiFootballStadiumPreviewPayload = {
  svg_markup: string;
  layout_json: Record<string, unknown>;
  demoOffers: {
    Id?: string;
    Sector?: string;
    Row?: string;
    SeatList?: string[];
    NominalPrice?: string;
    AgentPrice?: string;
    EventDateTime?: string;
  }[];
  meta: {
    mode: string;
    layoutId: string;
    width: number;
    height: number;
    sectorCount: number;
    seatCount: number;
    demoEventIso: string;
    /** Заполнено в режиме Inkscape (путь на сервере). */
    svgPath?: string;
  };
};

export async function fetchLuzhnikiFootballStadiumPreview(params?: {
  layoutId?: string;
  eventSourceId?: string;
  eventDateId?: string;
  demoEventIso?: string;
  /** `inkscape` — локальный SVG (см. backend LUZHNIKI_INKSCAPE_SVG_PATH / frontend/public/maps/luzhniki-go.svg). */
  source?: 'inkscape';
}): Promise<LuzhnikiFootballStadiumPreviewPayload> {
  const base = getApiBase();
  const sp = new URLSearchParams();
  if (params?.source === 'inkscape') sp.set('source', 'inkscape');
  if (params?.layoutId?.trim()) sp.set('layoutId', params.layoutId.trim());
  if (params?.eventSourceId?.trim()) sp.set('eventSourceId', params.eventSourceId.trim());
  if (params?.eventDateId?.trim()) sp.set('eventDateId', params.eventDateId.trim());
  if (params?.demoEventIso?.trim()) sp.set('demoEventIso', params.demoEventIso.trim());
  const qs = sp.toString();
  const url = `${base}/api/bilet/preview/luzhniki-football-stadium${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || `HTTP ${res.status}`);
  }
  return res.json() as Promise<LuzhnikiFootballStadiumPreviewPayload>;
}

export type LuzhnikiSeatGridDiagnosticPayload = import('@/utils/luzhnikiFieldGridCompare').LuzhnikiSeatGridDiagnosticPayload;

export async function fetchLuzhnikiSeatGridDiagnostic(sector?: string): Promise<LuzhnikiSeatGridDiagnosticPayload> {
  const base = getApiBase();
  const sp = new URLSearchParams();
  if (sector?.trim()) sp.set('sector', sector.trim());
  const qs = sp.toString();
  const url = `${base}/api/bilet/dev/luzhniki-seat-grid-diagnostic${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || `HTTP ${res.status}`);
  }
  return res.json() as Promise<LuzhnikiSeatGridDiagnosticPayload>;
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
  const ic = ev.inferredCategoryLabel ? normalizeSearchText(ev.inferredCategoryLabel) : '';
  const genreBlob = normalizeSearchText(ev.genre || '');
  const venueBlob = normalizeSearchText([ev.venue, ev.venueAddress].filter(Boolean).join(' '));
  const titleBlob = normalizeSearchText([ev.title, ev.subtitle].filter(Boolean).join(' '));
  const fullBlob = normalizeSearchText([ev.title, ev.subtitle, ev.genre, ev.venue, ev.venueAddress].filter(Boolean).join(' '));
  const sportSignalBlob = normalizeSearchText([ev.title, ev.subtitle, ev.genre].filter(Boolean).join(' '));

  /* Ошибочная метка «Спорт» в API — спорт показываем только по явным спортивным признакам. */
  if (gNorm === 'спорт') {
    if (ev.inferredKind === 'concert' || ev.inferredKind === 'theater' || ev.inferredKind === 'kids') return false;
    if (/(спектакль|театр|опера|балет|мюзикл|цирк|кукольн|сказк|драматич|комеди|гастрол|мхт|мхат|вахтангов|александринск|сатирикон|ленком|современник)/i.test(fullBlob)) return false;
    if (/(театр|балет|опера|мюзикл|детям|цирк|концерт)/i.test(ic)) return false;
    if (/(театр|мхт|мхат|вахтангов|александринск|сатирикон|ленком|современник|драм)/i.test(venueBlob)) return false;
    if (/(театр|спектакль|балет|опера|мюзикл|цирк|концерт)/i.test(genreBlob)) return false;

    if (ev.inferredKind === 'football') return true;
    if (['футбол', 'хоккей', 'баскетбол', 'волейбол', 'бои', 'бокс'].includes(ic)) return true;
    if (/(футбол|хоккей|баскетбол|волейбол|бои|единоборств|mma|ufc|бокс|матч|турнир|кубок|чемпионат|лига|плей\s*оф|стадион)/i.test(sportSignalBlob)) return true;
    if (/(футбол|хоккей|баскет|волейб|бокс|mma|ufc|единоборств)/i.test(genreBlob)) return true;
    return false;
  }
  if (ev.genre && normalizeSearchText(ev.genre).includes(g)) return true;
  if (ic.includes(g)) return true;
  if (titleBlob.includes(g)) return true;
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
  offerSelections?: Array<{ offerId: string; seats: string[] }>;
  repertoireId: string;
  eventTitle: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  promoCode?: string;
  fanId?: string;
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
