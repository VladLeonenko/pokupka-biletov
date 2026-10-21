// Управление мониторами-снайперами из админки (старт/стоп через PM2).
import express from 'express';
import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import { requireAuth, requireAdminOrSalesManager } from '../middleware/auth.js';

const require = createRequire(import.meta.url);

const MONITORS = [
  { name: 'sniper-monitor', label: 'Кабала святош (Афиша)' },
  { name: 'sniper-monitor-cycle2', label: 'Кабала святош — цикл 2 (Афиша)' },
  { name: 'ton-browser-monitor', label: 'Обыкновенная смерть (Театр Наций, браузер)' },
  { name: 'ton-monitor', label: 'Обыкновенная смерть (Театр Наций, HTTP-запасной)' },
  { name: 'intickets-monitor', label: 'Опера нищих (Театр Пушкина, Intickets)' },
  { name: 'profticket-monitor', label: 'Новогодний лабиринт (Цирк Никулина, Profticket)' },
  { name: 'profticket-browser-monitor', label: 'Profticket browser' },
  { name: 'profticket-session-pool', label: 'Profticket session pool' },
];

function loadPm2() {
  for (const p of [
    '/usr/lib/node_modules/pm2/index.js',
    '/usr/local/lib/node_modules/pm2/index.js',
  ]) {
    try {
      return require(p);
    } catch {
      /* try next */
    }
  }
  try {
    return require('pm2');
  } catch {
    return null;
  }
}

/** Из‑под PM2 jlist красит warning ANSI (`\x1b[31m`) — первый `[` это не JSON. */
function parsePm2Jlist(stdout) {
  const raw = String(stdout || '');
  const s = raw.replace(/\u001b\[[0-9;]*m/g, '');
  const i = s.indexOf('[{');
  if (i < 0) throw new Error('pm2 jlist: нет JSON-массива');
  const j = s.lastIndexOf(']');
  if (j < i) throw new Error('pm2 jlist: обрезанный JSON');
  return JSON.parse(s.slice(i, j + 1));
}

function pm2JlistViaExec() {
  return new Promise((resolve, reject) => {
    execFile(
      'pm2',
      ['jlist'],
      {
        timeout: 15000,
        maxBuffer: 20 * 1024 * 1024,
        env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1', PM2_SILENT: '1' },
      },
      (err, stdout, stderr) => {
        if (err) return reject(err);
        try {
          resolve(parsePm2Jlist(stdout || stderr || ''));
        } catch (e) {
          reject(e);
        }
      },
    );
  });
}

function pm2JlistViaApi() {
  const pm2 = loadPm2();
  if (!pm2) return Promise.reject(new Error('pm2 module not found'));
  return new Promise((resolve, reject) => {
    pm2.connect(true, (cerr) => {
      if (cerr) return reject(cerr);
      pm2.list((lerr, list) => {
        try {
          pm2.disconnect();
        } catch {
          /* ignore */
        }
        if (lerr) return reject(lerr);
        resolve(Array.isArray(list) ? list : []);
      });
    });
  });
}

async function pm2Jlist() {
  try {
    return await pm2JlistViaApi();
  } catch {
    return pm2JlistViaExec();
  }
}

function pm2Action(action, name) {
  return new Promise((resolve, reject) => {
    execFile('pm2', [action, name], { timeout: 20000 }, (err, stdout, stderr) => {
      if (err) return reject(new Error((stderr || err.message).slice(0, 300)));
      resolve(String(stdout || '') + String(stderr || '').slice(0, 500));
    });
  });
}

export const monitorRouter = express.Router();

// Статус всех мониторов.
monitorRouter.get('/', requireAuth, requireAdminOrSalesManager, async (req, res) => {
  try {
    const list = await pm2Jlist();
    const data = MONITORS.map((m) => {
      const p = list.find((x) => x.name === m.name);
      return {
        name: m.name,
        label: m.label,
        status: p ? p.pm2_env?.status : 'not_found',
        online: p?.pm2_env?.status === 'online',
        restarts: p?.pm2_env?.restart_time || 0,
        uptime: p?.pm2_env?.pm_uptime || 0,
      };
    });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

// Старт / стоп / рестарт монитора.
monitorRouter.post('/:name/:action', requireAuth, requireAdminOrSalesManager, async (req, res) => {
  const { name, action } = req.params;
  if (!MONITORS.some((m) => m.name === name)) return res.status(400).json({ error: 'неизвестный монитор' });
  let cmd;
  if (action === 'start' || action === 'restart') cmd = 'restart';
  else if (action === 'stop') cmd = 'stop';
  else return res.status(400).json({ error: 'действие: start|stop|restart' });
  try {
    const out = await pm2Action(cmd, name);
    res.json({ success: true, action: cmd, out });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});
