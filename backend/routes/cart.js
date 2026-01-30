import express from 'express';
import pool from '../db.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Все роуты используют опциональную аутентификацию
router.use(optionalAuth);

// Получение или создание session ID для неавторизованных пользователей
function getSessionId(req) {
  let sessionId = req.headers['x-session-id'];
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  return sessionId;
}

// Получить корзину
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    const sessionId = userId ? null : getSessionId(req);
    
    let query, params;
    if (userId) {
      query = `
        SELECT c.*, p.title, p.price_cents, p.currency, p.image_url, p.slug as product_slug
        FROM cart c
        JOIN products p ON c.product_slug = p.slug
        WHERE c.user_id = $1
        ORDER BY c.created_at DESC
      `;
      params = [userId];
    } else {
      query = `
        SELECT c.*, p.title, p.price_cents, p.currency, p.image_url, p.slug as product_slug
        FROM cart c
        JOIN products p ON c.product_slug = p.slug
        WHERE c.session_id = $1
        ORDER BY c.created_at DESC
      `;
      params = [sessionId];
    }
    
    const r = await pool.query(query, params);
    const items = r.rows.map(row => ({
      id: row.id,
      productSlug: row.product_slug,
      quantity: row.quantity,
      product: {
        slug: row.product_slug,
        title: row.title,
        priceCents: row.price_cents,
        currency: row.currency,
        imageUrl: row.image_url,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
    
    res.json({ items, sessionId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Добавить товар в корзину
router.post('/', async (req, res) => {
  try {
    const { productSlug, quantity = 1 } = req.body || {};
    if (!productSlug) return res.status(400).json({ error: 'productSlug required' });
    
    const userId = req.user?.id;
    const sessionId = userId ? null : getSessionId(req);
    
    // Проверяем, есть ли товар
    const productCheck = await pool.query('SELECT slug, is_active FROM products WHERE slug=$1', [productSlug]);
    if (!productCheck.rows[0]) return res.status(404).json({ error: 'Product not found' });
    if (!productCheck.rows[0].is_active) return res.status(400).json({ error: 'Product is not active' });
    
    // Проверяем, есть ли уже в корзине
    let existing;
    if (userId) {
      existing = await pool.query('SELECT id, quantity FROM cart WHERE user_id=$1 AND product_slug=$2', [userId, productSlug]);
    } else {
      existing = await pool.query('SELECT id, quantity FROM cart WHERE session_id=$1 AND product_slug=$2', [sessionId, productSlug]);
    }
    
    if (existing.rows[0]) {
      // Обновляем количество
      const newQuantity = existing.rows[0].quantity + quantity;
      await pool.query('UPDATE cart SET quantity=$1, updated_at=NOW() WHERE id=$2', [newQuantity, existing.rows[0].id]);
      res.json({ message: 'Quantity updated', sessionId });
    } else {
      // Добавляем новый товар
      if (userId) {
        await pool.query('INSERT INTO cart(user_id, product_slug, quantity) VALUES($1,$2,$3)', [userId, productSlug, quantity]);
      } else {
        await pool.query('INSERT INTO cart(session_id, product_slug, quantity) VALUES($1,$2,$3)', [sessionId, productSlug, quantity]);
      }
      res.json({ message: 'Added to cart', sessionId });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Обновить количество товара
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body || {};
    if (quantity === undefined || quantity < 1) return res.status(400).json({ error: 'quantity must be >= 1' });
    
    const userId = req.user?.id;
    const sessionId = userId ? null : getSessionId(req);
    
    let query, params;
    if (userId) {
      query = 'UPDATE cart SET quantity=$1, updated_at=NOW() WHERE id=$2 AND user_id=$3 RETURNING *';
      params = [quantity, id, userId];
    } else {
      query = 'UPDATE cart SET quantity=$1, updated_at=NOW() WHERE id=$2 AND session_id=$3 RETURNING *';
      params = [quantity, id, sessionId];
    }
    
    const r = await pool.query(query, params);
    if (!r.rows[0]) return res.status(404).json({ error: 'Cart item not found' });
    
    res.json({ updated: r.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Удалить товар из корзины
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const sessionId = userId ? null : getSessionId(req);
    
    let query, params;
    if (userId) {
      query = 'DELETE FROM cart WHERE id=$1 AND user_id=$2';
      params = [id, userId];
    } else {
      query = 'DELETE FROM cart WHERE id=$1 AND session_id=$2';
      params = [id, sessionId];
    }
    
    await pool.query(query, params);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Очистить корзину
router.delete('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    const sessionId = userId ? null : getSessionId(req);
    
    let query, params;
    if (userId) {
      query = 'DELETE FROM cart WHERE user_id=$1';
      params = [userId];
    } else {
      query = 'DELETE FROM cart WHERE session_id=$1';
      params = [sessionId];
    }
    
    await pool.query(query, params);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Синхронизация корзины при авторизации (переместить из session_id в user_id)
router.post('/sync', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const sessionId = req.headers['x-session-id'];
    
    if (!sessionId) return res.json({ message: 'No session to sync' });
    
    // Получаем товары из session корзины
    const sessionItems = await pool.query('SELECT product_slug, quantity FROM cart WHERE session_id=$1', [sessionId]);
    
    for (const item of sessionItems.rows) {
      // Проверяем, есть ли уже в user корзине
      const existing = await pool.query('SELECT id, quantity FROM cart WHERE user_id=$1 AND product_slug=$2', [userId, item.product_slug]);
      
      if (existing.rows[0]) {
        // Объединяем количества
        const newQuantity = existing.rows[0].quantity + item.quantity;
        await pool.query('UPDATE cart SET quantity=$1 WHERE id=$2', [newQuantity, existing.rows[0].id]);
      } else {
        // Переносим в user корзину
        await pool.query('UPDATE cart SET user_id=$1, session_id=NULL WHERE product_slug=$2 AND session_id=$3', [userId, item.product_slug, sessionId]);
      }
    }
    
    // Удаляем оставшиеся session товары
    await pool.query('DELETE FROM cart WHERE session_id=$1', [sessionId]);
    
    res.json({ message: 'Cart synced' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

