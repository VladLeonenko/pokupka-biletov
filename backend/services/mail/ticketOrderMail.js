import { sendTransactionalMail } from './transporter.js';

function siteName() {
  return process.env.SITE_NAME || process.env.SENDER_NAME || 'Покупка билетов';
}

function siteUrl() {
  return (process.env.SITE_URL || 'http://localhost:5173').replace(/\/$/, '');
}

function formatMoney(cents) {
  if (cents == null) return '—';
  return `${(Number(cents) / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ₽`;
}

/** Текст для клиента: срок отправки эл. билета (можно переопределить env). */
function ticketDeliveryPromiseLine() {
  return (
    process.env.TICKET_EMAIL_DELIVERY_PROMISE?.trim() ||
    'Электронный билет отправим на этот адрес в течение часа после подтверждения оплаты. Проверьте папку «Спам», если письма нет во «Входящих».'
  );
}

/**
 * После оплаты билетного заказа: приветствие в ЛК (+ ссылка входа для новых) и письмо с деталями заказа.
 */
export async function sendTicketOrderPaidEmails(orderRow, { isNew, rawMagicToken }) {
  const to = (orderRow.customer_email || '').trim();
  if (!to) return;

  const orderNumber = orderRow.order_number;
  const linkOrder = `${siteUrl()}/orders/${encodeURIComponent(orderNumber)}`;
  let meta = orderRow.payment_metadata;
  if (typeof meta === 'string') {
    try {
      meta = JSON.parse(meta);
    } catch {
      meta = {};
    }
  }
  if (!meta || typeof meta !== 'object') meta = {};
  const eventTitle = meta.eventTitle || 'Мероприятие';
  const seats = Array.isArray(meta.seats) ? meta.seats.join(', ') : String(meta.seats || '—');

  const loginLink = rawMagicToken
    ? `${siteUrl()}/auth/magic?token=${encodeURIComponent(rawMagicToken)}`
    : null;
  let accountMail = null;

  if (isNew && loginLink) {
    const subj1 = `${siteName()}: личный кабинет и заказ ${orderNumber}`;
    const text1 = [
      `Здравствуйте${orderRow.customer_name ? `, ${orderRow.customer_name}` : ''}!`,
      ``,
      `Мы создали для вас личный кабинет на ${siteName()}.`,
      `Войти по одноразовой ссылке (короткий срок действия):`,
      loginLink,
      ``,
      `Заказ: ${orderNumber}. Детали оплаты и заказ — в следующем письме и на странице заказа.`,
      `${ticketDeliveryPromiseLine()}`,
      ``,
      siteName(),
    ].join('\n');
    const html1 = `
      <div style="font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; line-height: 1.55; max-width: 560px;">
        <p style="margin: 0 0 16px; font-size: 15px;">Здравствуйте${orderRow.customer_name ? `, ${escapeHtml(orderRow.customer_name)}` : ''}.</p>
        <p style="margin: 0 0 16px; font-size: 15px;">Мы создали для вас личный кабинет — в нём будет история заказов и билеты.</p>
        <p style="margin: 0 0 20px;"><a href="${loginLink}" style="display: inline-block; padding: 12px 22px; background: #c45c2a; color: #fff; text-decoration: none; border-radius: 2px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; font-size: 11px;">Войти в кабинет</a></p>
        <p style="margin: 0; font-size: 13px; color: #666; word-break: break-all;">${escapeHtml(loginLink)}</p>
        <p style="margin: 16px 0 0; font-size: 14px; color: #444;">${escapeHtml(ticketDeliveryPromiseLine())}</p>
        <p style="margin: 24px 0 0; font-size: 13px; color: #888;">${escapeHtml(siteName())}</p>
      </div>`;
    accountMail = { subject: subj1, text: text1, html: html1 };
  }

  const subj2 = `${siteName()}: оплата получена — ${eventTitle}`;
  const deliveryLine = ticketDeliveryPromiseLine();
  const text2 = [
    `Здравствуйте${orderRow.customer_name ? `, ${orderRow.customer_name}` : ''}!`,
    ``,
    `Оплата прошла успешно.`,
    `Заказ: ${orderNumber}`,
    `Событие: ${eventTitle}`,
    `Места: ${seats}`,
    `Сумма: ${formatMoney(orderRow.total_cents)}`,
    ``,
    deliveryLine,
    ``,
    `Страница заказа (статус и детали): ${linkOrder}`,
    ``,
    `Если возникнут вопросы — ответьте на это письмо или напишите в поддержку сайта.`,
    ``,
    siteName(),
  ].join('\n');
  const html2 = `
    <div style="font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; line-height: 1.55; max-width: 560px;">
      <p style="margin: 0 0 8px; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: #888;">Оплата получена</p>
      <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 700;">${escapeHtml(eventTitle)}</h1>
      <table style="border-collapse: collapse; width: 100%; font-size: 15px; margin-bottom: 16px;">
        <tr><td style="padding: 6px 12px 6px 0; color: #666;">Заказ</td><td><strong>${escapeHtml(orderNumber)}</strong></td></tr>
        <tr><td style="padding: 6px 12px 6px 0; color: #666;">Места</td><td><strong>${escapeHtml(seats)}</strong></td></tr>
        <tr><td style="padding: 6px 12px 6px 0; color: #666;">Сумма</td><td><strong>${escapeHtml(formatMoney(orderRow.total_cents))}</strong></td></tr>
      </table>
      <p style="margin: 0 0 20px; font-size: 14px; color: #333;">${escapeHtml(deliveryLine)}</p>
      <p style="margin: 0 0 20px;"><a href="${linkOrder}" style="display: inline-block; padding: 12px 22px; background: #111; color: #fff; text-decoration: none; border-radius: 2px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; font-size: 11px;">Открыть заказ</a></p>
      <p style="margin: 0; font-size: 13px; color: #666;">Сохраните письмо — оно подтверждает оплату.</p>
      <p style="margin: 24px 0 0; font-size: 13px; color: #888;">${escapeHtml(siteName())}</p>
    </div>`;
  if (accountMail) {
    const rAcc = await sendTransactionalMail({
      to,
      subject: accountMail.subject,
      text: accountMail.text,
      html: accountMail.html,
    });
    if (!rAcc.ok) console.warn('[ticketOrderMail] письмо ЛК:', rAcc.reason);
  }
  const rPaid = await sendTransactionalMail({ to, subject: subj2, text: text2, html: html2 });
  if (!rPaid.ok) console.warn('[ticketOrderMail] письмо об оплате:', rPaid.reason);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
