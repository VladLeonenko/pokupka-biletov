/**
 * Live-поллер оплат снайперов.
 *
 * Пока заказ в окне оплаты — опрашиваем платформу.
 * После trackUntil без paid → expired.
 * На переход в paid — письмо менеджерам.
 *
 * pm2: sniper-payment-tracker
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { notifyOps } from './services/sniperOpsNotify.js';
import {
  listPayments,
  markPayment,
  paymentSummary,
  readLedger,
} from './services/sniperPaymentTracker.js';
import { MXAT_APP_KEY } from './services/afishaApiBooking.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const LOG_FILE = path.join(__dirname, 'data', 'sniper-payment-tracker.log');
const INTERVAL_MS = Number(process.env.SNIPER_PAY_POLL_MS || 15_000);
const FEE = Number(process.env.SNIPER_FEE_PER_TICKET || 0);
const UA = 'Mozilla/5.0 (compatible; biletvsem-pay-tracker/1.0)';
const MAX_TRACK_MS = Number(process.env.SNIPER_PAY_MAX_TRACK_MS || 6 * 3600_000);

function log(line) {
  const s = `${new Date().toISOString()} ${line}\n`;
  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.appendFileSync(LOG_FILE, s);
  } catch { /* */ }
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${line}`);
}

async function notify(subject, text) {
  return notifyOps({ subject, text, dedupeKey: `paid:${subject}`, ttlMs: 60_000 });
}

async function checkRadario(rec) {
  if (!rec.orderId || !rec.qrId) {
    return { status: 'unknown', detail: 'no orderId/qrId' };
  }
  // Нужна сессия buy-tickets (cookie sessionId). Без eventId — пробуем generic.
  const eventId = rec.eventId;
  if (!eventId) return { status: 'unknown', detail: 'no eventId' };

  const buyRes = await fetch(
    `https://radario.ru/buy-tickets/${eventId}?distributionType=Widget&skipEventsInGroup=true`,
    { headers: { Accept: 'application/json', Referer: 'https://teatrpushkin.ru/', 'User-Agent': UA } },
  );
  const setCookie = buyRes.headers.getSetCookie?.() || [];
  let sessionId = null;
  for (const c of setCookie) {
    const m = String(c).match(/sessionId=([^;]+)/);
    if (m) sessionId = m[1];
  }
  // Node <18 fallback: raw get('set-cookie')
  if (!sessionId) {
    const raw = buyRes.headers.get('set-cookie') || '';
    const m = raw.match(/sessionId=([^;]+)/);
    if (m) sessionId = m[1];
  }
  if (!sessionId) {
    return { status: 'unknown', detail: 'no sessionId from buy-tickets' };
  }

  const stRes = await fetch('https://radario.ru/payments/alfasbp/qr/status', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Referer: 'https://teatrpushkin.ru/',
      Origin: 'https://radario.ru',
      'User-Agent': UA,
      Cookie: `sessionId=${sessionId}`,
    },
    body: JSON.stringify({ orderId: Number(rec.orderId) || rec.orderId, qrId: rec.qrId }),
  });
  const j = await stRes.json().catch(() => ({}));
  const qs = j?.qrStatus || {};
  const msg = String(qs.errorMessage || j.message || '');
  const state = String(qs.transactionState || qs.qrStatus || '').toUpperCase();
  const blob = `${msg} ${state} ${JSON.stringify(j)}`.toLowerCase();

  // Alfa SBP: Accepted / Confirmed ≈ paid
  if (/accepted|confirmed|paid|success|оплач|исполнен/.test(blob) || ['ACWP', 'ACCEPTED', 'CONFIRMED', 'SUCCESS'].includes(state)) {
    return { status: 'paid', detail: `state=${state || 'paid'} ${msg}`.trim() };
  }
  if (/истек|expired/.test(blob)) {
    return { status: 'expired', detail: msg || 'expired' };
  }
  if (j?.errorCode === 1001 || /не удалось найти заказ/.test(msg)) {
    // После оплаты заказ тоже могут убрать из payment API — но если ещё pending в окне,
    // чаще это unpaid cleanup. Помечаем gone; менеджер может mark-paid вручную.
    return { status: 'gone', detail: msg || 'order not found' };
  }
  if (!stRes.ok) {
    return { status: 'unknown', detail: `http=${stRes.status} ${msg}` };
  }
  return { status: 'pending', detail: `state=${state || '—'} ${msg}`.trim() };
}

async function checkTicketland(rec) {
  if (!rec.orderId) return { status: 'unknown', detail: 'no orderId' };
  // Пока заказ ждёт оплату — instructions отдаёт QR. Если 4xx / нет qr — возможно оплачен или умер.
  const url = `https://www.ticketland.ru/api/payment/instructions/${encodeURIComponent(rec.orderId)}/?repeated=false`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': UA, Referer: 'https://www.ticketland.ru/' },
  });
  const j = await res.json().catch(() => ({}));
  if (res.status === 440 || res.status === 401) {
    return { status: 'unknown', detail: `auth ${res.status}` };
  }
  if (res.status === 404) {
    return { status: 'gone', detail: 'instructions 404' };
  }
  if (!res.ok) {
    return { status: 'unknown', detail: `http=${res.status} ${j?.message || ''}` };
  }
  const type = String(j?.type || '').toUpperCase();
  const payUrl = j?.details?.qrCode?.paymentUrl || '';
  // Если вместо QR пришёл SUCCESS/PAID тип — считаем paid (на случай смены схемы).
  if (/PAID|SUCCESS|COMPLETE/.test(type)) {
    return { status: 'paid', detail: `type=${type}` };
  }
  if (type === 'QRCODE' && payUrl) {
    return { status: 'pending', detail: `qr still open ${payUrl.slice(0, 48)}` };
  }
  // Пустой QR при 200 — неоднозначно
  return { status: 'unknown', detail: `type=${type || '—'} no qr` };
}

