import { sendTransactionalMail, ticketOrderMailBcc } from './transporter.js';
import { extractFanIdFromOrder, parsePaymentMetadata } from '../../utils/orderFanId.js';
import { extractGiftFromPaymentMeta } from '../../utils/ticketGift.js';
import {
  sendTicketGiftRecipientEmail,
  ticketGiftBuyerEmailNote,
  ticketGiftBuyerEmailNoteHtml,
} from './ticketGiftMail.js';

function siteName() {
  return process.env.SITE_NAME || process.env.SENDER_NAME || 'Покупка билетов';
}

function siteUrl() {
  return (process.env.SITE_URL || 'http://localhost:5173').replace(/\/$/, '');
}

function formatMoney(cents, currency = 'RUB') {
  if (cents == null) return '—';
  const cur = String(currency || 'RUB').toUpperCase();
  const suffix = cur === 'RUB' ? '₽' : ` ${cur}`;
  return `${(Number(cents) / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}${suffix}`;
}

function formatRub(n) {
  if (n == null || Number.isNaN(Number(n))) return null;
  return `${Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ₽`;
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

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function paymentStatusRu(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'paid') return 'оплачен';
  if (s === 'pending') return 'ожидает оплаты';
  if (s === 'failed' || s === 'declined') return 'отклонён';
  if (s === 'canceled' || s === 'cancelled') return 'отменён';
  if (s === 'refunded') return 'возврат';
  return status || '—';
}

function paymentProviderRu(provider) {
  const p = String(provider || '').toLowerCase();
  if (p === 'tbank' || p === 'tinkoff') return 'Т‑Банк';
  if (p === 'yookassa') return 'ЮKassa';
  if (!p || p === 'unknown') return null;
  return provider;
}

function paymentMethodRu(method) {
  const m = String(method || '').toLowerCase();
  if (m === 'online') return 'Онлайн';
  if (!m) return null;
  return method;
}

function formatDateTimeRu(raw) {
  if (!raw) return null;
  const d = raw instanceof Date ? raw : new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw);
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Europe/Moscow',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

function paymentIdLast4(raw) {
  const s = String(raw || '').trim();
  if (s.length < 4) return null;
  return s.slice(-4);
}

function resolveSeatLines(meta) {
  if (Array.isArray(meta.seatLabels) && meta.seatLabels.length) {
    return meta.seatLabels.map((s) => String(s).trim()).filter(Boolean);
  }
  if (Array.isArray(meta.seats) && meta.seats.length) {
    return meta.seats.map((s) => String(s).trim()).filter(Boolean);
  }
  if (meta.seats != null && meta.seats !== '') return [String(meta.seats)];
  return [];
}

/**
 * Сводка заказа для текста и HTML (клиент + BCC ops). Без внутренних секретов (viewToken и т.п.).
 * @param {Record<string, unknown>} orderRow
 * @param {Record<string, unknown>} meta
 */
