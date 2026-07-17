#!/usr/bin/env node
/**
 * E2E: Суперкубок NN — checkout с FAN ID → webhook → fanId в заказе/CRM + письмо.
 *
 *   cd backend && node scripts/test-supercup-fanid-email-flow.js
 *   cd backend && node scripts/test-supercup-fanid-email-flow.js --skip-mail-check
 *
 * На проде (localhost API + реальный GetBilet hold на 1 место):
 *   cd /var/pokupka-biletov/backend && node scripts/test-supercup-fanid-email-flow.js
 */

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pool from '../db.js';
import { buildTbankEacqToken, isTbankEacqConfigured } from '../services/payment/tbankEacq.js';
import { handleTbankEacqNotification } from '../routes/biletTicketCheckout.js';
import { isMailConfigured, isUniSenderMailConfigured } from '../services/mail/transporter.js';
import { extractFanIdFromOrder } from '../utils/orderFanId.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const skipMailCheck = process.argv.includes('--skip-mail-check');
const SUPERKUP_REPERTOIRE_ID = '6a46656d46a4d000309ed0a2';
const TEST_FAN_ID = 'E2EFAN01';
const apiBase = (process.env.API_INTERNAL_URL || `http://127.0.0.1:${process.env.PORT || 3000}`).replace(/\/$/, '');
const sessionId = `test-supercup-fanid-${Date.now()}`;
const testEmail = `supercup-fanid-${Date.now()}@mailinator.com`;

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function jsonFetch(url, opts = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  return { res, data, text };
}

function mockRes() {
  return {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(body) {
      this.body = body;
      return this;
    },
  };
}

function pickOfferSeat(offersPayload) {
  const rows = offersPayload?.ResultData ?? offersPayload?.resultData ?? [];
  if (!Array.isArray(rows)) return null;
  for (const row of rows) {
    const offerId = row?.Id ?? row?.id;
    const seats = row?.SeatList ?? row?.seatList;
    if (!offerId || !Array.isArray(seats) || seats.length === 0) continue;
    return { offerId: String(offerId), seat: String(seats[0]) };
  }
  return null;
}

