import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Все роуты требуют авторизации
router.use(requireAuth);

// Получить избранное
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const r = await pool.query(`
      SELECT w.*, p.title, p.price_cents, p.currency, p.image_url, p.slug as product_slug
      FROM wishlist w
      JOIN products p ON w.product_slug = p.slug
      WHERE w.user_id = $1
      ORDER BY w.created_at DESC
    `, [userId]);
    
    const items = r.rows.map(row => ({
      id: row.id,
      productSlug: row.product_slug,
      product: {
        slug: row.product_slug,
        title: row.title,
        priceCents: row.price_cents,
        currency: row.currency,
        imageUrl: row.image_url,
      },
      createdAt: row.created_at,
    }));
    
    res.json({ items });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Добавить в избранное
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { productSlug } = req.body || {};
    if (!productSlug) return res.status(400).json({ error: 'productSlug required' });
    
    // Проверяем, есть ли товар
    const productCheck = await pool.query('SELECT slug, is_active FROM products WHERE slug=$1', [productSlug]);
    if (!productCheck.rows[0]) return res.status(404).json({ error: 'Product not found' });
    if (!productCheck.rows[0].is_active) return res.status(400).json({ error: 'Product is not active' });
    
    // Проверяем, есть ли уже в избранном
    const existing = await pool.query('SELECT id FROM wishlist WHERE user_id=$1 AND product_slug=$2', [userId, productSlug]);
    if (existing.rows[0]) return res.json({ message: 'Already in wishlist' });
    
    await pool.query('INSERT INTO wishlist(user_id, product_slug) VALUES($1,$2)', [userId, productSlug]);
    res.json({ message: 'Added to wishlist' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Удалить из избранного
router.delete('/:productSlug', async (req, res) => {
  try {
    const userId = req.user.id;
    const { productSlug } = req.params;
    
    await pool.query('DELETE FROM wishlist WHERE user_id=$1 AND product_slug=$2', [userId, productSlug]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Проверить, есть ли товар в избранном
router.get('/check/:productSlug', async (req, res) => {
  try {
    const userId = req.user.id;
    const { productSlug } = req.params;
    
    const r = await pool.query('SELECT id FROM wishlist WHERE user_id=$1 AND product_slug=$2', [userId, productSlug]);
    res.json({ inWishlist: r.rows.length > 0 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

