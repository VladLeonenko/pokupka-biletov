import { sendTransactionalMail } from './transporter.js';

function siteName() {
  return process.env.SITE_NAME || process.env.SENDER_NAME || 'Покупка билетов';
}

function siteUrl() {
  return (process.env.SITE_URL || 'http://localhost:5173').replace(/\/$/, '');
}

export async function sendVerificationCodeEmail(email, code) {
  const subject = `Код подтверждения ${siteName()}`;
  const plainText = `Здравствуйте!\n\nВаш код подтверждения: ${code}\nКод действует 10 минут.\n\nЕсли вы не запрашивали регистрацию, проигнорируйте это сообщение.`;
  const html = `
    <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.5;">
      <h2 style="margin-bottom: 16px;">Код подтверждения ${siteName()}</h2>
      <p style="margin: 0 0 12px;">Здравствуйте!</p>
      <p style="margin: 0 0 12px;">Ваш код подтверждения:</p>
      <div style="display: inline-block; padding: 12px 20px; border-radius: 8px; background: #111827; color: #ffffff; font-size: 24px; letter-spacing: 6px;">
        ${code}
      </div>
      <p style="margin: 20px 0 12px;">Код действует в течение 10 минут.</p>
      <p style="margin: 0;">Если вы не запрашивали регистрацию, просто проигнорируйте это письмо.</p>
    </div>
  `;

  const r = await sendTransactionalMail({ to: email, subject, text: plainText, html });
  if (!r.ok) throw new Error(r.reason || 'Email not configured');
}

export async function sendMagicLinkEmail(email, rawToken) {
  const link = `${siteUrl()}/auth/magic?token=${encodeURIComponent(rawToken)}`;
  const subject = `Вход в личный кабинет — ${siteName()}`;
  const text = [
    `Здравствуйте!`,
    ``,
    `Чтобы войти в личный кабинет, перейдите по ссылке (действует ограниченное время):`,
    link,
    ``,
    `Если вы не запрашивали вход, проигнорируйте письмо.`,
    ``,
    siteName(),
  ].join('\n');
  const html = `
    <div style="font-family: system-ui, sans-serif; color: #111; line-height: 1.5; max-width: 560px;">
      <h2 style="margin: 0 0 16px;">Вход по ссылке</h2>
      <p>Нажмите кнопку ниже, чтобы войти в личный кабинет.</p>
      <p style="margin-top: 24px;"><a href="${link}" style="display: inline-block; padding: 10px 18px; background: #111827; color: #fff; text-decoration: none; border-radius: 8px;">Войти</a></p>
      <p style="color: #666; font-size: 13px; word-break: break-all;">${link}</p>
      <p style="color: #666; font-size: 13px; margin-top: 24px;">${siteName()}</p>
    </div>
  `;
  const r = await sendTransactionalMail({ to: email, subject, text, html });
  if (!r.ok) throw new Error(r.reason || 'Email not configured');
}

export async function sendPasswordResetEmail(email, rawToken) {
  const link = `${siteUrl()}/auth/reset-password?token=${encodeURIComponent(rawToken)}`;
  const subject = `Сброс пароля — ${siteName()}`;
  const text = [
    `Здравствуйте!`,
    ``,
    `Чтобы задать новый пароль, перейдите по ссылке:`,
    link,
    ``,
    `Если вы не запрашивали сброс, проигнорируйте письмо.`,
    ``,
    siteName(),
  ].join('\n');
  const html = `
    <div style="font-family: system-ui, sans-serif; color: #111; line-height: 1.5; max-width: 560px;">
      <h2 style="margin: 0 0 16px;">Сброс пароля</h2>
      <p>Нажмите кнопку ниже, чтобы задать новый пароль.</p>
      <p style="margin-top: 24px;"><a href="${link}" style="display: inline-block; padding: 10px 18px; background: #111827; color: #fff; text-decoration: none; border-radius: 8px;">Сбросить пароль</a></p>
      <p style="color: #666; font-size: 13px; word-break: break-all;">${link}</p>
      <p style="color: #666; font-size: 13px; margin-top: 24px;">${siteName()}</p>
    </div>
  `;
  const r = await sendTransactionalMail({ to: email, subject, text, html });
  if (!r.ok) throw new Error(r.reason || 'Email not configured');
}
