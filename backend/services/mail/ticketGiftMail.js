import { sendTransactionalMail } from './transporter.js';

function siteName() {
  return process.env.SITE_NAME || process.env.SENDER_NAME || 'Покупка билетов';
}

function siteUrl() {
  return (process.env.SITE_URL || 'http://localhost:5173').replace(/\/$/, '');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function giftViewUrl(orderNumber, viewToken) {
  return `${siteUrl()}/gift/${encodeURIComponent(orderNumber)}?token=${encodeURIComponent(viewToken)}`;
}

/**
 * @param {Record<string, unknown>} orderRow
 * @param {Record<string, unknown>} gift
 * @param {Record<string, unknown>} paymentMeta
 */
export async function sendTicketGiftRecipientEmail(orderRow, gift, paymentMeta = {}) {
  const to = String(gift.recipientEmail || '').trim();
  if (!to) return { ok: false, reason: 'no_recipient' };

  const orderNumber = orderRow.order_number;
  const fromName = orderRow.customer_name?.trim() || 'Друг';
  const eventTitle = paymentMeta.eventTitle || 'Мероприятие';
  const seats = Array.isArray(paymentMeta.seats) ? paymentMeta.seats.join(', ') : String(paymentMeta.seats || '—');
  const sessionLabel = paymentMeta.sessionLabel?.trim() || null;
  const recipientName = gift.recipientName?.trim() || null;
  const message = gift.message?.trim() || null;
  const link = giftViewUrl(orderNumber, gift.viewToken);

  const greet = recipientName ? `${recipientName},` : 'Привет!';
  const subj = `${fromName} дарит вам билет — ${eventTitle}`;

  const text = [
    greet,
    '',
    `${fromName} оформил(а) для вас билет на «${eventTitle}».`,
    sessionLabel ? `Сеанс: ${sessionLabel}` : null,
    `Места: ${seats}`,
    message ? `\nСообщение:\n${message}` : null,
    '',
    'Электронный билет отправят на email покупателя после подтверждения оплаты — попросите переслать или встретитесь на входе.',
    '',
    `Подробности подарка: ${link}`,
    '',
    siteName(),
  ]
    .filter((line) => line != null)
    .join('\n');

  const html = `
    <div style="font-family: system-ui, sans-serif; color: #111; line-height: 1.55; max-width: 520px;">
      <p style="margin:0 0 8px;font-size:13px;color:#666">Подарок</p>
      <h1 style="margin:0 0 12px;font-size:22px">${escapeHtml(greet)}</h1>
      <p style="margin:0 0 16px"><strong>${escapeHtml(fromName)}</strong> оформил(а) для вас билет на «${escapeHtml(eventTitle)}».</p>
      ${sessionLabel ? `<p style="margin:0 0 8px"><span style="color:#666">Сеанс:</span> ${escapeHtml(sessionLabel)}</p>` : ''}
      <p style="margin:0 0 16px"><span style="color:#666">Места:</span> <strong>${escapeHtml(seats)}</strong></p>
      ${
        message
          ? `<blockquote style="margin:0 0 20px;padding:12px 16px;border-left:3px solid #ff4e18;background:#faf9f7;color:#333">${escapeHtml(message)}</blockquote>`
          : ''
      }
      <p style="margin:0 0 20px;font-size:14px;color:#444">Электронный билет придёт покупателю после оплаты — договоритесь, как удобнее передать его вам.</p>
      <p style="margin:0 0 24px"><a href="${escapeHtml(link)}" style="display:inline-block;background:#ff4e18;color:#fff;text-decoration:none;padding:12px 20px;font-weight:700;border-radius:2px">Открыть подарок</a></p>
      <p style="margin:0;font-size:12px;color:#888">${escapeHtml(siteName())}</p>
    </div>`;

  return sendTransactionalMail({ to, subject: subj, text, html });
}

/** @param {Record<string, unknown>} gift */
export function ticketGiftBuyerEmailNote(gift) {
  const who = gift.recipientName?.trim() || gift.recipientEmail;
  return `\n\nПодарок: мы отправили письмо получателю (${who}).`;
}

/** @param {Record<string, unknown>} gift */
export function ticketGiftBuyerEmailNoteHtml(gift) {
  const who = escapeHtml(gift.recipientName?.trim() || gift.recipientEmail || 'получателю');
  return `<p style="margin:16px 0 0;padding:12px 14px;background:#fff7ed;border:1px solid rgba(255,78,24,0.25);font-size:14px">Подарок оформлен — мы отправили письмо получателю (${who}).</p>`;
}
