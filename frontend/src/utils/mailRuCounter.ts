/**
 * Top.Mail.Ru (VK) — hit при смене SPA-маршрута и привязка user id.
 * Счётчик инициализируется в index.html (официальный сниппет).
 */

const COUNTER_ID = '3768319';

type MailRuEvent =
  | { id: string; type: 'pageView'; start: number; url?: string; pid?: string }
  | { id: string; type: 'setUserID'; userid: string }
  | { id: string; type: 'reachGoal'; goal: string; value?: number; params?: Record<string, string> };

declare global {
  interface Window {
    _tmr?: MailRuEvent[];
  }
}

function pushMailRuEvent(event: MailRuEvent): void {
  if (typeof window === 'undefined') return;
  window._tmr = window._tmr || [];
  window._tmr.push(event);
}

function extractGoalValue(params?: Record<string, unknown>): number | undefined {
  if (!params) return undefined;
  for (const key of ['total_rub', 'order_price', 'value'] as const) {
    const raw = params[key];
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return Math.round(raw);
    }
  }
  return undefined;
}

function toMailRuParams(params: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === '') continue;
    result[key] = String(value);
  }
  return result;
}

/** Отправка JS-цели в Top.Mail.Ru (Настройки -> Цели -> JavaScript-событие). */
export function reachMailRuGoal(goal: string, params?: Record<string, unknown>): void {
  const event: MailRuEvent = {
    id: COUNTER_ID,
    type: 'reachGoal',
    goal,
  };

  const value = extractGoalValue(params);
  if (value != null) {
    event.value = value;
  }

  if (params) {
    const mailRuParams = toMailRuParams(params);
    if (Object.keys(mailRuParams).length > 0) {
      event.params = mailRuParams;
    }
  }

  pushMailRuEvent(event);
}

/** Отправка pageView при смене SPA-маршрута */
export function hitMailRuCounter(url?: string, pid?: string | number): void {
  const event: MailRuEvent = {
    id: COUNTER_ID,
    type: 'pageView',
    start: Date.now(),
    url: url || location.href,
  };

  if (pid != null && String(pid).length > 0) {
    event.pid = String(pid);
  }

  pushMailRuEvent(event);
}

/** Привязка id пользователя к счётчику (cross-device) */
export function setMailRuUserId(userId: string | number): void {
  pushMailRuEvent({
    id: COUNTER_ID,
    type: 'setUserID',
    userid: String(userId),
  });
}
