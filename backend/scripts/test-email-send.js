#!/usr/bin/env node
/**
 * Проверка отправки транзакционной почты (те же EMAIL_* / UniSender, что и в проде).
 *
 * Локально или на сервере:
 *   cd backend && node scripts/test-email-send.js
 *   cd backend && node scripts/test-email-send.js vladleo2020@gmail.com
 */

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  isMailConfigured,
  isUniSenderMailConfigured,
  mailFromAddress,
  sendTransactionalMail,
} from '../services/mail/transporter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const to = (process.argv[2] || 'vladleo2020@gmail.com').trim();

function mask(s) {
  if (!s) return '(не задано)';
  if (s.length <= 4) return '****';
  return `${s.slice(0, 2)}***${s.slice(-2)}`;
}

async function main() {
  console.log('=== Тест отправки почты ===\n');
  console.log('Получатель:', to);
  console.log('SMTP:', isMailConfigured() ? 'да' : 'нет');
  if (isMailConfigured()) {
    console.log('  EMAIL_HOST:', process.env.EMAIL_HOST);
    console.log('  EMAIL_PORT:', process.env.EMAIL_PORT || '587');
    console.log('  EMAIL_SECURE:', process.env.EMAIL_SECURE || '(auto)');
    console.log('  EMAIL_USER:', process.env.EMAIL_USER);
    console.log('  EMAIL_PASS:', mask(process.env.EMAIL_PASS));
    console.log('  From:', mailFromAddress());
  }
  console.log('UniSender:', isUniSenderMailConfigured() ? 'да (fallback)' : 'нет');

  if (!isMailConfigured() && !isUniSenderMailConfigured()) {
    console.error('\nОшибка: задайте EMAIL_HOST, EMAIL_USER, EMAIL_PASS в backend/.env');
    process.exit(1);
  }

  const site = process.env.SITE_NAME || 'Билеты всем';
  const subject = `${site}: тест почты ${new Date().toISOString().slice(0, 19)}`;
  const msk = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
  const text = [
    'Тестовое письмо с сервера pokupka-biletov.',
    '',
    `Время: ${msk} (МСК)`,
    `SMTP host: ${process.env.EMAIL_HOST || '—'}`,
    '',
    'Если письмо пришло — настройка EMAIL_* работает.',
  ].join('\n');

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;line-height:1.5">
      <h2 style="margin:0 0 12px">Тест почты</h2>
      <p>Письмо отправлено скриптом <code>test-email-send.js</code>.</p>
      <p><strong>${site}</strong></p>
      <p style="color:#666;font-size:13px">${msk} МСК</p>
    </div>`;

  console.log('\nОтправка…');
  const r = await sendTransactionalMail({ to, subject, text, html });

  if (r.ok) {
    console.log(`OK — отправлено через ${r.via || 'unknown'}`);
    console.log('Проверьте входящие и «Спам» у', to);
    process.exit(0);
  }

  console.error('Ошибка:', r.reason || 'unknown');
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
