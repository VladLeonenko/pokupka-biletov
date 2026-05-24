import express from 'express';
import pool from '../db.js';
import ticketPool from '../ticketDb.js';
import { optionalAuth, requireAuth, requireAdminOrSalesManager } from '../middleware/auth.js';
import { createAiTeamSubscriptionForUser } from './aiTeam.js';
import { createClientProjectFromOrder } from './projects.js';
import { createDealForClient } from '../utils/funnelHelper.js';
import { sendOrderCreatedEmail, sendOrderStatusChangedEmail } from '../services/mail/orderNotifications.js';
import { fetchRemotePaymentState } from '../services/payment/remotePaymentStatus.js';
import { applyOrderPaidState } from '../services/orderPaymentApply.js';
import { extractFanIdFromOrder } from '../utils/orderFanId.js';

const router = express.Router();

// Маппинг product_slug -> AI Team тариф
const AI_TEAM_PRODUCT_PLAN = {
  'ai-junior': 'JUNIOR',
  'ai-junior-team': 'JUNIOR',
  'ai-pro-team': 'PRO',
  'ai-pro': 'PRO',
  'ai-enterprise': 'ENTERPRISE',
};

async function maybeAttachAiTeamSubscription(orderRow) {
  try {
    const userId = orderRow.user_id;
    if (!userId) return;

    const itemsRes = await pool.query(
      'SELECT product_slug FROM order_items WHERE order_id = $1',
      [orderRow.id]
    );

    const slugs = itemsRes.rows.map((r) => r.product_slug);
    const aiSlug = slugs.find((slug) => AI_TEAM_PRODUCT_PLAN[slug]);
    if (!aiSlug) return;

    const planCode = AI_TEAM_PRODUCT_PLAN[aiSlug];

    await createAiTeamSubscriptionForUser({
      userId,
      clientId: null,
      planCode,
      status: 'active',
    });
  } catch (e) {
    console.error('[orders] Failed to attach AI Team subscription for order:', orderRow.id, e);
  }
}

/** Побочные эффекты успешной оплаты: AI Team, проект клиента — вызывается из финализации оплаты и legacy-путей. */
export async function runPaidOrderSideEffects(orderRow) {
  await maybeAttachAiTeamSubscription(orderRow);
  try {
    await createClientProjectFromOrder(orderRow);
  } catch (projErr) {
    console.error('[orders] Failed to create client project from order:', orderRow.id, projErr);
  }
}

// Все роуты используют опциональную аутентификацию (кроме специально помеченных)
router.use(optionalAuth);

// Генерация номера заказа
function generateOrderNumber() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

