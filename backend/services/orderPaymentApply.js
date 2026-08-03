import pool from '../db.js';
import ticketPool from '../ticketDb.js';
import { finalizePaidOrder } from './orderPaymentFinalize.js';

function alreadyPaid(row) {
  return row.payment_status === 'paid' && (row.status === 'paid' || row.status === 'completed');
}

/** Дозапись ticket refs для уже оплаченного заказа (retry MakeOrder после сбоя). */
async function storeTicketRefsIfNeeded(orderRow, ticketRefs) {
  if (!ticketRefs?.length) return;
  const provider = orderRow.payment_provider || 'unknown';
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
      ],
    );
  }
}

/**
 * Переводит заказ в оплаченный и запускает финализацию (билеты, пользователь, хуки оплаченного заказа).
 * Идемпотентно: повторный вызов для уже оплаченного заказа не дублирует побочные эффекты,
 * но дозаписывает ticket refs (на случай успешного MakeOrder при retry webhook).
 */
export async function applyOrderPaidState(orderRow, { externalPaymentId, ticketRefs } = {}) {
  if (alreadyPaid(orderRow)) {
    await storeTicketRefsIfNeeded(orderRow, ticketRefs);
    return orderRow;
  }

  const r = await pool.query(
    `UPDATE orders SET
      payment_status = 'paid',
      status = 'paid',
      external_payment_id = COALESCE($2::text, external_payment_id),
      updated_at = NOW()
    WHERE id = $1
    RETURNING *`,
    [orderRow.id, externalPaymentId || null]
  );
  const updated = r.rows[0];
  const { runPaidOrderSideEffects } = await import('../routes/orders.js');
  await finalizePaidOrder(updated, { ticketRefs, runPaidHooks: runPaidOrderSideEffects });
  return updated;
}
