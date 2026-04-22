/**
 * Короткий in-memory кэш для GET /api/bilet/events (снижает нагрузку на GetBilet и CPU).
 * Инвалидация: sync каталога, env GETBILET_EVENTS_HTTP_CACHE_SEC=0.
 */

/** @type {{ key: string, body: string, expiresAt: number } | null} */
let slot = null;

/**
 * @param {string} key
 * @returns {string | null} JSON body
 */
export function getGetbiletEventsHttpCache(key) {
  if (!slot || Date.now() >= slot.expiresAt || slot.key !== key) return null;
  return slot.body;
}

/**
 * @param {string} key
 * @param {unknown} payload — сериализуется в JSON (копия объекта)
 */
export function setGetbiletEventsHttpCache(key, payload) {
  const ttlSec = parseInt(process.env.GETBILET_EVENTS_HTTP_CACHE_SEC ?? '60', 10);
  if (!Number.isFinite(ttlSec) || ttlSec <= 0) {
    slot = null;
    return;
  }
  try {
    slot = {
      key,
      body: JSON.stringify(payload),
      expiresAt: Date.now() + ttlSec * 1000,
    };
  } catch {
    slot = null;
  }
}

export function invalidateGetbiletEventsHttpCache() {
  slot = null;
}