function buildOrderSummary(orderRow, meta) {
  const eventTitle = meta.eventTitle || 'Мероприятие';
  const venueLabel = meta.venueLabel ? String(meta.venueLabel).trim() : '';
  const sessionLabel = meta.sessionLabel ? String(meta.sessionLabel).trim() : '';
  const repertoireId = meta.repertoireId ? String(meta.repertoireId).trim() : '';
  const eventUrl = repertoireId ? `${siteUrl()}/ticket/${encodeURIComponent(repertoireId)}` : null;
  const seatLines = resolveSeatLines(meta);
  const fanId = extractFanIdFromOrder(orderRow);
  const gift = extractGiftFromPaymentMeta(meta);

  const currency = orderRow.currency || 'RUB';
  const createdAt = formatDateTimeRu(orderRow.created_at);
  const paidAt =
    String(orderRow.payment_status || '').toLowerCase() === 'paid'
      ? formatDateTimeRu(orderRow.updated_at)
      : null;

  const providerLabel = paymentProviderRu(orderRow.payment_provider);
  const methodLabel = paymentMethodRu(orderRow.payment_method);
  const payIdTail = paymentIdLast4(orderRow.external_payment_id);

  const promoCode = meta.promoCode ? String(meta.promoCode).trim() : '';
  const discountRub =
    meta.discountRub != null && Number(meta.discountRub) > 0 ? Number(meta.discountRub) : null;
  const baseRub = meta.baseRub != null ? Number(meta.baseRub) : null;

  /** @type {{ label: string, value: string }[]} */
  const orderRows = [];
  orderRows.push({ label: 'Номер заказа', value: String(orderRow.order_number || '—') });
  if (orderRow.id != null) orderRows.push({ label: 'ID', value: String(orderRow.id) });
  if (createdAt) orderRows.push({ label: 'Создан', value: createdAt });

  /** @type {{ label: string, value: string }[]} */
  const eventRows = [];
  eventRows.push({ label: 'Событие', value: eventTitle });
  if (venueLabel) eventRows.push({ label: 'Площадка', value: venueLabel });
  if (sessionLabel) eventRows.push({ label: 'Дата и время', value: sessionLabel });
  if (eventUrl) eventRows.push({ label: 'Страница', value: eventUrl });

  /** @type {{ label: string, value: string }[]} */
  const buyerRows = [];
  if (orderRow.customer_name) buyerRows.push({ label: 'ФИО', value: String(orderRow.customer_name) });
  if (orderRow.customer_email) buyerRows.push({ label: 'Email', value: String(orderRow.customer_email) });
  if (orderRow.customer_phone) buyerRows.push({ label: 'Телефон', value: String(orderRow.customer_phone) });
  if (fanId) buyerRows.push({ label: 'FAN ID', value: fanId });

  /** @type {{ label: string, value: string }[]} */
  const moneyRows = [];
  if (baseRub != null && discountRub != null) {
    moneyRows.push({ label: 'Сумма без скидки', value: formatRub(baseRub) || '—' });
  }
  if (promoCode) moneyRows.push({ label: 'Промокод', value: promoCode });
  if (discountRub != null) moneyRows.push({ label: 'Скидка', value: formatRub(discountRub) || '—' });
  moneyRows.push({ label: 'Итого', value: formatMoney(orderRow.total_cents, currency) });

  /** @type {{ label: string, value: string }[]} */
  const payRows = [];
  if (orderRow.payment_status) {
    payRows.push({ label: 'Статус оплаты', value: paymentStatusRu(orderRow.payment_status) });
  }
  if (methodLabel) payRows.push({ label: 'Способ', value: methodLabel });
  if (providerLabel) payRows.push({ label: 'Платёжная система', value: providerLabel });
  if (paidAt) payRows.push({ label: 'Оплачен', value: paidAt });
  if (payIdTail) payRows.push({ label: 'ID платежа (посл. 4)', value: `…${payIdTail}` });

  /** @type {{ label: string, value: string }[]} */
  const giftRows = [];
  if (gift) {
    if (gift.recipientName) giftRows.push({ label: 'Получатель', value: String(gift.recipientName) });
    if (gift.recipientEmail) giftRows.push({ label: 'Email получателя', value: String(gift.recipientEmail) });
    if (gift.message) giftRows.push({ label: 'Сообщение', value: String(gift.message) });
  }

  return {
    eventTitle,
    seatLines,
    orderRows,
    eventRows,
    buyerRows,
    moneyRows,
    payRows,
    giftRows,
    gift,
  };
}

function sectionText(title, rows) {
  if (!rows.length) return [];
  return [title, ...rows.map((r) => `${r.label}: ${r.value}`), ``];
}

function seatsText(seatLines) {
  if (!seatLines.length) return [`Места: —`, ``];
  if (seatLines.length === 1) return [`Места: ${seatLines[0]}`, ``];
  return [`Места:`, ...seatLines.map((s, i) => `  ${i + 1}. ${s}`), ``];
}

