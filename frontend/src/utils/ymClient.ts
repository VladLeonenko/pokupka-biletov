import { YANDEX_METRIKA_COUNTER_ID } from '@/utils/analyticsConstants';

const CID_KEY = 'ym_client_id';
const YCLID_KEY = 'ym_yclid';
const YCLID_COOKIE = 'bv_yclid';
const YCLID_MAX_AGE = 60 * 60 * 24 * 90;

function cacheClientId(id: string) {
  try {
    sessionStorage.setItem(CID_KEY, id);
    localStorage.setItem(CID_KEY, id);
  } catch {
    /* ignore */
  }
}

function readYclidCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${YCLID_COOKIE}=([^;]+)`));
  const raw = match ? decodeURIComponent(match[1]) : '';
  return /^[A-Za-z0-9_-]{6,128}$/.test(raw) ? raw : null;
}

function storeYclid(yclid: string) {
  try {
    sessionStorage.setItem(YCLID_KEY, yclid);
    localStorage.setItem(YCLID_KEY, yclid);
  } catch {
    /* ignore */
  }
  try {
    document.cookie = `${YCLID_COOKIE}=${encodeURIComponent(yclid)};path=/;max-age=${YCLID_MAX_AGE};SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

function readCookieClientId(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|; )_ym_uid=([^;]+)/);
  const raw = match ? decodeURIComponent(match[1]) : '';
  return /^\d{6,32}$/.test(raw) ? raw : null;
}

/** ClientID Метрики: кэш getClientID, иначе cookie _ym_uid. */
export function getYmClientId(): string | null {
  try {
    const cached = sessionStorage.getItem(CID_KEY) || localStorage.getItem(CID_KEY) || '';
    if (/^\d{6,32}$/.test(cached)) return cached;
  } catch {
    /* ignore */
  }
  const fromCookie = readCookieClientId();
  if (fromCookie) cacheClientId(fromCookie);
  return fromCookie;
}

export function getStoredYclid(): string | null {
  try {
    const raw = sessionStorage.getItem(YCLID_KEY) || localStorage.getItem(YCLID_KEY) || '';
    if (/^[A-Za-z0-9_-]{6,128}$/.test(raw)) return raw;
  } catch {
    /* ignore */
  }
  return readYclidCookie();
}

export function rememberYclidFromLocation(search?: string) {
  if (typeof window === 'undefined') return;
  const yclid = new URLSearchParams(search ?? window.location.search).get('yclid') || '';
  if (!/^[A-Za-z0-9_-]{6,128}$/.test(yclid)) return;
  storeYclid(yclid);
}

/** Дождаться ClientID счётчика. Без него офлайн-конверсию оплаты не к чему привязать. */
export function ensureYmClientId(timeoutMs = 1500): Promise<string | null> {
  rememberYclidFromLocation();
  const existing = getYmClientId();
  if (existing) return Promise.resolve(existing);
  if (typeof window === 'undefined' || typeof window.ym !== 'function') return Promise.resolve(null);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (id: string | null) => {
      if (settled) return;
      settled = true;
      const clean = id && /^\d{6,32}$/.test(id) ? id : null;
      if (clean) cacheClientId(clean);
      resolve(clean || getYmClientId());
    };
    const timer = window.setTimeout(() => finish(null), timeoutMs);
    try {
      window.ym(YANDEX_METRIKA_COUNTER_ID, 'getClientID', (id: string) => {
        window.clearTimeout(timer);
        const clean = id && /^\d{6,32}$/.test(String(id)) ? String(id) : null;
        if (clean) cacheClientId(clean);
        finish(clean);
      });
    } catch {
      window.clearTimeout(timer);
      finish(null);
    }
  });
}
