// Монитор Profticket (Цирк Никулина, «Новогодний лабиринт»).
// Цели: декабрь (12,13,19,20,30,31) + январь (все даты), время 14:30/18:00 (+11:00), места до 7000₽.
// Флоу: схема зала → пара мест → pre-reservation → order/create → ссылка на оплату → письмо.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { getEvents, getScheme, startBasketSession, preReservation, createOrder } from './services/profticketApi.js';
import { sendTransactionalMail } from './services/mail/transporter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const RESULTS_FILE = path.join(__dirname, 'data', 'profticket-results.json');
const CONTACTS_FILE = path.join(__dirname, 'sniper-contacts.json');
const NOTIFY_EMAIL = (process.env.PROFTICKET_NOTIFY_EMAIL || 'vladislav.leonenko@bk.ru,leonenkovlad2018@yandex.ru,info@prime-coder.ru,gyrodin@mail.ru,iosif131999@gmail.com').trim();
const BCC = process.env.PROFTICKET_BCC || 'yaguda_io@mail.ru';
const MAX_PRICE = 7000;
const MAX_BOOKINGS = Number(process.env.PROFTICKET_MAX_BOOKINGS || 150); // 150 пар = 300 мест
const MAX_SEATS_PER_ORDER = Number(process.env.PROFTICKET_MAX_SEATS_PER_ORDER || 6); // до 6 мест (3 пары) в заказ, как у остальных
const GLOBAL_SHOW_ID = 10362;

// Декабрь: целевые числа; январь: ЛЮБЫЕ доступные даты/время (площадка выложила 1,11-24 января).
const DEC_DAYS = ['12', '13', '19', '20', '30', '31'];
const JAN_TARGETS = {
  '02': ['14:30'],
  '03': ['18:00'],
  '04': ['14:30', '18:00'],
  '05': ['14:30'],
  '06': ['14:30', '18:00'],
  '07': ['14:30'],
};
const TIMES = ['14:30', '18:00', '11:00'];

function targetEvent(e) {
  const d = String(e.begin_date || '');
  const month = d.slice(5, 7);
  const day = d.slice(8, 10);
  const time = String(e.begin_time || '');
  if (month === '12') return DEC_DAYS.includes(day) && TIMES.includes(time);
  if (month === '01') return (JAN_TARGETS[day] || []).includes(time);
  return false;
}

// Макс. цена для события (12 декабря 14:30 — до 5000₽, остальное до MAX_PRICE).
function maxPriceFor(e) {
  const d = String(e.begin_date || '');
  const time = String(e.begin_time || '');
  if (d.slice(5, 7) === '12' && d.slice(8, 10) === '12' && time === '14:30') return 5000;
  return MAX_PRICE;
}

function loadContacts() {
  const p = path.resolve(__dirname, CONTACTS_FILE);
  const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
  return data.map((c) => ({ name: String(c.name || '').trim(), email: String(c.email || '').trim(), phone: String(c.phone || '').trim() }))
    .filter((c) => c.name && c.email);
}

function findPairs(seats) {
  const byRow = {};
  for (const s of seats) {
    const k = `${s.cod_sec}|${s.row}`;
    (byRow[k] = byRow[k] || []).push(s);
  }
  const pairs = [];
  for (const k of Object.keys(byRow)) {
    const list = byRow[k].sort((a, b) => Number(a.seat) - Number(b.seat));
    for (let i = 0; i < list.length; i++) {
      const next = list[i + 1];
      if (next && Number(next.seat) - Number(list[i].seat) === 1) {
        pairs.push({ sector: list[i].name_sec, row: list[i].row, seats: [list[i], next] });
        i++;
      }
    }
  }
  return pairs;
}

