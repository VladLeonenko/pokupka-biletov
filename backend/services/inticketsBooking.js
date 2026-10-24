// Браузерный снайпер Intickets (Театр Пушкина «Опера нищих»).
// Платформа: iframeab-pre12384.intickets.ru (Vue-виджет). API отдаёт зашифрованный JSON,
// поэтому читаем схему зала из DOM и кликаем по местам, как в tonBrowserBooking.
import { chromium } from 'playwright';

export const STEALTH = () => {
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  Object.defineProperty(navigator, 'languages', { get: () => ['ru-RU', 'ru', 'en-US', 'en'] });
  window.chrome = window.chrome || { runtime: {} };
  const oq = navigator.permissions && navigator.permissions.query;
  if (oq) {
    navigator.permissions.query = (p) => (p && p.name === 'notifications'
      ? Promise.resolve({ state: Notification.permission })
      : oq.call(navigator.permissions, p));
  }
};

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36';

// Перехват отрисовки канваса. Кладёт в window.__draws массив фигур с координатами и цветом.
export const CANVAS_HOOK = () => {
  const proto = CanvasRenderingContext2D.prototype;
  window.__draws = [];
  let path = { rects: [], arcs: [] };
  const origBeginPath = proto.beginPath;
  proto.beginPath = function (...a) { path = { rects: [], arcs: [] }; return origBeginPath.apply(this, a); };
  const origRect = proto.rect;
  proto.rect = function (...a) { path.rects.push([...a]); return origRect.apply(this, a); };
  const origArc = proto.arc;
  proto.arc = function (...a) { path.arcs.push([...a]); return origArc.apply(this, a); };
  const origFill = proto.fill;
  proto.fill = function (...a) {
    window.__draws.push({ kind: 'fill', rects: path.rects.slice(), arcs: path.arcs.slice(), fill: this.fillStyle, canvas: this.canvas?.className || '' });
    return origFill.apply(this, a);
  };
  const origFillRect = proto.fillRect;
  proto.fillRect = function (...a) {
    window.__draws.push({ kind: 'fillRect', rects: [[...a]], arcs: [], fill: this.fillStyle, canvas: this.canvas?.className || '' });
    return origFillRect.apply(this, a);
  };
  const origFillText = proto.fillText;
  proto.fillText = function (...a) {
    window.__draws.push({ kind: 'fillText', text: String(a[0]), x: a[1], y: a[2], fill: this.fillStyle, canvas: this.canvas?.className || '' });
    return origFillText.apply(this, a);
  };
};

export function seanceUrl(seanceId) {
  return `https://iframeab-pre12384.intickets.ru/seance/${seanceId}/`;
}

export async function launchCtx() {
  const ctx = await chromium.launchPersistentContext('/tmp/intickets-profile', {
    headless: true,
    viewport: { width: 1366, height: 900 },
    userAgent: UA,
    locale: 'ru-RU',
    timezoneId: 'Europe/Moscow',
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
  });
  await ctx.addInitScript(STEALTH);
  await ctx.addInitScript(CANVAS_HOOK);
  return ctx;
}

// Парсит перехваченную отрисовку в места: [{ x, y, w, h, cx, cy, fill, free }] на канвасе places-base.
export async function readSeats(page) {
  return page.evaluate(() => {
    const draws = window.__draws || [];
    const shapes = [];
    for (const d of draws) {
      if (d.kind === 'fillText') continue;
      if (!/places-base/i.test(d.canvas)) continue;
      for (const r of d.rects) shapes.push({ x: r[0], y: r[1], w: r[2] ?? 1, h: r[3] ?? 1, fill: d.fill });
      for (const a of d.arcs) shapes.push({ x: a[0] - a[2], y: a[1] - a[2], w: a[2] * 2, h: a[2] * 2, fill: d.fill });
    }
    // фон отбрасываем: оставляем мелкие «места» (w,h <= 40)
    const seats = shapes.filter((s) => s.w > 0 && s.h > 0 && s.w <= 40 && s.h <= 40);
    const map = new Map();
    for (const s of seats) map.set(`${Math.round(s.x)},${Math.round(s.y)}`, s);
    const out = [];
    const GRAY = /rgb\(\s*(\d+),\s*(\d+),\s*(\d+)/;
    for (const s of map.values()) {
      let free = true;
      const m = s.fill && s.fill.match(GRAY);
      if (m) { const r = +m[1], g = +m[2], b = +m[3]; if (Math.abs(r - g) < 12 && Math.abs(g - b) < 12 && r > 150) free = false; }
      out.push({ ...s, cx: s.x + s.w / 2, cy: s.y + s.h / 2, free });
    }
    return out;
  });
}

// Пары свободных соседних мест (по горизонтали, один ряд y).
export function findPairs(seats) {
  const free = seats.filter((s) => s.free);
  const byY = {};
  for (const s of free) { const y = Math.round(s.cy); (byY[y] = byY[y] || []).push(s); }
  const pairs = [];
  for (const y of Object.keys(byY)) {
    const list = byY[y].sort((a, b) => a.cx - b.cx);
    for (let i = 0; i < list.length - 1; i++) {
      const gap = list[i + 1].cx - list[i].cx;
      if (gap > 0 && gap <= list[i].w * 2.5) { pairs.push({ seats: [list[i], list[i + 1]] }); i++; }
    }
  }
  return pairs;
}

// Клик по месту (координаты канваса → экранные).
export async function clickSeatAt(page, seat) {
  const box = await page.evaluate(() => {
    const c = document.querySelector('canvas.places-base');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height, cw: c.width, ch: c.height };
  });
  if (!box) return false;
  const sx = box.x + (seat.cx / box.cw) * box.w;
  const sy = box.y + (seat.cy / box.ch) * box.h;
  await page.mouse.click(sx, sy);
  await page.waitForTimeout(500);
  return true;
}

export async function clickBuy(page) {
  // Кнопка покупки — ищем по тексту/классу.
  const sel = 'button:has-text("Купить"), button:has-text("Оформить"), button:has-text("Далее"), button:has-text("Продолжить"), [class*="buy" i], [class*="checkout" i]';
  await page.waitForSelector(sel, { timeout: 10000 }).catch(() => {});
  await page.click(sel, { timeout: 10000 }).catch(() => {});
}

// Ждёт редиректа на оплату и возвращает ссылку.
export async function waitPaymentUrl(page) {
  try {
    await page.waitForURL(/pay|payment|securepaymentgateway|cloudpayments|sberbank|tinkoff|checkout|unitpay|robokassa/i, { timeout: 30000 });
  } catch {}
  const url = page.url();
  return /pay|payment|securepaymentgateway|cloudpayments|sberbank|tinkoff|checkout|unitpay|robokassa/i.test(url) ? url : null;
}
