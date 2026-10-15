import { findBestSeatPairs, findBestSeatsByPreference, formatSeatPair } from '../utils/findBestSeatsInHall.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Бронирование мест через API Афиши напрямую (без браузера).
 * Реверс-инжиниринг из JS-бандлов виджета (index.fc2860ad.js):
 *   POST /carts                       → корзина (холд мест)
 *   POST /carts/{id}/ticket           → добавление мест
 *   POST /orders                      → создание заказа
 *   PATCH /orders/{id}/contacts       → контакты (name/email/phone)
 *   POST /payments/{id}               → создание платежа → payUrl (ссылка на оплату)
 */

const BASE = 'https://mapi.afisha.ru/api/v21';
// Widget-key МХТ им. Чехова (из URL iframe виджета afisha.ru/w/session/…/{key}/…).
export const MXAT_APP_KEY = 'a4b793a1-fe7b-4dfd-9dff-67fd74107277';
const CITY_ID = '2563';

/**
 * Куки-банка: капча Афиши работает так — при 429 (TooManyRequests) надо
 * вызвать GET /captcha (получить картинку+токен), решить и POST /captcha.
 * Верификация ставит куку, которую затем надо слать со всеми запросами.
 */
const cookieJar = new Map(); // name -> value

function storeSetCookies(headers) {
  let setCookies = [];
  try { setCookies = headers.getSetCookie ? headers.getSetCookie() : []; } catch { setCookies = []; }
  for (const sc of setCookies) {
    const first = String(sc).split(';')[0];
    const eq = first.indexOf('=');
    if (eq < 0) continue;
    cookieJar.set(first.slice(0, eq).trim(), first.slice(eq + 1).trim());
  }
}

function cookieHeader() {
  const parts = [...cookieJar].map(([k, v]) => `${k}=${v}`);
  return parts.length ? parts.join('; ') : '';
}

/** Низкоуровневый запрос (без ретраев капчи). Возвращает { status, ok, json, text }. */
async function rawRequest(method, path, body, appKey) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Application-Key': appKey,
    'X-City-Id': CITY_ID,
    'Referer': 'https://www.afisha.ru/',
  };
  const ck = cookieHeader();
  if (ck) headers['Cookie'] = ck;

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  storeSetCookies(res.headers);
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* не JSON */ }
  return { status: res.status, ok: res.ok, json, text };
}

const CAPTCHA_DIR = path.join(__dirname, '..', 'data', 'captcha');

/** Директория капчи (создаёт при необходимости). */
function captchaDir() {
  fs.mkdirSync(CAPTCHA_DIR, { recursive: true });
  return CAPTCHA_DIR;
}

/** Превращает image-поле капчи в строку, пригодную для <img src>. */
function toImageSrc(image) {
  const raw = String(image || '');
  if (raw.startsWith('data:') || /^https?:\/\//i.test(raw)) return raw;
  if (raw.includes('<svg')) return 'data:image/svg+xml;base64,' + Buffer.from(raw).toString('base64');
  return raw;
}

/** Сохраняет капчу для ручного решения (её увидит админка). */
function saveManualCaptchaState(token, image) {
  const dir = captchaDir();
  const state = { token, imageSrc: toImageSrc(image), createdAt: new Date().toISOString() };
  fs.writeFileSync(path.join(dir, 'current.json'), JSON.stringify(state, null, 2));
  return state;
}

/** Ждёт ручной ответ из data/captcha/answer.json (пишет админка). */
async function waitForManualAnswer(token, timeoutMs = 180000) {
  const answerFile = path.join(CAPTCHA_DIR, 'answer.json');
  console.log(`[captcha] Жду ручное решение (до ${Math.round(timeoutMs / 1000)}с). Введите ответ в админке «Снайпер мест».`);
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      if (fs.existsSync(answerFile)) {
        const a = JSON.parse(fs.readFileSync(answerFile, 'utf8'));
        if (a && a.token === token && a.answer) {
          fs.unlinkSync(answerFile); // одноразовый ответ
          return String(a.answer).trim();
        }
      }
    } catch { /* повторяем */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return null;
}

/** Одна попытка решения картинки через RuCaptcha (ImageToText). Возвращает текст или null. */
async function rucaptchaSolveOnce(key, imageBuf) {
  const form = new URLSearchParams({
    key,
    method: 'base64',
    body: imageBuf.toString('base64'),
    json: '1',
  });
  const inRes = await fetch('https://rucaptcha.com/in.php', { method: 'POST', body: form });
  const inText = await inRes.text();
  let id = null;
  try { id = JSON.parse(inText)?.request; } catch {}
  if (!id && inText.startsWith('OK|')) id = inText.slice(3);
  if (!id) { console.log(`[captcha] RuCaptcha in.php: ${inText.slice(0, 80)}`); return null; }

  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const resText = await (await fetch(`https://rucaptcha.com/res.php?key=${encodeURIComponent(key)}&action=get&id=${encodeURIComponent(id)}&json=1`)).text();
    // JSON (json=1): {"status":1,"request":"ответ"} или {"status":0,"request":"CAPCHA_NOT_READY"}
    if (resText.trim().startsWith('{')) {
      try {
        const j = JSON.parse(resText);
        if (j && j.status === 1 && j.request) return String(j.request).trim();
        if (String(j?.request || '').includes('CAPCHA_NOT_READY')) continue;
        console.log(`[captcha] RuCaptcha res.php: ${resText.slice(0, 80)}`);
        return null;
      } catch { /* fall through к текстовому формату */ }
    }
    // текстовый формат: OK|ответ / CAPCHA_NOT_READY / ERROR_*
    if (resText.startsWith('OK|')) return resText.slice(3).trim();
    if (!resText.includes('CAPCHA_NOT_READY')) {
      console.log(`[captcha] RuCaptcha res.php: ${resText.slice(0, 80)}`);
      return null;
    }
  }
  return null;
}

