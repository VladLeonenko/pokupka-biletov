import pool from '../db.js';
import ticketPool from '../ticketDb.js';
import { GetbiletValidationError, GetbiletUpstreamError } from '../services/getbiletClient.js';
import {
  restV2MakeOrder,
  restV2CancelOrder,
  restV2GetOfferById,
} from '../services/getbiletRestV2.js';
import { invalidateOffersCache } from '../services/getbiletOffersCache.js';
import { validateGetbiletPromoForAmount, incrementGetbiletPromoUses } from '../services/getbiletPromoPublic.js';
import {
  applyGetbiletMarkupToOfferPayload,
  getGetbiletMarkupRuleForRepertoire,
} from '../services/getbiletMarkupPublic.js';
import { isTbankEacqConfigured, tbankEacqInit, verifyTbankNotificationToken } from '../services/payment/tbankEacq.js';
import { applyOrderPaidState } from '../services/orderPaymentApply.js';

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

function pickGetbiletOrderId(data) {
  if (!data || typeof data !== 'object') return null;
  const rd = data.ResultData;
  if (rd && typeof rd === 'object' && !Array.isArray(rd)) {
    const id = rd.OrderId ?? rd.Id ?? rd.orderId;
    if (id != null && id !== '') return String(id);
  }
  if (Array.isArray(rd) && rd[0] && typeof rd[0] === 'object') {
    const id = rd[0].OrderId ?? rd[0].Id;
    if (id != null) return String(id);
  }
  const id = data.OrderId ?? data.Id;
  return id != null && id !== '' ? String(id) : null;
}

