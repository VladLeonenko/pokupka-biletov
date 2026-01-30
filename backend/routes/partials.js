import express from 'express';
import pool from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT name, html FROM partials');
    const map = Object.fromEntries(result.rows.map(r => [r.name, r.html]));
    res.json(map);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;




