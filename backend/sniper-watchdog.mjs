/**
 * Письмо, когда снайпер offline или молчит (лог не пишется).
 * Повтор того же статуса — не чаще раза в 6 часов.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import dotenv from 'dotenv';
import { notifyOps } from './services/sniperOpsNotify.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const STATE_FILE = path.join(__dirname, 'data', 'sniper-watchdog-state.json');
const HEALTH_FILE = path.join(__dirname, 'data', 'sniper-health.json');
const INTERVAL_MS = Number(process.env.SNIPER_WATCHDOG_MS || 60_000);
const SILENT_MS = Number(process.env.SNIPER_SILENT_MS || 20 * 60_000);
const REALERT_MS = 6 * 3600_000;
/** Эти процессы могут молчать в логе и при этом быть живыми. */
const QUIET_OK = new Set(['sniper-payment-tracker', 'kassir-monitor']);

function pm2Jlist() {
  return new Promise((resolve, reject) => {
    execFile('pm2', ['jlist'], { timeout: 15000, maxBuffer: 20 * 1024 * 1024, env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' } }, (err, stdout) => {
      if (err) return reject(err);
      const s = String(stdout).replace(/\u001b\[[0-9;]*m/g, '');
      const i = s.indexOf('[{');
      const j = s.lastIndexOf(']');
      if (i < 0 || j < i) return reject(new Error('pm2 jlist: нет JSON'));
      resolve(JSON.parse(s.slice(i, j + 1)));
    });
  });
}

function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { return { alerts: {} }; }
}
function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function healthOf(proc) {
  const name = proc.name || '';
  const online = proc.pm2_env?.status === 'online';
  const logPath = proc.pm2_env?.pm_out_log_path || '';
  let ageMs = null;
  try { ageMs = Date.now() - fs.statSync(logPath).mtimeMs; } catch { ageMs = null; }
  let health = 'down';
  if (online && (QUIET_OK.has(name) || (ageMs != null && ageMs < SILENT_MS))) health = 'ok';
  else if (online) health = 'silent';
  return {
    name,
    status: proc.pm2_env?.status || 'missing',
    health,
    online,
    logAgeMin: ageMs == null ? null : Math.round(ageMs / 60000),
    logPath,
  };
}

async function tick() {
  const list = await pm2Jlist();
  const bots = list.filter((p) => /sniper|monitor|kassir|vakht|konser|wowcup|ton-|tracker/i.test(p.name || ''));
  const rows = bots.map(healthOf);
  writeJson(HEALTH_FILE, { at: new Date().toISOString(), bots: rows });

  // «молчит» — процесс online, писать не о чем. Письмо только если процесс реально не online.
  const bad = rows.filter((r) => r.health === 'down' && r.name !== 'sniper-watchdog' && !QUIET_OK.has(r.name));
  if (!bad.length) return;

  const state = readState();
  const fresh = [];
  for (const r of bad) {
    const prev = state.alerts[r.name];
    const same = prev && prev.health === r.health && Date.now() - Date.parse(prev.at || 0) < REALERT_MS;
    if (same) continue;
    state.alerts[r.name] = { health: r.health, at: new Date().toISOString() };
    fresh.push(r);
  }
  for (const r of rows) {
    if (r.health === 'ok' && state.alerts[r.name]) delete state.alerts[r.name];
  }
  writeJson(STATE_FILE, state);
  if (!fresh.length) return;

  const lines = fresh.map((r) => `${r.health === 'silent' ? 'МОЛЧИТ' : 'НЕ ONLINE'} ${r.name} status=${r.status} лог ${r.logAgeMin == null ? 'нет' : r.logAgeMin + ' мин'}`);
  await notifyOps({
    subject: `Снайпер встал: ${fresh.map((r) => r.name).join(', ')}`,
    text: ['Боты перестали работать.', '', ...lines, '', 'Админка → Снайпер мест.'].join('\n'),
    dedupeKey: `watchdog:${fresh.map((r) => r.name + r.health).sort().join(',')}`,
    ttlMs: REALERT_MS,
  });
  console.log(`[watchdog] mailed ${fresh.map((r) => r.name).join(', ')}`);
}

console.log(`[watchdog] start every ${INTERVAL_MS}ms silent>${SILENT_MS}ms`);
async function loop() {
  try { await tick(); } catch (e) { console.error('[watchdog]', e instanceof Error ? e.message : e); }
  setTimeout(loop, INTERVAL_MS);
}
loop();
