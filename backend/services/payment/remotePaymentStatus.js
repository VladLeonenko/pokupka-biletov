import { tbankEacqGetState } from './tbankEacq.js';

/**
 * Запрос статуса оплаты у поставщика.
 */

function notConfigured() {
  return { state: 'pending', detail: 'provider_not_configured' };
}

export async function fetchGetbiletPaymentState(order) {
  const base = process.env.GETBILET_API_BASE;
  const key = process.env.GETBILET_API_KEY;
  const ref = order.external_payment_id || order.external_order_ref;
  if (!base || !key || !ref) return notConfigured();

  const url = `${base.replace(/\/$/, '')}/payments/${encodeURIComponent(ref)}/status`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
        ...(process.env.GETBILET_API_SECRET
          ? { 'X-Api-Secret': process.env.GETBILET_API_SECRET }
          : {}),
      },
    });
    if (!res.ok) {
      return { state: 'pending', detail: `http_${res.status}` };
    }
    const data = await res.json().catch(() => ({}));
    const paid =
      data?.status === 'paid' ||
      data?.paymentStatus === 'paid' ||
      data?.state === 'success' ||
      data?.paid === true;
    const failed =
      data?.status === 'failed' ||
      data?.paymentStatus === 'failed' ||
      data?.state === 'failed';

    const ticketRefs = [];
    if (Array.isArray(data?.tickets)) {
      for (const t of data.tickets) {
        const id = t?.id ?? t?.ticketId ?? t?.externalId;
        if (id) ticketRefs.push({ externalTicketId: String(id), orderItemId: t?.orderItemId ?? null, metadata: t });
      }
    }
    if (paid) return { state: 'paid', externalPaymentId: data?.paymentId ?? ref, ticketRefs };
    if (failed) return { state: 'failed', detail: data };
    return { state: 'pending', detail: data };
  } catch (e) {
    return { state: 'error', detail: e.message };
  }
}

export async function fetchProfticketPaymentState(order) {
  const base = process.env.PROFTICKET_API_BASE;
  const key = process.env.PROFTICKET_API_KEY;
  const ref = order.external_payment_id || order.external_order_ref;
  if (!base || !key || !ref) return notConfigured();

  const url = `${base.replace(/\/$/, '')}/api/v1/payments/${encodeURIComponent(ref)}`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      return { state: 'pending', detail: `http_${res.status}` };
    }
    const data = await res.json().catch(() => ({}));
    const paid = data?.paid === true || data?.status === 'paid' || data?.payment_status === 'paid';
    const failed = data?.status === 'failed' || data?.payment_status === 'failed';

    const ticketRefs = [];
    if (Array.isArray(data?.ticket_ids)) {
      for (const id of data.ticket_ids) {
        ticketRefs.push({ externalTicketId: String(id), orderItemId: null, metadata: {} });
      }
    }

    if (paid) return { state: 'paid', externalPaymentId: data?.id ?? ref, ticketRefs };
    if (failed) return { state: 'failed', detail: data };
    return { state: 'pending', detail: data };
  } catch (e) {
    return { state: 'error', detail: e.message };
  }
}

export async function fetchRemotePaymentState(order) {
  const p = (order.payment_provider || '').toLowerCase();
  if (!p || p === 'manual') return { state: 'unknown' };
  if (p === 'tbank' || p === 'tinkoff') return fetchTbankPaymentState(order);
  if (p === 'getbilet') return fetchGetbiletPaymentState(order);
  if (p === 'profticket') return fetchProfticketPaymentState(order);
  return { state: 'unknown' };
}

export async function fetchTbankPaymentState(order) {
  const ref = order.external_payment_id || order.external_order_ref;
  if (!ref) return notConfigured();
  try {
    const data = await tbankEacqGetState(ref);
    const status = String(data?.Status || '').toUpperCase();
    const success = data?.Success === true;
    if (success && (status === 'CONFIRMED' || status === 'AUTHORIZED')) {
      return { state: 'paid', externalPaymentId: String(data.PaymentId ?? ref), ticketRefs: [] };
    }
    if (['REJECTED', 'CANCELED', 'DEADLINE_EXPIRED', 'REFUNDED', 'PARTIAL_REFUNDED'].includes(status)) {
      return { state: 'failed', externalPaymentId: String(data.PaymentId ?? ref), detail: data };
    }
    return { state: 'pending', externalPaymentId: String(data?.PaymentId ?? ref), detail: data };
  } catch (e) {
    return { state: 'error', detail: e.message };
  }
}
