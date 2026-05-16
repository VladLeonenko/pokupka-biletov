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

function loginUrl() {
  return `${siteUrl()}/auth/login`;
}

function accountBlockText({ customerName, loginEmail, initialPassword }) {
  return [
    `Личный кабинет`,
    `Вход: ${loginUrl()}`,
    `Email: ${loginEmail}`,
    `Пароль: ${initialPassword}`,
    `Сохраните пароль. Сменить — «Забыли пароль» на странице входа.`,
  ].join('\n');
}

function accountBlockHtml({ customerName, loginEmail, initialPassword }) {
  const login = loginUrl();
  return `
    <div style="margin: 0 0 24px; padding: 16px 18px; background: #f6f4f0; border-left: 3px solid #c45c2a;">
      <p style="margin: 0 0 10px; font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase; color: #888;">Личный кабинет</p>
      <p style="margin: 0 0 12px; font-size: 15px;">${customerName ? `Здравствуйте, ${escapeHtml(customerName)}. ` : ''}Для вас создан кабинет с историей заказов.</p>
      <table style="border-collapse: collapse; font-size: 15px; margin-bottom: 14px;">
        <tr><td style="padding: 4px 12px 4px 0; color: #666;">Email</td><td><strong>${escapeHtml(loginEmail)}</strong></td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #666;">Пароль</td><td><strong style="font-family: monospace; letter-spacing: 0.05em;">${escapeHtml(initialPassword)}</strong></td></tr>
      </table>
      <p style="margin: 0 0 12px;"><a href="${login}" style="display: inline-block; padding: 12px 22px; background: #c45c2a; color: #fff; text-decoration: none; border-radius: 2px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; font-size: 11px;">Войти в кабинет</a></p>
      <p style="margin: 0; font-size: 13px; color: #666;">Сохраните пароль. Сменить можно через «Забыли пароль» на странице входа.</p>
    </div>`;
}

/**
 * После оплаты билетного заказа — одно письмо: оплата + при необходимости данные ЛК.
 */
export async function sendTicketOrderPaidEmails(orderRow, { isNew, initialPassword, customerEmail }) {
  const to = (orderRow.customer_email || customerEmail || '').trim();
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
  const deliveryLine = ticketDeliveryPromiseLine();
  const showAccount = Boolean(isNew && initialPassword);
  const loginEmail = to;

  const subj = showAccount
    ? `${siteName()}: оплата и вход в кабинет — ${orderNumber}`
    : `${siteName()}: оплата получена — ${eventTitle}`;

  const textParts = [
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
    `Страница заказа: ${linkOrder}`,
  ];
  if (showAccount) {
    textParts.push(``, accountBlockText({ customerName: orderRow.customer_name, loginEmail, initialPassword }));
  }
  textParts.push(``, siteName());
  const text = textParts.join('\n');

  const accountHtml = showAccount
    ? accountBlockHtml({ customerName: orderRow.customer_name, loginEmail, initialPassword })
    : '';

  const html = `
    <div style="font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; line-height: 1.55; max-width: 560px;">
      <p style="margin: 0 0 8px; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: #888;">Оплата получена</p>
      <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 700;">${escapeHtml(eventTitle)}</h1>
      <table style="border-collapse: collapse; width: 100%; font-size: 15px; margin-bottom: 16px;">
        <tr><td style="padding: 6px 12px 6px 0; color: #666;">Заказ</td><td><strong>${escapeHtml(orderNumber)}</strong></td></tr>
        <tr><td style="padding: 6px 12px 6px 0; color: #666;">Места</td><td><strong>${escapeHtml(seats)}</strong></td></tr>
        <tr><td style="padding: 6px 12px 6px 0; color: #666;">Сумма</td><td><strong>${escapeHtml(formatMoney(orderRow.total_cents))}</strong></td></tr>
      </table>
      <p style="margin: 0 0 20px; font-size: 14px; color: #333;">${escapeHtml(deliveryLine)}</p>
      ${accountHtml}
      <p style="margin: 0 0 20px;"><a href="${linkOrder}" style="display: inline-block; padding: 12px 22px; background: #111; color: #fff; text-decoration: none; border-radius: 2px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; font-size: 11px;">Открыть заказ</a></p>
      <p style="margin: 0; font-size: 13px; color: #666;">Сохраните письмо — оно подтверждает оплату.</p>
      <p style="margin: 24px 0 0; font-size: 13px; color: #888;">${escapeHtml(siteName())}</p>
    </div>`;

  const r = await sendTransactionalMail({ to, subject: subj, text, html });
  if (!r.ok) console.warn('[ticketOrderMail] письмо об оплате:', r.reason);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
