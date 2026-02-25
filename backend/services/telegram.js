/**
 * Отправка уведомлений в Telegram
 * Требуется: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (или TELEGRAM_CHAT_IDS через запятую)
 */

const SITE_URL = process.env.SITE_URL || 'https://prime-coder.ru';

async function sendToTelegram(text, options = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatIds = process.env.TELEGRAM_CHAT_IDS?.split(',').map((s) => s.trim()).filter(Boolean)
    || (process.env.TELEGRAM_CHAT_ID ? [process.env.TELEGRAM_CHAT_ID] : []);

  if (!token || chatIds.length === 0) {
    if (process.env.NODE_ENV !== 'production') {
      // В dev не спамим
    }
    return;
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const payload = {
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...options,
  };

  for (const chatId of chatIds) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId.trim(), ...payload }),
      });
      if (!res.ok) {
        const err = await res.text();
        console.warn('[telegram] Send failed:', res.status, err);
      }
    } catch (e) {
      console.warn('[telegram] Error:', e.message);
    }
  }
}

/**
 * Отправить уведомление о новой заявке/событии в админку
 */
export async function notifyTelegram({ title, message, linkUrl, type = 'notification' }) {
  const link = linkUrl && linkUrl.startsWith('/') ? `${SITE_URL}${linkUrl}` : linkUrl;
  const text = link
    ? `<b>${escapeHtml(title)}</b>\n\n${escapeHtml(message || '')}\n\n<a href="${link}">Открыть →</a>`
    : `<b>${escapeHtml(title)}</b>\n\n${escapeHtml(message || '')}`;

  await sendToTelegram(text);
}

function escapeHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