async function checkAfisha(rec) {
  if (!rec.orderId) return { status: 'unknown', detail: 'no orderId' };
  const res = await fetch(`https://mapi.afisha.ru/api/v21/payments/${encodeURIComponent(rec.orderId)}`, {
    headers: { 'X-Application-Key': MXAT_APP_KEY, 'X-City-Id': '2563', Referer: 'https://www.afisha.ru/', 'User-Agent': UA },
    signal: AbortSignal.timeout(15000),
  });
  const j = await res.json().catch(() => ({}));
  const st = String(j.status || '').toLowerCase();
  if (st === 'success' || st === 'paid') return { status: 'paid', detail: `afisha ${st}` };
  if (st === 'cancelled' || st === 'expired' || st === 'canceled') return { status: 'expired', detail: `afisha ${st}` };
  if (!res.ok) return { status: 'unknown', detail: `afisha http ${res.status}` };
  return { status: 'pending', detail: `afisha ${st || 'pending'}` };
}

async function checkOne(rec) {
  if (rec.platform === 'radario') return checkRadario(rec);
  if (rec.platform === 'vakhtangov-ticketland' || rec.platform === 'ticketland') {
    return checkTicketland(rec);
  }
  if (rec.platform === 'afisha' || rec.platform === 'wowcup-ticketsteam') return checkAfisha(rec);
  return { status: 'unknown', detail: `no checker for ${rec.platform}` };
}

async function maybeNotifyPaid(rec) {
  if (rec.notifyPaidSent) return;
  const feeLine = FEE > 0 && rec.tickets
    ? `фикс к начислению: ${FEE}₽ × ${rec.tickets} = ${FEE * rec.tickets}₽`
    : (FEE > 0 ? `фикс/билет: ${FEE}₽` : 'фикс/билет: не задан (SNIPER_FEE_PER_TICKET)');
  const text = [
    '💰 Снайпер — ОПЛАЧЕНО',
    `Платформа: ${rec.platform}`,
    `Сеанс: ${rec.label || '—'}`,
    `Заказ: ${rec.orderId}`,
    `Билеты: ${rec.tickets ?? '—'}`,
    `Сумма заказа: ${rec.amount ?? '—'}₽`,
    rec.seats ? `Места: ${rec.seats}` : null,
    feeLine,
    `paidAt: ${rec.paidAt || new Date().toISOString()}`,
    rec.lastCheckDetail ? `check: ${rec.lastCheckDetail}` : null,
  ].filter(Boolean).join('\n');
  await notify(`💰 Оплачено: ${rec.label || rec.orderId} · ${rec.tickets || '?'} бил.`, text);
  markPayment(rec.id, { notifyPaidSent: true });
}

async function tick() {
  const { orders } = listPayments({ status: 'pending' });
  // также дожимаем свежие unknown/gone внутри окна
  const ledger = readLedger();
  const now = Date.now();
  const watch = Object.values(ledger.orders).filter((o) => {
    if (o.status === 'paid' || o.status === 'expired') return false;
    const until = Date.parse(o.trackUntil || 0);
    return Number.isFinite(until) && until > now - 5 * 60_000; // +5м хвост
  });

  if (!watch.length) return;

  for (const rec of watch) {
    try {
      const until = Date.parse(rec.trackUntil || 0);
      const r = await checkOne(rec);
      let nextStatus = r.status;
      let extendUntil = null;
      const age = now - Date.parse(rec.registeredAt || 0);
      const detail = r.detail || '';
      const stillOpen = /qr still open/.test(detail) || /^afisha (?!expired|cancelled|canceled|success|paid)/.test(detail);
      if ((nextStatus === 'pending' || (nextStatus === 'expired' && /qr still open/.test(r.detail || ''))) && Number.isFinite(until) && now > until) {
        if (stillOpen && age < MAX_TRACK_MS) {
          nextStatus = 'pending';
          extendUntil = new Date(now + 30 * 60_000).toISOString();
        } else {
          nextStatus = 'expired';
        }
      }
      // gone после окна → expired; gone внутри окна оставляем gone (возможна оплата)
      if (nextStatus === 'gone' && Number.isFinite(until) && now > until) {
        nextStatus = 'expired';
      }

      const updated = markPayment(rec.id, {
        status: nextStatus === 'pending' ? 'pending' : nextStatus,
        lastCheckDetail: r.detail,
        ...(extendUntil ? { trackUntil: extendUntil } : {}),
        ...(nextStatus === 'paid' ? { paidAt: new Date().toISOString() } : {}),
      });

      if (rec.status !== nextStatus) {
        log(`${rec.id} ${rec.status} → ${nextStatus} (${r.detail})`);
      }
      if (nextStatus === 'paid' && updated) {
        await maybeNotifyPaid(updated).catch((e) => log(`mail fail ${rec.id}: ${e.message}`));
      }
    } catch (e) {
      markPayment(rec.id, {
        status: rec.status || 'unknown',
        lastCheckDetail: `error: ${e instanceof Error ? e.message : e}`,
      });
      log(`err ${rec.id}: ${e instanceof Error ? e.message : e}`);
    }
    await new Promise((r) => setTimeout(r, 400));
  }
}

log(`start pay-tracker interval=${INTERVAL_MS}ms fee/ticket=${FEE || '—'} pending=${listPayments({ status: 'pending' }).orders.length}`);
log(`summary ${JSON.stringify(paymentSummary(FEE))}`);

await tick().catch((e) => log(`tick0: ${e.message}`));
setInterval(() => {
  tick().catch((e) => log(`tick: ${e.message}`));
}, INTERVAL_MS);
