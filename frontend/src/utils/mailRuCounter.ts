/**
 * Top.Mail.Ru (VK) — hit при смене SPA-маршрута и привязка user id.
 * Счётчик инициализируется в index.html (официальный сниппет).
 */

const COUNTER_ID = '3768319';

type MailRuEvent =
  | { id: string; type: 'pageView'; start: number; url?: string; pid?: string }
  | { id: string; type: 'setUserID'; userid: string };

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
