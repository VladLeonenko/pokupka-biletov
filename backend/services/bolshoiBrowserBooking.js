/**
 * Большой театр — браузерный флоу (Playwright).
 *
 * Ограничения из заметок:
 * - ≤2 аккаунта с одного IP (3+ → бан)
 * - корзина 5 мин → кнопка «к оплате» → 10 мин на оплату
 * - 2 или 4 билета / 1 заказ; после оплаты можно снова бронировать
 * - ФИО + паспорт (серия+номер одной строкой)
 * - 3 модалки правил: доскролл → принять → продолжить; данные клиента
 *   заполняем только после ошибки «не внесены данные»
 * - кнопку иногда надо кликать несколько раз
 * - сайт падает → reload
 * - QRATOR + капча 100% на старте продаж → реалистичный headed/persistent browser
 * - параллельные конкуренты → несколько аккаунтов / IP (residential)
 *
 * QRATOR: прямой Chromium с VPS/забаненного IP не проходит.
 * Рабочие режимы: storageState/cookies с чистого IP, либо residential proxy.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { BOLSHOI_ORIGIN, BOLSHOI_UA } from './bolshoiApi.js';
import { parseProxyUrl } from './bolshoiSniper.js';

export const STEALTH = () => {
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  Object.defineProperty(navigator, 'languages', { get: () => ['ru-RU', 'ru', 'en-US', 'en'] });
  Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
  window.chrome = window.chrome || { runtime: {}, csi: () => ({}), loadTimes: () => ({}) };
};

const DEFAULT_ARGS = [
  '--disable-blink-features=AutomationControlled',
  '--disable-quic',
  '--no-sandbox',
];

/**
 * @param {{ userDataDir: string, proxy?: string, headless?: boolean }} opts
 */
export async function launchBolshoiContext(opts) {
  const { userDataDir, proxy, headless = false } = opts;
  fs.mkdirSync(userDataDir, { recursive: true });
  const launchOpts = {
    headless,
    channel: process.env.BOLSHOI_CHROME_CHANNEL || 'chrome',
    viewport: { width: 1440, height: 900 },
    userAgent: BOLSHOI_UA,
    locale: 'ru-RU',
    timezoneId: 'Europe/Moscow',
    args: DEFAULT_ARGS,
  };
  if (proxy) {
    const parsed = parseProxyUrl(proxy);
    launchOpts.proxy = parsed || { server: proxy };
  }
  let ctx;
  try {
    ctx = await chromium.launchPersistentContext(userDataDir, launchOpts);
  } catch {
    // fallback без channel (bundled chromium)
    delete launchOpts.channel;
    ctx = await chromium.launchPersistentContext(userDataDir, launchOpts);
  }
  await ctx.addInitScript(STEALTH);
  return ctx;
}

export async function waitPastQrator(page, { timeoutMs = 120000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const title = await page.title().catch(() => '');
    const body = await page.evaluate(() => document.body?.innerText?.slice(0, 400) || '').catch(() => '');
    if (/запрещен|403 Error|Forbidden/i.test(`${title}\n${body}`)) {
      throw new Error(`QRATOR hard 403: ${body.slice(0, 120)}`);
    }
    if (/Афиша|спектакл|Купить|Войти|Личный|репертуар|Показ|билет/i.test(body)) return true;
    // challenge blank page while PoW runs
    await page.waitForTimeout(1500);
  }
  throw new Error('QRATOR timeout — нет прохода за отведённое время');
}

/** Мультиклик пока кнопка не пропадёт / не станет disabled / не случится навигация. */
export async function clickUntilGone(page, selector, { max = 8, delayMs = 400 } = {}) {
  for (let i = 0; i < max; i++) {
    const loc = page.locator(selector).first();
    if (!(await loc.count()) || !(await loc.isVisible().catch(() => false))) return i;
    await loc.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(delayMs);
  }
  return max;
}

/** Три модалки правил: скролл → принять → продолжить. */
export async function acceptRulesModals(page) {
  for (let round = 0; round < 5; round++) {
    const dialog = page.locator('[role="dialog"], .modal, .popup, .v-dialog, .el-dialog').filter({ hasText: /правил|согласи|продаж/i }).first();
    if (!(await dialog.count()) || !(await dialog.isVisible().catch(() => false))) break;
    const scrollable = dialog.locator('.content, .modal-body, .scroll, [class*="scroll"]').first();
    if (await scrollable.count()) {
      await scrollable.evaluate((el) => { el.scrollTop = el.scrollHeight; }).catch(() => {});
    } else {
      await dialog.evaluate((el) => { el.scrollTop = el.scrollHeight; }).catch(() => {});
    }
    await page.waitForTimeout(300);
    await clickUntilGone(page, 'button:has-text("Принимаю"), button:has-text("Принять"), button:has-text("Согласен"), button:has-text("Agree")', { max: 4 });
    await clickUntilGone(page, 'button:has-text("Продолжить"), button:has-text("Далее"), button:has-text("Continue")', { max: 4 });
    await page.waitForTimeout(400);
  }
}

/**
 * После ошибки «не внесены данные» — ФИО + паспорт одной строкой.
 * @param {{ fio: string, passport: string }} guest
 */
