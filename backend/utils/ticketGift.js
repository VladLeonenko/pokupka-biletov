import crypto from 'node:crypto';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @param {unknown} body
 * @returns {null | {
 *   isGift: true;
 *   recipientEmail: string;
 *   recipientName: string | null;
 *   message: string | null;
 *   viewToken: string;
 * }}
 */
export function parseTicketGiftFromCheckoutBody(body) {
  const b = body && typeof body === 'object' ? body : {};
  const raw = b.gift && typeof b.gift === 'object' ? b.gift : b;
  const isGift = raw.isGift === true || raw.is_gift === true || b.isGift === true;
  if (!isGift) return null;

  const recipientEmail = String(raw.recipientEmail ?? raw.recipient_email ?? '').trim().toLowerCase();
  if (!EMAIL_RE.test(recipientEmail)) {
    throw new Error('Укажите корректный email получателя');
  }

  const recipientName = String(raw.recipientName ?? raw.recipient_name ?? '').trim().slice(0, 120) || null;
  const message = String(raw.message ?? raw.giftMessage ?? '').trim().slice(0, 500) || null;
  const viewToken = crypto.randomBytes(18).toString('hex');

  return {
    isGift: true,
    recipientEmail,
    recipientName,
    message,
    viewToken,
  };
}

/** @param {unknown} paymentMetadata */
export function extractGiftFromPaymentMeta(paymentMetadata) {
  let meta = paymentMetadata;
  if (typeof meta === 'string') {
    try {
      meta = JSON.parse(meta);
    } catch {
      return null;
    }
  }
  if (!meta || typeof meta !== 'object') return null;
  const gift = meta.gift;
  if (!gift || typeof gift !== 'object' || gift.isGift !== true) return null;
  return gift;
}
