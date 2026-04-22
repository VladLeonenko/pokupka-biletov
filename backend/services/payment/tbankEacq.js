import crypto from 'crypto';

const EXCLUDED_KEYS = new Set(['Token', 'Receipt', 'DATA', 'Shops']);

/**
 * Токен T-Bank / Tinkoff EACQ v2 (корневые поля, без вложенных объектов).
 * @see https://developer.tbank.ru/eacq/intro/developer/token
 */
export function buildTbankEacqToken(params, password) {
  const pairs = [];
  for (const [k, v] of Object.entries(params)) {
    if (EXCLUDED_KEYS.has(k)) continue;
    if (v !== null && typeof v === 'object') continue;
    if (v === undefined) continue;
    pairs.push([k, String(v)]);
  }
  pairs.push(['Password', password]);
  pairs.sort((a, b) => a[0].localeCompare(b[0]));
  const concatenated = pairs.map(([, val]) => val).join('');
  return crypto.createHash('sha256').update(concatenated, 'utf8').digest('hex');
}

function getTerminalAndPassword() {
  const terminalKey = process.env.TBANK_TERMINAL_KEY?.trim() || process.env.TINKOFF_TERMINAL_KEY?.trim();
  const password = process.env.TBANK_PASSWORD?.trim() || process.env.TINKOFF_PASSWORD?.trim();
  return { terminalKey, password };
}

export function isTbankEacqConfigured() {
  const { terminalKey, password } = getTerminalAndPassword();
  return Boolean(terminalKey && password);
}

/**
 * Инициализация оплаты (редирект на шлюз).
 * amountKopecks — целое число копеек.
 */
export async function tbankEacqInit({
  amountKopecks,
  orderId,
  description,
  successUrl,
  failUrl,
  notificationUrl,
  email,
  phone,
}) {
  const { terminalKey, password } = getTerminalAndPassword();
  if (!terminalKey || !password) {
    throw new Error('TBANK_TERMINAL_KEY и TBANK_PASSWORD не заданы в окружении');
  }

  const baseUrl = (process.env.TBANK_EACQ_BASE_URL || 'https://securepay.tinkoff.ru/v2').replace(/\/$/, '');
  const root = {
    TerminalKey: terminalKey,
    Amount: String(amountKopecks),
    OrderId: String(orderId),
    Description: String(description || 'Оплата билетов').slice(0, 250),
    SuccessURL: successUrl,
    FailURL: failUrl,
    NotificationURL: notificationUrl,
  };
  if (email && String(email).trim()) {
    root.Email = String(email).trim().slice(0, 100);
  }
  if (phone && String(phone).trim()) {
    root.Phone = String(phone).replace(/\s+/g, ' ').trim().slice(0, 18);
  }

  const Token = buildTbankEacqToken(root, password);
  const body = { ...root, Token };

  const res = await fetch(`${baseUrl}/Init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg = data && typeof data === 'object' && data.Message ? String(data.Message) : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  if (!data || data.Success !== true) {
    const msg = data && data.Message ? String(data.Message) : 'Init отклонён';
    throw new Error(msg);
  }
  const paymentUrl = data.PaymentURL || data.PaymentUrl;
  const paymentId = data.PaymentId != null ? String(data.PaymentId) : null;
  if (!paymentUrl) {
    throw new Error('Нет PaymentURL в ответе Init');
  }
  return { paymentUrl, paymentId, raw: data };
}

/**
 * Проверка токена входящего уведомления (Notification).
 */
export function verifyTbankNotificationToken(body) {
  const { terminalKey, password } = getTerminalAndPassword();
  if (!terminalKey || !password || !body || typeof body !== 'object') return false;
  const incoming = String(body.Token || '');
  if (!incoming) return false;

  const flat = { ...body };
  delete flat.Token;
  const recomputed = buildTbankEacqToken(flat, password);
  return recomputed.toLowerCase() === incoming.toLowerCase();
}
