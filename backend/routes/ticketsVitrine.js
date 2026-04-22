import express from 'express';
import pool from '../db.js';
import { requireAuth, requireAdminOrSalesManager } from '../middleware/auth.js';

export const ticketsVitrinePublicRouter = express.Router();
export const ticketsVitrineAdminRouter = express.Router();

async function loadRow() {
  const r = await pool.query(
    'SELECT content, updated_at FROM tickets_vitrine WHERE singleton = 1 LIMIT 1'
  );
  return r.rows[0] || null;
}

ticketsVitrinePublicRouter.get('/', async (req, res) => {
  try {
    const row = await loadRow();
    if (!row) {
      return res.json({ content: {}, updated_at: null });
    }
    res.json({ content: row.content || {}, updated_at: row.updated_at });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

ticketsVitrineAdminRouter.get('/', requireAuth, requireAdminOrSalesManager, async (req, res) => {
  try {
    const row = await loadRow();
    if (!row) {
      return res.json({ content: {}, updated_at: null });
    }
    res.json({ content: row.content || {}, updated_at: row.updated_at });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

ticketsVitrineAdminRouter.put('/', requireAuth, requireAdminOrSalesManager, async (req, res) => {
  try {
    const body = req.body;
    if (!body || typeof body.content !== 'object' || body.content === null) {
      return res.status(400).json({ error: 'Ожидается { content: object }' });
    }
    const content = body.content;
    const r = await pool.query(
      `INSERT INTO tickets_vitrine (singleton, content, updated_at)
       VALUES (1, $1::jsonb, NOW())
       ON CONFLICT (singleton) DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()
       RETURNING content, updated_at`,
      [JSON.stringify(content)]
    );
    res.json({ content: r.rows[0].content, updated_at: r.rows[0].updated_at });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