function parseOfferRow(offerPayload) {
  const row = Array.isArray(offerPayload?.ResultData)
    ? offerPayload.ResultData[0]
    : offerPayload?.ResultData;
  if (!row || typeof row !== 'object') return null;
  const unit = Number(row.AgentPrice ?? row.NominalPrice ?? 0);
  if (!Number.isFinite(unit) || unit < 0) return null;
  return { row, unitRub: unit };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEMO_REPERTOIRE_ID = process.env.TBANK_DEMO_REPERTOIRE_ID?.trim() || 'tbank-demo-event';

function isTbankDemoCheckoutAllowed() {
  const terminalKey = process.env.TBANK_TERMINAL_KEY?.trim() || process.env.TINKOFF_TERMINAL_KEY?.trim() || '';
  return process.env.TBANK_ENABLE_DEMO_EVENT === '1' || /DEMO$/i.test(terminalKey);
}

function isDemoCheckoutPayload(repertoireId, offerId) {
  return isTbankDemoCheckoutAllowed() && repertoireId === DEMO_REPERTOIRE_ID && offerId.startsWith('tb-demo-');
}

async function loadDemoOffer(repertoireId, offerId) {
  const r = await ticketPool.query(
    `SELECT payload_json FROM getbilet_repertoire_offers_cache WHERE repertoire_external_id = $1`,
    [repertoireId]
  );
  const payload = r.rows[0]?.payload_json;
  const rows = Array.isArray(payload?.ResultData) ? payload.ResultData : [];
  return rows.find((row) => row && typeof row === 'object' && String(row.Id ?? '') === offerId) || null;
}

async function prepareTicketReservation({ offerId, repertoireId, seats }) {
  if (isDemoCheckoutPayload(repertoireId, offerId)) {
    const row = await loadDemoOffer(repertoireId, offerId);
    if (!row) throw new GetbiletValidationError('Тестовое предложение не найдено');
    const availableSeats = Array.isArray(row.SeatList) ? row.SeatList.map(String) : [];
    const unavailable = seats.filter((seat) => !availableSeats.includes(String(seat)));
    if (unavailable.length > 0) {
      throw new GetbiletValidationError(`Места недоступны: ${unavailable.join(', ')}`);
    }
    const unitRub = Number(row.AgentPrice ?? row.NominalPrice ?? 0);
    if (!Number.isFinite(unitRub) || unitRub <= 0) {
      throw new GetbiletValidationError('Некорректная цена тестового предложения');
    }
    return {
      baseRub: unitRub * seats.length,
      makeData: {
        Success: true,
        Method: 'DemoMakeOrder',
        ResultData: seats.map((seat) => ({
          TicketId: `demo-${offerId}-${seat}`,
          OfferId: offerId,
          Seat: String(seat),
        })),
      },
      getbiletOrderId: null,
      isDemo: true,
    };
  }

  let offerPayload = await restV2GetOfferById(offerId);
  const markupRule = await getGetbiletMarkupRuleForRepertoire(repertoireId);
  offerPayload = applyGetbiletMarkupToOfferPayload(offerPayload, markupRule);
  const parsed = parseOfferRow(offerPayload);
  if (!parsed) {
    throw new GetbiletValidationError('Не удалось получить цену предложения');
  }
  const makeData = await restV2MakeOrder(offerId, seats);
  return {
    baseRub: parsed.unitRub * seats.length,
    makeData,
    getbiletOrderId: pickGetbiletOrderId(makeData),
    isDemo: false,
  };
}

/**
 * @param {import('express').Router} router
 * @param {{ optionalAuth: import('express').RequestHandler }} deps
 */
export function registerBiletTicketCheckoutRoutes(router, { optionalAuth }) {
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
    let getbiletOrderIdToCancel = null;
    let insertedOrderId = null;
    try {
      if (!isTbankEacqConfigured()) {
        return res.status(503).json({
          error: 'payment_not_configured',
          message: 'Онлайн-оплата не настроена (TBANK_TERMINAL_KEY / TBANK_PASSWORD).',
        });
      }

      const offerId = requireNonEmptyString(req.body?.offerId, 'offerId');
      const repertoireId = requireNonEmptyString(req.body?.repertoireId, 'repertoireId');
      const eventTitle =
        typeof req.body?.eventTitle === 'string' && req.body.eventTitle.trim()
          ? req.body.eventTitle.trim().slice(0, 300)
          : 'Мероприятие';
      const seatsRaw = req.body?.seats;
      if (!Array.isArray(seatsRaw) || seatsRaw.length === 0) {
        throw new GetbiletValidationError('Выберите хотя бы одно место');
      }
      const seats = seatsRaw.map((s) => String(s).trim()).filter(Boolean);
      if (seats.length === 0) throw new GetbiletValidationError('Некорректный список мест');

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

      const userId = req.user?.id ?? null;
      const sessionId = userId ? null : getSessionId(req);
      if (!userId && !sessionId) {
        return res.status(400).json({ error: 'session_required' });
      }

      const reservation = await prepareTicketReservation({ offerId, repertoireId, seats });
      const baseRub = reservation.baseRub;
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

      const makeData = reservation.makeData;
      getbiletOrderIdToCancel = reservation.getbiletOrderId;

      if (!reservation.isDemo) {
        invalidateOffersCache(repertoireId).catch(() => {});
      }

      const orderNumber = generateOrderNumber();
      const paymentMeta = {
        ticketCheckout: true,
        eventTitle,
        seats,
        offerId,
        repertoireId,
        promoId,
        getbiletMakeOrder: makeData,
        getbiletOrderId: getbiletOrderIdToCancel,
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
          `Билеты: ${eventTitle}`.slice(0, 2000),
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
      if (getbiletOrderIdToCancel) {
        restV2CancelOrder(getbiletOrderIdToCancel).catch(() => {});
      }
      if (err instanceof GetbiletValidationError) {
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

    let pm = order.payment_metadata;
    if (typeof pm === 'string') {
      try {
        pm = JSON.parse(pm);
      } catch {
        pm = {};
      }
    }
    const ticketRefs = [];
    const gbm = pm?.getbiletMakeOrder;
    if (gbm && typeof gbm === 'object') {
      const rd = gbm.ResultData;
      const rows = Array.isArray(rd) ? rd : rd ? [rd] : [];
      for (const r of rows) {
        if (!r || typeof r !== 'object') continue;
        const tid = r.TicketId ?? r.Id ?? r.ticketId;
        if (tid != null) {
          ticketRefs.push({ externalTicketId: String(tid), metadata: r });
        }
      }
    }

    await applyOrderPaidState(order, {
      externalPaymentId: paymentId,
      ticketRefs,
    });

    if (pm?.promoId != null) {
      await incrementGetbiletPromoUses(pm.promoId).catch(() => {});
    }

    return res.status(200).send('OK');
  } catch (e) {
    console.error('[tbank eacq webhook]', e);
    return res.status(500).send('ERR');
  }
}
