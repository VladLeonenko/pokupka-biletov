const state = {
  version: Date.now().toString(),
  invalidators: new Set(),
};

export function getCacheVersion() {
  return state.version;
}

export function bumpCacheVersion(context = {}) {
  state.version = Date.now().toString();
  state.invalidators.forEach((fn) => {
    try {
      fn(state.version, context);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn('[cacheManager] invalidator failed', error);
      }
    }
  });
  return state.version;
}

export function registerCacheInvalidator(fn) {
  if (typeof fn === 'function') {
    state.invalidators.add(fn);
    return () => state.invalidators.delete(fn);
  }
  return () => {};
}

