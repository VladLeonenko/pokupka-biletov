/**
 * Yandex.Metrika — hit при смене SPA-маршрута.
 * Счётчик инициализируется только после cookie consent (useCookieConsent).
 */

import { reachMailRuGoal } from '@/utils/mailRuCounter';
import { YANDEX_METRIKA_COUNTER_ID } from '@/utils/analyticsConstants';

const COUNTER_ID = YANDEX_METRIKA_COUNTER_ID;

declare global {
  interface Window {
    ym?: (id: number, action: string, ...args: unknown[]) => void;
  }
}

/** Отправка hit при смене SPA-маршрута */
export function hitYandexMetrika(url?: string): void {
  if (typeof window === 'undefined' || !window.ym) return;
  window.ym(COUNTER_ID, 'hit', url || location.href);
}

/** Отправка JS-цели в Метрику (Настройки -> Цели -> JavaScript-событие). */
export function reachMetrikaGoal(goal: string, params?: Record<string, unknown>): void {
  if (typeof window !== 'undefined' && window.ym) {
    if (params) {
      window.ym(COUNTER_ID, 'reachGoal', goal, params);
    } else {
      window.ym(COUNTER_ID, 'reachGoal', goal);
    }
  }
  reachMailRuGoal(goal, params);
}
