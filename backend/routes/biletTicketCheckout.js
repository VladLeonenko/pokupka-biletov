import pool from '../db.js';
import { GetbiletValidationError, GetbiletUpstreamError, getGetbiletConfig } from '../services/getbiletClient.js';
import {
  cancelTicketSeatHolds,
  normalizeOfferSelections,
  prepareLocalSeatHold,
  buildSeatHoldResponse,
} from '../services/ticketSeatReservation.js';
import { fulfillPartnerBookingAfterPayment } from '../services/fulfillPartnerBooking.js';
import { validateGetbiletPromoForAmount, incrementGetbiletPromoUses } from '../services/getbiletPromoPublic.js';
import { isTbankEacqConfigured, tbankEacqInit, verifyTbankNotificationToken } from '../services/payment/tbankEacq.js';
import { applyOrderPaidState } from '../services/orderPaymentApply.js';
import {
  isFanIdRequiredForRepertoire,
  requireValidFanId,
} from '../utils/fanIdRequiredEvents.js';
import {
  assertRepertoireStorefrontAccess,
  RepertoireNotAvailableError,
} from '../services/repertoireStorefrontAccess.js';
import { registerTicketPriceAlertRoutes } from './ticketPriceAlerts.js';
import { registerTicketGiftRoutes } from './ticketGift.js';
import { parseTicketGiftFromCheckoutBody } from '../utils/ticketGift.js';

function generateOrderNumber() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

function getSessionId(req) {
  let sessionId = req.headers['x-session-id'];
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  return sessionId;
}

