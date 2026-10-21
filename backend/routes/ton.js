// Роуты снайпера Театра Наций: результаты + статус аккаунтов (оплачено/заперто).
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireAuth, requireAdminOrSalesManager } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE = path.join(__dirname, '..', 'data', 'ton-account-state.json');
const RESULTS_FILE = path.join(__dirname, '..', 'data', 'ton-results.json');

function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')); } catch { return {}; }
}
function writeState(state) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

export const tonRouter = express.Router();

// Результаты бронирований + текущее состояние аккаунтов (locked/paid).
tonRouter.get('/results', requireAuth, requireAdminOrSalesManager, (req, res) => {
  let results = [];
  try { results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8')); } catch {}
  res.json({ success: true, data: { results, accounts: readState() } });
});

// Пометить аккаунт оплаченным — бот снова сможет его использовать.
tonRouter.post('/mark-paid', requireAuth, requireAdminOrSalesManager, (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email обязателен' });
  const state = readState();
  const prev = state[email] || {};
  state[email] = { ...prev, status: 'paid', paidAt: new Date().toISOString() };
  writeState(state);
  res.json({ success: true, email });
});

// Сбросить (разблокировать) аккаунт без отметки оплаты — на случай ошибки.
tonRouter.post('/unlock', requireAuth, requireAdminOrSalesManager, (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email обязателен' });
  const state = readState();
  const prev = state[email] || {};
  state[email] = { ...prev, status: 'paid', unlockedAt: new Date().toISOString() };
  writeState(state);
  res.json({ success: true, email });
});
