import { getMailTransporter, isMailConfigured, mailFromAddress } from './transporter.js';

function siteName() {
  return process.env.SITE_NAME || process.env.SENDER_NAME || 'Покупка билетов';
}

function siteUrl() {
  return (process.env.SITE_URL || 'http://localhost:5173').replace(/\/$/, '');
}

function formatMoney(cents, currency = 'RUB') {
  if (cents == null) return '—';
  return `${(Number(cents) / 100).toFixed(2)} ${currency}`;
}

export async function sendOrderCreatedEmail({ to, order }) {
  if (!isMailConfigured() || !to) return;
  const transporter = await getMailTransporter();
  const from = mailFromAddress();
  const subject = `${siteName()}: заказ ${order.orderNumber} создан`;
  const link = `${siteUrl()}/orders/${encodeURIComponent(order.orderNumber)}`;
  const text = [
    `Здравствуйте!`,
    ``,
    `Ваш заказ ${order.orderNumber} создан.`,
    `Сумма: ${formatMoney(order.totalCents, order.currency)}`,
    ``,
    `Статус оплаты: ${order.paymentStatus || 'pending'}`,
    ``,
    `Страница заказа: ${link}`,
    ``,
    `${siteName()}`,
  ].join('\n');

  const html = `
    <div style="font-family: system-ui, sans-serif; color: #111; line-height: 1.5; max-width: 560px;">
      <h2 style="margin: 0 0 16px;">Заказ создан</h2>
      <p>Номер заказа: <strong>${order.orderNumber}</strong></p>
      <p>Сумма: <strong>${formatMoney(order.totalCents, order.currency)}</strong></p>
      <p>Статус оплаты: <strong>${order.paymentStatus || 'pending'}</strong></p>
      <p style="margin-top: 24px;"><a href="${link}" style="display: inline-block; padding: 10px 18px; background: #111827; color: #fff; text-decoration: none; border-radius: 8px;">Открыть заказ</a></p>
      <p style="color: #666; font-size: 13px; margin-top: 24px;">${siteName()}</p>
    </div>
  `;

  await transporter.sendMail({ from, to, subject, text, html });
}

export async function sendOrderStatusChangedEmail({ to, order, previousStatus, previousPaymentStatus }) {
  if (!isMailConfigured() || !to) return;
  const transporter = await getMailTransporter();
  const from = mailFromAddress();
  const subject = `${siteName()}: обновлён заказ ${order.orderNumber}`;
  const link = `${siteUrl()}/orders/${encodeURIComponent(order.orderNumber)}`;
  const text = [
    `Здравствуйте!`,
    ``,
    `По заказу ${order.orderNumber} изменились данные.`,
    `Статус заказа: ${previousStatus ?? '—'} → ${order.status}`,
    `Статус оплаты: ${previousPaymentStatus ?? '—'} → ${order.paymentStatus}`,
    ``,
    `Страница заказа: ${link}`,
    ``,
    `${siteName()}`,
  ].join('\n');

  const html = `
    <div style="font-family: system-ui, sans-serif; color: #111; line-height: 1.5; max-width: 560px;">
      <h2 style="margin: 0 0 16px;">Статус заказа изменился</h2>
      <p>Номер: <strong>${order.orderNumber}</strong></p>
      <table style="border-collapse: collapse; margin: 12px 0;">
        <tr><td style="padding: 4px 12px 4px 0; color: #666;">Статус заказа</td><td>${previousStatus ?? '—'} → <strong>${order.status}</strong></td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #666;">Статус оплаты</td><td>${previousPaymentStatus ?? '—'} → <strong>${order.paymentStatus}</strong></td></tr>
      </table>
      <p style="margin-top: 24px;"><a href="${link}" style="display: inline-block; padding: 10px 18px; background: #111827; color: #fff; text-decoration: none; border-radius: 8px;">Открыть заказ</a></p>
      <p style="color: #666; font-size: 13px; margin-top: 24px;">${siteName()}</p>
    </div>
  `;

  await transporter.sendMail({ from, to, subject, text, html });
}
