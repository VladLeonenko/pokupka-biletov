/**
 * Большой театр — HTTP API (ticket.bolshoi.ru)
 *
 * Стек: Vue2 SPA + Sails.js + QRATOR.
 * Автоматический TLS с нашего IP часто 403; рабочий путь — Safari/cookies с живой QRATOR-сессией
 * или residential proxy.
 *
 * Подтверждённые эндпоинты (из SPA + live Safari, show 150610044869):
 *   GET  /api/v1/client/shows
 *   GET  /api/v1/client/shows/:showId          → { showInfo, tariffs, schemeData }
 *   GET  /api/v1/client/shows/:showId/tariffs/:tariffId/seats
 *        seat: { ticketId, seatId, ticketState: free|unavailable|selected|...,
 *                ticketPrice, seatRow, seatNumber, requireVisitorData, ... }
 *   GET  /api/v1/client/checkout              → залочки текущей сессии
 *   PUT  /api/v1/client/lock_seats?lt=<YYYYMMDDhhmmss>
 *        headers: lltill, ls=<seat_id>
 *        body: { payload: { data: [{ seat_id, ticket_id, show_id, tariff_id, lock_till }] } }
 *   DELETE /api/v1/client/lock_seats?ticketIds=<id>   (axios params)
 *   POST /api/v1/client/buy_tickets
 *        body: { payload: { agreeWithRules, data: [{ ticket_id, visitor_name, visitor_document }] } }
 *        → { paymentUrl, paymentData }
 *   GET  /api/v1/client/profile               → { __id, fio, login, email, documentNumber, ... }
 *   GET  /api/v1/client/orders
 *   GET  /api/csrfToken                       → { _csrf }
 *   POST /api/v1/client/login | signup | logout | password...
 *
 * Тариф «Полный» = до 4 билетов. requireVisitorData → ФИО + паспорт одной строкой (visitor_document).
 * Заказы: expireTime − createTime ≈ 20 мин на оплату в истории (revoked).
 */
import fs from 'node:fs';

export const BOLSHOI_ORIGIN = 'https://ticket.bolshoi.ru';
export const BOLSHOI_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export const BOLSHOI_PATHS = {
  shows: '/api/v1/client/shows',
  show: (id) => `/api/v1/client/shows/${id}`,
  seats: (showId, tariffId) => `/api/v1/client/shows/${showId}/tariffs/${tariffId}/seats`,
  checkout: '/api/v1/client/checkout',
  lockSeats: '/api/v1/client/lock_seats',
  buyTickets: '/api/v1/client/buy_tickets',
  profile: '/api/v1/client/profile',
  orders: '/api/v1/client/orders',
  login: '/api/v1/client/login',
  logout: '/api/v1/client/logout',
  csrf: '/api/csrfToken',
};

export function normalizeCookieHeader(cookieHeader) {
  const raw = String(cookieHeader || '').trim();
  if (!raw) return '';
  if (raw.startsWith('[') || raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed) ? parsed : parsed.cookies || [];
      return list
        .filter((c) => c && c.name && c.value != null)
        .map((c) => `${c.name}=${c.value}`)
        .join('; ');
    } catch {
      /* fallthrough */
    }
  }
  return raw;
}

export function loadCookieFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return '';
  return normalizeCookieHeader(fs.readFileSync(filePath, 'utf8'));
}

/** lock_till / lt query — как в фронте (захардкоженные «далёкие» даты тоже прокатывают). */
export function lockTillStamp(d = new Date(Date.now() + 15 * 60 * 1000)) {
  const p = (n) => String(n).padStart(2, '0');
  return Number(
    `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`,
  );
}

