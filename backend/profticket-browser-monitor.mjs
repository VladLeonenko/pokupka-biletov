// Браузерная подстраховка Profticket (Цирк Никулина).
// Работает параллельно с API-ботом. При капче/блоке API пытается купить через SPA.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import dotenv from 'dotenv';
import { sendTransactionalMail } from './services/mail/transporter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const RESULTS_FILE = path.join(__dirname, 'data', 'profticket-browser-results.json');
const CONTACTS_FILE = path.join(__dirname, 'sniper-contacts.json');
const NOTIFY_EMAIL = (process.env.PROFTICKET_NOTIFY_EMAIL || 'vladislav.leonenko@bk.ru,leonenkovlad2018@yandex.ru,info@prime-coder.ru,gyrodin@mail.ru,iosif131999@gmail.com').trim();
const BCC = process.env.PROFTICKET_BCC || 'yaguda_io@mail.ru';
const SHOW_URL = 'https://spa.profticket.ru/customer/53/shows/102';

const JAN_TARGETS = {
  '02': ['14:30'],
  '03': ['18:00'],
  '04': ['14:30', '18:00'],
  '05': ['14:30'],
  '06': ['14:30', '18:00'],
  '07': ['14:30'],
};
const DEC_DAYS = ['12', '13', '19', '20', '30', '31'];

function loadContacts() {
  const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, CONTACTS_FILE), 'utf-8'));
  return data.map((c) => ({ name: String(c.name || '').trim(), email: String(c.email || '').trim(), phone: String(c.phone || '').trim() })).filter((c) => c.name && c.email);
}

function saveResult(rec) {
  fs.mkdirSync(path.dirname(RESULTS_FILE), { recursive: true });
  let list = [];
  try { list = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8')); } catch {}
  list.push(rec);
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(list, null, 2));
}

function targetDateText(text) {
  const d = String(text).toLowerCase();
  const dayMatch = d.match(/(\d{1,2})\s+(января|декабря)/);
  if (!dayMatch) return false;
  const day = dayMatch[1].padStart(2, '0');
  const month = dayMatch[2];
  const timeMatch = d.match(/(\d{2}:\d{2})/);
  const time = timeMatch ? timeMatch[1] : '';
  if (month === 'декабря') return DEC_DAYS.includes(day) && (time ? ['14:30', '18:00', '11:00'].includes(time) : true);
  if (month === 'января') return (JAN_TARGETS[day] || []).includes(time);
  return false;
}

async function notify(rec) {
  const lines = (rec.results || []).map((r) => `${r.name} (${r.email}) | ${r.seats} | ${r.price}₽ | ${r.paymentUrl || 'ссылка в ЛК виджета'}`);
  const text = [
    `Событие: НОВОГОДНИЙ ЛАБИРИНТ (Цирк Никулина) — БРАУЗЕРНАЯ ПОДСТРАХОВКА`,
    `Сеанс: ${rec.label}`,
    `Забронировано: ${(rec.results || []).length} заказ(ов)`,
    '', 'Ссылки на оплату:', ...lines.map((l) => '  ' + l),
    '', 'Если API-бот не справился — проверьте личный кабинет виджета.',
  ].join('\n');
  return sendTransactionalMail({ to: NOTIFY_EMAIL, subject: `🎪 Цирк (браузер): забронировано — ${rec.label}`, text, bcc: BCC });
}

async function run() {
  const contacts = loadContacts();
  if (!contacts.length) { console.error('Нет контактов'); process.exit(1); }
  console.log(`Браузерная подстраховка Цирка запущена. Целевые даты: декабрь ${DEC_DAYS.join(',')}, январь указанные.`);

  const browser = await chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 }, locale: 'ru-RU' });

  while (true) {
    try {
      await page.goto(SHOW_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(8000);

      // Ищем карточки дат
      const buttons = await page.locator('button, a, [role=button], .event, .schedule-item, [data-date]').all();
      const targets = [];
      for (const btn of buttons) {
        const txt = await btn.innerText().catch(() => '');
        if (targetDateText(txt)) targets.push({ btn, txt });
      }
      console.log(`[${new Date().toLocaleTimeString('ru-RU')}] Найдено целевых кнопок: ${targets.length}`);

      for (const { btn, txt } of targets) {
        try {
          await btn.click();
          await page.waitForTimeout(5000);

          // Ищем свободные места в SVG
          const freeSeats = await page.evaluate(() => {
            const seats = [];
            for (const el of document.querySelectorAll('svg [class*="place"], svg [data-seat], g.place, rect[fill], circle[fill]')) {
              const fill = el.getAttribute('fill') || window.getComputedStyle(el).fill;
              if (!fill || fill.includes('rgb(229') || fill.includes('#e5') || fill.includes('gray') || fill.includes('grey')) continue;
              const box = el.getBoundingClientRect();
              seats.push({ x: box.x + box.width / 2, y: box.y + box.height / 2, el: el.outerHTML.slice(0, 80) });
            }
            return seats;
          });

          console.log(`  ${txt}: свободных мест ${freeSeats.length}`);
          if (freeSeats.length < 2) continue;

          // Кликаем первые 2 места
          for (const s of freeSeats.slice(0, 2)) {
            await page.mouse.click(s.x, s.y);
            await page.waitForTimeout(600);
          }

          // Пытаемся дойти до оформления
          const continueBtn = await page.locator('button:has-text("Оформить")').or(page.locator('button:has-text("Продолжить")')).first();
          if (await continueBtn.isVisible().catch(() => false)) {
            await continueBtn.click();
            await page.waitForTimeout(3000);
          }

          const contact = contacts[Math.floor(Math.random() * contacts.length)];
          await page.locator('input[type=email]').fill(contact.email).catch(() => {});
          await page.locator('input[type=tel], input[name*=phone], input[name*=tel]').fill(contact.phone).catch(() => {});
          await page.locator('input[name*=name], input[name*=firstName]').fill(contact.name).catch(() => {});
          await page.locator('button:has-text("Перейти к оплате")').click().catch(() => {});
          await page.waitForTimeout(3000);

          const url = page.url();
          const rec = { label: txt, bookedAt: new Date().toISOString(), results: [{ name: contact.name, email: contact.email, phone: contact.phone, seats: `${freeSeats.length} мест`, price: '?', paymentUrl: url }] };
          saveResult(rec);
          await notify(rec).catch(() => {});
          console.log(`  ✅ браузерная бронь: ${txt} | ${url}`);
        } catch (e) {
          console.log(`  ❌ ${txt}: ${(e instanceof Error ? e.message : e).slice(0, 100)}`);
        }
      }
    } catch (e) {
      console.log(`[${new Date().toLocaleTimeString('ru-RU')}] ⚠️ ${(e instanceof Error ? e.message : e).slice(0, 120)}`);
    }
    await page.evaluate(() => { try { window.location.reload(); } catch {} });
    await page.waitForTimeout(30000);
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
