/**
 * In-memory SSR HTML cache.
 * SSR_CACHE_TTL_MS=0 — выкл (по умолчанию 60000).
 */
import {
  getCacheVersion,
  registerCacheInvalidator,
} from '../services/cacheManager.js';

const TTL = Number(process.env.SSR_CACHE_TTL_MS ?? 60_000);
const store = new Map();
const MAX_ENTRIES = 500;

registerCacheInvalidator(() => {
  store.clear();
});

function keyFor(pathOnly, queryKey = '') {
  return `${getCacheVersion()}::${pathOnly}::${queryKey}`;
}

function pruneIfNeeded() {
  if (store.size <= MAX_ENTRIES) return;
  const drop = store.size - MAX_ENTRIES;
  let i = 0;
  for (const k of store.keys()) {
    store.delete(k);
    if (++i >= drop) break;
  }
}

export function getSsrHtmlCache(pathOnly, queryKey = '') {
  if (!(TTL > 0)) return null;
  const key = keyFor(pathOnly, queryKey);
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() > hit.exp) {
    store.delete(key);
    return null;
  }
  return hit.html;
}

export function setSsrHtmlCache(pathOnly, html, queryKey = '') {
  if (!(TTL > 0) || !html) return;
  store.set(keyFor(pathOnly, queryKey), { html, exp: Date.now() + TTL });
  pruneIfNeeded();
}

export function clearSsrHtmlCache() {
  store.clear();
}

export function ssrCacheStats() {
  return { ttlMs: TTL, size: store.size, version: getCacheVersion() };
}
