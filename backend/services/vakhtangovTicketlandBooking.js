/**
 * Вахтангов / Ticketland — бронь партера парами через Playwright.
 *
 * Флоу:
 *  1) open performance (?lite-layout&iframe-hash) — ServicePipe проходит в Chromium
 *  2) GET /api/show/performance + /api/v2/hallview/map/{id}
 *  3) filter section=Партер, adjacent pair
 *  4) POST /hallPlace/select/ (cypher=abcde+base64) ×2
 *  5) /shopcart → ФИО/email/phone → Оплата СБП → payment URL
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CONTACTS = path.join(__dirname, '..', 'sniper-contacts.json');
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36';

function encodeCypher(obj) {
  return 'abcde' + Buffer.from(JSON.stringify(obj), 'utf8').toString('base64');
}

function loadContacts(filePath = process.env.VAKHTANGOV_CONTACTS_FILE || DEFAULT_CONTACTS) {
  const list = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return (Array.isArray(list) ? list : [])
    .map((c) => ({
      name: String(c.name || '').trim(),
      email: String(c.email || '').trim(),
      phone: String(c.phone || '').replace(/\D/g, ''),
    }))
    .filter((c) => c.name && c.email && c.phone);
}

function splitName(full) {
  const parts = String(full || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return { last: parts[0], first: parts.slice(1).join(' ') };
  return { last: parts[0] || 'Иванов', first: parts[1] || 'Иван' };
}

function findParterPairs(places) {
  const free = (places || []).filter(
    (p) => Number(p.state) === 0 && /партер/i.test(p.section?.name || ''),
  );
  free.sort(
    (a, b) => Number(a.row) - Number(b.row) || Number(a.place) - Number(b.place) || a.price - b.price,
  );
  const pairs = [];
  const used = new Set();
  for (let i = 0; i < free.length - 1; i++) {
    if (used.has(free[i].id)) continue;
    const a = free[i];
    const b = free[i + 1];
    if (
      a.row === b.row &&
      Number(b.place) - Number(a.place) === 1 &&
      a.section?.id === b.section?.id
    ) {
      pairs.push([a, b]);
      used.add(a.id);
      used.add(b.id);
      i++;
    }
  }
  return pairs;
}

async function selectSeat(page, s) {
  const payload = {
    id: s.id,
    objId: Number(s.o),
    sectionId: s.section.id,
    placeNum: String(s.place),
    rowNum: String(s.row),
    performanceId: Number(s.p),
    groupId: s.group,
    isBI: false,
    description: s.description,
    isSpectatorCard: false,
    taxes: s.taxes,
    fundId: s.fundId,
  };
  const body = new URLSearchParams({
    cypher: encodeCypher(payload),
    tax: String(s.tariff),
    'tl-csrf': 'no-csrf',
  }).toString();
  return page.evaluate(async (body) => {
    const res = await fetch('/hallPlace/select/', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        Accept: 'application/json, text/javascript, */*; q=0.01',
      },
      body,
    });
    const json = await res.json().catch(async () => ({ raw: await res.text() }));
    return { status: res.status, json };
  }, body);
}

/**
 * @param {{ path: string, accessHash: string, label?: string }} performance
 * @param {{ maxPairs?: number, contactsFile?: string, dryRun?: boolean, contactIndex?: number }} [opts]
 */
