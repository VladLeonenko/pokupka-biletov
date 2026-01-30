import express from 'express';
import pool from '../db.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Трекинг публичный, просмотр требует авторизации
router.use(optionalAuth);

// Записать событие аналитики
router.post('/track', async (req, res) => {
  try {
    const { productSlug, eventType, metadata } = req.body || {};
    if (!productSlug || !eventType) {
      return res.status(400).json({ error: 'productSlug and eventType required' });
    }
    
    const userId = req.user?.id;
    const sessionId = userId ? null : req.headers['x-session-id'] || `session_${Date.now()}`;
    
    await pool.query(`
      INSERT INTO product_analytics(product_slug, event_type, user_id, session_id, metadata)
      VALUES($1,$2,$3,$4,$5)
    `, [productSlug, eventType, userId, sessionId, metadata ? JSON.stringify(metadata) : null]);
    
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Получить аналитику продуктов (только для админов)
router.get('/', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }
    
    const { days = 30, productSlug } = req.query || {};
    
    let query = `
      SELECT 
        p.slug,
        p.title,
        COUNT(CASE WHEN pa.event_type = 'view' THEN 1 END) as views,
        COUNT(CASE WHEN pa.event_type = 'click' THEN 1 END) as clicks,
        COUNT(CASE WHEN pa.event_type = 'add_to_cart' THEN 1 END) as add_to_cart,
        COUNT(CASE WHEN pa.event_type = 'add_to_wishlist' THEN 1 END) as add_to_wishlist,
        COUNT(CASE WHEN pa.event_type = 'purchase' THEN 1 END) as purchases,
        COUNT(CASE WHEN pa.event_type = 'case_view' THEN 1 END) as case_views
      FROM products p
      LEFT JOIN product_analytics pa ON pa.product_slug = p.slug
        AND pa.created_at > NOW() - INTERVAL '${parseInt(days)} days'
      ${productSlug ? 'WHERE p.slug = $1' : ''}
      GROUP BY p.slug, p.title
      ORDER BY views DESC, clicks DESC
    `;
    
    const params = productSlug ? [productSlug] : [];
    const r = await pool.query(query, params);
    
    res.json(r.rows.map(row => ({
      productSlug: row.slug,
      productTitle: row.title,
      views: parseInt(row.views) || 0,
      clicks: parseInt(row.clicks) || 0,
      addToCart: parseInt(row.add_to_cart) || 0,
      addToWishlist: parseInt(row.add_to_wishlist) || 0,
      purchases: parseInt(row.purchases) || 0,
      caseViews: parseInt(row.case_views) || 0,
    })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Получить детальную аналитику по продукту
router.get('/:productSlug', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }
    
    const { productSlug } = req.params;
    const { days = 30 } = req.query || {};
    
    // Общая статистика
    const statsResult = await pool.query(`
      SELECT 
        event_type,
        COUNT(*) as count,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT session_id) as unique_sessions
      FROM product_analytics
      WHERE product_slug = $1
        AND created_at > NOW() - INTERVAL '${parseInt(days)} days'
      GROUP BY event_type
      ORDER BY count DESC
    `, [productSlug]);
    
    // Статистика по дням
    const dailyResult = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        event_type,
        COUNT(*) as count
      FROM product_analytics
      WHERE product_slug = $1
        AND created_at > NOW() - INTERVAL '${parseInt(days)} days'
      GROUP BY DATE(created_at), event_type
      ORDER BY date DESC, event_type
    `, [productSlug]);
    
    // Связанные кейсы
    const casesResult = await pool.query(`
      SELECT 
        c.slug,
        c.title,
        COUNT(pa.id) as view_count
      FROM product_cases pc
      JOIN cases c ON c.slug = pc.case_slug
      LEFT JOIN product_analytics pa ON pa.product_slug = $1 
        AND pa.event_type = 'case_view'
        AND pa.metadata->>'caseSlug' = c.slug
        AND pa.created_at > NOW() - INTERVAL '${parseInt(days)} days'
      WHERE pc.product_slug = $1
      GROUP BY c.slug, c.title
      ORDER BY view_count DESC
    `, [productSlug]);
    
    res.json({
      productSlug,
      period: `${days} days`,
      stats: statsResult.rows.map(row => ({
        eventType: row.event_type,
        count: parseInt(row.count) || 0,
        uniqueUsers: parseInt(row.unique_users) || 0,
        uniqueSessions: parseInt(row.unique_sessions) || 0,
      })),
      daily: dailyResult.rows.map(row => ({
        date: row.date,
        eventType: row.event_type,
        count: parseInt(row.count) || 0,
      })),
      relatedCases: casesResult.rows.map(row => ({
        slug: row.slug,
        title: row.title,
        viewCount: parseInt(row.view_count) || 0,
      })),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

