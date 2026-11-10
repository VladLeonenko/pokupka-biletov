/**
 * Вахтангов / Ticketland — бронь партера парами через Playwright.
 *
 * Флоу:
 *  1) open performance (?lite-layout&iframe-hash) — ServicePipe проходит в Chromium
 *  2) GET /api/show/performance + /api/v2/hallview/map/{id}
 *  3) filter section=Партер, adjacent pair
 *  4) POST /hallPlace/select/ (cypher=abcde+base64) ×N
 *  5) API: paymentMethodChange(SBP) → /api/order/create/ → /api/payment/instructions/{orderId}/
 *     (UI-кнопка на VPS часто стопорится VPN-check Ticketland — поэтому только API)
 */

/** Реальная ссылка на оплату (не shopcart: там substring "pay" ложно матчится). */
export function isRealPaymentUrl(u) {
  if (!u || typeof u !== 'string' || !/^https?:\/\//i.test(u)) return false;
  const s = u.trim();
  if (/ticketland\.ru\/shopcart/i.test(s)) return false;
  if (/qr\.nspk\.ru/i.test(s)) return true;
  if (/sbp\.|nspk\.ru|yookassa|yoomoney|pay\.|cloudpayments|tinkoff|sberbank|alfabank|unitpay|robokassa|securepay/i.test(s)) {
    return true;
  }
  if (/ticketland\.ru\/shopcart\/pay\//i.test(s)) return true;
  if (/ticketland\.ru\/.*\/(pay|payment)\b/i.test(s) && !/shopcart\/?$/i.test(s)) return true;
  return false;
}

function digPaymentUrl(node, depth = 0) {
  if (!node || depth > 8) return null;
  if (typeof node === 'string') return isRealPaymentUrl(node) ? node : null;
  if (Array.isArray(node)) {
    for (const x of node) {
      const f = digPaymentUrl(x, depth + 1);
      if (f) return f;
    }
    return null;
  }
  if (typeof node === 'object') {
    for (const k of ['paymentUrl', 'redirectUrl', 'url', 'payUrl', 'qrUrl', 'link']) {
      if (typeof node[k] === 'string' && isRealPaymentUrl(node[k])) return node[k];
    }
    for (const v of Object.values(node)) {
      const f = digPaymentUrl(v, depth + 1);
      if (f) return f;
    }
  }
  return null;
}
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
      if (/shopcart\/?$/i.test(u) || /\/api\/shopcart\/?$/i.test(u)) return;
      if (!/payment|instructions|nspk|sbp|redirect|order\/create/i.test(u)) return;
      try {
        if (isRealPaymentUrl(u)) {
          paymentUrl = u;
          return;
        }
        const j = await res.json();
        const dug = digPaymentUrl(j);
        if (dug) paymentUrl = dug;
      } catch {
        /* ignore */
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

    // Корзина в той же cookie-сессии (select уже сделал hold).
    const cartBefore = await page
      .evaluate(async () =>
        (await fetch('/api/shopcart/', { credentials: 'include' })).json().catch(() => null),
      )
      .catch(() => null);
    if (!(cartBefore?.items || []).length) {
      return {
        ok: false,
        reason: 'empty_cart_after_select',
        performanceId: perf.id,
        locked,
      };
    }

    // Ticketland: ровно 11 цифр, без «+» (иначе 400 «Длинна номера… должна быть 11»)
    let phoneFmt = String(contact.phone || '').replace(/\D/g, '');
    if (phoneFmt.startsWith('8') && phoneFmt.length === 11) phoneFmt = `7${phoneFmt.slice(1)}`;
    if (!phoneFmt.startsWith('7') && phoneFmt.length === 10) phoneFmt = `7${phoneFmt}`;
    if (phoneFmt.length !== 11 || !phoneFmt.startsWith('7')) {
      return {
        ok: false,
        reason: 'bad_phone',
        performanceId: perf.id,
        phone: contact.phone,
        seats: locked.map((s) => ({
          id: s.id,
          row: s.row,
          place: s.place,
          price: s.price,
          section: s.section?.name,
        })),
      };
    }

    // API-оплата: UI на VPS режет VPN-check до createOrder.
    const checkout = await page.evaluate(
      async ({ firstName, lastName, email, phone }) => {
        const jfetch = async (url, init) => {
          const res = await fetch(url, {
            credentials: 'include',
            headers: {
              Accept: 'application/json, text/plain, */*',
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
              ...(init?.headers || {}),
            },
            ...init,
          });
          const text = await res.text();
          let json = null;
          try {
            json = text ? JSON.parse(text) : null;
          } catch {
            json = { raw: text.slice(0, 500) };
          }
          return { status: res.status, json, ok: res.ok };
        };

        const dig = (node, depth = 0) => {
          if (!node || depth > 8) return null;
          if (typeof node === 'string') {
            return /^https?:\/\//i.test(node) && /nspk|sbp|pay|yookassa|tinkoff|sber/i.test(node) && !/shopcart\/?$/i.test(node)
              ? node
              : null;
          }
          if (Array.isArray(node)) {
            for (const x of node) {
              const f = dig(x, depth + 1);
              if (f) return f;
            }
            return null;
          }
          if (typeof node === 'object') {
            for (const k of ['paymentUrl', 'redirectUrl', 'url', 'payUrl', 'qrUrl', 'link']) {
              if (typeof node[k] === 'string') {
                const f = dig(node[k], depth + 1);
                if (f) return f;
              }
            }
            for (const v of Object.values(node)) {
              const f = dig(v, depth + 1);
              if (f) return f;
            }
          }
          return null;
        };

        const method = await jfetch('/api/shopcart/paymentMethodChange/', {
          method: 'POST',
          body: JSON.stringify({ paymentMethodType: 'SBP' }),
        });

        const orderPayload = {
          user: {
            firstName,
            lastName,
            middleName: '',
            email,
            phone,
            consents: { marketing: false },
          },
        };
        const created = await jfetch('/api/order/create/', {
          method: 'POST',
          body: JSON.stringify(orderPayload),
        });
        const orderId =
          created.json?.orderId ||
          created.json?.id ||
          created.json?.data?.orderId ||
          null;
        if (!orderId) {
          return {
            ok: false,
            reason: 'order_create_failed',
            methodStatus: method.status,
            createStatus: created.status,
            createBody: created.json,
          };
        }

        const instr = await jfetch(`/api/payment/instructions/${encodeURIComponent(orderId)}/?repeated=false`);
        let pay = dig(instr.json);
        if (!pay && instr.json?.details?.qrCode?.paymentUrl) {
          pay = instr.json.details.qrCode.paymentUrl;
        }
        // fallback: страница оплаты заказа (сессионная, но лучше чем shopcart)
        const payPage = `https://www.ticketland.ru/shopcart/pay/${orderId}`;
        return {
          ok: !!pay,
          orderId,
          paymentUrl: pay || null,
          payPage,
          instructionsStatus: instr.status,
          instructions: instr.json,
          methodStatus: method.status,
          createStatus: created.status,
        };
      },
      { firstName: first, lastName: last, email: contact.email, phone: phoneFmt },
    );

    if (checkout?.paymentUrl && isRealPaymentUrl(checkout.paymentUrl)) {
      paymentUrl = checkout.paymentUrl;
    } else if (checkout?.paymentUrl) {
      paymentUrl = digPaymentUrl(checkout.paymentUrl) || digPaymentUrl(checkout.instructions);
    } else {
      paymentUrl = digPaymentUrl(checkout?.instructions);
    }

    // Доп. попытка: открыть /shopcart/pay/{orderId} и вытащить nspk из сети/DOM
    if (!isRealPaymentUrl(paymentUrl) && checkout?.orderId) {
      const payPageUrl = `https://www.ticketland.ru/shopcart/pay/${checkout.orderId}`;
      page.on('response', async (res) => {
        try {
          const u = res.url();
          if (isRealPaymentUrl(u)) paymentUrl = u;
          if (/payment|instructions|nspk|sbp/i.test(u)) {
            const j = await res.json().catch(() => null);
            const dug = digPaymentUrl(j);
            if (dug) paymentUrl = dug;
          }
        } catch {
          /* */
        }
      });
      await page.goto(payPageUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 }).catch(() => {});
      await page.waitForTimeout(5000);
      if (!isRealPaymentUrl(paymentUrl)) {
        const fromDom = await page
          .evaluate(() => {
            const hrefs = [...document.querySelectorAll('a[href]')]
              .map((a) => a.href)
              .filter(Boolean);
            const text = document.body?.innerText || '';
            const m = text.match(/https?:\/\/qr\.nspk\.ru\/[A-Z0-9]+/i);
            return m?.[0] || hrefs.find((h) => /nspk|sbp/i.test(h)) || null;
          })
          .catch(() => null);
        if (fromDom) paymentUrl = fromDom;
      }
      if (!isRealPaymentUrl(paymentUrl) && isRealPaymentUrl(page.url())) {
        paymentUrl = page.url();
      }
    }

    const seatsOut = locked.map((s) => ({
      id: s.id,
      row: s.row,
      place: s.place,
      price: s.price,
      section: s.section?.name,
      description: s.description,
    }));

    const okPay = isRealPaymentUrl(paymentUrl);

    return {
      ok: okPay,
      reason: okPay
        ? undefined
        : checkout?.reason || (checkout?.orderId ? 'no_payment_url' : 'order_create_failed'),
      performanceId: perf.id,
      basisId: perf.basisId,
      label: performance.label || perf.name,
      seats: seatsOut,
      amount: cartBefore?.totalPrice ?? seatsOut.reduce((s, x) => s + Number(x.price || 0), 0),
      orderId: checkout?.orderId || null,
      paymentUrl: okPay ? paymentUrl : null,
      payPage: checkout?.orderId ? `https://www.ticketland.ru/shopcart/pay/${checkout.orderId}` : null,
      shopcartUrl: 'https://www.ticketland.ru/shopcart/',
      buyer: { name: contact.name, email: contact.email, phone: contact.phone },
      pageUrl: page.url(),
      checkoutDetail: okPay
        ? undefined
        : {
            methodStatus: checkout?.methodStatus,
            createStatus: checkout?.createStatus,
            createBody: checkout?.createBody,
            instructionsStatus: checkout?.instructionsStatus,
          },
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