/** Авто-решение растровой капчи через RuCaptcha (одна попытка). */
async function solveViaRucaptcha(imageBuf) {
  const key = String(process.env.RUCAPTCHA_API_KEY || '').trim();
  if (!key) return null;
  try {
    const answer = await rucaptchaSolveOnce(key, imageBuf);
    if (answer) console.log(`[captcha] RuCaptcha решил: «${answer}»`);
    return answer;
  } catch (e) {
    console.log('[captcha] RuCaptcha ошибка:', e instanceof Error ? e.message : e);
    return null;
  }
}

/** Решает картинку капчи. Авто (SVG/RuCaptcha) или сохраняет для ручного решения. */
async function solveCaptchaImage(image, token) {
  const dir = captchaDir();
  let svgText = null;
  let rasterBuf = null;
  let ext = 'svg';

  const raw = String(image || '');
  if (raw.startsWith('data:')) {
    const m = raw.match(/^data:([^;,]+)(;base64)?,(.*)$/s);
    if (m) {
      const mime = m[1];
      const payload = m[3];
      if (mime.includes('svg')) {
        svgText = m[2] ? Buffer.from(payload, 'base64').toString('utf8') : decodeURIComponent(payload);
      } else {
        rasterBuf = m[2] ? Buffer.from(payload, 'base64') : Buffer.from(payload);
        ext = mime.includes('png') ? 'png' : mime.includes('jpeg') || mime.includes('jpg') ? 'jpg' : 'bin';
      }
    }
  } else if (/^\s*<svg/i.test(raw) || raw.includes('<svg')) {
    svgText = raw;
  } else if (/^https?:\/\//i.test(raw)) {
    const r = await fetch(raw);
    const arr = await r.arrayBuffer();
    rasterBuf = Buffer.from(arr);
    ext = 'png';
  }

  // SVG → пробуем вытащить текст из <text> (авто).
  if (svgText) {
    const texts = [...svgText.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/gi)].map((m) => m[1].replace(/<[^>]+>/g, '').trim()).filter(Boolean);
    if (texts.length) {
      const answer = texts.join('');
      fs.writeFileSync(path.join(dir, `captcha-${token}.svg`), svgText);
      console.log(`[captcha] SVG-капча решена автоматически: «${answer}»`);
      return answer;
    }
  }

  // Авто не получилось → пробуем RuCaptcha (растр) или сохраняем для ручного решения.
  if (rasterBuf) {
    fs.writeFileSync(path.join(dir, `captcha-${token}.${ext}`), rasterBuf);
    const auto = await solveViaRucaptcha(rasterBuf);
    if (auto) return auto;
  } else if (svgText) {
    fs.writeFileSync(path.join(dir, `captcha-${token}.svg`), svgText);
  }
  saveManualCaptchaState(token, raw);
  return null;
}

/** Флоу капчи: GET /captcha → решить (авто/вручную) → POST /captcha. */
async function solveCaptchaFlow(appKey) {
  const get = await rawRequest('GET', '/captcha', undefined, appKey);
  if (!get.ok || !get.json?.token) {
    console.log(`[captcha] GET /captcha не дал токен: ${get.json?.error?.description || get.status}`);
    return false;
  }
  const { image, token } = get.json;
  let answer = await solveCaptchaImage(image, token);
  if (!answer) {
    answer = await waitForManualAnswer(token);
  }
  if (!answer) {
    console.log('[captcha] Ручное решение не получено — пропускаю.');
    return false;
  }
  const post = await rawRequest('POST', '/captcha', { token, captchaResult: answer }, appKey);
  if (!post.ok) {
    console.log(`[captcha] POST /captcha не прошёл: ${post.json?.error?.description || post.status}`);
    return false;
  }
  console.log('[captcha] Капча верифицирована, кука установлена.');
  return true;
}

