import pool from '../db.js';
import { invalidateOffersCache } from './getbiletOffersCache.js';
import {
  extractTicketRefsFromMakeData,
  normalizeOfferSelections,
  prepareTicketReservations,
} from './ticketSeatReservation.js';

function parsePaymentMeta(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return { ...raw };
  try {
    return { ...JSON.parse(raw) };
  } catch {
    return {};
  }
}

function hasPartnerMakeOrder(pm) {
  const gbm = pm?.getbiletMakeOrder;
  if (gbm == null || typeof gbm !== 'object') return false;
  const chunks = Array.isArray(gbm) ? gbm : [gbm];
  return chunks.some((chunk) => chunk && typeof chunk === 'object' && chunk.Method !== 'LocalSoftHold');
}

/**
 * После успешной оплаты — MakeOrder в GetBilet.
 * Идемпотентно: если партнёрская бронь уже есть в metadata — только отдаёт ticketRefs.
 *
 * @returns {{ order, paymentMeta, ticketRefs, partnerBooked: boolean, partnerError: string|null }}
 */
export async function fulfillPartnerBookingAfterPayment(orderRow) {
  let pm = parsePaymentMeta(orderRow.payment_metadata);
  if (!pm.ticketCheckout) {
    return {
      order: orderRow,
      paymentMeta: pm,
      ticketRefs: extractTicketRefsFromMakeData(pm.getbiletMakeOrder),
      partnerBooked: hasPartnerMakeOrder(pm),
      partnerError: null,
    };
  }

  if (hasPartnerMakeOrder(pm)) {
    return {
      order: orderRow,
      paymentMeta: pm,
      ticketRefs: extractTicketRefsFromMakeData(pm.getbiletMakeOrder),
      partnerBooked: true,
      partnerError: pm.partnerBookingError || null,
    };
  }

  const repertoireId = pm.repertoireId != null ? String(pm.repertoireId) : '';
  let offerSelections;
  try {
    offerSelections = normalizeOfferSelections({
      offerSelections: pm.offerSelections,
      offerId: pm.offerId,
      seats: pm.seats,
    });
  } catch (err) {
    const partnerError = err?.message || 'Некорректные данные мест для брони у оператора';
    pm = {
      ...pm,
      partnerBookingError: partnerError,
      partnerBookingFailedAt: new Date().toISOString(),
    };
    const updated = await pool.query(
      `UPDATE orders SET payment_metadata = $2::jsonb, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [orderRow.id, JSON.stringify(pm)],
    );
    return {
      order: updated.rows[0] || orderRow,
      paymentMeta: pm,
      ticketRefs: [],
      partnerBooked: false,
      partnerError,
    };
  }

  try {
    const reservation = await prepareTicketReservations({ offerSelections, repertoireId });
    pm = {
      ...pm,
      getbiletMakeOrder: reservation.makeData,
      getbiletOrderId: reservation.getbiletOrderIds[0] ?? null,
      getbiletOrderIds: reservation.getbiletOrderIds,
      deferPartnerBooking: false,
      partnerBookedAt: new Date().toISOString(),
      partnerBookingError: undefined,
      partnerBookingFailedAt: undefined,
    };
    const updated = await pool.query(
      `UPDATE orders SET payment_metadata = $2::jsonb, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [orderRow.id, JSON.stringify(pm)],
    );
    if (!reservation.isDemo && repertoireId) {
      invalidateOffersCache(repertoireId).catch(() => {});
    }
    return {
      order: updated.rows[0] || orderRow,
      paymentMeta: pm,
      ticketRefs: extractTicketRefsFromMakeData(reservation.makeData),
      partnerBooked: true,
      partnerError: null,
    };
  } catch (err) {
    const partnerError = err?.message || 'Ошибка бронирования у оператора';
    console.error('[fulfillPartnerBooking]', orderRow.order_number, partnerError, err);
    pm = {
      ...pm,
      deferPartnerBooking: true,
      partnerBookingError: partnerError,
      partnerBookingFailedAt: new Date().toISOString(),
    };
    const updated = await pool.query(
      `UPDATE orders SET payment_metadata = $2::jsonb, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [orderRow.id, JSON.stringify(pm)],
    );

    try {
      const { createNotification } = await import('../routes/notifications.js');
      await createNotification({
        userId: 0,
        type: 'ticket_partner_booking_failed',
        title: `Не удалось забронировать у оператора ${orderRow.order_number}`,
        message: [
          orderRow.customer_email ? `Покупатель: ${orderRow.customer_email}` : null,
          pm?.eventTitle ? `Событие: ${pm.eventTitle}` : null,
          partnerError,
        ]
          .filter(Boolean)
          .join(' · '),
        linkUrl: '/admin/orders',
        relatedEntityType: 'order',
        relatedEntityId: orderRow.id,
      });
    } catch (notifyErr) {
      console.warn('[fulfillPartnerBooking] admin notify failed:', notifyErr?.message);
    }

    return {
      order: updated.rows[0] || orderRow,
      paymentMeta: pm,
      ticketRefs: [],
      partnerBooked: false,
      partnerError,
    };
  }
}
