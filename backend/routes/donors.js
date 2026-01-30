import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Получить всех доноров по категориям
router.get('/', async (req, res) => {
  console.log('GET /api/donors called');
  try {
    const result = await pool.query(
      'SELECT * FROM donors WHERE is_active = TRUE ORDER BY category, sort_order ASC'
    );
    
    // Группируем по категориям
    const grouped = {};
    result.rows.forEach(row => {
      if (!grouped[row.category]) {
        grouped[row.category] = [];
      }
      grouped[row.category].push({
        id: row.id,
        url: row.url,
        sortOrder: row.sort_order,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });
    });
    
    res.json(grouped);
  } catch (error) {
    console.error('Ошибка получения доноров:', error);
    res.status(500).json({ error: 'Ошибка получения доноров' });
  }
});

// Получить доноров конкретной категории
router.get('/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const result = await pool.query(
      'SELECT * FROM donors WHERE category = $1 AND is_active = TRUE ORDER BY sort_order ASC',
      [category]
    );
    
    res.json(result.rows.map(row => ({
      id: row.id,
      url: row.url,
      sortOrder: row.sort_order,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })));
  } catch (error) {
    console.error('Ошибка получения доноров категории:', error);
    res.status(500).json({ error: 'Ошибка получения доноров категории' });
  }
});

// Создать нового донора
router.post('/', requireAuth, async (req, res) => {
  try {
    const { category, url, sortOrder } = req.body;
    
    if (!category || !url) {
      return res.status(400).json({ error: 'Категория и URL обязательны' });
    }
    
    // Валидация URL
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Некорректный URL' });
    }
    
    const result = await pool.query(
      `INSERT INTO donors (category, url, sort_order) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [category, url, sortOrder || 0]
    );
    
    res.json({
      id: result.rows[0].id,
      category: result.rows[0].category,
      url: result.rows[0].url,
      sortOrder: result.rows[0].sort_order,
      isActive: result.rows[0].is_active,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
    });
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Такой донор уже существует' });
    }
    console.error('Ошибка создания донора:', error);
    res.status(500).json({ error: 'Ошибка создания донора' });
  }
});

// Обновить донора
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { category, url, sortOrder, isActive } = req.body;
    
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      values.push(category);
    }
    if (url !== undefined) {
      // Валидация URL
      try {
        new URL(url);
      } catch {
        return res.status(400).json({ error: 'Некорректный URL' });
      }
      updates.push(`url = $${paramIndex++}`);
      values.push(url);
    }
    if (sortOrder !== undefined) {
      updates.push(`sort_order = $${paramIndex++}`);
      values.push(sortOrder);
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(isActive);
    }
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    
    const result = await pool.query(
      `UPDATE donors 
       SET ${updates.join(', ')} 
       WHERE id = $${paramIndex} 
       RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Донор не найден' });
    }
    
    res.json({
      id: result.rows[0].id,
      category: result.rows[0].category,
      url: result.rows[0].url,
      sortOrder: result.rows[0].sort_order,
      isActive: result.rows[0].is_active,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
    });
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Такой донор уже существует' });
    }
    console.error('Ошибка обновления донора:', error);
    res.status(500).json({ error: 'Ошибка обновления донора' });
  }
});

// Удалить донора
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM donors WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Донор не найден' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка удаления донора:', error);
    res.status(500).json({ error: 'Ошибка удаления донора' });
  }
});

// Массовое обновление доноров (для сохранения порядка)
router.post('/bulk-update', requireAuth, async (req, res) => {
  try {
    const { donors } = req.body; // Массив { id, sortOrder, isActive }
    
    if (!Array.isArray(donors)) {
      return res.status(400).json({ error: 'Ожидается массив доноров' });
    }
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      for (const donor of donors) {
        await client.query(
          'UPDATE donors SET sort_order = $1, is_active = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
          [donor.sortOrder || 0, donor.isActive !== undefined ? donor.isActive : true, donor.id]
        );
      }
      
      await client.query('COMMIT');
      res.json({ success: true });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Ошибка массового обновления доноров:', error);
    res.status(500).json({ error: 'Ошибка массового обновления доноров' });
  }
});

export default router;