async function main() {
  console.log('=== Supercup FAN ID + email flow ===\n');
  assert(isTbankEacqConfigured(), 'TBANK_TERMINAL_KEY + TBANK_PASSWORD/TBANK_KEY не заданы');

  console.log('1) live offers…');
  const { res: pageRes, data: pageData } = await jsonFetch(
    `${apiBase}/api/bilet/repertoire/${SUPERKUP_REPERTOIRE_ID}/page?refresh=1`,
  );
  if (!pageRes.ok) {
    throw new Error(`page API HTTP ${pageRes.status}: ${pageData?.message || pageData?.error || ''}`);
  }
  assert(pageData?.context?.requiresFanId === true, 'requiresFanId должен быть true для Суперкубка');

  const pick = pickOfferSeat(pageData?.offers);
  if (!pick) {
    throw new Error('нет доступных мест в offers — проверь GetBilet / кэш офферов');
  }
  console.log('   offer:', pick.offerId, 'seat:', pick.seat);

  console.log('2) checkout с FAN ID…');
  const checkoutBody = {
    repertoireId: SUPERKUP_REPERTOIRE_ID,
    offerId: pick.offerId,
    seats: [pick.seat],
    fanId: TEST_FAN_ID,
    eventTitle: pageData.context?.title || 'Суперкубок NN 2026',
    customerName: 'Тест FAN ID',
    customerEmail: testEmail,
    customerPhone: '+79005556677',
  };
  const { res: checkoutRes, data: checkoutData } = await jsonFetch(`${apiBase}/api/bilet/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-id': sessionId,
    },
    body: JSON.stringify(checkoutBody),
  });
  if (!checkoutRes.ok) {
    console.error('checkout response:', checkoutData);
    throw new Error(`checkout HTTP ${checkoutRes.status}: ${checkoutData?.message || checkoutData?.error || 'fail'}`);
  }
  assert(checkoutData?.ok === true, 'checkout ok=false');
  const orderNumber = checkoutData.orderNumber;
  console.log('   order:', orderNumber);

  const orderPending = (await pool.query('SELECT * FROM orders WHERE order_number = $1', [orderNumber])).rows[0];
  assert(orderPending, 'заказ не в БД');
  const fanBeforePay = extractFanIdFromOrder(orderPending);
  assert(fanBeforePay === TEST_FAN_ID, `FAN ID до оплаты: ожидался ${TEST_FAN_ID}, got ${fanBeforePay}`);
  console.log('   fanId in order (pending):', fanBeforePay);

  console.log('3) webhook CONFIRMED…');
  const password =
    process.env.TBANK_PASSWORD?.trim() ||
    process.env.TBANK_KEY?.trim() ||
    process.env.TINKOFF_PASSWORD?.trim();
  const terminalKey = process.env.TBANK_TERMINAL_KEY?.trim() || process.env.TINKOFF_TERMINAL_KEY?.trim();
  const notifyBody = {
    TerminalKey: terminalKey,
    OrderId: orderNumber,
    Success: true,
    Status: 'CONFIRMED',
    PaymentId: orderPending.external_payment_id || String(Date.now()),
    Amount: String(checkoutData.amountKopecks || orderPending.total_cents),
  };
  notifyBody.Token = buildTbankEacqToken(notifyBody, password);
  const mock = mockRes();
  await handleTbankEacqNotification({ body: notifyBody }, mock);
  assert(mock.statusCode === 200 && mock.body === 'OK', `webhook failed: ${mock.statusCode} ${mock.body}`);

  console.log('4) verify paid + FAN ID…');
  const orderAfter = (await pool.query('SELECT * FROM orders WHERE order_number = $1', [orderNumber])).rows[0];
  assert(orderAfter.payment_status === 'paid', `payment_status=${orderAfter.payment_status}`);
  const fanAfter = extractFanIdFromOrder(orderAfter);
  assert(fanAfter === TEST_FAN_ID, `FAN ID после оплаты: ожидался ${TEST_FAN_ID}, got ${fanAfter}`);
  console.log('   fanId in order (paid):', fanAfter);
  console.log('   notes:', orderAfter.notes);

  const client = (
    await pool.query(
      `SELECT c.id, c.email, c.source FROM clients c
       JOIN client_orders co ON co.client_id = c.id
       WHERE co.order_id = $1
       LIMIT 1`,
      [orderAfter.id],
    )
  ).rows[0];
  if (!client) {
    const byEmail = (
      await pool.query('SELECT id, email, source FROM clients WHERE lower(email) = lower($1)', [testEmail])
    ).rows[0];
    assert(byEmail, 'клиент не создан в CRM');
    console.log('   client (by email):', byEmail.id, byEmail.source);
  } else {
    console.log('   client (by order):', client.id, client.source);
  }

  const notif = (
    await pool.query(
      `SELECT id, type, title, message FROM notifications
       WHERE type = 'ticket_order_paid' AND related_entity_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [orderAfter.id],
    )
  ).rows[0];
  assert(notif, 'админ-уведомление не создано');
  assert(String(notif.message || '').includes('FAN ID'), `уведомление без FAN ID: ${notif.message}`);
  console.log('   admin notification:', notif.title);
  console.log('   notification body:', notif.message);

  console.log('5) mail…');
  const smtp = isMailConfigured();
  const uni = isUniSenderMailConfigured();
  console.log('   SMTP:', smtp ? 'yes' : 'no');
  console.log('   UniSender:', uni ? 'yes' : 'no');
  if (!smtp && !uni) {
    throw new Error('почта не настроена — письмо после оплаты не уйдёт');
  }
  if (!skipMailCheck) {
    console.log(`   → проверь inbox: ${testEmail} (Mailinator)`);
    console.log('   → в письме должны быть: оплата, FAN ID, данные ЛК');
  }

  console.log('\n✅ PASS — FAN ID сохранён, post-payment flow OK');
  console.log(`   order: ${orderNumber}`);
  console.log(`   fanId: ${fanAfter}`);
  console.log(`   email: ${testEmail}`);
}

main()
  .catch((e) => {
    console.error('\n❌ FAIL:', e.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => {});
  });
