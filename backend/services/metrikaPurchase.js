import pool from '../db.js';

const COUNTER_ID = process.env.YANDEX_COUNTER_ID || '109119282';
const PURCHASE_GOAL = 'purchase';

function parseMeta(row) {
  const raw = row?.payment_metadata;
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function csvField(value) {
  const s = String(value ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function buildOfflineConversionCsv({ idColumn, idValue, goal, unixSeconds, price, currency }) {
  const header = `${idColumn},Target,DateTime,Price,Currency`;
  const line = [idValue, goal, unixSeconds, price, currency].map(csvField).join(',');
  return `${header}\n${line}\n`;
}

function conversionUnix(date) {
  const now = Math.floor(Date.now() / 1000) - 1;
  const ts = Math.floor(new Date(date || Date.now()).getTime() / 1000);
  if (!Number.isFinite(ts) || ts <= 0) return now;
  return Math.min(ts, now);
}

async function uploadOfflineConversion({ clientIdType, idValue, priceRub, date }) {
  const token = process.env.YANDEX_TOKEN;
  if (!token) return { ok: false, reason: 'no_token' };

  const idColumn = clientIdType === 'YCLID' ? 'Yclid' : 'ClientId';
  const price = Number(priceRub);
  const csv = buildOfflineConversionCsv({
    idColumn,
    idValue,
    goal: PURCHASE_GOAL,
    unixSeconds: conversionUnix(date),
    price: Number.isFinite(price) ? price.toFixed(2) : '0.00',
    currency: 'RUB',
  });

  const form = new FormData();
  form.append('file', new Blob([csv], { type: 'text/csv' }), 'purchase.csv');
  const url =
    `https://api-metrika.yandex.net/management/v1/counter/${COUNTER_ID}` +
    `/offline_conversions/upload?client_id_type=${clientIdType}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `OAuth ${token}` },
    body: form,
  });
  const text = await res.text();
  if (!res.ok) {
    return { ok: false, reason: `http_${res.status}`, detail: text.slice(0, 240) };
  }
  return { ok: true, uploaded: true, detail: text.slice(0, 240) };
}

async function claimSend(orderId, via) {
  const r = await pool.query(
    `UPDATE orders
     SET payment_metadata = jsonb_set(
       COALESCE(payment_metadata, '{}'::jsonb),
       '{ymPurchaseSentAt}',
       to_jsonb($2::text),
       true
     )
     WHERE id = $1
       AND COALESCE(payment_metadata->>'ymPurchaseSentAt', '') = ''
     RETURNING id`,
    [orderId, `${via}:${new Date().toISOString()}`],
  );
  return r.rowCount > 0;
}

async function releaseSend(orderId) {
  await pool.query(
    `UPDATE orders
     SET payment_metadata = COALESCE(payment_metadata, '{}'::jsonb) - 'ymPurchaseSentAt'
     WHERE id = $1`,
    [orderId],
  );
}

export async function saveMetrikaIds(orderId, { ymClientId, yclid } = {}) {
  let expr = `COALESCE(payment_metadata, '{}'::jsonb)`;
  const params = [orderId];
  // Не затираем id с посадки (клик Директа) id из вебвью банка.
  if (ymClientId) {
    params.push(ymClientId);
    expr = `CASE WHEN COALESCE(${expr}->>'ymClientId', '') = '' THEN jsonb_set(${expr}, '{ymClientId}', to_jsonb($${params.length}::text), true) ELSE ${expr} END`;
  }
  if (yclid) {
    params.push(yclid);
    expr = `CASE WHEN COALESCE(${expr}->>'yclid', '') = '' THEN jsonb_set(${expr}, '{yclid}', to_jsonb($${params.length}::text), true) ELSE ${expr} END`;
  }
  if (params.length === 1) return;
  await pool.query(
    `UPDATE orders
     SET payment_metadata = ${expr}
     WHERE id = $1
       AND COALESCE(payment_metadata->>'ymPurchaseSentAt', '') = ''`,
    params,
  );
}

export async function markBrowserPurchaseSent(orderId) {
  return claimSend(orderId, 'browser');
}

/**
 * Офлайн-конверсия цели purchase. Идемпотентно: повтор webhook не удваивает цель.
 * Без ClientID / yclid Метрика конверсию не примет — тогда её шлёт браузер со страницы заказа.
 */
export async function reportMetrikaPurchase(orderRow) {
  if (!orderRow?.id) return { ok: false, reason: 'no_order' };

  const freshRes = await pool.query('SELECT * FROM orders WHERE id = $1', [orderRow.id]);
  const row = freshRes.rows[0] || orderRow;
  const paid = row.payment_status === 'paid' || row.status === 'paid' || row.status === 'completed';
  if (!paid) return { ok: false, reason: 'not_paid' };

  const meta = parseMeta(row);
  if (meta.ymPurchaseSentAt) return { ok: true, already: true };

  const clientId = String(meta.ymClientId || '').trim();
  const yclid = String(meta.yclid || '').trim();
  const clientOk = /^\d{6,32}$/.test(clientId);
  const yclidOk = /^[A-Za-z0-9_-]{6,128}$/.test(yclid);
  if (!clientOk && !yclidOk) return { ok: false, reason: 'no_client_id' };

  const claimed = await claimSend(row.id, 'upload');
  if (!claimed) return { ok: true, already: true };

  const uploaded = await uploadOfflineConversion({
    clientIdType: yclidOk ? 'YCLID' : 'CLIENT_ID',
    idValue: yclidOk ? yclid : clientId,
    priceRub: Number(row.total_cents || 0) / 100,
    date: row.updated_at || new Date(),
  });
  if (!uploaded.ok) {
    await releaseSend(row.id);
    console.warn(
      '[metrika] purchase upload failed',
      row.order_number,
      uploaded.reason,
      uploaded.detail || '',
    );
    return uploaded;
  }

  console.log('[metrika] purchase uploaded', row.order_number, yclidOk ? 'yclid' : 'client');
  return { ok: true, uploaded: true };
}
