import { useState, useEffect } from 'react';
import { saveConsent, getConsents } from '@/services/consentsApi';
import { useAuth } from '@/auth/AuthProvider';

export interface CookiePreferences {
  necessary: boolean;
  functional: boolean;
  analytical: boolean;
  marketing: boolean;
}

const STORAGE_KEY = 'cookie_consent';
const CONSENT_VERSION = '1.0';

export function useCookieConsent() {
  const { user } = useAuth();
  const [hasConsent, setHasConsent] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences | null>(null);

  useEffect(() => {
    checkConsent();
    // Загружаем аналитику при монтировании, если есть согласие
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
        if (data.version === CONSENT_VERSION) {
          setHasConsent(true);
          setPreferences(data.preferences);
          return true;
        }
      } catch (e) {
        console.error('Error parsing cookie consent:', e);
      }
    }
    return false;
  };

  const saveToStorage = (prefs: CookiePreferences) => {
    const data = {
      version: CONSENT_VERSION,
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
      // Не блокируем работу, если не удалось сохранить в БД
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
        return data.preferences || {
          necessary: true,
          functional: false,
          analytical: false,
          marketing: false,
        };
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
    // Загружаем аналитику только если есть согласие
    if (prefs.analytical && typeof window !== 'undefined') {
      // Оптимизированная загрузка Google Analytics
      // Используем requestIdleCallback для загрузки после основного контента
      const loadGA = () => {
        if (!window.gtag) {
          // Создаем dataLayer заранее для предотвращения ошибок
          window.dataLayer = window.dataLayer || [];
          function gtag(...args: any[]) {
            window.dataLayer.push(args);
          }
          window.gtag = gtag;
          
          // Загружаем скрипт асинхронно с defer
          const script = document.createElement('script');
          script.async = true;
          script.defer = true;
          script.src = 'https://www.googletagmanager.com/gtag/js?id=G-XC0BRKGDLR';
          script.crossOrigin = 'anonymous';
          // Добавляем в конец head для неблокирующей загрузки
          document.head.appendChild(script);
          
          // Инициализируем после загрузки скрипта
          script.onload = () => {
            gtag('js', new Date());
            gtag('config', 'G-XC0BRKGDLR', {
              // Оптимизация производительности
              send_page_view: true,
              transport_type: 'beacon', // Используем sendBeacon для лучшей производительности
            });
          };
        }
      };

      // Оптимизированная загрузка Яндекс.Метрики
      const loadYM = () => {
        if (!window.ym) {
          // Используем оптимизированную версию загрузки
          (function(m,e,t,r,i,k,a){
            m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
            m[i].l=1*new Date();
            // Проверяем, не загружен ли уже скрипт
            for(var j=0;j<document.scripts.length;j++){
              if(document.scripts[j].src===r){return}
            }
            k=e.createElement(t);
            a=e.getElementsByTagName(t)[0];
            k.async=1;
            k.defer=1; // Добавляем defer
            k.src=r;
            a.parentNode.insertBefore(k,a);
          })(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
          
          // Инициализируем с оптимизациями
          window.ym(88795306, "init", {
            clickmap: true,
            trackLinks: true,
            accurateTrackBounce: true,
            webvisor: true,
            // Оптимизации производительности
            defer: true,
            trackHash: false, // Отключаем отслеживание хеша для SPA
          });
        }
      };

      // Загружаем аналитику после загрузки страницы (неблокирующе)
      if (document.readyState === 'complete') {
        // Страница уже загружена, загружаем сразу
        loadGA();
        loadYM();
      } else {
        // Ждем загрузки страницы
        window.addEventListener('load', () => {
          // Используем requestIdleCallback для загрузки в свободное время
          if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
              loadGA();
              loadYM();
            }, { timeout: 2000 });
          } else {
            // Fallback для браузеров без requestIdleCallback
            setTimeout(() => {
              loadGA();
              loadYM();
            }, 1000);
          }
        });
      }
    } else {
      // Отключаем аналитику если согласия нет
      if (typeof window !== 'undefined') {
        window.gtag = () => {};
        window.ym = () => {};
        // Удаляем скрипты аналитики если они уже загружены
        const gaScript = document.querySelector('script[src*="googletagmanager"]');
        const ymScript = document.querySelector('script[src*="yandex.ru/metrika"]');
        if (gaScript) gaScript.remove();
        if (ymScript) ymScript.remove();
        // Очищаем dataLayer
        if (window.dataLayer) {
          window.dataLayer = [];
        }
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

// Расширяем Window для TypeScript
declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
    ym?: (id: number, action: string, params?: any) => void;
  }
}

