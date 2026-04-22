import ticketPool from '../ticketDb.js';

/**
 * Публичная проверка промокода getbilet_promo_codes (ticket DB).
 * @param {string} codeRaw
 * @param {number} amountRub — сумма до скидки (руб, decimal)
 * @returns {Promise<{ ok: boolean, error?: string, promo?: object, discountRub?: number, finalRub?: number }>}
 */
export async function validateGetbiletPromoForAmount(codeRaw, amountRub) {
  const code = typeof codeRaw === 'string' ? codeRaw.trim() : '';
  if (!code) {
    return { ok: false, error: 'Введите промокод' };
  }
  if (!Number.isFinite(amountRub) || amountRub < 0) {
    return { ok: false, error: 'Некорректная сумма' };
  }

  const r = await ticketPool.query(
    `SELECT id, code, discount_kind, discount_value, max_uses_total, uses_count,
            valid_from, valid_until, min_order_amount, is_active
     FROM getbilet_promo_codes
     WHERE lower(trim(code)) = lower(trim($1))`,
    [code]
  );
  if (!r.rows.length) {
    return { ok: false, error: 'Промокод не найден' };
  }
  const row = r.rows[0];
  if (!row.is_active) {
    return { ok: false, error: 'Промокод неактивен' };
  }
  const now = new Date();
  if (row.valid_from && new Date(row.valid_from) > now) {
    return { ok: false, error: 'Промокод ещё не действует' };
  }
  if (row.valid_until && new Date(row.valid_until) < now) {
    return { ok: false, error: 'Срок действия промокода истёк' };
  }
  if (row.max_uses_total != null && row.uses_count >= row.max_uses_total) {
    return { ok: false, error: 'Лимит использований промокода исчерпан' };
  }
  const minAmt = row.min_order_amount != null ? Number(row.min_order_amount) : null;
  if (minAmt != null && Number.isFinite(minAmt) && amountRub + 1e-9 < minAmt) {
    return { ok: false, error: `Минимальная сумма заказа: ${minAmt.toLocaleString('ru-RU')} ₽` };
  }

  const kind = row.discount_kind;
  const val = Number(row.discount_value);
  let discountRub = 0;
  if (kind === 'percent') {
    discountRub = (amountRub * val) / 100;
  } else if (kind === 'fixed') {
    discountRub = val;
  } else {
    return { ok: false, error: 'Некорректный тип скидки' };
  }
  if (!Number.isFinite(discountRub) || discountRub < 0) discountRub = 0;
  if (discountRub > amountRub) discountRub = amountRub;

  const finalRub = Math.max(0, Math.round((amountRub - discountRub) * 100) / 100);
  if (finalRub < 0.01) {
    return { ok: false, error: 'Сумма после скидки слишком мала' };
  }

  return {
    ok: true,
    promo: {
      id: row.id,
      code: row.code,
      discountKind: kind,
      discountValue: val,
    },
    discountRub: Math.round((amountRub - finalRub) * 100) / 100,
    finalRub,
  };
}

export async function incrementGetbiletPromoUses(promoId) {
  const id = Number(promoId);
  if (!Number.isFinite(id)) return;
  await ticketPool.query(
    `UPDATE getbilet_promo_codes SET uses_count = uses_count + 1, updated_at = NOW() WHERE id = $1`,
    [id]
  );
}
