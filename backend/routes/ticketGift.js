import pool from '../db.js';
import { extractGiftFromPaymentMeta } from '../utils/ticketGift.js';

function parseMeta(raw) {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return typeof raw === 'object' ? raw : {};
}

/**
 * @param {import('express').Router} router
 */
export function registerTicketGiftRoutes(router) {
  router.get('/gift/:orderNumber', async (req, res) => {
    try {
      const orderNumber = String(req.params.orderNumber || '').trim();
      const token = String(req.query.token ?? req.query.viewToken ?? '').trim();
      if (!orderNumber || !token) {
        return res.status(400).json({ error: 'order_and_token_required' });
      }

      const r = await pool.query(`SELECT * FROM orders WHERE order_number = $1 LIMIT 1`, [orderNumber]);
      const order = r.rows[0];
      if (!order) return res.status(404).json({ error: 'not_found' });

      const meta = parseMeta(order.payment_metadata);
      const gift = extractGiftFromPaymentMeta(meta);
      if (!gift || String(gift.viewToken || '') !== token) {
        return res.status(403).json({ error: 'invalid_token' });
      }

      if (order.payment_status !== 'paid') {
        return res.status(409).json({ error: 'payment_pending', message: 'Оплата ещё не подтверждена' });
      }

      return res.json({
        ok: true,
        orderNumber,
        eventTitle: meta.eventTitle || 'Мероприятие',
        sessionLabel: meta.sessionLabel || null,
        seats: meta.seats || [],
        seatLabels: meta.seatLabels || null,
        fromName: order.customer_name || null,
        recipientName: gift.recipientName || null,
        message: gift.message || null,
      });
    } catch (e) {
      console.error('[bilet/gift]', e);
      return res.status(500).json({ error: 'gift_view_failed' });
    }
  });
}
