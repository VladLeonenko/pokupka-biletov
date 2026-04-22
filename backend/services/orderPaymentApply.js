import pool from '../db.js';
import { finalizePaidOrder } from './orderPaymentFinalize.js';

function alreadyPaid(row) {
  return row.payment_status === 'paid' && (row.status === 'paid' || row.status === 'completed');
}

/**
 * Переводит заказ в оплаченный и запускает финализацию (билеты, пользователь, хуки оплаченного заказа).
 * Идемпотентно: повторный вызов для уже оплаченного заказа не дублирует побочные эффекты.
 */
export async function applyOrderPaidState(orderRow, { externalPaymentId, ticketRefs } = {}) {
  if (alreadyPaid(orderRow)) {
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
