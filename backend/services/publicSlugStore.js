/**
 * public_slug на getbilet_events: канонический /ticket/:slug.
 * Индекс в памяти на минуту — карточки и SSR не ходят в БД на каждое событие.
 */
import ticketPool from '../ticketDb.js';

/** @type {{ at: number; byId: Map<string, string>; bySlug: Map<string, string> }} */
let cache = { at: 0, byId: new Map(), bySlug: new Map() };

const TTL_MS = 60_000;

export function invalidatePublicSlugCache() {
  cache = { at: 0, byId: new Map(), bySlug: new Map() };
}

async function loadIndex() {
  const r = await ticketPool.query(
    `SELECT getbilet_external_id, public_slug
     FROM getbilet_events
     WHERE public_slug IS NOT NULL AND btrim(public_slug) <> ''`,
  );
  const byId = new Map();
  const bySlug = new Map();
  for (const row of r.rows) {
    const id = String(row.getbilet_external_id || '').trim().toLowerCase();
    const slug = String(row.public_slug || '').trim().toLowerCase();
    if (!id || !slug) continue;
    byId.set(id, slug);
    if (!bySlug.has(slug)) bySlug.set(slug, id);
  }
  cache = { at: Date.now(), byId, bySlug };
  return cache;
}

async function index() {
  if (cache.at && Date.now() - cache.at < TTL_MS) return cache;
  try {
    return await loadIndex();
  } catch (e) {
    const code = e && typeof e === 'object' && 'code' in e ? e.code : '';
    if (code === '42703' || code === '42P01') {
      cache = { at: Date.now(), byId: new Map(), bySlug: new Map() };
      return cache;
    }
    throw e;
  }
}

/** @param {string | null | undefined} repertoireId */
export async function publicSlugByRepertoireId(repertoireId) {
  const id = String(repertoireId || '').trim().toLowerCase();
  if (!id) return '';
  const idx = await index();
  return idx.byId.get(id) || '';
}

/** @param {string | null | undefined} slug */
export async function repertoireIdByPublicSlug(slug) {
  const s = String(slug || '').trim().toLowerCase();
  if (!s) return '';
  const idx = await index();
  return idx.bySlug.get(s) || '';
}

/**
 * Проставляет publicSlug на компактные карточки каталога.
 * @param {Array<Record<string, unknown>> | null | undefined} actions
 */
export async function attachPublicSlugs(actions) {
  if (!Array.isArray(actions) || actions.length === 0) return actions;
  const idx = await index();
  if (!idx.byId.size) return actions;
  for (const item of actions) {
    if (!item || typeof item !== 'object') continue;
    const keys = [item.repertoireId, item.id]
      .map((v) => String(v || '').trim().toLowerCase())
      .filter(Boolean);
    for (const key of keys) {
      const slug = idx.byId.get(key);
      if (slug) {
        item.publicSlug = slug;
        break;
      }
    }
  }
  return actions;
}