async function api(method, path, body, appKey) {
  let res = await rawRequest(method, path, body, appKey);
  let captchaTries = 0;
  while (res.status === 429 && captchaTries < 3) {
    captchaTries++;
    console.warn(`[captcha] 429 на ${path} — решаю капчу (попытка ${captchaTries})...`);
    const solved = await solveCaptchaFlow(appKey);
    if (!solved) break;
    res = await rawRequest(method, path, body, appKey);
  }
  if (!res.ok) {
    const msg = res.json?.error?.description || res.json?.error?.codeDescription || `HTTP ${res.status}`;
    throw new Error(`${path}: ${msg}`);
  }
  return res.json;
}

/** Схема зала (та же, что отдаёт виджет). */
export async function getHallJson(sessionId, appKey = MXAT_APP_KEY) {
  return api('GET', `/hall/${sessionId}?withSubstrate=true`, undefined, appKey);
}

/** Payload билета для POST /carts/{id}/ticket (повторяет normalizeTicket из виджета). */
function buildTicket(level, row, seat) {
  const st = level.seatTypes?.find((x) => x.id === seat.seatTypeId);
  if (!st || !st.ticketTypes?.length) throw new Error(`нет seatTypes для ${seat.seatTypeId}`);
  const tt = st.ticketTypes[0];
  return {
    levelId: level.id,
    levelName: level.name,
    seatId: seat.id,
    row: row.number,
    seat: seat.number,
    seatTypeId: seat.seatTypeId,
    seatTypeName: st.name,
    ticketTypeId: tt.id,
    ticketTypeTicketPrice: tt.price,
    ticketTypeFee: tt.fee,
    ticketTypeTitle: tt.title,
    ticketTypes: st.ticketTypes.map((o) => ({
      id: o.id,
      title: o.title,
      description: o.description,
      shortDescription: o.shortDescription,
      benefitShortDescription: o.benefitShortDescription ?? o.benefitDescription,
      price: o.price,
      ticketKind: o.ticketKind,
      fee: o.fee,
    })),
  };
}

/**
 * Резолвер: открывает страницу события (mxat.ru/…) в headless-браузере
 * и вытаскивает sessionId всех сессий + widget-key (appKey).
 */
export async function resolveEventSessions(url, appKey = MXAT_APP_KEY) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, locale: 'ru-RU' });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(4000);

    const sessions = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('[onclick*="appendWidget"]').forEach((el) => {
        const m = (el.getAttribute('onclick') || '').match(/sessionId:\s*(\d+)/);
        if (!m) return;
        let node = el;
        let date = '';
        for (let i = 0; i < 6 && node; i++) {
          node = node.parentElement;
          if (!node) break;
          const t = (node.innerText || '').trim().replace(/\s+/g, ' ');
          if (t && t.length < 120 && /\d{1,2}\s+[А-ЯЁA-Z]+/i.test(t)) { date = t.slice(0, 60); break; }
        }
        const status = (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 40);
        out.push({ sessionId: m[1], date, status });
      });
      return out;
    });

    return { sessions, appKey };
  } finally {
    await browser.close();
  }
}

/** Проверка доступности сессии (для мониторинга старта продаж). */
export async function getSessionAvailability(sessionId, appKey = MXAT_APP_KEY) {
  try {
    const hall = await getHallJson(sessionId, appKey);
    const available = hall.levels.flatMap((l) => l.rows.flatMap((r) => r.seats)).filter((s) => s.isAvailable);
    return {
      sessionId,
      hasAvailablePlaces: !!hall.session?.hasAvailablePlaces,
      availableCount: available.length,
      minPrice: hall.session?.minPrice,
      time: hall.session?.time,
    };
  } catch (e) {
    // «нет доступных мест» / «не в продаже» → продажи ещё не открыты.
    // 429/captcha — это НЕ «закрыто», а антибот-блок: отдельно помечаем.
    const msg = e instanceof Error ? e.message : String(e);
    const captchaBlocked = /429|капч|captcha/i.test(msg);
    return { sessionId, hasAvailablePlaces: false, availableCount: 0, error: msg, captchaBlocked, time: null };
  }
}

/** Отменяет заказ (освобождает забронированные места). */
export async function cancelOrder(orderId, appKey = MXAT_APP_KEY) {
  return api('DELETE', `/orders/${orderId}`, undefined, appKey);
}

