import bcrypt from 'bcryptjs';
import pool from '../db.js';
import ticketPool from '../ticketDb.js';
import { createLoginToken, PURPOSE_MAGIC_LINK } from './loginTokens.js';
import { sendMagicLinkEmail } from './mail/authMail.js';

async function storeTicketRefs(orderRow, provider, ticketRefs) {
  if (!ticketRefs?.length) return;
  const legacyOrderId = orderRow.id;
  const orderNumber = orderRow.order_number || null;
  for (const t of ticketRefs) {
    const extId = t.externalTicketId || t.external_ticket_id;
    if (!extId) continue;
    await ticketPool.query(
      `INSERT INTO ticket_external_ticket_refs (
         legacy_order_id, order_number, order_item_id, provider, external_ticket_id, metadata
       )
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       ON CONFLICT (legacy_order_id, provider, external_ticket_id) DO NOTHING`,
      [
        legacyOrderId,
        orderNumber,
        t.orderItemId ?? null,
        provider,
        String(extId),
        t.metadata || {},
      ]
    );
  }
}

/** Создаёт пользователя по email заказа (если ещё нет), привязывает заказ, шлёт magic link для входа в ЛК. */
export async function ensureUserAndNotifyAfterPayment(orderRow, options = {}) {
  const deferMagicLink = Boolean(options.deferMagicLink);
  const email = (orderRow.customer_email || '').trim().toLowerCase();
  if (!email) return { userId: null, magicLinkSent: false, isNew: false, rawMagicToken: null };

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  let userId;
  let isNew = false;

  if (existing.rows.length) {
    userId = existing.rows[0].id;
  } else {
    const randomHash = await bcrypt.hash(
      `${Date.now()}_${Math.random().toString(36)}_${process.env.JWT_SECRET?.slice(0, 8) || 'x'}`,
      12
    );
    const name = orderRow.customer_name || null;
    const phone = orderRow.customer_phone || null;
    const ins = await pool.query(
      `INSERT INTO users (email, password_hash, name, phone, role, email_verified, oauth_provider, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'user', TRUE, NULL, NOW(), NOW())
       RETURNING id`,
      [email, randomHash, name, phone]
    );
    userId = ins.rows[0].id;
    isNew = true;
  }

  if (!orderRow.user_id && userId) {
    await pool.query(
      'UPDATE orders SET user_id = $1, session_id = NULL, updated_at = NOW() WHERE id = $2',
      [userId, orderRow.id]
    );
  }

  let magicLinkSent = false;
  let rawMagicToken = null;
  const sendMagic =
    String(process.env.SEND_MAGIC_LINK_AFTER_PAYMENT || 'true').toLowerCase() === 'true';
  const shouldSendMagic =
    sendMagic && (isNew || String(process.env.MAGIC_LINK_AFTER_PAYMENT_ALWAYS || '').toLowerCase() === 'true');
  if (shouldSendMagic || deferMagicLink) {
    try {
      const ttl = Number(process.env.MAGIC_LINK_EXPIRES_MINUTES) || 15;
      const { raw } = await createLoginToken({
        userId,
        email,
        purpose: PURPOSE_MAGIC_LINK,
        ttlMinutes: ttl,
        metadata: { orderId: orderRow.id },
      });
      rawMagicToken = raw;
      if (shouldSendMagic && !deferMagicLink) {
        await sendMagicLinkEmail(email, raw);
        magicLinkSent = true;
      }
    } catch (e) {
      console.warn('[orderPaymentFinalize] magic link email failed:', e.message);
    }
  }

  return { userId, magicLinkSent, isNew, rawMagicToken };
}

/**
 * Вызывать после перевода заказа в оплаченный: билеты в БД, пользователь, побочные эффекты заказа (передаются снаружи).
 */
function parsePaymentMeta(row) {
  const m = row.payment_metadata;
  if (!m) return null;
  if (typeof m === 'object') return m;
  try {
    return JSON.parse(m);
  } catch {
    return null;
  }
}

export async function finalizePaidOrder(orderRow, { ticketRefs = [], runPaidHooks } = {}) {
  const provider = orderRow.payment_provider || 'unknown';
  await storeTicketRefs(orderRow, provider, ticketRefs);

  const pm = parsePaymentMeta(orderRow);
  const ticketCheckout = Boolean(pm && pm.ticketCheckout === true);

  const { userId, isNew, rawMagicToken } = await ensureUserAndNotifyAfterPayment(orderRow, {
    deferMagicLink: ticketCheckout,
  });

  if (ticketCheckout) {
    try {
      const { sendTicketOrderPaidEmails } = await import('./mail/ticketOrderMail.js');
      await sendTicketOrderPaidEmails(
        { ...orderRow, user_id: userId || orderRow.user_id },
        { isNew, rawMagicToken }
      );
    } catch (e) {
      console.warn('[orderPaymentFinalize] ticket order emails failed:', e.message);
    }
  }

  const fresh = await pool.query('SELECT * FROM orders WHERE id = $1', [orderRow.id]);
  const order = fresh.rows[0];
  if (typeof runPaidHooks === 'function') {
    await runPaidHooks({ ...order, user_id: userId || order.user_id });
  }
  return order;
}