export function createBolshoiClient(opts = {}) {
  const cookie =
    normalizeCookieHeader(opts.cookie) ||
    loadCookieFile(opts.cookieFile) ||
    normalizeCookieHeader(process.env.BOLSHOI_COOKIE) ||
    loadCookieFile(process.env.BOLSHOI_COOKIE_FILE);
  const timeoutMs = opts.timeoutMs || 30000;
  let csrf = opts.csrf || '';

  async function request(method, path, { json, headers, query } = {}) {
    let url = path.startsWith('http') ? path : `${BOLSHOI_ORIGIN}${path}`;
    if (query) {
      const q = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (Array.isArray(v)) v.forEach((x) => q.append(k, String(x)));
        else if (v != null) q.set(k, String(v));
      }
      url += (url.includes('?') ? '&' : '?') + q.toString();
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method,
        signal: ctrl.signal,
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Accept-Language': 'ru-RU,ru;q=0.9',
          Origin: BOLSHOI_ORIGIN,
          Referer: `${BOLSHOI_ORIGIN}/`,
          'User-Agent': BOLSHOI_UA,
          ...(cookie ? { Cookie: cookie } : {}),
          ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
          ...(json != null ? { 'Content-Type': 'application/json;charset=UTF-8' } : {}),
          ...headers,
        },
        body: json != null ? JSON.stringify(json) : undefined,
      });
      const ct = res.headers.get('content-type') || '';
      const text = await res.text();
      let data = null;
      if (ct.includes('json') || /^[\[{]/.test(text.trim())) {
        try { data = JSON.parse(text); } catch { /* */ }
      }
      return { ok: res.ok, status: res.status, ct, data, text: text.slice(0, 8000) };
    } finally {
      clearTimeout(t);
    }
  }

  return {
    cookie,
    request,
    async ensureCsrf() {
      const r = await request('GET', BOLSHOI_PATHS.csrf);
      csrf = r.data?._csrf || csrf;
      return csrf;
    },
    getShows: () => request('GET', BOLSHOI_PATHS.shows),
    getShow: (id) => request('GET', BOLSHOI_PATHS.show(id)),
    getSeats: (showId, tariffId) => request('GET', BOLSHOI_PATHS.seats(showId, tariffId)),
    getCheckout: () => request('GET', BOLSHOI_PATHS.checkout),
    getProfile: () => request('GET', BOLSHOI_PATHS.profile),
    getOrders: () => request('GET', BOLSHOI_PATHS.orders),

    /**
     * @param {{ seatId:number, ticketId:number, showId:number, tariffId:number, lockTill?: number }} seat
     */
    lockSeat(seat) {
      // SPA hardcoded lt/lltill (dynamic «сейчас+N» часто даёт 456)
      const lt = seat.lockTill || 20260101235959;
      const lltill = seat.lockLltill || 20260101315959;
      return request('PUT', BOLSHOI_PATHS.lockSeats, {
        query: { lt },
        headers: { lltill: String(lltill), ls: String(seat.seatId) },
        json: {
          payload: {
            data: [{
              seat_id: seat.seatId,
              ticket_id: seat.ticketId,
              show_id: seat.showId,
              tariff_id: seat.tariffId,
              lock_till: lt,
            }],
          },
        },
      });
    },

    unlockSeats(ticketIds) {
      const ids = Array.isArray(ticketIds) ? ticketIds : [ticketIds];
      return request('DELETE', BOLSHOI_PATHS.lockSeats, { query: { ticketIds: ids } });
    },

    /**
     * @param {{ agreeWithRules?: boolean, tickets: Array<{ ticketId:number, visitorName:string, visitorDocument:string }> }} opts
     */
    buyTickets({ agreeWithRules = true, tickets }) {
      return request('POST', BOLSHOI_PATHS.buyTickets, {
        json: {
          payload: {
            agreeWithRules,
            data: tickets.map((t) => ({
              ticket_id: t.ticketId,
              visitor_name: t.visitorName,
              visitor_document: t.visitorDocument,
            })),
          },
        },
      });
    },

    freeSeats(list) {
      return (list || []).filter((s) => s.ticketState === 'free' && Number(s.ticketPrice) > 0);
    },
  };
}