export async function bookVakhtangovParterPairs(performance, opts = {}) {
  const contacts = loadContacts(opts.contactsFile);
  if (!contacts.length) throw new Error('vakhtangov: empty contacts');
  const maxPairs = Math.max(1, Math.min(Number(opts.maxPairs || 1), 3));
  const contact = contacts[Number(opts.contactIndex || 0) % contacts.length];
  const { first, last } = splitName(contact.name);

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled'],
  });
  try {
    const ctx = await browser.newContext({ userAgent: UA, locale: 'ru-RU' });
    await ctx.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
    const page = await ctx.newPage();
    let paymentUrl = null;
    page.on('response', async (res) => {
      const u = res.url();
      if (/payment|pay|sbp|redirect/i.test(u)) {
        try {
          const j = await res.json();
          const cand =
            j?.redirectUrl ||
            j?.paymentUrl ||
            j?.url ||
            j?.data?.redirectUrl ||
            j?.data?.paymentUrl ||
            null;
          if (cand && /^https?:/i.test(cand)) paymentUrl = cand;
        } catch { /* ignore */ }
      }
    });

    const startUrl = `https://www.ticketland.ru${performance.path}?lite-layout=1&iframe-hash=${performance.accessHash}`;
    await page.goto(startUrl, { waitUntil: 'networkidle', timeout: 90_000 });
    await page.waitForTimeout(1500);

    const perf = await page.evaluate(async (path) => {
      const r = await fetch(`/api/show/performance/?url=${encodeURIComponent(path)}`, {
        credentials: 'include',
      });
      if (!r.ok) throw new Error(`performance HTTP ${r.status}`);
      return r.json();
    }, `${performance.path}?lite-layout=1&iframe-hash=${performance.accessHash}`);

    if (perf?.isSoldOut) {
      return { ok: false, reason: 'sold_out', performanceId: perf.id };
    }

    const map = await page.evaluate(async (id) => {
      const r = await fetch(`/api/v2/hallview/map/${id}/?isSpecialSale=0`, {
        credentials: 'include',
      });
      if (!r.ok) throw new Error(`hallmap HTTP ${r.status}`);
      return r.json();
    }, perf.id);

    const pairs = findParterPairs(map.places || []);
    if (!pairs.length) {
      return {
        ok: false,
        reason: 'no_parter_pairs',
        performanceId: perf.id,
        freeParter: (map.places || []).filter(
          (p) => p.state === 0 && /партер/i.test(p.section?.name || ''),
        ).length,
      };
    }

    const take = pairs.slice(0, maxPairs);
    if (opts.dryRun) {
      return {
        ok: true,
        dryRun: true,
        performanceId: perf.id,
        pairs: take.map((pr) =>
          pr.map((s) => ({
            id: s.id,
            row: s.row,
            place: s.place,
            price: s.price,
            section: s.section?.name,
          })),
        ),
      };
    }

    const locked = [];
    for (const pr of take) {
      for (const s of pr) {
        const r = await selectSeat(page, s);
        if (!r?.json?.result) {
          return {
            ok: false,
            reason: 'select_failed',
            performanceId: perf.id,
            seat: s.id,
            error: r?.json || r,
            locked,
          };
        }
        locked.push(s);
        await page.waitForTimeout(300);
      }
    }

    await page.goto('https://www.ticketland.ru/shopcart/', {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    await page.waitForTimeout(2500);

    const fillByPlaceholder = async (placeholder, value) => {
      const loc = page.locator(`input[placeholder="${placeholder}"]`).first();
      if (await loc.count()) {
        await loc.click({ timeout: 3000 });
        await loc.fill('');
        await loc.type(value, { delay: 20 });
        return true;
      }
      return false;
    };

    await fillByPlaceholder('Имя', first);
    await fillByPlaceholder('Фамилия', last);
    await fillByPlaceholder('Email', contact.email);
    // телефон: вводим 10 цифр после +7 (mask)
    const phone10 = contact.phone.replace(/^7/, '').replace(/^8/, '').slice(0, 10);
    const tel = page.locator('input[type=tel]').first();
    if (await tel.count()) {
      await tel.click({ timeout: 3000 });
      await tel.fill('');
      await tel.type(phone10, { delay: 25 });
    }

    const checks = page.locator('input[type=checkbox]');
    const n = await checks.count();
    for (let i = 0; i < Math.min(n, 2); i++) {
      const c = checks.nth(i);
      if (!(await c.isChecked().catch(() => true))) {
        await c.check({ force: true }).catch(() => {});
      }
    }

    // СБП: сначала выбрать метод, потом кнопку оплаты
    await page.getByText('Оплата СБП', { exact: false }).first().click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(800);

    const confirmSelectors = [
      page.getByRole('button', { name: /оплатить|перейти к оплате|оформить заказ|оплата заказа/i }),
      page.locator('button.q-btn:has-text("Оплат")'),
      page.locator('[class*="pay"] button'),
      page.locator('button:has-text("Оплатить")'),
    ];
    let clickedPay = false;
    for (const loc of confirmSelectors) {
      const btn = loc.first();
      if (!(await btn.count())) continue;
      try {
        await Promise.all([
          page.waitForURL(/payment|pay|sbp|bank|qr|checkout/i, { timeout: 25000 }).catch(() => null),
          btn.click({ timeout: 5000 }),
        ]);
        clickedPay = true;
        await page.waitForTimeout(6000);
        break;
      } catch { /* try next */ }
    }
    if (!clickedPay) await page.waitForTimeout(4000);

    if (!paymentUrl) {
      paymentUrl = page.url();
      if (!/payment|pay|sbp|qr|bank/i.test(paymentUrl)) {
        // иногда ссылка в iframe / новой вкладке
        const pages = ctx.pages();
        for (const p of pages) {
          const u = p.url();
          if (/payment|pay|sbp|qr|bank/i.test(u)) {
            paymentUrl = u;
            break;
          }
        }
      }
    }

    const cart = await page
      .evaluate(async () =>
        (await fetch('/api/shopcart/', { credentials: 'include' })).json().catch(() => null),
      )
      .catch(() => null);

    const seatsOut = locked.map((s) => ({
      id: s.id,
      row: s.row,
      place: s.place,
      price: s.price,
      section: s.section?.name,
      description: s.description,
    }));

    const okPay =
      paymentUrl &&
      paymentUrl !== 'https://www.ticketland.ru/shopcart/' &&
      /payment|pay|sbp|qr|bank|checkout/i.test(paymentUrl);

    return {
      ok: !!okPay || (cart?.items || []).length >= 2,
      reason: okPay ? undefined : 'no_payment_url',
      performanceId: perf.id,
      basisId: perf.basisId,
      label: performance.label || perf.name,
      seats: seatsOut,
      amount: cart?.totalPrice ?? seatsOut.reduce((s, x) => s + Number(x.price || 0), 0),
      paymentUrl: okPay ? paymentUrl : paymentUrl || null,
      shopcartUrl: 'https://www.ticketland.ru/shopcart/',
      buyer: { name: contact.name, email: contact.email, phone: contact.phone },
      pageUrl: page.url(),
    };
  } finally {
    await browser.close().catch(() => {});
  }
}

/** Парсит TLConf из script-поля ticketland_afisha. */
export function parseTlScript(script) {
  const path = String(script || '').match(/start:'([^']+)'/)?.[1] || null;
  const accessHash = String(script || '').match(/accessHash:'([^']+)'/)?.[1] || null;
  const performanceId = path?.match(/_p_(\d+)/)?.[1] || null;
  return { path, accessHash, performanceId };
}

export { findParterPairs, loadContacts };
