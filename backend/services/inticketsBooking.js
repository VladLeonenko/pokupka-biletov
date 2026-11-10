/**
 * Intickets iframe (Современник / Пушкин и др.).
 * API шифрует JSON → схема из canvas DOM, клик по соседним местам.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const STEALTH = () => {
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  Object.defineProperty(navigator, 'languages', { get: () => ['ru-RU', 'ru', 'en-US', 'en'] });
  window.chrome = window.chrome || { runtime: {} };
  const oq = navigator.permissions && navigator.permissions.query;
  if (oq) {
    navigator.permissions.query = (p) =>
      p && p.name === 'notifications'
        ? Promise.resolve({ state: Notification.permission })
        : oq.call(navigator.permissions, p);
  }
};

export const CANVAS_HOOK = () => {
  const proto = CanvasRenderingContext2D.prototype;
  window.__draws = [];
  let pathState = { rects: [], arcs: [] };
  const origBeginPath = proto.beginPath;
  proto.beginPath = function (...a) {
    pathState = { rects: [], arcs: [] };
    return origBeginPath.apply(this, a);
  };
  const origRect = proto.rect;
  proto.rect = function (...a) {
    pathState.rects.push([...a]);
    return origRect.apply(this, a);
  };
  const origArc = proto.arc;
  proto.arc = function (...a) {
    pathState.arcs.push([...a]);
    return origArc.apply(this, a);
  };
  const origFill = proto.fill;
  proto.fill = function (...a) {
    window.__draws.push({
      kind: 'fill',
      rects: pathState.rects.slice(),
      arcs: pathState.arcs.slice(),
      fill: this.fillStyle,
      canvas: this.canvas?.className || '',
    });
    return origFill.apply(this, a);
  };
  const origFillRect = proto.fillRect;
  proto.fillRect = function (...a) {
    window.__draws.push({
      kind: 'fillRect',
      rects: [[...a]],
      arcs: [],
      fill: this.fillStyle,
      canvas: this.canvas?.className || '',
    });
    return origFillRect.apply(this, a);
  };
  const origFillText = proto.fillText;
  proto.fillText = function (...a) {
    window.__draws.push({
      kind: 'fillText',
      text: String(a[0]),
      x: a[1],
      y: a[2],
      fill: this.fillStyle,
      canvas: this.canvas?.className || '',
    });
    return origFillText.apply(this, a);
  };
};

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36';

export const SOVREMENNIK_HOST = 'https://iframeab-pre6521.intickets.ru';
export const PUSHKIN_HOST = 'https://iframeab-pre12384.intickets.ru';

export function seanceUrl(seanceId, host = SOVREMENNIK_HOST) {
  return `${host.replace(/\/$/, '')}/seance/${seanceId}/`;
}

export async function launchInticketsCtx({
  profileDir = '/tmp/intickets-konserzh-profile',
  referer = 'https://sovremennik.ru/',
} = {}) {
  const ctx = await chromium.launchPersistentContext(profileDir, {
    headless: true,
    viewport: { width: 1366, height: 900 },
    userAgent: UA,
    locale: 'ru-RU',
    timezoneId: 'Europe/Moscow',
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
    extraHTTPHeaders: { Referer: referer },
  });
  await ctx.addInitScript(STEALTH);
  await ctx.addInitScript(CANVAS_HOOK);
  return ctx;
}

export async function readSeats(page) {
  return page.evaluate(() => {
    const draws = window.__draws || [];
    const shapes = [];
    for (const d of draws) {
      if (d.kind === 'fillText') continue;
      if (d.canvas && !/places-base/i.test(d.canvas)) continue;
      for (const r of d.rects || []) shapes.push({ x: r[0], y: r[1], w: r[2] ?? 1, h: r[3] ?? 1, fill: d.fill });
      for (const a of d.arcs || []) shapes.push({ x: a[0] - a[2], y: a[1] - a[2], w: a[2] * 2, h: a[2] * 2, fill: d.fill });
    }
    const seats = shapes.filter((s) => s.w > 0 && s.h > 0 && s.w <= 40 && s.h <= 40);
    const map = new Map();
    for (const s of seats) map.set(`${Math.round(s.x)},${Math.round(s.y)}`, s);
    const out = [];
    const GRAY = /rgb\(\s*(\d+),\s*(\d+),\s*(\d+)/;
    for (const s of map.values()) {
      let free = true;
      const m = s.fill && String(s.fill).match(GRAY);
      if (m) {
        const r = +m[1];
        const g = +m[2];
        const b = +m[3];
        if (Math.abs(r - g) < 12 && Math.abs(g - b) < 12 && r > 150) free = false;
      }
      out.push({ ...s, cx: s.x + s.w / 2, cy: s.y + s.h / 2, free });
    }
    return out;
  });
}

export function findPairs(seats) {
  const free = (seats || []).filter((s) => s.free);
  const byY = {};
  for (const s of free) {
    const y = Math.round(s.cy);
    (byY[y] = byY[y] || []).push(s);
  }
  const pairs = [];
  for (const y of Object.keys(byY)) {
    const list = byY[y].sort((a, b) => a.cx - b.cx);
    for (let i = 0; i < list.length - 1; i++) {
      const gap = list[i + 1].cx - list[i].cx;
      if (gap > 0 && gap <= list[i].w * 2.5) {
        pairs.push({ seats: [list[i], list[i + 1]] });
        i++;
      }
    }
  }
  return pairs;
}

export async function clickSeatAt(page, seat) {
  const box = await page.evaluate(() => {
    const c = document.querySelector('canvas.places-base') || document.querySelector('canvas');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height, cw: c.width, ch: c.height };
  });
  if (!box || !box.cw || !box.ch) return false;
  const sx = box.x + (seat.cx / box.cw) * box.w;
  const sy = box.y + (seat.cy / box.ch) * box.h;
  await page.mouse.click(sx, sy);
  await page.waitForTimeout(450);
  return true;
}

/** @returns {'soldout'|'closed'|'open'|'unknown'} */
export async function getSeanceStatus(page) {
  const text = await page.evaluate(() => (document.body?.innerText || '').slice(0, 1200));
  const t = text.replace(/\s+/g, ' ');
  if (/аншлаг/i.test(t)) return { status: 'soldout', text: t.slice(0, 200) };
  if (/продажа билетов завершена|билеты не продаются|нет в продаже/i.test(t)) {
    return { status: 'closed', text: t.slice(0, 200) };
  }
  const hasCanvas = await page.evaluate(() => !!document.querySelector('canvas'));
  if (hasCanvas) return { status: 'open', text: t.slice(0, 200) };
  return { status: 'unknown', text: t.slice(0, 200) };
}