function loadResults() { try { return JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8')); } catch { return []; } }
function saveResult(rec) { const list = loadResults(); list.push(rec); fs.mkdirSync(path.dirname(RESULTS_FILE), { recursive: true }); fs.writeFileSync(RESULTS_FILE, JSON.stringify(list, null, 2)); }
function bookedCount() { return loadResults().reduce((s, r) => s + (r.results?.length || 0), 0); }
// Уже забронированные места (чтобы не бронировать одни и те же повторно).
function bookedSeatKeys() {
  const keys = new Set();
  for (const r of loadResults()) {
    for (const x of r.results || []) {
      for (const k of x.seatKeys || []) keys.add(k);
    }
  }
  return keys;
}

async function notify(rec) {
  const lines = (rec.results || []).map((r) => `${r.name} (${r.email}) | ${r.seats} | ${r.price}₽ | ${r.paymentUrl}`);
  const text = [
    `Событие: НОВОГОДНИЙ ЛАБИРИНТ (Цирк Никулина)`,
    `Сеанс: ${rec.label}`,
    `Забронировано: ${(rec.results || []).length} заказ(ов)`,
    '', 'Ссылки на оплату:',
    ...lines.map((l) => '  ' + l),
    '', 'Сгенерировано снайпером biletvsem (Profticket).',
  ].join('\n');
  return sendTransactionalMail({ to: NOTIFY_EMAIL, subject: `🎪 Цирк: забронировано — ${rec.label}`, text, bcc: BCC });
}

const contacts = loadContacts();
console.log(`Контактов: ${contacts.length}. Цель: до ${MAX_BOOKINGS} пар (${MAX_BOOKINGS * 2} мест). В заказ до ${MAX_SEATS_PER_ORDER} мест (${MAX_SEATS_PER_ORDER / 2} пары), после оплаты ящик можно использовать повторно.`);
if (!contacts.length) { console.error('Нет контактов'); process.exit(1); }

let contactCursor = 0;
while (true) {
  const t = new Date().toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow', hour12: false });
  try {
    const booked = bookedCount();
    if (booked >= MAX_BOOKINGS) { console.log(`[${t}] Цель достигнута (${booked} пар).`); await new Promise((r) => setTimeout(r, 30000)); continue; }
    const events = await getEvents();
    const targets = events.filter(targetEvent);
    const bookedKeys = bookedSeatKeys();
    let cycleFree = 0, cyclePairs = 0;
    for (const e of targets) {
      const sch = await getScheme(e.id);
      const maxP = maxPriceFor(e);
      const free = sch.items.filter((s) => s.avail === true && Number(s.price) <= maxP && !bookedKeys.has(`${e.id}|${s.cod_sec}|${s.row}|${s.seat}`));
      const pairs = findPairs(free);
      cycleFree += free.length; cyclePairs += pairs.length;
      // ТОЛЬКО пары (без одиночных).
      if (!pairs.length) continue;
      // Берём до 3 пар (6 мест) в один заказ; при «Превышен лимит» — меньше пар.
      const contact = contacts[contactCursor % contacts.length];
      const pairCounts = [...new Set([Math.floor(MAX_SEATS_PER_ORDER / 2), 2, 1])];
      let bookedNow = false;
      try {
        let session = await startBasketSession();
        if (!session) { console.log('  ⚠️ нет сессии корзины'); continue; }
        for (const nPairs of pairCounts) {
          const groupPairs = pairs.slice(0, nPairs);
          const seatsToBook = groupPairs.flatMap((p) => p.seats);
          const seatsText = seatsToBook.map((s) => `${s.name_sec}, ряд ${s.row}, место ${s.seat}`).join(' + ');
          const price = Number(seatsToBook[0].price);
          const totalPrice = price * seatsToBook.length;
          console.log(`[${t}] 🔥 ${e.date_formatted}: ${seatsToBook.length} мест (${groupPairs.length} пары) ${seatsText} · ${totalPrice}₽ — на ${contact.email}`);
          const pr = await preReservation(session, e.id, seatsToBook, GLOBAL_SHOW_ID);
          if (pr?.error?.code === 15) {
            console.log(`[${t}] 🛑 капча — пробую новую сессию и сразу повторяю`);
            try { session = await startBasketSession(); } catch (e) { console.log('  ⚠️ не удалось пересоздать сессию:', (e instanceof Error ? e.message : e).slice(0, 80)); break; }
            if (!session) break;
            continue;
          }
          if (pr?.error?.code === 2 && /лимит/i.test(String(pr?.error?.message))) { console.log('  ⚠️ лимит на 1 заказ — пробую меньше пар'); continue; }
          if (pr?.response?.success !== true) { console.log('  ⚠️ pre-reservation не прошёл:', JSON.stringify(pr).slice(0, 200)); break; }
          const o = await createOrder(session, contact);
          if (!o.paymentUrl) { console.log('  ⚠️ нет payment_url:', JSON.stringify(o).slice(0, 300)); break; }
          contactCursor++;
          const rec = {
            sessionId: e.id, label: e.date_formatted, bookedAt: new Date().toISOString(),
            results: [{ name: contact.name, email: contact.email, phone: contact.phone, seats: seatsText, price: totalPrice, paymentUrl: o.paymentUrl, orderId: o.order?.id, tickets: seatsToBook.length, seatKeys: seatsToBook.map((s) => `${e.id}|${s.cod_sec}|${s.row}|${s.seat}`) }],
          };
          saveResult(rec);
          console.log(`  ✅ ${contact.email} | ${rec.results[0].seats} | ${o.paymentUrl}`);
          await notify(rec).catch(() => {});
          bookedNow = true;
          break;
        }
      } catch (e2) { console.log('  ❌', (e2 instanceof Error ? e2.message : e2).slice(0, 160)); }
      await new Promise((r) => setTimeout(r, 500));
    }
    console.log(`[${t}] опрос: свободных мест ${cycleFree}, пар ${cyclePairs} — бронируем только пары`);
  } catch (e) {
    console.log(`[${t}] ⚠️ ${(e instanceof Error ? e.message : e).slice(0, 140)}`);
  }
  // Агрессивный поллинг только 15 октября 2026 с 10:55 до 16:00 по Москве.
  const nowMsk = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
  const isOct15 = nowMsk.getFullYear() === 2026 && nowMsk.getMonth() === 9 && nowMsk.getDate() === 15;
  const h = nowMsk.getHours();
  const m = nowMsk.getMinutes();
  const minutes = h * 60 + m;
  const aggressive = isOct15 && minutes >= 10 * 60 + 15 && minutes <= 16 * 60;
  await new Promise((r) => setTimeout(r, aggressive ? 2000 : 60000));
}
