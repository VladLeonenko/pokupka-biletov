// Монитор «Опера нищих» (Театр Пушкина).
// Платформа сменилась: Intickets → Radario (radario.ru).
// Пока ticketCount=0 по всем датам — только опрос + письмо при появлении билетов.
// Полный автобронь с паспортными данными — отдельный шаг (в виджете Radario есть Passport/Document).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { sendTransactionalMail } from './services/mail/transporter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const RESULTS_FILE = path.join(__dirname, 'data', 'intickets-results.json');
const NOTIFY_EMAIL = (process.env.INTICKETS_NOTIFY_EMAIL || 'vladislav.leonenko@bk.ru,leonenkovlad2018@yandex.ru,gyrodin@mail.ru,iosif131999@gmail.com').trim();
const BCC = process.env.INTICKETS_BCC || 'yaguda_io@mail.ru';
const INTERVAL_MS = Number(process.env.INTICKETS_INTERVAL_MS || 5000);

// Актуальные даты с teatrpushkin.ru / Radario eventGroup (обновлено 24.10.2026).
const EVENTS = [
  { id: 2747582, label: '17 ноября 19:00' },
  { id: 2747584, label: '18 ноября 19:00' },
  { id: 2747607, label: '19 ноября 19:00' },
  { id: 2747608, label: '20 ноября 19:00' },
  { id: 2871744, label: '15 декабря 19:00' },
  { id: 2871745, label: '16 декабря 19:00' },
  { id: 2871746, label: '17 декабря 19:00' },
  { id: 2871748, label: '18 декабря 19:00' },
];

const alerted = new Set();

async function fetchGroup() {
  const res = await fetch('https://radario.ru/web-api/events/2747582/eventGroup?distributionType=Widget', {
    headers: { Accept: 'application/json', Referer: 'https://teatrpushkin.ru/' },
  });
  if (!res.ok) throw new Error(`eventGroup HTTP ${res.status}`);
  const j = await res.json();
  return Array.isArray(j?.events) ? j.events : [];
}

function saveResult(rec) {
  fs.mkdirSync(path.dirname(RESULTS_FILE), { recursive: true });
  let list = [];
  try { list = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8')); } catch {}
  list.push(rec);
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(list, null, 2));
}

async function notifyOpen(ev) {
  const text = [
    '🔥 Опера нищих — появились билеты в Radario!',
    `Дата: ${ev.label}`,
    `Event ID: ${ev.id}`,
    `ticketCount: ${ev.ticketCount}`,
    `цена: ${ev.minPrice}–${ev.maxPrice} ₽`,
    '',
    `Виджет: https://radario.ru/customer/event/${ev.id}/info?distributionType=Widget`,
    `Страница: https://teatrpushkin.ru/spektakli/detail/opera-nishchikh/`,
    '',
    'Автобронь с паспортом ещё не подключена — нужно забронировать руками или дописать Radario-флоу.',
  ].join('\n');
  return sendTransactionalMail({
    to: NOTIFY_EMAIL,
    subject: `🔥 Опера нищих: билеты ${ev.label} (${ev.ticketCount} шт)`,
    text,
    bcc: BCC,
  });
}

console.log(`Опера нищих / Radario. Событий: ${EVENTS.length}. Интервал ${INTERVAL_MS}мс.`);
console.log('Платформа: Radario (не Intickets). Паспортные поля в виджете есть — автобронь пока только алерт.');

while (true) {
  const t = new Date().toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow', hour12: false });
  try {
    const events = await fetchGroup();
    const byId = new Map(events.map((e) => [Number(e.id), e]));
    for (const cfg of EVENTS) {
      const e = byId.get(cfg.id);
      if (!e) {
        console.log(`[${t}] ${cfg.label}: нет в eventGroup`);
        continue;
      }
      const count = Number(e.ticketCount || 0);
      const stopped = !!e.salesStopped;
      console.log(`[${t}] ${cfg.label}: ticketCount=${count}, salesStopped=${stopped}, price=${e.minPrice}-${e.maxPrice}`);
      if (count > 0 && !stopped && !alerted.has(cfg.id)) {
        alerted.add(cfg.id);
        const rec = {
          platform: 'radario',
          label: cfg.label,
          eventId: cfg.id,
          ticketCount: count,
          minPrice: e.minPrice,
          maxPrice: e.maxPrice,
          detectedAt: new Date().toISOString(),
        };
        saveResult(rec);
        console.log(`[${t}] 🔥 ${cfg.label}: появились билеты (${count}) — шлю письмо`);
        await notifyOpen({ ...cfg, ticketCount: count, minPrice: e.minPrice, maxPrice: e.maxPrice }).catch((err) => {
          console.log(`[${t}] ⚠️ письмо: ${err.message}`);
        });
      }
    }
  } catch (err) {
    console.log(`[${t}] ⚠️ ${err instanceof Error ? err.message : err}`);
  }
  await new Promise((r) => setTimeout(r, INTERVAL_MS));
}
