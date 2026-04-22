import { Router } from 'express';
import pool from '../db.js';
import { applyOrderPaidState } from '../services/orderPaymentApply.js';

const router = Router();

/**
 * POST /api/webhooks/ticket-payments/:provider
 * Тело (пример): { "orderNumber": "ORD-...", "paymentId": "...", "status": "paid", "tickets": [...] }
 * Если задан {PROVIDER}_WEBHOOK_SECRET — заголовок X-Webhook-Secret или query ?secret= должен совпадать.
 */
router.post('/ticket-payments/:provider', async (req, res) => {
  try {
    const provider = req.params.provider.toLowerCase();
    const secretEnv = `${provider.toUpperCase()}_WEBHOOK_SECRET`;
    const expected = process.env[secretEnv];
    if (expected) {
      const got = req.headers['x-webhook-secret'] || req.query.secret;
      if (got !== expected) {
        return res.status(401).json({ error: 'Invalid webhook secret' });
      }
    }

    const body = req.body || {};
    const orderNumber = body.orderNumber || body.order_number;
    const paymentId = body.paymentId || body.payment_id || body.external_payment_id;
    const paid =
      body.status === 'paid' ||
      body.paymentStatus === 'paid' ||
      body.payment_status === 'paid' ||
      body.event === 'payment.succeeded';

    if (!orderNumber) {
      return res.status(400).json({ error: 'orderNumber required' });
    }

    const or = await pool.query('SELECT * FROM orders WHERE order_number = $1', [orderNumber]);
    const order = or.rows[0];
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (!paid) {
      return res.json({ ok: true, ignored: true, reason: 'not_paid_event' });
    }

    const ticketRefs = [];
    if (Array.isArray(body.tickets)) {
      for (const t of body.tickets) {
        const id = t?.id ?? t?.ticketId ?? t?.externalId;
        if (id) {
          ticketRefs.push({
            externalTicketId: String(id),
            orderItemId: t.orderItemId ?? null,
            metadata: t,
          });
        }
      }
    }

    const updated = await applyOrderPaidState(order, {
      externalPaymentId: paymentId,
      ticketRefs,
    });

    res.json({
      ok: true,
      orderNumber: updated.order_number,
      paymentStatus: updated.payment_status,
      status: updated.status,
    });
  } catch (e) {
    console.error('[webhooks ticket-payments]', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
