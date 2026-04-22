import nodemailer from 'nodemailer';

let emailTransporter = null;

export function isMailConfigured() {
  return !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS);
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
