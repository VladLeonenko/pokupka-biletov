import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

const VALID_FUND_IDS = ['podari-zhizn', 'rusfond', 'starost', 'khabenskiy', 'avz', 'donate-stream', 'nochlezhka', 'zhizn', 'adresmilk'];

function validateAllocations(allocations) {
  if (!Array.isArray(allocations) || allocations.length === 0) return [];
  if (allocations.length > 2) return null;
  let sum = 0;
  for (const a of allocations) {
    if (!a.fund_id || !VALID_FUND_IDS.includes(a.fund_id)) return null;
    const p = Number(a.percent);
    if (isNaN(p) || p < 0 || p > 10) return null;
    sum += p;
  }
  if (Math.abs(sum - 10) > 0.01) return null; // Сумма должна быть 10%
  return allocations.map(a => ({
    fund_id: a.fund_id,
    fund_name: a.fund_name || a.fund_id,
    percent: Number(a.percent),
  }));
}

// GET /api/charity-preferences — пожелания текущего пользователя
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const r = await pool.query(
      'SELECT allocations FROM user_charity_preferences WHERE user_id = $1',
      [userId]
    );
    const allocations = r.rows[0]?.allocations || [];
    res.json({ allocations });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/charity-preferences
router.put('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { allocations } = req.body || {};
    const validated = validateAllocations(allocations);
    if (validated === null) {
      return res.status(400).json({ error: 'Некорректные данные: выберите 1–2 фонда, сумма 10%' });
    }
    await pool.query(`
      INSERT INTO user_charity_preferences (user_id, allocations, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (user_id) DO UPDATE SET allocations = $2, updated_at = NOW()
    `, [userId, JSON.stringify(validated)]);
    res.json({ allocations: validated });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
