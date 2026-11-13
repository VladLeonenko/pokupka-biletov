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
const CONTACTS_BAK = path.join(__dirname, '..', 'sniper-contacts.json.bak');
const PASSPORTS_FILE = path.join(__dirname, '..', 'data', 'radario-passports.json');
const TON_FILE = path.join(__dirname, '..', 'ton-accounts.json');

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

function blank(email) {
  return {
    id: randomUUID(),
    lk: email,
    fullName: '',
    email,
    phone: '',
    documentType: 'PassportRf',
    documentSeries: '',
    documentNumber: '',
    password: '',
  };
}

function asList(value) {
  return Array.isArray(value) ? value : [];
}

/** Пустые поля добираем из контактов, бэкапа, паспортов и ЛК Театра Наций. Уже введённое не затираем. */
function unionSources(stored) {
  const byEmail = new Map();
  for (const row of asList(stored)) {
    const email = String(row?.email || '').trim();
    const key = email.toLowerCase();
    if (!key) continue;
    byEmail.set(key, { ...blank(email), ...row, email });
  }
  const fill = (email, patch) => {
    const addr = String(email || '').trim();
    const key = addr.toLowerCase();
    if (!key) return;
    const prev = byEmail.get(key) || blank(addr);
    for (const [k, v] of Object.entries(patch)) {
      if (v && !prev[k]) prev[k] = v;
    }
    prev.email = prev.email || addr;
    byEmail.set(key, prev);
  };
  for (const file of [CONTACTS_FILE, CONTACTS_BAK]) {
    for (const c of asList(readJson(file, []))) {
      fill(c.email, {
        fullName: String(c.name || c.fullName || '').trim(),
        phone: String(c.phone || '').trim(),
        lk: String(c.email || '').trim(),
      });
    }
  }
  for (const p of asList(readJson(PASSPORTS_FILE, []))) {
    fill(p.email, {
      fullName: String(p.fullName || '').trim(),
      phone: String(p.phone || '').trim(),
      documentType: String(p.documentType || '').trim(),
      documentSeries: String(p.documentSeries || '').trim(),
      documentNumber: String(p.documentNumber || '').trim(),
    });
  }
  for (const a of asList(readJson(TON_FILE, []))) {
    fill(a.email, {
      lk: String(a.email || '').trim(),
      password: String(a.password || ''),
    });
  }
  return [...byEmail.values()];
}

export function listBuyers() {
  const stored = readJson(BUYERS_FILE, []);
  const merged = unionSources(Array.isArray(stored) ? stored : []);
  const prev = JSON.stringify(asList(stored));
  if (prev !== JSON.stringify(merged)) writeJson(BUYERS_FILE, merged);
  return merged;
}

function cleanBuyer(row, index) {
  const email = String(row?.email || '').trim();
  const phone = String(row?.phone || '').trim();
  const n = index + 1;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error(`строка ${n}: некорректная почта`);
  if (phone && phone.replace(/\D/g, '').length < 10) throw new Error(`строка ${n}: телефон — минимум 10 цифр`);
  return {
    id: String(row.id || randomUUID()),
    lk: String(row.lk || '').trim(),
    fullName: String(row.fullName || '').trim(),
    email,
    phone,
    documentType: String(row.documentType || 'PassportRf').slice(0, 40),
    documentSeries: String(row.documentSeries || '').replace(/\s+/g, ''),
    documentNumber: String(row.documentNumber || '').replace(/\s+/g, ''),
    password: String(row.password || ''),
  };
}

export function saveBuyers(rows) {
  if (!Array.isArray(rows)) throw new Error('ожидается список');
  const list = rows.map(cleanBuyer);
  const emails = list.map((b) => b.email.toLowerCase());
  if (new Set(emails).size !== emails.length) throw new Error('почты не должны повторяться');
  writeJson(BUYERS_FILE, list);
  writeJson(CONTACTS_FILE, list.filter((b) => b.fullName && b.phone).map((b) => ({ name: b.fullName, email: b.email, phone: b.phone })));
  writeJson(TON_FILE, list.filter((b) => b.password).map((b) => ({ email: b.email, password: b.password })));
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
