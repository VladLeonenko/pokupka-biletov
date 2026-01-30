import express from 'express';
import pool from '../db.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { createAiTeamSubscriptionForUser } from './aiTeam.js';
import { createClientProjectFromOrder } from './projects.js';

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
    const {
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      paymentMethod,
      notes,
    } = req.body || {};
    
    const userId = req.user?.id;
    const sessionId = userId ? null : req.headers['x-session-id'];
    
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
    
    // Создаем заказ
    const orderNumber = generateOrderNumber();
    const orderResult = await pool.query(`
      INSERT INTO orders(
        user_id, session_id, order_number, status, total_cents, currency,
        customer_name, customer_email, customer_phone, shipping_address,
        payment_method, payment_status, notes
      ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
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
    
    // Автоматически связываем заказ с клиентом
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
              'form',
              'lead'
            ]
          );
          clientId = newClientResult.rows[0].id;
        }

        // Связываем заказ с клиентом
        if (clientId) {
          await pool.query(
            'INSERT INTO client_orders (client_id, order_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [clientId, order.id]
          );
          // Обновляем метрики клиента
          await pool.query('SELECT update_client_metrics($1)', [clientId]);
        }
      }
    } catch (clientErr) {
      // Логируем ошибку, но не прерываем создание заказа
      console.warn('[orders] Error linking order to client:', clientErr);
    }

    // Пытаемся автоматически создать проект для клиента из заказа
    // (идемпотентно: createClientProjectFromOrder сам проверяет дубли)
    try {
      await createClientProjectFromOrder(order);
    } catch (projErr) {
      console.error('[orders] Error creating client project from order (on create):', order.id, projErr);
    }
    
    res.json({ order: {
      id: order.id,
      orderNumber: order.order_number,
      status: order.status,
      totalCents: order.total_cents,
      currency: order.currency,
      createdAt: order.created_at,
    } });
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
      items: row.items || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
    
    res.json({ orders });
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
        notes: order.notes,
        items: itemsResult.rows.map(row => ({
          id: row.id,
          productSlug: row.product_slug,
          productTitle: row.product_title,
          priceCents: row.price_cents,
          quantity: row.quantity,
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
router.put('/:orderNumber/status', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }
    
    const { orderNumber } = req.params;
    const { status, paymentStatus } = req.body || {};
    
    if (!status && !paymentStatus) {
      return res.status(400).json({ error: 'status or paymentStatus required' });
    }
    
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

    // Если заказ успешно оплачен - проверяем, нужно ли создать подписку AI Team
    const newStatus = status || updated.status;
    const newPaymentStatus = paymentStatus || updated.payment_status;
    if (newStatus === 'paid' || newPaymentStatus === 'paid') {
      await maybeAttachAiTeamSubscription(updated);
      try {
        await createClientProjectFromOrder(updated);
      } catch (projErr) {
        console.error('[orders] Failed to create client project from order:', updated.id, projErr);
      }
    }
    
    res.json({ updated });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