/** Повторно создаёт платёж по заказу — обновляет окно оплаты (продлевает бронь). */
export async function renewPayment(orderId, appKey = MXAT_APP_KEY) {
  return api('POST', `/payments/${orderId}`, {}, appKey);
}

/**
 * Бронирует одну группу пар мест (один заказ) и возвращает ссылку на оплату.
 */
export async function bookOneOrder(hall, pairs, sessionId, appKey, contacts) {
  const seats = [];
  for (const pair of pairs) {
    const level = hall.levels.find((l) => l.id === pair.levelId);
    const row = level.rows.find((r) => r.number === pair.row);
    for (const s of pair.seats) {
      seats.push({ level, row, seat: row.seats.find((x) => x.id === s.id) });
    }
  }
  const cart = await api('POST', '/carts', { sessionId: Number(sessionId) }, appKey);
  const tickets = seats.map(({ level, row, seat }) => buildTicket(level, row, seat));
  await api('POST', `/carts/${cart.id}/ticket`, tickets, appKey);
  const order = await api('POST', '/orders', { cartId: cart.id }, appKey);
  const orderId = order.order.id;
  if (contacts) await api('PATCH', `/orders/${orderId}/contacts`, contacts, appKey);
  const payment = await api('POST', `/payments/${orderId}`, {}, appKey);

  return {
    orderId,
    seats: pairs.map(formatSeatPair).join(' | '),
    totalPrice: pairs.reduce((sum, p) => sum + p.totalPrice, 0),
    paymentUrl: payment.payUrl,
    status: payment.status,
    remainingTime: payment.remainingTime,
    qrCode: payment.qrCode,
    seatIds: pairs.flatMap((p) => p.seats.map((s) => s.id)),
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function mapConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function pump() {
    for (;;) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, pump));
  return results;
}

/**
 * Бронирует пары соседних мест (2 места) для списка покупателей с авто-повтором.
 * Каждый покупатель получает одну пару. При «место занято» (гонка) покупатель
 * повторяется со следующим лучшим местом (до maxTries раз). Отслеживает уже
 * забронированные места, чтобы не повторить их.
 *
 * @param {{ sessionId, appKey?, pairCount?, contacts, concurrency?, maxTries?, preference?, skipSeatIds? }} opts
 * @returns {Promise<{ results: Array, errors: Array }>}
 */
export async function bookSeatsViaApi({ sessionId, appKey = MXAT_APP_KEY, pairCount, contacts = [], concurrency = 5, maxTries = 3, preference = null, skipSeatIds = null }) {
  if (!contacts.length) throw new Error('нужен хотя бы один контакт {name, email}');
  const count = pairCount ?? contacts.length;
  const rankPairs = (hall, opts) => (preference
    ? findBestSeatsByPreference(hall, preference, opts)
    : findBestSeatPairs(hall, opts));

  const results = [];
  const errors = [];
  const bookedSeatIds = skipSeatIds instanceof Set ? skipSeatIds : new Set(skipSeatIds || []);
  const queue = Array.from({ length: count }, (_, i) => ({ contact: contacts[i % contacts.length], tries: 0 }));

  while (queue.length > 0) {
    const hall = await getHallJson(sessionId, appKey).catch(() => null);
    if (!hall) { await sleep(800); continue; }

    const pairs = rankPairs(hall, { count: 2, limit: 200 })
      .filter((p) => !p.seats.some((s) => bookedSeatIds.has(s.id)));
    if (!pairs.length) break; // свободных пар больше нет

    const batch = queue.slice(0, concurrency);
    const outcomes = await mapConcurrency(batch, concurrency, async ({ contact }, i) => {
      const pair = pairs[i];
      if (!pair) return { ok: false, contact, error: 'no_pair' };
      try {
        const r = await bookOneOrder(hall, [pair], sessionId, appKey, contact);
        return { ok: true, contact, pair, result: r };
      } catch (e) {
        return { ok: false, contact, error: e instanceof Error ? e.message : String(e) };
      }
    });

    const retry = [];
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (i >= batch.length) { retry.push(item); continue; }
      const o = outcomes[i];
      if (o.ok) {
        results.push({ ...o.result, name: o.contact.name, email: o.contact.email, phone: o.contact.phone });
        o.pair.seats.forEach((s) => bookedSeatIds.add(s.id));
      } else {
        item.tries += 1;
        if (item.tries >= maxTries) errors.push({ name: o.contact.name, email: o.contact.email, error: o.error });
        else retry.push(item);
      }
    }
    queue.splice(0, queue.length, ...retry);
    if (batch.length && outcomes.every((o) => !o.ok)) await sleep(1200);
  }

  return { results, errors };
}
