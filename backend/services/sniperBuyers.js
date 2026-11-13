/**
 * Справочник покупателей снайпера.
 * Канон: data/sniper-buyers.json
 * Зеркала для уже запущенных ботов: sniper-contacts.json и data/radario-passports.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUYERS_FILE = path.join(__dirname, '..', 'data', 'sniper-buyers.json');
const CONTACTS_FILE = path.join(__dirname, '..', 'sniper-contacts.json');
const PASSPORTS_FILE = path.join(__dirname, '..', 'data', 'radario-passports.json');

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

export function listBuyers() {
  const stored = readJson(BUYERS_FILE, null);
  if (Array.isArray(stored)) return stored;
  const merged = mergeLegacy();
  writeJson(BUYERS_FILE, merged);
  return merged;
}

function mergeLegacy() {
  const contacts = readJson(CONTACTS_FILE, []);
  const passports = readJson(PASSPORTS_FILE, []);
  const byEmail = new Map();
  for (const c of Array.isArray(contacts) ? contacts : []) {
    const email = String(c.email || '').trim();
    const key = email.toLowerCase();
    if (!key) continue;
    byEmail.set(key, {
      id: randomUUID(),
      lk: email,
      fullName: String(c.name || '').trim(),
      email,
      phone: String(c.phone || '').trim(),
      documentType: 'PassportRf',
      documentSeries: '',
      documentNumber: '',
    });
  }
  for (const p of Array.isArray(passports) ? passports : []) {
    const email = String(p.email || '').trim();
    const key = email.toLowerCase();
    const prev = (key && byEmail.get(key)) || {
      id: randomUUID(),
      lk: email,
      fullName: '',
      email,
      phone: '',
      documentType: 'PassportRf',
      documentSeries: '',
      documentNumber: '',
    };
    prev.fullName = String(p.fullName || prev.fullName || '').trim();
    prev.phone = String(p.phone || prev.phone || '').trim();
    prev.documentType = String(p.documentType || prev.documentType || 'PassportRf');
    prev.documentSeries = String(p.documentSeries || '');
    prev.documentNumber = String(p.documentNumber || '');
    byEmail.set(key || `id:${prev.id}`, prev);
  }
  return [...byEmail.values()];
}

function cleanBuyer(row, index) {
  const fullName = String(row?.fullName || '').trim();
  const email = String(row?.email || '').trim();
  const phone = String(row?.phone || '').trim();
  const n = index + 1;
  if (!fullName) throw new Error(`строка ${n}: нужно ФИО`);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error(`строка ${n}: некорректная почта`);
  if (phone.replace(/\D/g, '').length < 10) throw new Error(`строка ${n}: телефон — минимум 10 цифр`);
  return {
    id: String(row.id || randomUUID()),
    lk: String(row.lk || '').trim(),
    fullName,
    email,
    phone,
    documentType: String(row.documentType || 'PassportRf').slice(0, 40),
    documentSeries: String(row.documentSeries || '').replace(/\s+/g, ''),
    documentNumber: String(row.documentNumber || '').replace(/\s+/g, ''),
  };
}

export function saveBuyers(rows) {
  if (!Array.isArray(rows)) throw new Error('ожидается список');
  const list = rows.map(cleanBuyer);
  const emails = list.map((b) => b.email.toLowerCase());
  if (new Set(emails).size !== emails.length) throw new Error('почты не должны повторяться');
  writeJson(BUYERS_FILE, list);
  writeJson(CONTACTS_FILE, list.map((b) => ({ name: b.fullName, email: b.email, phone: b.phone })));
  writeJson(PASSPORTS_FILE, list.filter((b) => b.documentNumber).map((b) => ({
    fullName: b.fullName,
    documentType: b.documentType || 'PassportRf',
    documentSeries: b.documentSeries,
    documentNumber: b.documentNumber,
    email: b.email,
    phone: b.phone,
  })));
  return list;
}