export async function fillGuestAfterError(page, guest) {
  const err = page.getByText(/не внесен|не указан|данных клиент|персональн|паспорт|ФИО/i).first();
  await err.waitFor({ timeout: 15000 }).catch(() => {});
  const fioInput = page.locator('input[name*="fio" i], input[placeholder*="ФИО" i], input[placeholder*="Фамилия" i]').first();
  const docInput = page.locator('input[name*="passport" i], input[name*="document" i], input[placeholder*="паспорт" i], input[placeholder*="серия" i]').first();
  if (await fioInput.count()) {
    await fioInput.fill(guest.fio);
  }
  if (await docInput.count()) {
    await docInput.fill(guest.passport);
  }
  // иногда одно поле «ФИО паспорт»
  const single = page.locator('input[placeholder*="ФИО" i][placeholder*="паспорт" i], textarea[name*="guest" i]').first();
  if (await single.count()) {
    await single.fill(`${guest.fio} ${guest.passport}`.trim());
  }
}

export async function ensureLogin(ctx, { email, password }) {
  const page = await ctx.newPage();
  try {
    await page.goto(`${BOLSHOI_ORIGIN}/login`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await waitPastQrator(page);
    // уже в сессии?
    const cookies = await ctx.cookies();
    if (cookies.some((c) => c.name === 'sails.sid' || c.name === 'spid')) {
      const me = await page.evaluate(async () => {
        try {
          const r = await fetch('/api/v1/client/user', { headers: { Accept: 'application/json' } });
          if (!r.ok) return null;
          return await r.json();
        } catch { return null; }
      });
      if (me && (me.__id || me.email || me.login)) return me;
    }
    await page.waitForSelector('input[type="email"], input[name="email"], input[name="login"]', { timeout: 30000 });
    const loginSel = await page.locator('input[type="email"], input[name="email"], input[name="login"]').first();
    const passSel = await page.locator('input[type="password"]').first();
    await loginSel.fill(email);
    await passSel.fill(password);
    await clickUntilGone(page, 'button[type="submit"], button:has-text("Войти"), button:has-text("Вход")', { max: 5 });
    await page.waitForTimeout(3000);
    const me = await page.evaluate(async () => {
      try {
        const r = await fetch('/api/v1/client/user', { headers: { Accept: 'application/json' } });
        if (!r.ok) return { status: r.status };
        return await r.json();
      } catch (e) { return { err: String(e) }; }
    });
    return me;
  } finally {
    await page.close().catch(() => {});
  }
}

/**
 * Dry-run / бой: открыть событие → выбрать N мест → корзина → правила → гость → оплата.
 * Возвращает { ok, paymentUrl?, orderId?, error? }
 */
export async function bookBolshoiEvent(ctx, {
  eventUrl,
  ticketCount = 2,
  guest,
  dryRun = true,
}) {
  const page = await ctx.newPage();
  const apiHits = [];
  page.on('response', (r) => {
    if (/\/api\/v1\//i.test(r.url())) apiHits.push({ status: r.status(), url: r.url() });
  });
  try {
    await page.goto(eventUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await waitPastQrator(page);
    // свободные места
    await page.waitForSelector('rect.seat:not(.unavailable), .seat:not(.unavailable)', { timeout: 60000 });
    const seats = page.locator('rect.seat:not(.unavailable):not(.seat--locked), .seat.available, .seat:not(.unavailable)');
    const n = Math.min(ticketCount, await seats.count());
    if (n < 1) return { ok: false, error: 'no_free_seats', apiHits };
    for (let i = 0; i < n; i++) {
      await seats.nth(i).click({ force: true });
      await page.waitForTimeout(200);
    }
    await clickUntilGone(page, 'button:has-text("Купить"), button:has-text("В корзину"), button:has-text("Забронировать"), button:has-text("Оформить")', { max: 6 });
    await acceptRulesModals(page);
    await clickUntilGone(page, 'button:has-text("Продолжить"), button:has-text("Далее"), button:has-text("К оплате")', { max: 6 });
    // ошибка про данные → заполняем
    if (guest?.fio) await fillGuestAfterError(page, guest);
    await clickUntilGone(page, 'button:has-text("Продолжить"), button:has-text("К оплате"), button:has-text("Оплатить")', { max: 6 });

    if (dryRun) {
      return { ok: true, dryRun: true, seats: n, apiHits, url: page.url() };
    }
    // ждём payment redirect
    await page.waitForURL(/pay|payment|tinkoff|sber|yookassa|order/i, { timeout: 60000 }).catch(() => {});
    return { ok: true, paymentUrl: page.url(), apiHits };
  } catch (e) {
    // сайт упал → один reload
    try {
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
      await waitPastQrator(page);
    } catch { /* ignore */ }
    return { ok: false, error: e.message, apiHits, screenshotHint: 'check /tmp/bolshoi-*.png' };
  } finally {
    await page.close().catch(() => {});
  }
}

export function accountUserDataDir(baseDir, accountKey) {
  const safe = String(accountKey).replace(/[^a-zA-Z0-9._@-]/g, '_');
  return path.join(baseDir, 'bolshoi-profiles', safe);
}
