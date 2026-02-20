import express from 'express';
import pool from '../db.js';
import { requireAuth, requireAdminOrSalesManager } from '../middleware/auth.js';

const router = express.Router();

// Материалы обучения — менеджер + админ
router.get('/materials', requireAuth, requireAdminOrSalesManager, async (req, res) => {
  try {
    const { type } = req.query;
    let query = 'SELECT * FROM sales_training_materials WHERE 1=1';
    const params = [];
    if (type) {
      params.push(type);
      query += ` AND type = $${params.length}`;
    }
    query += ' ORDER BY sort_order ASC, id ASC';
    const r = await pool.query(query, params);
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Добавить/обновить материал (админ)
router.post('/materials', requireAuth, async (req, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  try {
    const { type, title, content, objection_text, solution_text, sort_order } = req.body || {};
    if (!type || !title) return res.status(400).json({ error: 'type and title required' });
    const r = await pool.query(
      `INSERT INTO sales_training_materials (type, title, content, objection_text, solution_text, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [type, title, content || null, objection_text || null, solution_text || null, sort_order ?? 0]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Продуктовая матрица (из каталога) — удобный формат для менеджера
router.get('/product-matrix', requireAuth, requireAdminOrSalesManager, async (req, res) => {
  try {
    const [productsRes, categoriesRes] = await Promise.all([
      pool.query(`SELECT p.slug, p.title, p.price_cents, p.currency, p.price_period, p.summary, p.case_slugs,
        (SELECT array_agg(pc.name) FROM product_categories pc
         JOIN product_category_links pcl ON pcl.category_id = pc.id WHERE pcl.product_slug = p.slug) as categories
        FROM products p WHERE p.is_active = TRUE ORDER BY p.sort_order`),
      pool.query('SELECT id, name, slug FROM product_categories WHERE is_active = TRUE ORDER BY sort_order')
    ]);
    const categories = categoriesRes.rows.reduce((acc, c) => ({ ...acc, [c.id]: c.name }), {});
    const matrix = productsRes.rows.map((p) => ({
      slug: p.slug,
      title: p.title,
      price: p.price_cents ? `${(p.price_cents / 100).toLocaleString('ru-RU')} ₽` : 'По запросу',
      period: p.price_period === 'month' ? '/мес' : p.price_period === 'year' ? '/год' : '',
      summary: p.summary || '',
      cases: p.case_slugs || [],
      categories: p.categories || []
    }));
    res.json({ products: matrix, categories: categoriesRes.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Кейсы (из таблицы cases) — для менеджера
router.get('/cases', requireAuth, requireAdminOrSalesManager, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT slug, title, summary, category, hero_image_url, created_at
       FROM cases WHERE is_published = TRUE
       ORDER BY home_order ASC NULLS LAST, created_at DESC`
    );
    res.json(r.rows);
  } catch (e) {
    if (e.message?.includes('home_order')) {
      const r = await pool.query(
        `SELECT slug, title, summary, category, hero_image_url, created_at
         FROM cases WHERE is_published = TRUE ORDER BY created_at DESC`
      );
      return res.json(r.rows);
    }
    res.status(500).json({ error: e.message });
  }
});

export default router;
