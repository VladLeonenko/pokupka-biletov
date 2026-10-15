// Profticket API (Цирк Никулина, «Новогодний лабиринт», customer 53).
// Обычный JSON API (без шифрования). Эндпоинты выяснены из виджета spa.profticket.ru.
const BASE = 'https://widget.profticket.ru/api/v1/company/53';
const LANG = 'ru-RU';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Куки (PHPSESSID из start-session) — сессия корзины привязана к ним.
let cookieJar = '';
function mergeCookies(setCookie) {
  if (!setCookie) return;
  for (const c of setCookie.split(/,(?=\s*[A-Za-z0-9_]+=)/)) {
    const nv = (c.split(';')[0] || '').trim();
    const eq = nv.indexOf('=');
    if (eq < 0) continue;
    const name = nv.slice(0, eq);
    const val = nv.slice(eq + 1);
    cookieJar = cookieJar.split('; ').filter((x) => !x.startsWith(name + '=')).join('; ');
    cookieJar = (cookieJar ? cookieJar + '; ' : '') + name + '=' + val;
  }
}

async function api(path, opts = {}) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 20000); // таймаут, чтобы не зависнуть навсегда
  try {
    const headers = { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded', ...(cookieJar ? { Cookie: cookieJar } : {}), ...(opts.headers || {}) };
    const res = await fetch(`${BASE}${path}`, {
      method: opts.method || 'GET',
      headers,
      body: opts.body ? new URLSearchParams(opts.body).toString() : undefined,
      signal: ac.signal,
    });
    mergeCookies(res.headers.get('set-cookie'));
    const text = await res.text();
    try { return JSON.parse(text); } catch (parseErr) { return { error: { code: -1, message: `JSON parse error: ${parseErr.message} | body=${text.slice(0, 200)}` } }; }
  } catch (err) {
    return { error: { code: -2, message: err?.message || String(err) } };
  } finally {
    clearTimeout(timer);
  }
}

// Список событий (все декабрьские представления).
export async function getEvents() {
  const j = await api(`/event/list/?company_id=53&page=1&period_id=0&language=${LANG}`);
  const out = [];
  for (const d of j?.response?.items || []) {
    for (const e of d.events || []) out.push(e);
  }
  return out;
}

// Схема зала события: items[] с полями id,row,seat,cod_sec,name_sec,avail,price.
export async function getScheme(eventId, globalShowId = 10362) {
  const j = await api(`/event/scheme/?company_id=53&global_show_id=${globalShowId}&event_id=${eventId}&language=${LANG}`);
  const r = j?.response || {};
  return {
    items: (r.items || []).filter((x) => x.object_type === 'Place'),
    hasAvailable: r.schedule_item_data?.has_available_places ?? false,
  };
}

// Сессия корзины (для будущего бронирования).
export async function startBasketSession() {
  const j = await api('/basket/start-session/', { method: 'POST', body: { company_id: 53 } });
  return j?.response?.session || null;
}

// Решение Google reCAPTCHA v2 (чекбокс «Подтвердите, что Вы не робот») через RuCaptcha.
async function solveRecaptcha(pageurl, sitekey) {
  const key = String(process.env.RUCAPTCHA_API_KEY || '').trim();
  if (!key) throw new Error('нет RUCAPTCHA_API_KEY');
  const form = new URLSearchParams({ key, method: 'userrecaptcha', googlekey: sitekey, pageurl, json: '1' });
  const inText = await (await fetch('https://rucaptcha.com/in.php', { method: 'POST', body: form })).text();
  let id = null;
  try { id = JSON.parse(inText)?.request; } catch {}
  if (!id && inText.startsWith('OK|')) id = inText.slice(3);
  if (!id) throw new Error('rucaptcha in.php: ' + inText.slice(0, 120));
  for (let i = 0; i < 120; i++) {
    await sleep(3000);
    const t = await (await fetch(`https://rucaptcha.com/res.php?key=${encodeURIComponent(key)}&action=get&id=${encodeURIComponent(id)}&json=1`)).text();
    if (t.trim().startsWith('{')) {
      try {
        const j = JSON.parse(t);
        if (j?.status === 1 && j?.request) return String(j.request);
        if (!String(j?.request || '').includes('CAPCHA_NOT_READY')) break;
      } catch { break; }
    } else if (t.startsWith('OK|')) return t.slice(3);
  }
  throw new Error('rucaptcha: не смог решить reCAPTCHA');
}

// Резерв мест (положить в корзину). seats = [{ cod_sec, row, seat, price, price_sell }].
export async function preReservation(session, eventId, seats, globalShowId = 10362) {
  const items = JSON.stringify(seats.map((s) => ({
    event_id: String(eventId),
    set_id: null,
    cod_sec: s.cod_sec,
    row: s.row,
    seat: s.seat,
    price: s.price,
    price_sell: s.price_sell ?? s.price,
  })));
  const body = { session, company_id: 53, global_show_id: globalShowId, items };
  let j = await api('/basket/pre-reservation/', { method: 'POST', body });
  if (j?.error?.code === 15) {
    const sitekey = j?.error?.message?.siteKey;
    if (sitekey) {
      // Токен капчи идёт НЕ в pre-reservation, а в отдельный anti-fraud/verify-captcha.
      const token = await solveRecaptcha('https://spa.profticket.ru/customer/53/shows/102', sitekey);
      await api('/anti-fraud/verify-captcha/', { method: 'POST', body: { company_id: 53, token } });
      j = await api('/basket/pre-reservation/', { method: 'POST', body });
    }
  }
  return j;
}

// Создание заказа → возвращает { order, payment_url, params_for_payment }.
// payment_system_id: 335 = Сбербанк (карта, внешний payment_url), 475 = SberPay (Web SDK, без URL), 200 = СБП (qr_code_url).
export async function createOrder(session, contact, paymentSystemId = 335) {
  const j = await api('/order/create/', {
    method: 'POST',
    body: {
      session,
      company_id: 53,
      user_email: contact.email,
      user_name: contact.name,
      user_phone: contact.phone,
      accepted: 1,
      personal_data_checkbox: 1,
      payment_system_id: paymentSystemId,
    },
  });
  const r = j?.response || j || {};
  const pp = r.params_for_payment || {};
  return { order: r.order, paymentUrl: pp.payment_url, params: pp };
}
