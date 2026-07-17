#!/usr/bin/env node
/**
 * E2E smoke: checkout → webhook T-Bank → finalize (клиент, воронка, письмо).
 *
 *   cd backend && node scripts/test-tbank-payment-flow.js
 *   cd backend && node scripts/test-tbank-payment-flow.js --skip-mail
 */

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pool from '../db.js';
import { buildTbankEacqToken, isTbankEacqConfigured } from '../services/payment/tbankEacq.js';
import { handleTbankEacqNotification } from '../routes/biletTicketCheckout.js';
import { isMailConfigured, isUniSenderMailConfigured } from '../services/mail/transporter.js';
import { getRepertoireStorefrontAccess } from '../services/repertoireStorefrontAccess.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const skipMail = process.argv.includes('--skip-mail');
const apiBase = (process.env.API_INTERNAL_URL || `http://127.0.0.1:${process.env.PORT || 3000}`).replace(/\/$/, '');
const sessionId = `test-tbank-flow-${Date.now()}`;
const testEmail = `tbank-flow-${Date.now()}@mailinator.com`;

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

async function ensureDemoEvent(repertoireId) {
  const { execSync } = await import('node:child_process');
  const out = execSync('node scripts/seed-tbank-demo-event.js', {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
  });
  if (out.trim()) console.log(out.trim());

  const access = await getRepertoireStorefrontAccess(repertoireId);
  if (!access.allowed) {
    throw new Error(
      `demo event ${repertoireId} недоступен после seed (reason=${access.reason ?? 'unknown'}). ` +
        'Проверь TICKET_* / GETBILET_USE_MAIN_DATABASE и строку в getbilet_events.',
    );
  }
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
    json(body) {
      this.body = body;
      return this;
    },
  };
}

async function main() {
  console.log('=== T-Bank payment flow test ===\n');
  assert(isTbankEacqConfigured(), 'TBANK_TERMINAL_KEY + TBANK_PASSWORD/TBANK_KEY не заданы');

  const repertoireId = process.env.TBANK_DEMO_REPERTOIRE_ID?.trim() || 'tbank-demo-event';

  console.log('1) seed demo event…');
  await ensureDemoEvent(repertoireId);

  console.log('2) checkout API…');
  const checkoutBody = {
    repertoireId,
    offerId: 'tb-demo-offer-1',
    seats: ['3'],
    eventTitle: 'Тестовая оплата T-Банк',
    customerName: 'Тест Оплаты',
    customerEmail: testEmail,
    customerPhone: '+79001112233',
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
  assert(checkoutData?.paymentUrl, 'нет paymentUrl');
  const orderNumber = checkoutData.orderNumber;
  console.log('   order:', orderNumber);
  console.log('   paymentUrl:', checkoutData.paymentUrl);

  const orderBefore = await pool.query('SELECT * FROM orders WHERE order_number = $1', [orderNumber]);
  assert(orderBefore.rows[0], 'заказ не создан в БД');
  assert(orderBefore.rows[0].payment_status === 'pending', 'ожидался pending');

  console.log('3) simulate T-Bank webhook…');
  const password =
    process.env.TBANK_PASSWORD?.trim() ||
    process.env.TBANK_KEY?.trim() ||
    process.env.TINKOFF_PASSWORD?.trim();
  const terminalKey = process.env.TBANK_TERMINAL_KEY?.trim() || process.env.TINKOFF_TERMINAL_KEY?.trim();
  const paymentId = orderBefore.rows[0].external_payment_id || String(Date.now());
  const notifyBody = {
    TerminalKey: terminalKey,
    OrderId: orderNumber,
    Success: true,
    Status: 'CONFIRMED',
    PaymentId: paymentId,
    Amount: String(checkoutData.amountKopecks || orderBefore.rows[0].total_cents),
  };
  notifyBody.Token = buildTbankEacqToken(notifyBody, password);
  const mock = mockRes();
  await handleTbankEacqNotification({ body: notifyBody }, mock);
  assert(mock.statusCode === 200 && mock.body === 'OK', `webhook failed: ${mock.statusCode} ${mock.body}`);

  console.log('4) verify DB side effects…');
  const orderAfter = (await pool.query('SELECT * FROM orders WHERE order_number = $1', [orderNumber])).rows[0];
  assert(orderAfter.payment_status === 'paid', `payment_status=${orderAfter.payment_status}`);
  assert(orderAfter.status === 'paid', `status=${orderAfter.status}`);

  const user = (
    await pool.query('SELECT id, email FROM users WHERE lower(email) = lower($1)', [testEmail])
  ).rows[0];
  assert(user, 'пользователь не создан');
  assert(Number(orderAfter.user_id) === Number(user.id), 'заказ не привязан к user_id');

  const client = (
    await pool.query('SELECT id, source, status FROM clients WHERE lower(email) = lower($1)', [testEmail])
  ).rows[0];
  assert(client, 'клиент не создан в CRM');
  assert(client.source === 'ticket_payment', `client.source=${client.source}`);

  const deal = (
    await pool.query(
      `SELECT d.id, d.title, fs.name AS stage_name
       FROM deals d
       JOIN funnel_stages fs ON fs.id = d.stage_id
       WHERE d.client_email = $1 AND d.description ILIKE $2
       ORDER BY d.created_at DESC LIMIT 1`,
      [testEmail, `%${orderNumber}%`],
    )
  ).rows[0];
  assert(deal, 'сделка в воронке не создана');
  console.log('   deal:', deal.title, '→', deal.stage_name);

  const notif = (
    await pool.query(
      `SELECT id, type, title FROM notifications
       WHERE type = 'ticket_order_paid' AND related_entity_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [orderAfter.id],
    )
  ).rows[0];
  assert(notif, 'админ-уведомление не создано');
  console.log('   admin notification:', notif.title);

  console.log('5) mail config…');
  const mailOk = isMailConfigured() || isUniSenderMailConfigured();
  console.log('   SMTP:', isMailConfigured() ? 'yes' : 'no');
  console.log('   UniSender:', isUniSenderMailConfigured() ? 'yes' : 'no');
  if (!mailOk) {
    console.warn('   ⚠ почта не настроена локально — письмо после оплаты не уйдёт');
  } else if (!skipMail) {
    console.log('   (письмо отправляется в handleTbank webhook через finalizePaidOrder)');
  }

  console.log('\n✅ PASS — полный post-payment flow работает');
  console.log(`   test email: ${testEmail}`);
  console.log(`   order: ${orderNumber}`);
}

main()
  .catch((e) => {
    console.error('\n❌ FAIL:', e.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => {});
  });
