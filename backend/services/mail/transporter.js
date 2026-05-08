import nodemailer from 'nodemailer';

let emailTransporter = null;

export function isMailConfigured() {
  return !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS);
}

/** Транзакционные письма (билеты, магик-линк): SMTP или UniSender, если заданы UNISENDER_API_KEY + SENDER_EMAIL */
export function isUniSenderMailConfigured() {
  return !!(process.env.UNISENDER_API_KEY?.trim() && process.env.SENDER_EMAIL?.trim());
}

function escapeHtmlPlain(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {{ to: string; subject: string; text: string; html?: string }} p
 * @returns {Promise<{ ok: boolean; via?: string; reason?: string }>}
 */
export async function sendTransactionalMail(p) {
  const toAddr = (p.to || '').trim();
  if (!toAddr) return { ok: false, reason: 'no_to' };
  const subject = p.subject || 'Уведомление';
  const text = p.text || '';
  const html = p.html || `<pre style="font-family:system-ui,sans-serif;white-space:pre-wrap">${escapeHtmlPlain(text)}</pre>`;

  if (isMailConfigured()) {
    try {
      const transporter = await getMailTransporter();
      await transporter.sendMail({
        from: mailFromAddress(),
        to: toAddr,
        subject,
        text,
        html,
      });
      return { ok: true, via: 'smtp' };
    } catch (e) {
      console.error('[mail] SMTP:', e instanceof Error ? e.message : e);
    }
  }

  if (isUniSenderMailConfigured()) {
    try {
      const { sendUniSenderEmail } = await import('../salesPipelineService.js');
      const senderName = process.env.SENDER_NAME || process.env.SITE_NAME || 'Уведомления';
      const senderEmail = process.env.SENDER_EMAIL?.trim() || '';
      const r = await sendUniSenderEmail(toAddr, subject, html, senderName, senderEmail);
      if (r.ok) return { ok: true, via: 'unisender' };
      return { ok: false, reason: r.reason || 'unisender_failed' };
    } catch (e) {
      console.error('[mail] UniSender:', e instanceof Error ? e.message : e);
      return { ok: false, reason: e instanceof Error ? e.message : 'unisender_error' };
    }
  }

  console.warn('[mail] Не настроены EMAIL_* (SMTP) и не заданы UNISENDER_API_KEY + SENDER_EMAIL — письмо не отправлено:', subject);
  return { ok: false, reason: 'no_mailer' };
}

export async function getMailTransporter() {
  if (emailTransporter) return emailTransporter;

  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT) || 587;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !user || !pass) {
    throw new Error(
      'Email transport is not configured. Provide EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS env variables.'
    );
  }

  const secure = String(process.env.EMAIL_SECURE || '').toLowerCase() === 'true' || port === 465;

  emailTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  return emailTransporter;
}

export function mailFromAddress() {
  return process.env.EMAIL_FROM || process.env.SENDER_EMAIL || process.env.EMAIL_USER;
}
