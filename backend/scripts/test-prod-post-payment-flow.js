#!/usr/bin/env node
/**
 * E2E post-payment на проде: checkout → webhook → заказ / (опционально) админ API.
 *
 *   cd backend && node scripts/test-prod-post-payment-flow.js
 *   cd backend && node scripts/test-prod-post-payment-flow.js --admin-email=... --admin-password=...
 */

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTbankEacqToken } from '../services/payment/tbankEacq.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const site = (process.env.PROD_SITE_URL || 'https://biletvsem.com').replace(/\/$/, '');
const sessionId = `prod-e2e-${Date.now()}`;
const testEmail = `prod-e2e-${Date.now()}@mailinator.com`;

function arg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=').trim() : '';
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

async function adminLogin(email, password) {
  const { res, data } = await jsonFetch(`${site}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`admin login HTTP ${res.status}: ${data?.error || data?.message || 'fail'}`);
  const token = data?.token || data?.accessToken;
  if (!token) throw new Error('admin login: нет token в ответе');
  return token;
}

async function main() {
  console.log('=== Prod post-payment E2E ===\n');
  console.log('site:', site);
  console.log('email:', testEmail);

  const password =
    process.env.TBANK_KEY?.trim() ||
    process.env.TBANK_PASSWORD?.trim() ||
    process.env.TINKOFF_PASSWORD?.trim();
  const terminalKey = process.env.TBANK_TERMINAL_KEY?.trim() || process.env.TINKOFF_TERMINAL_KEY?.trim();
  if (!password || !terminalKey) {
    throw new Error('Локально нужны TBANK_TERMINAL_KEY + TBANK_KEY (для подписи webhook)');
  }

  console.log('\n1) checkout…');
  const checkoutBody = {
    repertoireId: 'tbank-demo-event',
    offerId: 'tb-demo-offer-1',
    seats: ['4'],
    eventTitle: 'Тестовая оплата T-Банк',
    customerName: 'E2E Post Payment',
    customerEmail: testEmail,
    customerPhone: '+79006667788',
  };
  const { res: coRes, data: coData } = await jsonFetch(`${site}/api/bilet/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-id': sessionId,
    },
    body: JSON.stringify(checkoutBody),
  });
  if (!coRes.ok || !coData?.ok) {
    throw new Error(`checkout failed: HTTP ${coRes.status} ${coData?.message || coData?.error || ''}`);
  }
  const { orderNumber, amountKopecks, paymentUrl } = coData;
  console.log('   order:', orderNumber, 'amountKopecks:', amountKopecks);
  console.log('   paymentUrl:', paymentUrl);

  console.log('\n2) webhook CONFIRMED…');
  const paymentId = String(Date.now());
  const notifyBody = {
    TerminalKey: terminalKey,
    OrderId: orderNumber,
    Success: true,
    Status: 'CONFIRMED',
    PaymentId: paymentId,
    Amount: String(amountKopecks),
  };
  notifyBody.Token = buildTbankEacqToken(notifyBody, password);
  const wh = await fetch(`${site}/api/webhooks/tbank/eacq`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(notifyBody),
  });
  const whText = await wh.text();
  if (!wh.ok || whText !== 'OK') {
    throw new Error(`webhook failed: HTTP ${wh.status} ${whText}`);
  }
  console.log('   webhook OK');

  console.log('\n3) order status (session)…');
  await new Promise((r) => setTimeout(r, 800));
  const { res: stRes, data: stData } = await jsonFetch(
    `${site}/api/orders/${encodeURIComponent(orderNumber)}/payment-status`,
    { headers: { 'x-session-id': sessionId } },
  );
  if (!stRes.ok) throw new Error(`payment-status HTTP ${stRes.status}`);
  console.log('   paymentStatus:', stData.paymentStatus, 'status:', stData.status);
  if (stData.paymentStatus !== 'paid') {
    throw new Error(`ожидался paid, получено ${stData.paymentStatus}`);
  }

  const adminEmail = arg('admin-email') || process.env.ADMIN_EMAIL?.trim() || '';
  const adminPassword = arg('admin-password') || process.env.ADMIN_PASSWORD?.trim() || '';
  if (adminEmail && adminPassword) {
    console.log('\n4) admin CRM checks…');
    const token = await adminLogin(adminEmail, adminPassword);
    const auth = { Authorization: `Bearer ${token}` };

    const clients = await jsonFetch(
      `${site}/api/clients?search=${encodeURIComponent(testEmail)}&limit=5`,
      { headers: auth },
    );
    const clientRows = clients.data?.clients || clients.data?.rows || clients.data || [];
    const client = Array.isArray(clientRows)
      ? clientRows.find((c) => String(c.email || '').toLowerCase() === testEmail.toLowerCase())
      : null;
    console.log('   client:', client ? `#${client.id} ${client.email} source=${client.source}` : 'NOT FOUND');

    const deals = await jsonFetch(`${site}/api/sales-pipeline/deals?limit=20`, { headers: auth });
    const dealRows = deals.data?.deals || deals.data?.rows || [];
    const deal = Array.isArray(dealRows)
      ? dealRows.find(
          (d) =>
            String(d.client_email || '').toLowerCase() === testEmail.toLowerCase() &&
            String(d.description || d.title || '').includes(orderNumber),
        )
      : null;
    console.log('   deal:', deal ? `#${deal.id} ${deal.title}` : 'NOT FOUND (search by email/order)');

    const notifs = await jsonFetch(`${site}/api/notifications?unreadOnly=false`, { headers: auth });
    const notifRows = notifs.data?.notifications || notifs.data || [];
    const notif = Array.isArray(notifRows)
      ? notifRows.find((n) => n.type === 'ticket_order_paid' && String(n.message || n.title || '').includes(orderNumber))
      : null;
    console.log('   admin notification:', notif ? notif.title : 'NOT FOUND');
  } else {
    console.log('\n4) admin CRM — пропуск (передай --admin-email=... --admin-password=... или ADMIN_* в .env)');
  }

  console.log('\n✅ PASS post-payment flow');
  console.log(`   order: ${orderNumber}`);
  console.log(`   проверь письмо: ${testEmail} (Mailinator / спам)`);
}

main().catch((e) => {
  console.error('\n❌ FAIL:', e.message);
  process.exitCode = 1;
});
