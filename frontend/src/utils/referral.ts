/**
 * Клиентская рефералка: cookie bv_ref / bv_vid, capture на ?ref= и /r/:code.
 */
import Cookies from 'js-cookie';
import { getApiBase } from '@/utils/apiBase';
import { YANDEX_METRIKA_COUNTER_ID } from '@/utils/analyticsConstants';
import { getStoredYclid, getYmClientId } from '@/utils/ymClient';

export { getYmClientId };

const REF_COOKIE = 'bv_ref';
const VID_COOKIE = 'bv_vid';
const REF_LS = 'bv_ref';
const VID_LS = 'bv_vid';
const CAPTURED_KEY = 'bv_ref_captured';

/** In-flight lock: React StrictMode / двойной mount не шлёт 2 клика. */
const inflight = new Map<string, Promise<{ ok: boolean; code?: string; cookieDays?: number; error?: string }>>();

function randomId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `v_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getVisitorKey(): string {
  try {
    const fromCookie = Cookies.get(VID_COOKIE);
    if (fromCookie) return fromCookie;
    const fromLs = localStorage.getItem(VID_LS);
    if (fromLs) {
      Cookies.set(VID_COOKIE, fromLs, { expires: 365, sameSite: 'Lax', path: '/' });
      return fromLs;
    }
  } catch {
    /* ignore */
  }
  const id = randomId();
  setVisitorKey(id);
  return id;
}

export function setVisitorKey(id: string) {
  try {
    Cookies.set(VID_COOKIE, id, { expires: 365, sameSite: 'Lax', path: '/' });
    localStorage.setItem(VID_LS, id);
  } catch {
    /* ignore */
  }
}

export function getStoredRefCode(): string | null {
  try {
    return Cookies.get(REF_COOKIE) || localStorage.getItem(REF_LS) || null;
  } catch {
    return null;
  }
}

export function setStoredRefCode(code: string, days = 30) {
  const c = String(code || '')
    .trim()
    .toLowerCase();
  if (!c) return;
  try {
    Cookies.set(REF_COOKIE, c, { expires: days, sameSite: 'Lax', path: '/' });
    localStorage.setItem(REF_LS, c);
  } catch {
    /* ignore */
  }
}

function getSessionId(): string | null {
  try {
    return sessionStorage.getItem('session.id') || localStorage.getItem('session.id');
  } catch {
    return null;
  }
}

/** Достаёт ref из query (?ref= / ?bv_ref=) или path /r/:code */
export function extractRefFromLocation(pathname: string, search: string): string | null {
  const qs = new URLSearchParams(search || '');
  const fromQuery = (qs.get('ref') || qs.get('bv_ref') || '').trim().toLowerCase();
  if (fromQuery) return fromQuery;

  const m = String(pathname || '').match(/^\/r\/([a-z0-9][a-z0-9_-]{1,31})\/?$/i);
  return m ? m[1].toLowerCase() : null;
}

/** Только внутренний path, без // open-redirect */
export function extractDeepLinkTo(search: string): string | null {
  const raw = new URLSearchParams(search || '').get('to');
  if (!raw) return null;
  let to = raw;
  try {
    to = decodeURIComponent(raw);
  } catch {
    /* keep raw */
  }
  if (!to.startsWith('/') || to.startsWith('//')) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(to)) return null;
  if (to.includes('\\') || to.includes('\0')) return null;
  return to.slice(0, 500);
}

export async function captureReferralIfNeeded(code: string): Promise<{
  ok: boolean;
  code?: string;
  cookieDays?: number;
  error?: string;
}> {
  const c = String(code || '')
    .trim()
    .toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{1,31}$/.test(c)) {
    return { ok: false, error: 'invalid_code' };
  }

  const prev = getStoredRefCode();
  try {
    const already = sessionStorage.getItem(CAPTURED_KEY) === c && prev === c;
    if (already) return { ok: true, code: c };
  } catch {
    /* ignore */
  }

  const existing = inflight.get(c);
  if (existing) return existing;

  const job = (async () => {
    const visitorKey = getVisitorKey();
    try {
      const res = await fetch(`${getApiBase()}/api/referral/capture`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'x-visitor-key': visitorKey,
          ...(getSessionId() ? { 'x-session-id': getSessionId()! } : {}),
        },
        body: JSON.stringify({
          code: c,
          visitorKey,
          sessionId: getSessionId(),
          landingPath: `${window.location.pathname}${window.location.search || ''}`,
          landingUrl: window.location.href,
          referer: document.referrer || undefined,
          ymClientId: getYmClientId(),
          utmSource: 'referral',
          utmMedium: 'agent',
          utmCampaign: c,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        code?: string;
        cookieDays?: number;
        visitorKey?: string;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        return {
          ok: false,
          error: data.error || (res.status === 404 ? 'agent_not_found' : `http_${res.status}`),
        };
      }

      const days = data.cookieDays || 30;
      setStoredRefCode(data.code || c, days);
      if (data.visitorKey) setVisitorKey(data.visitorKey);
      try {
        sessionStorage.setItem(CAPTURED_KEY, data.code || c);
      } catch {
        /* ignore */
      }

      try {
        if (typeof window !== 'undefined' && window.ym) {
          window.ym(YANDEX_METRIKA_COUNTER_ID, 'params', {
            referral_agent: data.code || c,
            channel: 'referral',
          });
          window.ym(YANDEX_METRIKA_COUNTER_ID, 'reachGoal', 'referral_click', {
            referral_agent: data.code || c,
          });
        }
      } catch {
        /* ignore */
      }

      return { ok: true, code: data.code || c, cookieDays: days };
    } catch {
      // Сеть упала: cookie локально, атрибуция по visitor на сервере при следующем клике/чекауте
      setStoredRefCode(c, 30);
      return { ok: false, code: c, error: 'network' };
    } finally {
      inflight.delete(c);
    }
  })();

  inflight.set(c, job);
  return job;
}

/** Поля для checkout payload */
export function referralCheckoutFields(): {
  refCode?: string;
  visitorKey?: string;
  ymClientId?: string;
  yclid?: string;
} {
  const refCode = getStoredRefCode() || undefined;
  return {
    refCode,
    visitorKey: getVisitorKey(),
    ymClientId: getYmClientId() || undefined,
    yclid: getStoredYclid() || undefined,
  };
}

export function buildDeepReferralLink(publicLink: string, toPath: string): string {
  const to = toPath.startsWith('/') && !toPath.startsWith('//') ? toPath : '';
  if (!to) return publicLink;
  try {
    const u = new URL(publicLink);
    u.searchParams.set('to', to);
    return u.toString();
  } catch {
    const sep = publicLink.includes('?') ? '&' : '?';
    return `${publicLink}${sep}to=${encodeURIComponent(to)}`;
  }
}