function summaryText(summary) {
  return [
    ...sectionText('Заказ', summary.orderRows),
    ...sectionText('Событие', summary.eventRows),
    ...sectionText('Покупатель', summary.buyerRows),
    ...seatsText(summary.seatLines),
    ...sectionText('Сумма', summary.moneyRows),
    ...sectionText('Оплата', summary.payRows),
    ...(summary.giftRows.length ? sectionText('Подарок', summary.giftRows) : []),
  ].join('\n');
}

function rowsHtml(rows) {
  return rows
    .map(
      (r) =>
        `<tr><td style="padding: 6px 12px 6px 0; color: #666; vertical-align: top; white-space: nowrap;">${escapeHtml(r.label)}</td><td style="padding: 6px 0;"><strong>${escapeHtml(r.value)}</strong></td></tr>`,
    )
    .join('');
}

function sectionHtml(title, rows) {
  if (!rows.length) return '';
  return `
    <p style="margin: 18px 0 6px; font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase; color: #888;">${escapeHtml(title)}</p>
    <table style="border-collapse: collapse; width: 100%; font-size: 15px; margin-bottom: 4px;">
      ${rowsHtml(rows)}
    </table>`;
}

function seatsHtml(seatLines) {
  if (!seatLines.length) {
    return sectionHtml('Места', [{ label: 'Места', value: '—' }]);
  }
  if (seatLines.length === 1) {
    return sectionHtml('Места', [{ label: 'Места', value: seatLines[0] }]);
  }
  const list = seatLines
    .map((s) => `<li style="margin: 0 0 4px;">${escapeHtml(s)}</li>`)
    .join('');
  return `
    <p style="margin: 18px 0 6px; font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase; color: #888;">Места</p>
    <ol style="margin: 0 0 8px; padding-left: 20px; font-size: 15px;">${list}</ol>`;
}

