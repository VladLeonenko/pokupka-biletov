// Браузерный монитор Intickets (Театр Пушкина, «Опера нищих»).
// Поллит сеансы, при появлении свободных пар мест — бронирует и шлёт ссылку на оплату.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { seanceUrl, launchCtx, readSeats, findPairs, clickSeatAt, clickBuy, waitPaymentUrl } from './services/inticketsBooking.js';
import { sendTransactionalMail } from './services/mail/transporter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const RESULTS_FILE = path.join(__dirname, 'data', 'intickets-results.json');
const CONTACTS_FILE = path.join(__dirname, 'sniper-contacts.json');
const NOTIFY_EMAIL = (process.env.INTICKETS_NOTIFY_EMAIL || 'vladislav.leonenko@bk.ru,leonenkovlad2018@yandex.ru,gyrodin@mail.ru,iosif131999@gmail.com').trim();
const BCC = process.env.INTICKETS_BCC || 'yaguda_io@mail.ru';

// Сеансы «Оперы нищих» (id в Intickets). Ноябрь/декабрь добавляются по мере открытия продаж.
const SEANCES = [
  { id: '72420789', label: '13 октября' },
  { id: '72420791', label: '14 октября' },
  { id: '72420793', label: '15 октября' },
];

function loadContacts() {
  const p = path.resolve(__dirname, CONTACTS_FILE);
  const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
  return data.map((c) => ({ name: String(c.name || '').trim(), email: String(c.email || '').trim(), phone: String(c.phone || '').trim() }))
    .filter((c) => c.name && c.email);
}

function saveResult(rec) {
  fs.mkdirSync(path.dirname(RESULTS_FILE), { recursive: true });
  let list = [];
  try { list = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8')); } catch {}
  list.push(rec);
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(list, null, 2));
}

async function notify(rec) {
  const lines = (rec.results || []).map((r) => `${r.name || '—'} (${r.email || '—'})${r.phone ? ' · ' + r.phone : ''} | ${r.seats} | ${r.totalPrice} ₽ | ${r.paymentUrl}`);
  const text = [
    `Событие: Опера нищих (Театр Пушкина)`,
    `Сеанс: ${rec.label}`,
    `Забронировано: ${(rec.results || []).length} заказов`,
    '',
    'Ссылки на оплату:',
    ...lines.map((l) => '  ' + l),
    '',
    'Сгенерировано снайпером biletvsem (Intickets).',
  ].join('\n');
  return sendTransactionalMail({ to: NOTIFY_EMAIL, subject: `🎭 Опера нищих: забронировано ${(rec.results || []).length}`, text, bcc: BCC });
}

const contacts = loadContacts();
console.log(`Контактов: ${contacts.length}. Сеансов: ${SEANCES.length}.`);
if (!contacts.length) { console.error('Нет контактов в sniper-contacts.json'); process.exit(1); }

let contactCursor = 0;
const ctx = await launchCtx();
console.log('Браузер Intickets запущен. Мониторинг старт.');

while (true) {
  const t = new Date().toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow', hour12: false });
  for (const s of SEANCES) {
    const page = await ctx.newPage();
    try {
      await page.goto(seanceUrl(s.id), { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(7000);
      // закрыть модалку согласия, если есть
      await page.click('button:has-text("Хорошо")', { timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(3000);
      const seats = await readSeats(page);
      const freeCount = seats.filter((x) => x.free).length;
      const pairs = findPairs(seats);
      console.log(`[${t}] ${s.label}: мест ${seats.length}, свободных ${freeCount}, пар ${pairs.length}`);
      if (!pairs.length) continue;

      // берём пару и покупаем
      const pair = pairs[0].seats;
      console.log(`[${t}] 🔥 ${s.label}: пара (${Math.round(pair[0].cx)},${Math.round(pair[0].cy)}) + (${Math.round(pair[1].cx)},${Math.round(pair[1].cy)}) — кликаю`);
      await clickSeatAt(page, pair[0]);
      await clickSeatAt(page, pair[1]);
      await page.waitForTimeout(800);
      await clickBuy(page);
      const url = await waitPaymentUrl(page);
      if (url) {
        const rec = { label: s.label, bookedAt: new Date().toISOString(), results: [{ seats: '2 места (пара)', paymentUrl: url }] };
        saveResult(rec);
        console.log(`  ✅ ${s.label} | ${url}`);
        await notify(rec).catch(() => {});
      } else {
        console.log(`  ⚠️ ${s.label}: до оплаты не дошли (url=${page.url().slice(0, 80)})`);
      }
    } catch (e) {
      console.log(`[${t}] ${s.label}: ⚠️ ${(e instanceof Error ? e.message : e).slice(0, 120)}`);
    } finally {
      await page.close();
    }
  }
  await new Promise((r) => setTimeout(r, 5000));
}
