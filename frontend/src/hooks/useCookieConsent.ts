import { useState, useEffect } from 'react';
import { saveConsent } from '@/services/consentsApi';
import { useAuth } from '@/auth/AuthProvider';
import { ensureMailRuCounter } from '@/utils/mailRuCounter';
import { YANDEX_METRIKA_COUNTER_ID } from '@/utils/analyticsConstants';

export interface CookiePreferences {
  necessary: boolean;
  functional: boolean;
  analytical: boolean;
  marketing: boolean;
}

export { YANDEX_METRIKA_COUNTER_ID };

const STORAGE_KEY = 'cookie_consent';
const CONSENT_VERSION = '1.0';
const GA_MEASUREMENT_ID = 'G-XC0BRKGDLR';

export function hasAnalyticalConsent(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    return Boolean(data?.version === CONSENT_VERSION && data?.preferences?.analytical);
  } catch {
    return false;
  }
}

export function useCookieConsent() {
  const { user } = useAuth();
  const [hasConsent, setHasConsent] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences | null>(null);

  useEffect(() => {
    checkConsent();
    const prefs = getPreferences();
    if (prefs.analytical) {
      loadAnalytics(prefs);
    }
  }, [user]);

  const checkConsent = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.version === CONSENT_VERSION && data.preferences) {
          setHasConsent(true);
          setPreferences(data.preferences);
          return true;
        }
        localStorage.removeItem(STORAGE_KEY);
        setHasConsent(false);
        setPreferences(null);
      } catch (e) {
        console.error('Error parsing cookie consent:', e);
        localStorage.removeItem(STORAGE_KEY);
        setHasConsent(false);
        setPreferences(null);
      }
    } else {
      setHasConsent(false);
      setPreferences(null);
    }
    return false;
  };

  const saveToStorage = (prefs: CookiePreferences) => {
    const data = {
      version: CONSENT_VERSION,
      consent: true,
      preferences: prefs,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setHasConsent(true);
    setPreferences(prefs);
  };

  const saveToBackend = async (prefs: CookiePreferences) => {
    try {
      await saveConsent({
        type: 'cookies',
        necessary: prefs.necessary,
        functional: prefs.functional,
        analytical: prefs.analytical,
        marketing: prefs.marketing,
        accepted: true,
      });
    } catch (error) {
      console.error('Error saving consent to backend:', error);
    }
  };

  const acceptAll = async () => {
    const prefs: CookiePreferences = {
      necessary: true,
      functional: true,
      analytical: true,
      marketing: true,
    };
    saveToStorage(prefs);
    await saveToBackend(prefs);
    loadAnalytics(prefs);
  };

  const rejectAll = async () => {
    const prefs: CookiePreferences = {
      necessary: true,
      functional: false,
      analytical: false,
      marketing: false,
    };
    saveToStorage(prefs);
    await saveToBackend(prefs);
    loadAnalytics(prefs);
  };

  const savePreferences = async (prefs: CookiePreferences) => {
    saveToStorage(prefs);
    await saveToBackend(prefs);
    loadAnalytics(prefs);
  };

  const getPreferences = (): CookiePreferences => {
    if (preferences) return preferences;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        return (
          data.preferences || {
            necessary: true,
            functional: false,
            analytical: false,
            marketing: false,
          }
        );
      } catch (e) {
        console.error('Error parsing preferences:', e);
      }
    }

    return {
      necessary: true,
      functional: false,
      analytical: false,
      marketing: false,
    };
  };

  const loadAnalytics = (prefs: CookiePreferences) => {
    if (prefs.analytical && typeof window !== 'undefined') {
      const loadGA = () => {
        if (!window.gtag) {
          window.dataLayer = window.dataLayer || [];
          function gtag(...args: any[]) {
            window.dataLayer!.push(args);
          }
          window.gtag = gtag;

          const script = document.createElement('script');
          script.async = true;
          script.defer = true;
          script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
          script.crossOrigin = 'anonymous';
          document.head.appendChild(script);

          script.onload = () => {
            gtag('js', new Date());
            gtag('config', GA_MEASUREMENT_ID, {
              send_page_view: true,
              transport_type: 'beacon',
            });
          };
        }
      };

      const loadYM = () => {
        if (!window.ym) {
          (function (m: any, e: Document, t: string, r: string, i: string) {
            m[i] =
              m[i] ||
              function (...args: unknown[]) {
                (m[i].a = m[i].a || []).push(args);
              };
            m[i].l = 1 * new Date();
            for (let j = 0; j < e.scripts.length; j++) {
              if (e.scripts[j].src === r) return;
            }
            const k = e.createElement(t) as HTMLScriptElement;
            const a = e.getElementsByTagName(t)[0];
            k.async = true;
            k.defer = true;
            k.src = r;
            a.parentNode?.insertBefore(k, a);
          })(
            window,
            document,
            'script',
            `https://mc.yandex.ru/metrika/tag.js?id=${YANDEX_METRIKA_COUNTER_ID}`,
            'ym',
          );

          window.ym!(YANDEX_METRIKA_COUNTER_ID, 'init', {
            clickmap: true,
            trackLinks: true,
            accurateTrackBounce: true,
            webvisor: true,
            ecommerce: 'dataLayer',
            defer: true,
            trackHash: false,
          });
        }
      };

      const loadMailRu = () => {
        ensureMailRuCounter();
      };

      const run = () => {
        loadGA();
        loadYM();
        loadMailRu();
      };

      if (document.readyState === 'complete') {
        if ('requestIdleCallback' in window) {
          requestIdleCallback(run, { timeout: 2000 });
        } else {
          setTimeout(run, 0);
        }
      } else {
        window.addEventListener('load', () => {
          if ('requestIdleCallback' in window) {
            requestIdleCallback(run, { timeout: 2000 });
          } else {
            setTimeout(run, 0);
          }
        });
      }
    } else if (typeof window !== 'undefined') {
      window.gtag = () => {};
      window.ym = () => {};
      const gaScript = document.querySelector('script[src*="googletagmanager"]');
      const ymScript = document.querySelector('script[src*="yandex.ru/metrika"]');
      const mailScript = document.getElementById('tmr-code');
      if (gaScript) gaScript.remove();
      if (ymScript) ymScript.remove();
      if (mailScript) mailScript.remove();
      if (window.dataLayer) {
        window.dataLayer = [];
      }
    }
  };

  return {
    hasConsent,
    preferences,
    acceptAll,
    rejectAll,
    savePreferences,
    getPreferences,
    checkConsent,
  };
}

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
    ym?: (id: number, action: string, params?: any) => void;
  }
}
