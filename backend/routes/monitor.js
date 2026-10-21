// Управление мониторами-снайперами из админки (старт/стоп через PM2).
import express from 'express';
import { exec } from 'node:child_process';
import { requireAuth, requireAdminOrSalesManager } from '../middleware/auth.js';

const MONITORS = [
  { name: 'sniper-monitor', label: 'Кабала святош (Афиша)' },
  { name: 'ton-browser-monitor', label: 'Обыкновенная смерть (Театр Наций, браузер)' },
  { name: 'ton-monitor', label: 'Обыкновенная смерть (Театр Наций, HTTP-запасной)' },
  { name: 'intickets-monitor', label: 'Опера нищих (Театр Пушкина, Intickets)' },
  { name: 'profticket-monitor', label: 'Новогодний лабиринт (Цирк Никулина, Profticket)' },
];

function pm2Jlist() {
  return new Promise((resolve, reject) => {
    exec('pm2 jlist', { timeout: 10000 }, (err, stdout) => {
      if (err) return reject(err);
      try { resolve(JSON.parse(stdout)); } catch (e) { reject(e); }
    });
  });
}

function pm2Action(action, name) {
  return new Promise((resolve, reject) => {
    exec(`pm2 ${action} ${name}`, { timeout: 20000 }, (err, stdout, stderr) => {
      if (err) return reject(new Error((stderr || err.message).slice(0, 300)));
      resolve((stdout + stderr).slice(0, 500));
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
