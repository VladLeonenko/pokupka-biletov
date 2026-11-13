/**
 * Технические письма снайперов — только операторам.
 * Письма о бронировании со ссылками на оплату сюда не ходят.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEDUPE_FILE = path.join(__dirname, '..', 'data', 'sniper-ops-dedupe.json');

export const OPS_EMAILS = ['info@prime-coder.ru', 'vladislav.leonenko@bk.ru'];

function claimDedupe(key, ttlMs) {
  if (!key) return true;
  let map = {};
  try { map = JSON.parse(fs.readFileSync(DEDUPE_FILE, 'utf8')); } catch { map = {}; }
  const now = Date.now();
  const prev = Number(map[key] || 0);
  if (prev && now - prev < ttlMs) return false;
  const next = {};
  for (const [k, t] of Object.entries(map)) {
    if (now - Number(t) < 7 * 24 * 3600_000) next[k] = t;
  }
  next[key] = now;
  fs.mkdirSync(path.dirname(DEDUPE_FILE), { recursive: true });
  fs.writeFileSync(DEDUPE_FILE, JSON.stringify(next));
  return true;
}

export async function notifyOps({ subject, text, dedupeKey, ttlMs = 10 * 60_000 }) {
  if (!claimDedupe(dedupeKey, ttlMs)) return { skipped: true };
  const title = String(subject || 'Снайпер').slice(0, 250);
  const message = String(text || '').slice(0, 4000);
  try {
    const { createNotification } = await import('../routes/notifications.js');
    await createNotification({
      userId: 0,
      type: 'sniper',
      title,
      message,
      linkUrl: '/admin/sniper',
      relatedEntityType: 'sniper',
    });
  } catch (e) {
    console.error('[sniper-ops] bell', e instanceof Error ? e.message : e);
  }
  try {
    const { sendTransactionalMail } = await import('./mail/transporter.js');
    await sendTransactionalMail({
      to: OPS_EMAILS.join(', '),
      subject: title,
      text: message,
    });
  } catch (e) {
    console.error('[sniper-ops] mail', e instanceof Error ? e.message : e);
  }
  return { ok: true };
}
