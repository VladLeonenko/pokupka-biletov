import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { captureReferralIfNeeded, extractRefFromLocation } from '@/utils/referral';

/**
 * Глобальный захват ?ref= / ?bv_ref= на обычных страницах.
 * /r/:code обрабатывает ReferralLandingPage (редирект + ошибки).
 */
export function ReferralCapture() {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname.startsWith('/admin')) return;
    if (/^\/r\//i.test(location.pathname)) return;

    const code = extractRefFromLocation(location.pathname, location.search);
    if (!code) return;

    let cancelled = false;
    (async () => {
      const r = await captureReferralIfNeeded(code);
      if (cancelled || r.ok) return;
      // невалидный код в query — тихо игнор (не ломаем страницу)
    })();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.search]);

  return null;
}