function summaryHtml(summary) {
  return [
    sectionHtml('Заказ', summary.orderRows),
    sectionHtml('Событие', summary.eventRows),
    sectionHtml('Покупатель', summary.buyerRows),
    seatsHtml(summary.seatLines),
    sectionHtml('Сумма', summary.moneyRows),
    sectionHtml('Оплата', summary.payRows),
    summary.giftRows.length ? sectionHtml('Подарок', summary.giftRows) : '',
  ].join('');
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
 * До оплаты: бронь только у нас — подтверждение заказа и ссылка на оплату.
 */
export async function sendTicketOrderReservedEmail(orderRow, { paymentUrl } = {}) {
  const to = (orderRow.customer_email || '').trim();
  if (!to) return { ok: false, reason: 'no_email' };

  const orderNumber = orderRow.order_number;
  const linkOrder = `${siteUrl()}/orders/${encodeURIComponent(orderNumber)}`;
  const meta = parsePaymentMetadata(orderRow.payment_metadata) || {};
  const summary = buildOrderSummary(orderRow, meta);
  const payLink = (paymentUrl || orderRow.payment_checkout_url || '').trim();

  const subj = `${siteName()}: бронь сохранена — ${summary.eventTitle}`;
  const textParts = [
    `Здравствуйте${orderRow.customer_name ? `, ${orderRow.customer_name}` : ''}!`,
    ``,
    `Мы сохранили вашу бронь в нашей системе.`,
    ``,
    summaryText(summary).trimEnd(),
    ``,
    `Оплатите заказ, чтобы мы забронировали места у билетного оператора.`,
    payLink ? `Оплатить: ${payLink}` : `Страница заказа: ${linkOrder}`,
    ``,
    siteName(),
  ];
  const text = textParts.join('\n');

  const html = `
    <div style="font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; line-height: 1.55; max-width: 560px;">
      <p style="margin: 0 0 8px; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: #888;">Бронь сохранена</p>
      <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 700;">${escapeHtml(summary.eventTitle)}</h1>
      ${summaryHtml(summary)}
      <p style="margin: 20px 0 20px; font-size: 14px; color: #333;">Оплатите заказ — после оплаты мы забронируем места у билетного оператора и пришлём подтверждение.</p>
      <p style="margin: 0 0 20px;"><a href="${escapeHtml(payLink || linkOrder)}" style="display: inline-block; padding: 12px 22px; background: #111; color: #fff; text-decoration: none; border-radius: 2px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; font-size: 11px;">${payLink ? 'Оплатить' : 'Открыть заказ'}</a></p>
      <p style="margin: 0; font-size: 13px; color: #666;">Пока оплата не прошла, бронь у оператора не создаётся.</p>
      <p style="margin: 24px 0 0; font-size: 13px; color: #888;">${escapeHtml(siteName())}</p>
    </div>`;

  const r = await sendTransactionalMail({ to, subject: subj, text, html, bcc: ticketOrderMailBcc() });
  if (!r.ok) console.warn('[ticketOrderMail] письмо о брони:', r.reason);
  return r;
}

/**
 * После оплаты билетного заказа — одно письмо: оплата + при необходимости данные ЛК.
 */
export async function sendTicketOrderPaidEmails(orderRow, { isNew, initialPassword, customerEmail }) {
  const to = (orderRow.customer_email || customerEmail || '').trim();
  if (!to) return;

  const orderNumber = orderRow.order_number;
  const linkOrder = `${siteUrl()}/orders/${encodeURIComponent(orderNumber)}`;
  const meta = parsePaymentMetadata(orderRow.payment_metadata) || {};
  const summary = buildOrderSummary(orderRow, meta);
  const gift = summary.gift;
  const deliveryLine = ticketDeliveryPromiseLine();
  const showAccount = Boolean(isNew && initialPassword);
  const loginEmail = to;

  const subj = showAccount
    ? `${siteName()}: оплата и вход в кабинет — ${orderNumber}`
    : `${siteName()}: оплата получена — ${summary.eventTitle}`;

  const textParts = [
    `Здравствуйте${orderRow.customer_name ? `, ${orderRow.customer_name}` : ''}!`,
    ``,
    `Оплата прошла успешно.`,
    ``,
    summaryText(summary).trimEnd(),
    ``,
    deliveryLine,
    ``,
    `Страница заказа: ${linkOrder}`,
  ];
  if (showAccount) {
    textParts.push(``, accountBlockText({ customerName: orderRow.customer_name, loginEmail, initialPassword }));
  }
  if (gift) {
    textParts.push(ticketGiftBuyerEmailNote(gift));
  }
  textParts.push(``, siteName());
  const text = textParts.join('\n');

  const accountHtml = showAccount
    ? accountBlockHtml({ customerName: orderRow.customer_name, loginEmail, initialPassword })
    : '';

  const html = `
    <div style="font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; line-height: 1.55; max-width: 560px;">
      <p style="margin: 0 0 8px; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: #888;">Оплата получена</p>
      <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 700;">${escapeHtml(summary.eventTitle)}</h1>
      ${summaryHtml(summary)}
      <p style="margin: 20px 0 20px; font-size: 14px; color: #333;">${escapeHtml(deliveryLine)}</p>
      ${accountHtml}
      ${gift ? ticketGiftBuyerEmailNoteHtml(gift) : ''}
      <p style="margin: 0 0 20px;"><a href="${linkOrder}" style="display: inline-block; padding: 12px 22px; background: #111; color: #fff; text-decoration: none; border-radius: 2px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; font-size: 11px;">Открыть заказ</a></p>
      <p style="margin: 0; font-size: 13px; color: #666;">Сохраните письмо — оно подтверждает оплату.</p>
      <p style="margin: 24px 0 0; font-size: 13px; color: #888;">${escapeHtml(siteName())}</p>
    </div>`;

  const r = await sendTransactionalMail({ to, subject: subj, text, html, bcc: ticketOrderMailBcc() });
  if (!r.ok) console.warn('[ticketOrderMail] письмо об оплате:', r.reason);

  if (gift) {
    const gr = await sendTicketGiftRecipientEmail(orderRow, gift, meta);
    if (!gr.ok) console.warn('[ticketOrderMail] письмо получателю подарка:', gr.reason);
  }
}
