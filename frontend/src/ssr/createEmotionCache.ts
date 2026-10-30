import createCache from '@emotion/cache';

/** Same key on server + client — required for hydrate without FOUC/mismatch. */
export function createEmotionCache() {
  return createCache({ key: 'css', prepend: true });
}
