/**
 * Top.Mail.Ru (VK) — init only after cookie consent; hit on SPA route change.
 */

const COUNTER_ID = '3768319';
const SCRIPT_ID = 'tmr-code';

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

/** Load Top.Mail.Ru script + initial pageView (call only after analytical consent). */
export function ensureMailRuCounter(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  window._tmr = window._tmr || [];
  if (!document.getElementById(SCRIPT_ID)) {
    window._tmr.push({ id: COUNTER_ID, type: 'pageView', start: Date.now() });
    const ts = document.createElement('script');
    ts.type = 'text/javascript';
    ts.async = true;
    ts.id = SCRIPT_ID;
    ts.src = 'https://top-fwz1.mail.ru/js/code.js';
    const s = document.getElementsByTagName('script')[0];
    s?.parentNode?.insertBefore(ts, s);
  }
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
  if (typeof document !== 'undefined' && !document.getElementById(SCRIPT_ID)) return;

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
  if (typeof document !== 'undefined' && !document.getElementById(SCRIPT_ID)) return;

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
  if (typeof document !== 'undefined' && !document.getElementById(SCRIPT_ID)) return;

  pushMailRuEvent({
    id: COUNTER_ID,
    type: 'setUserID',
    userid: String(userId),
  });
}
