import { useEffect } from 'react';
import { CACHE_VERSION_KEY, fetchCacheVersionFromServer, getStoredCacheVersion, setStoredCacheVersion } from '@/utils/cacheVersion';

const POLL_INTERVAL_MS = 5 * 60 * 1000;
const PRESERVE_KEYS = ['auth.token', 'token'];

const clearClientCaches = (nextVersion: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  const preserved = new Map<string, string | null>();
  PRESERVE_KEYS.forEach((key) => {
    try {
      preserved.set(key, window.localStorage.getItem(key));
    } catch {
      preserved.set(key, null);
    }
  });

  try {
    window.localStorage.clear();
    window.sessionStorage.clear();
  } catch {
    // ignore storage clearing errors
  }

  preserved.forEach((value, key) => {
    if (value) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // ignore restore errors
      }
    }
  });

  setStoredCacheVersion(nextVersion);
  window.location.reload();
};

export const useCacheVersionWatcher = () => {
  useEffect(() => {
    let stopped = false;
    let intervalId: number | null = null;

    const checkVersion = async () => {
      const serverVersion = await fetchCacheVersionFromServer();
      if (!serverVersion) {
        return;
      }
      const storedVersion = getStoredCacheVersion();
      if (!storedVersion) {
        setStoredCacheVersion(serverVersion);
        return;
      }
      if (storedVersion !== serverVersion && !stopped) {
        clearClientCaches(serverVersion);
      }
    };

    checkVersion();
    intervalId = window.setInterval(checkVersion, POLL_INTERVAL_MS);

    return () => {
      stopped = true;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, []);
};