// Создать заказ
router.post('/', async (req, res) => {
  try {
    let {
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      paymentMethod,
      notes,
      paymentProvider,
      externalPaymentId,
      externalOrderRef,
      paymentCheckoutUrl,
    } = req.body || {};
    
    const userId = req.user?.id;
    const sessionId = userId ? null : req.headers['x-session-id'];

    // Если авторизован, но данные не переданы — подставляем из users
    if (userId && (!customerEmail || !customerName || !customerPhone)) {
      const userRes = await pool.query('SELECT name, email, phone FROM users WHERE id = $1', [userId]);
      if (userRes.rows[0]) {
        const u = userRes.rows[0];
        customerName = customerName || u.name || null;
        customerEmail = customerEmail || u.email || null;
        customerPhone = customerPhone || u.phone || null;
      }
    }
    
    if (!userId && !sessionId) {
      return res.status(400).json({ error: 'User or session required' });
    }
    
    // Получаем корзину
    let cartItems;
    if (userId) {
      const cartResult = await pool.query(`
        SELECT c.product_slug, c.quantity, p.title, p.price_cents
        FROM cart c
        JOIN products p ON c.product_slug = p.slug
        WHERE c.user_id = $1
      `, [userId]);
      cartItems = cartResult.rows;
    } else {
      const cartResult = await pool.query(`
        SELECT c.product_slug, c.quantity, p.title, p.price_cents
        FROM cart c
        JOIN products p ON c.product_slug = p.slug
        WHERE c.session_id = $1
      `, [sessionId]);
      cartItems = cartResult.rows;
    }
    
    if (cartItems.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }
    
    // Подсчитываем общую сумму
    let totalCents = 0;
    for (const item of cartItems) {
      totalCents += (item.price_cents || 0) * item.quantity;
    }

    // Пожелания по благотворительности — из профиля пользователя
    let charityPreference = null;
    if (userId) {
      const charityRes = await pool.query(
        'SELECT allocations FROM user_charity_preferences WHERE user_id = $1',
        [userId]
      );
      const allocs = charityRes.rows[0]?.allocations;
      if (Array.isArray(allocs) && allocs.length > 0) {
        charityPreference = allocs;
      }
    }
    
    // Создаем заказ
    const orderNumber = generateOrderNumber();
    const orderResult = await pool.query(`
      INSERT INTO orders(
        user_id, session_id, order_number, status, total_cents, currency,
        customer_name, customer_email, customer_phone, shipping_address,
        payment_method, payment_status, notes, charity_preference,
        payment_provider, external_payment_id, external_order_ref, payment_checkout_url
      ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      RETURNING *
    `, [
      userId,
      sessionId,
      orderNumber,
      'pending',
      totalCents,
      'RUB',
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress ? JSON.stringify(shippingAddress) : null,
      paymentMethod,
      'pending',
      notes,
      charityPreference ? JSON.stringify(charityPreference) : null,
      paymentProvider || null,
      externalPaymentId || null,
      externalOrderRef || null,
      paymentCheckoutUrl || null,
    ]);
    
    const order = orderResult.rows[0];
    
    // Создаем позиции заказа
    for (const item of cartItems) {
      await pool.query(`
        INSERT INTO order_items(order_id, product_slug, product_title, price_cents, quantity)
        VALUES($1,$2,$3,$4,$5)
      `, [order.id, item.product_slug, item.title, item.price_cents, item.quantity]);
    }
    
    // Очищаем корзину
    if (userId) {
      await pool.query('DELETE FROM cart WHERE user_id=$1', [userId]);
    } else {
      await pool.query('DELETE FROM cart WHERE session_id=$1', [sessionId]);
    }
    
    // Записываем аналитику
    for (const item of cartItems) {
      await pool.query(`
        INSERT INTO product_analytics(product_slug, event_type, user_id, session_id)
        VALUES($1,$2,$3,$4)
      `, [item.product_slug, 'purchase', userId, sessionId]);
    }
    
    // Автоматически связываем заказ с клиентом и добавляем в воронку
    let linkedClientId = null;
    try {
      if (customerEmail || customerPhone) {
        // Ищем клиента по email или телефону
        let clientId = null;
        if (customerEmail) {
          const emailCheck = await pool.query('SELECT id FROM clients WHERE email = $1 LIMIT 1', [customerEmail]);
          if (emailCheck.rows.length > 0) {
            clientId = emailCheck.rows[0].id;
          }
        }
        if (!clientId && customerPhone) {
          const phoneCheck = await pool.query('SELECT id FROM clients WHERE phone = $1 LIMIT 1', [customerPhone]);
          if (phoneCheck.rows.length > 0) {
            clientId = phoneCheck.rows[0].id;
          }
        }

        // Если клиент не найден, создаем нового
        if (!clientId && (customerName || customerEmail || customerPhone)) {
          const newClientResult = await pool.query(
            `INSERT INTO clients (name, email, phone, source, status)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [
              customerName || 'Неизвестно',
              customerEmail || null,
              customerPhone || null,
              'order',
              'lead'
            ]
          );
          clientId = newClientResult.rows[0].id;
        }

        // Связываем заказ с клиентом
        if (clientId) {
          linkedClientId = clientId;
          await pool.query(
            'INSERT INTO client_orders (client_id, order_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [clientId, order.id]
          );
          // Обновляем метрики клиента
          await pool.query('SELECT update_client_metrics($1)', [clientId]);
          // Добавляем сделку в основную воронку продаж
          await createDealForClient(clientId, customerName, customerEmail, customerPhone, 'cart');
        }
      }
    } catch (clientErr) {
      // Логируем ошибку, но не прерываем создание заказа
      console.warn('[orders] Error linking order to client:', clientErr);
    }

    // Создать сделку в воронке даже если клиент не найден по email/phone (гость)
    if (!linkedClientId && (customerName || customerEmail || customerPhone)) {
      try {
        await createDealForClient(null, customerName, customerEmail, customerPhone, 'cart');
      } catch (funnelErr) {
        console.warn('[orders] Error creating funnel deal:', funnelErr);
      }
    }

    // Пытаемся автоматически создать проект для клиента из заказа
    // (идемпотентно: createClientProjectFromOrder сам проверяет дубли)
    try {
      await createClientProjectFromOrder(order);
    } catch (projErr) {
      console.error('[orders] Error creating client project from order (on create):', order.id, projErr);
    }

    try {
      await sendOrderCreatedEmail({
        to: customerEmail,
        order: {
          orderNumber: order.order_number,
          totalCents: order.total_cents,
          currency: order.currency,
          paymentStatus: order.payment_status,
        },
      });
    } catch (mailErr) {
      console.warn('[orders] order created email:', mailErr.message);
    }
    
    res.json({ order: {
      id: order.id,
      orderNumber: order.order_number,
      status: order.status,
      totalCents: order.total_cents,
      currency: order.currency,
      createdAt: order.created_at,
      paymentProvider: order.payment_provider,
      externalPaymentId: order.external_payment_id,
      externalOrderRef: order.external_order_ref,
      paymentCheckoutUrl: order.payment_checkout_url,
    } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Список всех заказов для админа
router.get('/admin', requireAuth, requireAdminOrSalesManager, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }
    const r = await pool.query(
      `SELECT o.*, 
        (SELECT json_agg(json_build_object(
          'productSlug', oi.product_slug,
          'productTitle', oi.product_title,
          'priceCents', oi.price_cents,
          'quantity', oi.quantity
        )) FROM order_items oi WHERE oi.order_id = o.id) as items,
        (SELECT c.id FROM client_orders co JOIN clients c ON c.id = co.client_id WHERE co.order_id = o.id LIMIT 1) as client_id
      FROM orders o
      ORDER BY o.created_at DESC
      LIMIT 500`
    );
    const orders = r.rows.map((row) => ({
      id: row.id,
      orderNumber: row.order_number,
      status: row.status,
      totalCents: row.total_cents,
      currency: row.currency,
      customerName: row.customer_name,
      customerEmail: row.customer_email,
      customerPhone: row.customer_phone,
      paymentMethod: row.payment_method,
      paymentStatus: row.payment_status,
      notes: row.notes,
      fanId: extractFanIdFromOrder(row),
      items: row.items || [],
      clientId: row.client_id,
      charityPreference: row.charity_preference || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
    res.json({ orders });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Получить заказы пользователя (требует авторизации)
// ВАЖНО: помимо заказов с user_id, подтягиваем гостевые заказы,
// оформленные на тот же email / телефон, что и у пользователя
router.get('/my', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Узнаём email / телефон пользователя, чтобы привязать гостевые заказы
    const userRes = await pool.query(
      'SELECT email, phone FROM users WHERE id = $1',
      [userId]
    );
    const userRow = userRes.rows[0] || {};

    const whereParts = ['o.user_id = $1'];
    const params = [userId];
    let paramIndex = 2;

    if (userRow.email) {
      // Гостевые заказы без user_id, но с тем же email
      whereParts.push(`(o.user_id IS NULL AND o.customer_email = $${paramIndex})`);
      params.push(userRow.email);
      paramIndex++;
    }

    if (userRow.phone) {
      // Гостевые заказы без user_id, но с тем же телефоном
      whereParts.push(`(o.user_id IS NULL AND o.customer_phone = $${paramIndex})`);
      params.push(userRow.phone);
      paramIndex++;
    }

    const whereSql = whereParts.join(' OR ');

    const r = await pool.query(
      `
      SELECT o.*, 
        (SELECT json_agg(json_build_object(
          'id', oi.id,
          'productSlug', oi.product_slug,
          'productTitle', oi.product_title,
          'priceCents', oi.price_cents,
          'quantity', oi.quantity
        )) FROM order_items oi WHERE oi.order_id = o.id) as items
      FROM orders o
      WHERE ${whereSql}
      ORDER BY o.created_at DESC
    `,
      params
    );
    
    const orders = r.rows.map(row => ({
      id: row.id,
      orderNumber: row.order_number,
      status: row.status,
      totalCents: row.total_cents,
      currency: row.currency,
      customerName: row.customer_name,
      customerEmail: row.customer_email,
      customerPhone: row.customer_phone,
      shippingAddress: row.shipping_address,
      paymentMethod: row.payment_method,
      paymentStatus: row.payment_status,
      notes: row.notes,
      fanId: extractFanIdFromOrder(row),
      items: row.items || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
    
    res.json({ orders });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Polling статуса оплаты у поставщика (GetBilet / Profticket) + синхронизация с БД
router.get('/:orderNumber/payment-status', async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const userId = req.user?.id;
    const sessionId = userId ? null : req.headers['x-session-id'];

    let orderQuery;
    let params;
    if (userId) {
      orderQuery = 'SELECT * FROM orders WHERE order_number = $1 AND user_id = $2';
      params = [orderNumber, userId];
    } else {
      orderQuery = 'SELECT * FROM orders WHERE order_number = $1 AND session_id = $2';
      params = [orderNumber, sessionId];
    }

    const orderResult = await pool.query(orderQuery, params);
    if (!orderResult.rows[0]) return res.status(404).json({ error: 'Order not found' });

    let order = orderResult.rows[0];
    await pool.query('UPDATE orders SET last_payment_poll_at = NOW() WHERE id = $1', [order.id]);
    order = (await pool.query('SELECT * FROM orders WHERE id = $1', [order.id])).rows[0];

    const remote = await fetchRemotePaymentState(order);

    if (remote.state === 'paid') {
      order = await applyOrderPaidState(order, {
        externalPaymentId: remote.externalPaymentId,
        ticketRefs: remote.ticketRefs,
      });
    } else if (remote.state === 'failed') {
      const failed = await pool.query(
        `UPDATE orders SET
          payment_status = 'failed',
          status = CASE WHEN status = 'pending' THEN 'cancelled' ELSE status END,
          external_payment_id = COALESCE($2::text, external_payment_id),
          updated_at = NOW()
        WHERE id = $1 AND payment_status <> 'paid'
        RETURNING *`,
        [order.id, remote.externalPaymentId || null]
      );
      order = failed.rows[0] || order;
    }

    res.json({
      paymentStatus: order.payment_status,
      status: order.status,
      remote: {
        state: remote.state,
        detail: remote.detail ?? null,
      },
      lastPaymentPollAt: order.last_payment_poll_at,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Получить заказ по номеру
router.get('/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const userId = req.user?.id;
    const sessionId = userId ? null : req.headers['x-session-id'];
    
    let query, params;
    if (userId) {
      query = 'SELECT * FROM orders WHERE order_number=$1 AND user_id=$2';
      params = [orderNumber, userId];
    } else {
      query = 'SELECT * FROM orders WHERE order_number=$1 AND session_id=$2';
      params = [orderNumber, sessionId];
    }
    
    const orderResult = await pool.query(query, params);
    if (!orderResult.rows[0]) return res.status(404).json({ error: 'Order not found' });
    
    const order = orderResult.rows[0];
    
    // Получаем позиции заказа
    const itemsResult = await pool.query(`
      SELECT * FROM order_items WHERE order_id = $1
    `, [order.id]);

    const ticketsRes = await ticketPool.query(
      `SELECT id, order_item_id, provider, external_ticket_id, metadata
       FROM ticket_external_ticket_refs WHERE legacy_order_id = $1 ORDER BY id`,
      [order.id]
    );
    
    res.json({
      order: {
        id: order.id,
        orderNumber: order.order_number,
        status: order.status,
        totalCents: order.total_cents,
        currency: order.currency,
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        customerPhone: order.customer_phone,
        shippingAddress: order.shipping_address,
        paymentMethod: order.payment_method,
        paymentStatus: order.payment_status,
        paymentProvider: order.payment_provider,
        externalPaymentId: order.external_payment_id,
        externalOrderRef: order.external_order_ref,
        paymentCheckoutUrl: order.payment_checkout_url,
        notes: order.notes,
        fanId: extractFanIdFromOrder(order),
        items: itemsResult.rows.map(row => ({
          id: row.id,
          productSlug: row.product_slug,
          productTitle: row.product_title,
          priceCents: row.price_cents,
          quantity: row.quantity,
        })),
        externalTickets: ticketsRes.rows.map((row) => ({
          id: row.id,
          orderItemId: row.order_item_id,
          provider: row.provider,
          externalTicketId: row.external_ticket_id,
          metadata: row.metadata,
        })),
        createdAt: order.created_at,
        updatedAt: order.updated_at,
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Обновить статус заказа (только для админов)
router.put('/:orderNumber/status', requireAuth, requireAdminOrSalesManager, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }
    
    const { orderNumber } = req.params;
    const { status, paymentStatus } = req.body || {};
    
    if (!status && !paymentStatus) {
      return res.status(400).json({ error: 'status or paymentStatus required' });
    }

    const prevRes = await pool.query('SELECT * FROM orders WHERE order_number = $1', [orderNumber]);
    const prev = prevRes.rows[0];
    if (!prev) return res.status(404).json({ error: 'Order not found' });
    
    const updates = [];
    const params = [];
    let paramIndex = 1;
    
    if (status) {
      updates.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }
    
    if (paymentStatus) {
      updates.push(`payment_status = $${paramIndex}`);
      params.push(paymentStatus);
      paramIndex++;
    }
    
    updates.push(`updated_at = NOW()`);
    params.push(orderNumber);
    
    const query = `UPDATE orders SET ${updates.join(', ')} WHERE order_number = $${paramIndex} RETURNING *`;
    
    const r = await pool.query(query, params);
    const updated = r.rows[0];
    if (!updated) return res.status(404).json({ error: 'Order not found' });

    const wasPaid =
      prev.payment_status === 'paid' ||
      prev.status === 'paid' ||
      prev.status === 'completed';
    const nowPaid =
      updated.payment_status === 'paid' ||
      updated.status === 'paid' ||
      updated.status === 'completed';

    if (nowPaid && !wasPaid) {
      const { finalizePaidOrder } = await import('../services/orderPaymentFinalize.js');
      await finalizePaidOrder(updated, { ticketRefs: [], runPaidHooks: runPaidOrderSideEffects });
    }

    if (
      prev.status !== updated.status ||
      prev.payment_status !== updated.payment_status
    ) {
      try {
        await sendOrderStatusChangedEmail({
          to: updated.customer_email,
          order: {
            orderNumber: updated.order_number,
            status: updated.status,
            paymentStatus: updated.payment_status,
            totalCents: updated.total_cents,
            currency: updated.currency,
          },
          previousStatus: prev.status,
          previousPaymentStatus: prev.payment_status,
        });
      } catch (mailErr) {
        console.warn('[orders] status email:', mailErr.message);
      }
    }
    
    res.json({ updated });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

