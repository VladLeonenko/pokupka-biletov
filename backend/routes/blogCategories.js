import express from 'express';
import pool from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT slug, name FROM blog_categories ORDER BY name');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  const { slug, name } = req.body;
  if (!slug) return res.status(400).json({ error: 'slug is required' });
  try {
    await pool.query('INSERT INTO blog_categories (slug, name) VALUES ($1, $2) ON CONFLICT(slug) DO UPDATE SET name=EXCLUDED.name', [slug, name || slug]);
    res.status(201).json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:slug', async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM blog_categories WHERE slug=$1 RETURNING *', [req.params.slug]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'Category not found' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;


