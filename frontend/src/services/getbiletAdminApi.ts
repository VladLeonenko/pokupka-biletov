import { getApiBase } from '@/utils/apiBase';
import Cookies from 'js-cookie';

const API_BASE = getApiBase();

function authHeaders(): HeadersInit {
  const token = Cookies.get('auth_token') || null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handle<T>(res: Response): Promise<T> {
  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      if (!res.ok) throw new Error(`Ошибка ${res.status}`);
      throw new Error('Некорректный JSON в ответе');
    }
  }
  if (!res.ok) {
    const msg =
      parsed && typeof parsed === 'object' && parsed !== null && 'error' in parsed
        ? String((parsed as { error: unknown }).error)
        : `Ошибка ${res.status}`;
    throw new Error(msg);
  }
  return parsed as T;
}

/** Подстановки «как на сайте» для админ-формы (кэш каталога + пакет описания), только в GET /events/:id */
export type GetbiletEventResolvedForForm = {
  title: string;
  venue: string;
  venue_address: string;
  card_subtitle: string;
  description: string;
};

export interface GetbiletEventRow {
  id: number;
  getbilet_external_id: string;
  /** Заполняется только ответом одной карточки — для полей, совпадающих с витриной */
  resolved_for_form?: GetbiletEventResolvedForForm;
  poster_url_manual?: string | null;
  /** Автообложка из поиска (Google CSE); ниже приоритета, чем poster_url_manual */
  poster_url_web?: string | null;
  banner_url_manual?: string | null;
  /** Страница спектакля на сайте театра — источник для кнопки «Подтянуть постер» */
  poster_page_url?: string | null;
  title_manual: string | null;
  /** Площадка на витрине; перекрывает GetBilet */
  venue_manual?: string | null;
  venue_address_manual?: string | null;
  /** Краткая строка под заголовком на карточке; иначе — из описания/API */
  card_subtitle_manual?: string | null;
  description_manual: string | null;
  /** Снимок AI-описания для публичной страницы (см. backfill description_pack) */
  description_pack_json?: Record<string, unknown> | null;
  notes_internal: string | null;
  is_published: boolean;
  sort_order: number;
  group_id?: number | null;
  /** Последнее появление в ответе GetBilet при sync-catalog */
  last_seen_in_catalog_at?: string | null;
  catalog_last_sync_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type ListGetbiletEventsParams = {
  /** Поиск по id репертуара, ручному названию, заметкам, описанию, названию из кэша каталога */
  q?: string;
  /** 1 = только в продаже, 0 = только скрытые, не передано = все */
  published?: '1' | '0';
};

export async function listGetbiletEvents(params?: ListGetbiletEventsParams): Promise<GetbiletEventRow[]> {
  const sp = new URLSearchParams();
  if (params?.q) sp.set('q', params.q);
  if (params?.published) sp.set('published', params.published);
  const qs = sp.toString();
  const res = await fetch(
    `${API_BASE}/api/admin/getbilet/events${qs ? `?${qs}` : ''}`,
    { headers: authHeaders() },
  );
  return handle(res);
}

export async function getGetbiletEvent(id: number): Promise<GetbiletEventRow> {
  const res = await fetch(`${API_BASE}/api/admin/getbilet/events/${id}`, { headers: authHeaders() });
  return handle(res);
}

export async function createGetbiletEvent(body: Partial<GetbiletEventRow> & { getbilet_external_id: string }) {
  const res = await fetch(`${API_BASE}/api/admin/getbilet/events`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return handle<GetbiletEventRow>(res);
}

export async function updateGetbiletEvent(id: number, body: Partial<GetbiletEventRow>) {
  const res = await fetch(`${API_BASE}/api/admin/getbilet/events/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return handle<GetbiletEventRow>(res);
}

/** POST /api/images — загрузка в backend/uploads/images (нужен admin JWT). */
export async function uploadAdminImage(file: File): Promise<{ url: string }> {
  const token = Cookies.get('auth_token') || null;
  const fd = new FormData();
  fd.append('image', file);
  const res = await fetch(`${API_BASE}/api/images`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  return handle<{ url: string }>(res);
}

export async function deleteGetbiletEvent(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/admin/getbilet/events/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  await handle(res);
}

export type PosterProbeResult = {
  bestUrl: string | null;
  candidates: Array<{ url: string; source: string; width: number; height: number; score: number }>;
  finalUrl: string;
};

/** Проверить URL страницы: кандидаты превью без записи в БД */
export async function probePosterPage(url: string): Promise<PosterProbeResult> {
  const res = await fetch(`${API_BASE}/api/admin/getbilet/poster-probe`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ url }),
  });
  return handle(res);
}

export type FetchPosterResult = {
  bestUrl: string | null;
  candidates: PosterProbeResult['candidates'];
  finalUrl: string;
  saved?: boolean;
  skipped?: boolean;
  reason?: string;
  row?: GetbiletEventRow;
};

/** Сохранить лучший URL в poster_url_manual (и опционально в пустой banner) */
export async function fetchPosterForEvent(
  id: number,
  body?: { url?: string; also_banner?: boolean; force?: boolean },
): Promise<FetchPosterResult> {
  const res = await fetch(`${API_BASE}/api/admin/getbilet/events/${id}/fetch-poster`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body || {}),
  });
  return handle(res);
}

export async function syncGetbiletCatalog(): Promise<{ ok: boolean; count: number; repertoireIds: string[] }> {
  const res = await fetch(`${API_BASE}/api/admin/getbilet/sync-catalog`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({}),
  });
  return handle(res);
}

export async function batchFetchPosters(body?: {
  limit?: number;
  force?: boolean;
  also_banner?: boolean;
  delay_ms?: number;
}): Promise<{
  processed: number;
  results: Array<{ id: number; ok: boolean; bestUrl?: string; error?: string }>;
  hint?: string;
}> {
  const res = await fetch(`${API_BASE}/api/admin/getbilet/events/batch-fetch-posters`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body || {}),
  });
  return handle(res);
}

/** Постеры из ImageUrl в кэше каталога (после sync), без скачивания со страниц театра. */
export async function batchPostersFromCacheImages(): Promise<{
  updated: number;
  rows?: Array<{ id: number; getbilet_external_id: string }>;
  hint?: string;
}> {
  const res = await fetch(`${API_BASE}/api/admin/getbilet/events/batch-posters-from-cache-images`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({}),
  });
  return handle(res);
}

export async function getWebPosterSearchStatus(): Promise<{
  configured: boolean;
  google: boolean;
  openai: boolean;
  provider: string;
}> {
  const res = await fetch(`${API_BASE}/api/admin/getbilet/web-poster-search-status`, {
    headers: authHeaders(),
  });
  return handle(res);
}

export type FetchPosterWebResult = {
  saved?: boolean;
  skipped?: boolean;
  reason?: string;
  imageUrl?: string | null;
  searchTitle?: string;
  resultTitle?: string | null;
  rawItems?: number;
  row?: GetbiletEventRow;
  error?: string;
  queryTitle?: string;
};

export async function fetchPosterWebForEvent(id: number, body?: { force?: boolean }): Promise<FetchPosterWebResult> {
  const res = await fetch(`${API_BASE}/api/admin/getbilet/events/${id}/fetch-poster-web`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body || {}),
  });
  return handle(res);
}

export async function batchFetchPostersWeb(body?: {
  limit?: number;
  force?: boolean;
  delay_ms?: number;
}): Promise<{
  processed: number;
  results: Array<{ id: number; ok: boolean; imageUrl?: string; searchTitle?: string; error?: string }>;
  hint?: string;
}> {
  const res = await fetch(`${API_BASE}/api/admin/getbilet/events/batch-fetch-posters-web`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body || {}),
  });
  return handle(res);
}

export type CatalogStageRow = {
  stage_id: string;
  events_in_cache: number;
  sample_title: string | null;
};

export async function listCatalogStageIds(): Promise<{ stages: CatalogStageRow[] }> {
  const res = await fetch(`${API_BASE}/api/admin/getbilet/catalog-stage-ids`, {
    headers: authHeaders(),
  });
  return handle(res);
}

export interface GetbiletGroupRow {
  id: number;
  name: string;
  slug: string | null;
  events_count: number;
  created_at: string;
  updated_at: string;
}

export async function listGetbiletGroups(): Promise<GetbiletGroupRow[]> {
  const res = await fetch(`${API_BASE}/api/admin/getbilet/groups`, { headers: authHeaders() });
  return handle(res);
}

export async function createGetbiletGroup(body: { name: string; slug?: string | null }) {
  const res = await fetch(`${API_BASE}/api/admin/getbilet/groups`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return handle<GetbiletGroupRow>(res);
}

export async function updateGetbiletGroup(id: number, body: { name?: string; slug?: string | null }) {
  const res = await fetch(`${API_BASE}/api/admin/getbilet/groups/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return handle<GetbiletGroupRow>(res);
}

export async function deleteGetbiletGroup(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/admin/getbilet/groups/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  await handle(res);
}

export interface MarkupRule {
  id: number;
  markup_kind: 'percent' | 'fixed';
  markup_value: string | number;
  updated_at?: string;
}

export interface MarkupSnapshot {
  global: MarkupRule | null;
  groupRules: (MarkupRule & { group_id: number; group_name: string })[];
  eventRules: (MarkupRule & {
    event_id: number;
    getbilet_external_id: string;
    title_manual: string | null;
  })[];
}

export async function getMarkup(): Promise<MarkupSnapshot> {
  const res = await fetch(`${API_BASE}/api/admin/getbilet/markup`, { headers: authHeaders() });
  return handle(res);
}

export async function putMarkupGlobal(body: { markup_kind: 'percent' | 'fixed'; markup_value: number }) {
  const res = await fetch(`${API_BASE}/api/admin/getbilet/markup/global`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return handle(res);
}

export async function putMarkupGroup(
  groupId: number,
  body: { markup_kind: 'percent' | 'fixed'; markup_value: number }
) {
  const res = await fetch(`${API_BASE}/api/admin/getbilet/markup/group/${groupId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return handle(res);
}

export async function deleteMarkupGroup(groupId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/admin/getbilet/markup/group/${groupId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  await handle(res);
}

export async function putMarkupEvent(
  eventId: number,
  body: { markup_kind: 'percent' | 'fixed'; markup_value: number }
) {
  const res = await fetch(`${API_BASE}/api/admin/getbilet/markup/event/${eventId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return handle(res);
}

export async function deleteMarkupEvent(eventId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/admin/getbilet/markup/event/${eventId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  await handle(res);
}

export interface PromoRow {
  id: number;
  code: string;
  discount_kind: 'percent' | 'fixed';
  discount_value: string | number;
  max_uses_total: number | null;
  max_uses_per_user: number | null;
  uses_count: number;
  valid_from: string | null;
  valid_until: string | null;
  min_order_amount: string | number | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export async function listPromos(): Promise<PromoRow[]> {
  const res = await fetch(`${API_BASE}/api/admin/getbilet/promos`, { headers: authHeaders() });
  return handle(res);
}

export async function createPromo(body: Record<string, unknown>) {
  const res = await fetch(`${API_BASE}/api/admin/getbilet/promos`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return handle<PromoRow>(res);
}

export async function updatePromo(id: number, body: Record<string, unknown>) {
  const res = await fetch(`${API_BASE}/api/admin/getbilet/promos/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return handle<PromoRow>(res);
}

export async function deletePromo(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/admin/getbilet/promos/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  await handle(res);
}

export interface GetbiletStageMapListRow {
  id: number;
  stage_external_id: string;
  place_external_id: string | null;
  title: string | null;
  has_svg: boolean;
  has_external_plan?: boolean;
  native_seat_count?: number;
  layout_seat_count?: number;
  layout_json: unknown;
  notes_internal: string | null;
  updated_at: string;
}

export interface GetbiletStageMapRow {
  id: number;
  stage_external_id: string;
  place_external_id: string | null;
  title: string | null;
  svg_markup: string | null;
  external_plan_url?: string | null;
  layout_json: unknown;
  notes_internal: string | null;
  updated_at: string;
}

export async function listGetbiletStageMaps(): Promise<GetbiletStageMapListRow[]> {
  const res = await fetch(`${API_BASE}/api/admin/getbilet/stage-maps`, { headers: authHeaders() });
  return handle(res);
}

export async function importStageMapsFromCatalog(): Promise<{
  inserted: number;
  distinct_stages_in_catalog: number;
}> {
  const res = await fetch(`${API_BASE}/api/admin/getbilet/stage-maps/import-from-catalog`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return handle(res);
}

export async function getGetbiletStageMap(id: number): Promise<GetbiletStageMapRow> {
  const res = await fetch(`${API_BASE}/api/admin/getbilet/stage-maps/${id}`, { headers: authHeaders() });
  return handle(res);
}

export async function createGetbiletStageMap(body: {
  stage_external_id: string;
  place_external_id?: string | null;
  title?: string | null;
  svg_markup?: string | null;
  external_plan_url?: string | null;
  layout_json?: unknown;
  notes_internal?: string | null;
}): Promise<GetbiletStageMapRow> {
  const res = await fetch(`${API_BASE}/api/admin/getbilet/stage-maps`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return handle(res);
}

export async function updateGetbiletStageMap(
  id: number,
  body: Partial<{
    stage_external_id: string;
    place_external_id: string | null;
    title: string | null;
    svg_markup: string | null;
    external_plan_url: string | null;
    layout_json: unknown;
    notes_internal: string | null;
  }>
): Promise<GetbiletStageMapRow> {
  const res = await fetch(`${API_BASE}/api/admin/getbilet/stage-maps/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return handle(res);
}

export async function deleteGetbiletStageMap(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/admin/getbilet/stage-maps/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  await handle(res);
}