export async function clickBuy(page) {
  const sel =
    'button:has-text("Купить"), button:has-text("Оформить"), button:has-text("Далее"), button:has-text("Продолжить"), button:has-text("К оформлению"), [class*="buy" i], [class*="checkout" i]';
  await page.waitForSelector(sel, { timeout: 12000 }).catch(() => {});
  await page.click(sel, { timeout: 12000 }).catch(() => {});
}

async function fillFirst(page, selectors, value) {
  if (value == null || value === '') return false;
  for (const sel of selectors) {
    const el = page.locator(sel).first();
    if ((await el.count().catch(() => 0)) === 0) continue;
    try {
      await el.fill(String(value), { timeout: 2000 });
      return true;
    } catch {
      /* try next */
    }
  }
  return false;
}

function splitFio(fullName) {
  const parts = String(fullName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return {
    last: parts[0] || '',
    first: parts[1] || '',
    middle: parts.slice(2).join(' ') || '',
  };
}

/**
 * Заполняет покупателя + паспортные поля (если виджет просит).
 * @param {{ name, email, phone, documentSeries?, documentNumber?, fullName? }} buyer
 */
export async function fillBuyerForm(page, buyer) {
  const fio = splitFio(buyer.fullName || buyer.name);
  const phone = String(buyer.phone || '').replace(/\D/g, '');
  const phoneFmt = phone.startsWith('7') ? `+${phone}` : phone ? `+7${phone}` : '';

  await fillFirst(page, ['input[name*="email" i]', 'input[type="email"]', 'input[placeholder*="mail" i]'], buyer.email);
  await fillFirst(
    page,
    ['input[name*="phone" i]', 'input[type="tel"]', 'input[placeholder*="елефон" i]'],
    phoneFmt || buyer.phone,
  );
  await fillFirst(page, ['input[name*="last" i]', 'input[name*="surname" i]', 'input[placeholder*="амили" i]'], fio.last);
  await fillFirst(page, ['input[name*="first" i]', 'input[name*="name" i]', 'input[placeholder*="мя" i]'], fio.first);
  await fillFirst(page, ['input[name*="middle" i]', 'input[name*="patronym" i]', 'input[placeholder*="тчеств" i]'], fio.middle);
  await fillFirst(
    page,
    ['input[name*="series" i]', 'input[placeholder*="ерия" i]'],
    buyer.documentSeries,
  );
  await fillFirst(
    page,
    ['input[name*="number" i]', 'input[name*="passport" i]', 'input[placeholder*="омер" i]'],
    buyer.documentNumber,
  );
  // чекбоксы согласий
  for (const sel of ['input[type="checkbox"]']) {
    const boxes = page.locator(sel);
    const n = await boxes.count().catch(() => 0);
    for (let i = 0; i < n; i++) {
      const b = boxes.nth(i);
      if (!(await b.isChecked().catch(() => true))) await b.check({ force: true }).catch(() => {});
    }
  }
}

export async function waitPaymentUrl(page, { timeout = 45000 } = {}) {
  try {
    await page.waitForURL(
      /pay|payment|securepaymentgateway|cloudpayments|sberbank|tinkoff|checkout|unitpay|robokassa|sbp/i,
      { timeout },
    );
  } catch {
    /* */
  }
  const url = page.url();
  if (/pay|payment|securepaymentgateway|cloudpayments|sberbank|tinkoff|checkout|unitpay|robokassa|sbp/i.test(url)) {
    return url;
  }
  // иногда ссылка в новой вкладке / кнопке
  const href = await page
    .locator('a[href*="pay"], a[href*="payment"], a[href*="checkout"]')
    .first()
    .getAttribute('href')
    .catch(() => null);
  return href || null;
}

/**
 * Бронь соседних пар на сеансе Intickets.
 * @returns {{ ok, reason?, paymentUrl?, seatsLabel?, buyer?, pairsBooked? }}
 */
export async function bookInticketsAdjacentPairs(opts) {
  const {
    ctx,
    seanceId,
    host = SOVREMENNIK_HOST,
    referer = 'https://sovremennik.ru/',
    buyer,
    maxPairs = 1,
    waitMs = 9000,
  } = opts;
  if (!buyer?.email && !buyer?.phone) throw new Error('intickets: нужен buyer email/phone');

  const page = await ctx.newPage();
  try {
    await page.setExtraHTTPHeaders({ Referer: referer });
    await page.goto(seanceUrl(seanceId, host), { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(waitMs);

    const st = await getSeanceStatus(page);
    if (st.status === 'soldout') return { ok: false, reason: 'soldout', status: st };
    if (st.status === 'closed') return { ok: false, reason: 'closed', status: st };

    // дать канвасу дорисоваться
    for (let i = 0; i < 8; i++) {
      const seats = await readSeats(page);
      if (seats.length) break;
      await page.waitForTimeout(800);
    }
    await page.evaluate(() => {
      window.__draws = window.__draws || [];
    });
    // перезагрузка хука уже есть; просто ещё раз подождём redraw
    await page.waitForTimeout(1500);
    const seats = await readSeats(page);
    const pairs = findPairs(seats);
    if (!pairs.length) {
      return {
        ok: false,
        reason: seats.some((s) => s.free) ? 'no_pairs' : 'no_free_seats',
        free: seats.filter((s) => s.free).length,
        status: st,
      };
    }

    const take = pairs.slice(0, Math.max(1, maxPairs));
    for (const pr of take) {
      for (const s of pr.seats) {
        const okClick = await clickSeatAt(page, s);
        if (!okClick) return { ok: false, reason: 'click_failed' };
      }
    }

    await clickBuy(page);
    await page.waitForTimeout(1200);
    await fillBuyerForm(page, buyer);
    await clickBuy(page);
    await page.waitForTimeout(800);
    await clickBuy(page);

    const paymentUrl = await waitPaymentUrl(page);
    if (!paymentUrl) {
      return {
        ok: false,
        reason: 'no_payment_url',
        pageUrl: page.url(),
        pairsBooked: take.length,
      };
    }

    return {
      ok: true,
      paymentUrl,
      pairsBooked: take.length,
      seatsCount: take.length * 2,
      seatsLabel: `${take.length} пар (${take.length * 2} мест)`,
      buyer: {
        name: buyer.fullName || buyer.name,
        email: buyer.email,
        phone: buyer.phone,
      },
      pageUrl: page.url(),
    };
  } finally {
    await page.close().catch(() => {});
  }
}

export function loadBuyers({ contactsFile, passportsFile } = {}) {
  const contactsPath = contactsFile || path.join(__dirname, '..', 'sniper-contacts.json');
  const passportsPath = passportsFile || path.join(__dirname, '..', 'data', 'radario-passports.json');
  let passports = [];
  let contacts = [];
  try {
    passports = JSON.parse(fs.readFileSync(passportsPath, 'utf8'));
  } catch {
    /* */
  }
  try {
    contacts = JSON.parse(fs.readFileSync(contactsPath, 'utf8'));
  } catch {
    /* */
  }
  const fromPass = (Array.isArray(passports) ? passports : []).map((p) => ({
    fullName: p.fullName,
    name: p.fullName,
    email: p.email,
    phone: String(p.phone || '').replace(/\D/g, ''),
    documentSeries: p.documentSeries,
    documentNumber: p.documentNumber,
    documentType: p.documentType || 'PassportRf',
  }));
  const fromContacts = (Array.isArray(contacts) ? contacts : []).map((c) => ({
    fullName: c.name,
    name: c.name,
    email: c.email,
    phone: String(c.phone || '').replace(/\D/g, ''),
  }));
  // паспорта приоритетнее (есть серия/номер)
  const byEmail = new Map();
  for (const c of fromContacts) if (c.email) byEmail.set(c.email.toLowerCase(), c);
  for (const p of fromPass) byEmail.set(String(p.email || '').toLowerCase(), { ...byEmail.get(String(p.email || '').toLowerCase()), ...p });
  const merged = [...fromPass];
  for (const c of fromContacts) {
    if (!merged.some((m) => m.email && c.email && m.email.toLowerCase() === c.email.toLowerCase())) merged.push(c);
  }
  return merged.filter((b) => b.email || b.phone);
}

/** Совместимость со старым API (Пушкин). */
export async function launchCtx() {
  return launchInticketsCtx({
    profileDir: '/tmp/intickets-profile',
    referer: 'https://teatrpushkin.ru/',
  });
}

export { clickSeatAt as clickSeat };