function requireNonEmptyString(v, name) {
  const s = typeof v === 'string' ? v.trim() : v != null ? String(v).trim() : '';
  if (!s) throw new GetbiletValidationError(`${name} обязателен`);
  return s;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @param {import('express').Router} router
 * @param {{ optionalAuth: import('express').RequestHandler }} deps
 */
export function registerBiletTicketCheckoutRoutes(router, { optionalAuth }) {
  registerTicketPriceAlertRoutes(router);
  registerTicketGiftRoutes(router);

  /** Локальный soft-hold: без MakeOrder у GetBilet. */
  router.post('/reserve', optionalAuth, async (req, res) => {
    try {
      const { protocol } = getGetbiletConfig();
      if (protocol !== 'rest_v2') {
        return res.status(501).json({ error: 'only_rest_v2' });
      }
      const repertoireId = requireNonEmptyString(req.body?.repertoireId, 'repertoireId');
      await assertRepertoireStorefrontAccess(repertoireId);
      const offerSelections = normalizeOfferSelections(req.body);
      const reservation = await prepareLocalSeatHold({ offerSelections, repertoireId });
      return res.json(
        buildSeatHoldResponse({ reservation, offerSelections, repertoireId }),
      );
    } catch (err) {
      if (err instanceof GetbiletValidationError) {
        return res.status(400).json({ error: 'validation', message: err.message });
      }
      if (err instanceof RepertoireNotAvailableError) {
        return res.status(404).json({ error: 'not_found', message: err.message });
      }
      if (err instanceof GetbiletUpstreamError) {
        return res.status(502).json({ error: 'getbilet_upstream', message: err.message });
      }
      console.error('[bilet/reserve]', err);
      return res.status(500).json({ error: 'reserve_failed', message: err.message || 'Ошибка бронирования' });
    }
  });

  router.post('/cancel-reserve', optionalAuth, async (req, res) => {
    try {
      const raw = req.body?.getbiletOrderIds ?? req.body?.orderIds;
      const ids = Array.isArray(raw) ? raw.map(String).filter(Boolean) : [];
      // На случай старых soft-hold с реальными GetBilet order id
      await cancelTicketSeatHolds(ids);
      return res.json({ ok: true, cancelled: ids.length });
    } catch (err) {
      console.error('[bilet/cancel-reserve]', err);
      return res.status(500).json({ ok: false, error: err.message || 'cancel_failed' });
    }
  });

  router.post('/validate-promo', optionalAuth, async (req, res) => {
    try {
      const code = req.body?.code ?? req.body?.promoCode ?? '';
      const amountRub = Number(req.body?.amountRub);
      const v = await validateGetbiletPromoForAmount(String(code), amountRub);
      if (!v.ok) {
        return res.status(400).json({ ok: false, error: v.error || 'Промокод недоступен' });
      }
      return res.json({
        ok: true,
        discountRub: v.discountRub,
        finalRub: v.finalRub,
        promo: v.promo,
      });
    } catch (e) {
      console.error('[bilet/validate-promo]', e);
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.post('/checkout', optionalAuth, async (req, res) => {
    let insertedOrderId = null;
    try {
      if (!isTbankEacqConfigured()) {
        return res.status(503).json({
          error: 'payment_not_configured',
          message: 'Онлайн-оплата не настроена (TBANK_TERMINAL_KEY / TBANK_PASSWORD).',
        });
      }

      const repertoireId = requireNonEmptyString(req.body?.repertoireId, 'repertoireId');
      await assertRepertoireStorefrontAccess(repertoireId);

      const eventTitle =
        typeof req.body?.eventTitle === 'string' && req.body.eventTitle.trim()
          ? req.body.eventTitle.trim().slice(0, 300)
          : 'Мероприятие';
      const offerSelections = normalizeOfferSelections(req.body);
      const offerId = offerSelections[0].offerId;
      const seats = offerSelections.flatMap((selection) => selection.seats);

      const customerName = requireNonEmptyString(req.body?.customerName, 'ФИО');
      let customerEmail = requireNonEmptyString(req.body?.customerEmail, 'Email');
      customerEmail = customerEmail.toLowerCase();
      if (!EMAIL_RE.test(customerEmail)) {
        throw new GetbiletValidationError('Некорректный email');
      }
      const customerPhone = requireNonEmptyString(req.body?.customerPhone, 'Телефон');
      const digits = customerPhone.replace(/\D/g, '');
      if (digits.length < 10) {
        throw new GetbiletValidationError('Укажите телефон полностью');
      }

      const promoCode = typeof req.body?.promoCode === 'string' ? req.body.promoCode.trim() : '';

      let fanId = null;
      if (isFanIdRequiredForRepertoire(repertoireId)) {
        fanId = requireValidFanId(req.body?.fanId ?? req.body?.fan_id);
      }

      const gift = (() => {
        try {
          return parseTicketGiftFromCheckoutBody(req.body);
        } catch (e) {
          throw new GetbiletValidationError(e instanceof Error ? e.message : 'Ошибка оформления подарка');
        }
      })();
      const sessionLabel =
        typeof req.body?.sessionLabel === 'string' && req.body.sessionLabel.trim()
          ? req.body.sessionLabel.trim().slice(0, 200)
          : null;
      const seatLabels = Array.isArray(req.body?.seatLabels)
        ? req.body.seatLabels.map((s) => String(s).trim()).filter(Boolean).slice(0, 20)
        : null;

      const userId = req.user?.id ?? null;
      const sessionId = userId ? null : getSessionId(req);
      if (!userId && !sessionId) {
        return res.status(400).json({ error: 'session_required' });
      }

      // Только локальная цена/проверка мест — MakeOrder у GetBilet после оплаты
      const priced = await prepareLocalSeatHold({ offerSelections, repertoireId });
      const baseRub = priced.baseRub;
      let finalRub = baseRub;
      let promoId = null;
      if (promoCode) {
        const pv = await validateGetbiletPromoForAmount(promoCode, baseRub);
        if (!pv.ok) {
          throw new GetbiletValidationError(pv.error || 'Промокод недоступен');
        }
        finalRub = pv.finalRub;
        promoId = pv.promo?.id ?? null;
      }

      const amountKopecks = Math.round(finalRub * 100);
      if (amountKopecks < 100) {
        throw new GetbiletValidationError('Сумма заказа слишком мала');
      }

      const orderNumber = generateOrderNumber();
      const paymentMeta = {
        ticketCheckout: true,
        deferPartnerBooking: true,
        eventTitle,
        seats,
        seatLabels: seatLabels?.length ? seatLabels : undefined,
        sessionLabel: sessionLabel || undefined,
        offerId,
        offerSelections,
        repertoireId,
        promoId,
        fanId: fanId || undefined,
        gift: gift || undefined,
        getbiletMakeOrder: null,
        getbiletOrderId: null,
        getbiletOrderIds: [],
        isDemo: priced.isDemo,
      };

      const orderResult = await pool.query(
        `INSERT INTO orders(
          user_id, session_id, order_number, status, total_cents, currency,
          customer_name, customer_email, customer_phone,
          payment_method, payment_status, notes,
          payment_provider, payment_metadata
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb)
        RETURNING id`,
        [
          userId,
          sessionId,
          orderNumber,
          'pending',
          amountKopecks,
          'RUB',
          customerName,
          customerEmail,
          customerPhone,
          'online',
          'pending',
          (`Билеты: ${eventTitle}${fanId ? ` · FAN ID ${fanId}` : ''}`).slice(0, 2000),
          'tbank',
          paymentMeta,
        ]
      );
      insertedOrderId = orderResult.rows[0].id;

      await pool.query(
        `INSERT INTO order_items(order_id, product_slug, product_title, price_cents, quantity)
         VALUES ($1, 'internal-getbilet-ticket', $2, $3, 1)`,
        [insertedOrderId, `${eventTitle} — ${seats.join(', ')}`.slice(0, 500), amountKopecks]
      );

      const site = (process.env.SITE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
      const successUrl = `${site}/orders/${encodeURIComponent(orderNumber)}?paid=1`;
      const failUrl = `${site}/ticket/${encodeURIComponent(repertoireId)}?payment=failed`;
      const notificationUrl = `${site}/api/webhooks/tbank/eacq`;

      const { paymentUrl, paymentId } = await tbankEacqInit({
        amountKopecks,
        orderId: orderNumber,
        description: `${eventTitle}`.slice(0, 120),
        successUrl,
        failUrl,
        notificationUrl,
        email: customerEmail,
        phone: customerPhone,
      });

      await pool.query(
        `UPDATE orders SET
          payment_provider = 'tbank',
          external_payment_id = $2,
          payment_checkout_url = $3,
          updated_at = NOW()
        WHERE id = $1`,
        [insertedOrderId, paymentId, paymentUrl]
      );

      try {
        const { sendTicketOrderReservedEmail } = await import('../services/mail/ticketOrderMail.js');
        await sendTicketOrderReservedEmail(
          {
            id: insertedOrderId,
            order_number: orderNumber,
            customer_name: customerName,
            customer_email: customerEmail,
            total_cents: amountKopecks,
            payment_metadata: paymentMeta,
            payment_checkout_url: paymentUrl,
          },
          { paymentUrl },
        );
      } catch (mailErr) {
        console.warn('[bilet/checkout] reserved email failed:', mailErr?.message || mailErr);
      }

      if (!userId) {
        res.setHeader('x-session-id', sessionId);
      }

      return res.json({
        ok: true,
        orderNumber,
        paymentUrl,
        amountKopecks,
      });
    } catch (err) {
      if (insertedOrderId) {
        await pool.query('DELETE FROM orders WHERE id = $1', [insertedOrderId]).catch(() => {});
      }
      if (err instanceof GetbiletValidationError) {
        return res.status(400).json({ error: 'validation', message: err.message });
      }
      if (err instanceof RepertoireNotAvailableError) {
        return res.status(404).json({ error: 'not_found', message: err.message });
      }
      if (err && typeof err === 'object' && 'name' in err && err.name === 'FanIdValidationError') {
        return res.status(400).json({ error: 'validation', message: err.message });
      }
      if (err instanceof GetbiletUpstreamError) {
        return res.status(502).json({ error: 'getbilet_upstream', message: err.message });
      }
      console.error('[bilet/checkout]', err);
      return res.status(500).json({ error: 'checkout_failed', message: err.message || 'Ошибка оформления' });
    }
  });
}

/**
 * POST /api/webhooks/tbank/eacq — уведомление T-Bank (Tinkoff EACQ).
 */
export async function handleTbankEacqNotification(req, res) {
  try {
    const body = req.body || {};
    if (!verifyTbankNotificationToken(body)) {
      console.warn('[tbank eacq] invalid notification token');
      return res.status(403).send('INVALID');
    }
    const orderNumber = body.OrderId != null ? String(body.OrderId) : '';
    if (!orderNumber) {
      return res.status(400).json({ error: 'OrderId required' });
    }
    const paid =
      body.Success === true &&
      (body.Status === 'CONFIRMED' || body.Status === 'AUTHORIZED');
    if (!paid) {
      const failedStatuses = new Set(['REJECTED', 'CANCELED', 'DEADLINE_EXPIRED']);
      const status = body.Status != null ? String(body.Status).toUpperCase() : '';
      if (orderNumber && failedStatuses.has(status)) {
        await pool.query(
          `UPDATE orders SET
            payment_status = 'failed',
            status = CASE WHEN status = 'pending' THEN 'cancelled' ELSE status END,
            external_payment_id = COALESCE($2::text, external_payment_id),
            updated_at = NOW()
           WHERE order_number = $1 AND payment_status <> 'paid'`,
          [orderNumber, body.PaymentId != null ? String(body.PaymentId) : null]
        );
      }
      return res.status(200).send('OK');
    }

    const or = await pool.query('SELECT * FROM orders WHERE order_number = $1', [orderNumber]);
    const order = or.rows[0];
    if (!order) {
      console.warn('[tbank eacq] order not found', orderNumber);
      return res.status(200).send('OK');
    }

    const paymentId = body.PaymentId != null ? String(body.PaymentId) : null;

    // Партнёрская бронь (GetBilet MakeOrder) — только после подтверждённой оплаты
    const fulfilled = await fulfillPartnerBookingAfterPayment(order);

    await applyOrderPaidState(fulfilled.order, {
      externalPaymentId: paymentId,
      ticketRefs: fulfilled.ticketRefs,
    });

    const pm = fulfilled.paymentMeta;
    if (pm?.promoId != null) {
      await incrementGetbiletPromoUses(pm.promoId).catch(() => {});
    }

    return res.status(200).send('OK');
  } catch (e) {
    console.error('[tbank eacq webhook]', e);
    return res.status(500).send('ERR');
  }
}
