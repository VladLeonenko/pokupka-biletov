/**
 * Yandex.Metrika — hit при смене SPA-маршрута.
 * Счётчик инициализируется в index.html (официальный сниппет).
 */

const COUNTER_ID = 106795462;

declare global {
  interface Window {
    ym?: (id: number, action: string, params?: string) => void;
  }
}

/** Отправка hit при смене SPA-маршрута */
export function hitYandexMetrika(url?: string): void {
  if (typeof window === 'undefined' || !window.ym) return;
  window.ym(COUNTER_ID, 'hit', url || location.href);
}
