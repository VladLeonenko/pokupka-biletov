import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// PUBLIC: Получить опубликованные отзывы с фильтрацией
router.get('/public', async (req, res) => {
  try {
    const { rating, service_type, sort = 'recent', limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT 
        id, brand_name, author, email, rating, text, source, 
        is_verified, helpful_count, response_text, response_author, 
        response_date, photo_url, service_type, created_at
      FROM brand_reviews 
      WHERE is_published = true
    `;
    const params = [];
    let paramIndex = 1;
    
    // Фильтр по рейтингу
    if (rating) {
      query += ` AND rating = $${paramIndex}`;
      params.push(parseInt(rating));
      paramIndex++;
    }
    
    // Фильтр по типу услуги
    if (service_type && service_type !== 'all') {
      query += ` AND service_type = $${paramIndex}`;
      params.push(service_type);
      paramIndex++;
    }
    
    // Сортировка
    switch (sort) {
      case 'rating_desc':
        query += ' ORDER BY rating DESC, created_at DESC';
        break;
      case 'rating_asc':
        query += ' ORDER BY rating ASC, created_at DESC';
        break;
      case 'helpful':
        query += ' ORDER BY helpful_count DESC, created_at DESC';
        break;
      default:
        query += ' ORDER BY created_at DESC';
    }
    
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await pool.query(query, params);
    
    // Получаем статистику
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        AVG(rating)::NUMERIC(3,1) as avg_rating,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
      FROM brand_reviews 
      WHERE is_published = true
    `);
    
    res.json({
      reviews: result.rows,
      stats: statsResult.rows[0],
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: parseInt(statsResult.rows[0].total)
      }
    });
  } catch (err) {
    console.error('[Reviews] Error fetching public reviews:', err);
    res.status(500).json({ error: 'Ошибка при получении отзывов' });
  }
});

// PUBLIC: Создать новый отзыв
router.post('/public', async (req, res) => {
  try {
    const { 
      brand_name = 'PrimeCoder', 
      author, 
      email, 
      rating, 
      text, 
      service_type,
      photo_url 
    } = req.body;
    
    // Валидация
    if (!author || !rating || !text) {
      return res.status(400).json({ error: 'Заполните все обязательные поля' });
    }
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Рейтинг должен быть от 1 до 5' });
    }
    
    if (text.length < 10) {
      return res.status(400).json({ error: 'Отзыв должен содержать минимум 10 символов' });
    }
    
    // Вставляем отзыв (он будет ожидать модерации)
    const result = await pool.query(
      `INSERT INTO brand_reviews 
        (brand_name, author, email, rating, text, service_type, photo_url, is_moderated, is_published, source) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, false, false, 'Сайт') 
       RETURNING id`,
      [brand_name, author, email, parseInt(rating), text, service_type, photo_url]
    );
    
    const reviewId = result.rows[0].id;
    
    // Создаем уведомление для админов о новом отзыве
    try {
      const { createNotification } = await import('./notifications.js');
      const ratingStars = '⭐'.repeat(parseInt(rating));
      const textPreview = text.length > 100 ? text.substring(0, 100) + '...' : text;
      
      await createNotification({
        userId: 0, // для всех пользователей
        type: 'new_review',
        title: `Новый отзыв от ${author} ${ratingStars}`,
        message: textPreview,
        linkUrl: `/admin/reviews`,
        relatedEntityType: 'review',
        relatedEntityId: reviewId
      });
    } catch (notifyErr) {
      console.error('[Reviews] ❌ Ошибка создания уведомления:', notifyErr);
    }
    
    res.json({ 
      message: 'Спасибо за отзыв! Он будет опубликован после модерации.',
      reviewId: reviewId
    });
  } catch (err) {
    console.error('[Reviews] Error creating review:', err);
    res.status(500).json({ error: 'Ошибка при создании отзыва' });
  }
});

// PUBLIC: Отметить отзыв как полезный
router.post('/public/:id/helpful', async (req, res) => {
  try {
    const { id } = req.params;
    const userIp = req.ip || req.connection.remoteAddress;
    const { fingerprint } = req.body;
    
    // Проверяем, не лайкнул ли уже пользователь
    const existing = await pool.query(
      'SELECT id FROM review_helpful_votes WHERE review_id = $1 AND user_ip = $2',
      [id, userIp]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Вы уже отметили этот отзыв' });
    }
    
    // Добавляем голос
    await pool.query(
      'INSERT INTO review_helpful_votes (review_id, user_ip, user_fingerprint) VALUES ($1, $2, $3)',
      [id, userIp, fingerprint]
    );
    
    // Обновляем счетчик
    const result = await pool.query(
      `UPDATE brand_reviews 
       SET helpful_count = (SELECT COUNT(*) FROM review_helpful_votes WHERE review_id = $1)
       WHERE id = $1
       RETURNING helpful_count`,
      [id]
    );
    
    res.json({ helpful_count: result.rows[0].helpful_count });
  } catch (err) {
    console.error('[Reviews] Error marking helpful:', err);
    res.status(500).json({ error: 'Ошибка при отметке отзыва' });
  }
});

// ADMIN: Получить все отзывы (включая неопубликованные)
router.get('/admin', requireAuth, async (req, res) => {
  try {
    const { is_moderated, is_published, limit = 100, offset = 0 } = req.query;
    
    let query = 'SELECT * FROM brand_reviews WHERE 1=1';
    const params = [];
    let paramIndex = 1;
    
    if (is_moderated !== undefined) {
      query += ` AND is_moderated = $${paramIndex}`;
      params.push(is_moderated === 'true');
      paramIndex++;
    }
    
    if (is_published !== undefined) {
      query += ` AND is_published = $${paramIndex}`;
      params.push(is_published === 'true');
      paramIndex++;
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await pool.query(query, params);
    const countResult = await pool.query('SELECT COUNT(*) FROM brand_reviews');
    
    res.json({
      reviews: result.rows,
      total: parseInt(countResult.rows[0].count)
    });
  } catch (err) {
    console.error('[Reviews] Error fetching admin reviews:', err);
    res.status(500).json({ error: 'Ошибка при получении отзывов' });
  }
});

// ADMIN: Модерировать отзыв (одобрить/отклонить)
router.put('/admin/:id/moderate', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_published, is_verified } = req.body;
    
    const result = await pool.query(
      `UPDATE brand_reviews 
       SET is_moderated = true, is_published = $1, is_verified = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [is_published, is_verified, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Отзыв не найден' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[Reviews] Error moderating review:', err);
    res.status(500).json({ error: 'Ошибка при модерации отзыва' });
  }
});

// ADMIN: Добавить ответ на отзыв
router.put('/admin/:id/response', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { response_text, response_author } = req.body;
    
    const result = await pool.query(
      `UPDATE brand_reviews 
       SET response_text = $1, response_author = $2, response_date = NOW(), updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [response_text, response_author, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Отзыв не найден' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[Reviews] Error adding response:', err);
    res.status(500).json({ error: 'Ошибка при добавлении ответа' });
  }
});

// ADMIN: Удалить отзыв
router.delete('/admin/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM brand_reviews WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Отзыв не найден' });
    }
    
    res.json({ message: 'Отзыв удалён' });
  } catch (err) {
    console.error('[Reviews] Error deleting review:', err);
    res.status(500).json({ error: 'Ошибка при удалении отзыва' });
  }
});

export default router;

