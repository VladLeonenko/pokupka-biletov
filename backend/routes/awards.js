import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

function rowToAward(r) {
  return {
    id: r.id,
    year: r.year,
    description: r.description,
    caseSlug: r.case_slug,
    externalUrl: r.external_url,
    sortOrder: r.sort_order,
    isActive: r.is_active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// Публичный API - получить все активные награды
router.get('/public', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM awards WHERE is_active = TRUE ORDER BY year DESC, sort_order ASC'
    );
    res.json(result.rows.map(rowToAward));
  } catch (error) {
    // Если таблица не существует, возвращаем пустой массив
    if (error.message && error.message.includes('does not exist')) {
      console.warn('Awards table does not exist yet, returning empty array');
      return res.json([]);
    }
    console.error('Error fetching awards:', error);
    // В случае других ошибок тоже возвращаем пустой массив, чтобы фронтенд не падал
    res.json([]);
  }
});

// Админ API - получить все награды
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM awards ORDER BY year DESC, sort_order ASC'
    );
    res.json(result.rows.map(rowToAward));
  } catch (error) {
    console.error('Error fetching awards:', error);
    res.status(500).json({ error: 'Failed to fetch awards' });
  }
});

// Админ API - получить одну награду
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM awards WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Award not found' });
    }
    res.json(rowToAward(result.rows[0]));
  } catch (error) {
    console.error('Error fetching award:', error);
    res.status(500).json({ error: 'Failed to fetch award' });
  }
});

// Админ API - создать награду
router.post('/', requireAuth, async (req, res) => {
  try {
    const { year, description, caseSlug, externalUrl, sortOrder, isActive } = req.body;
    
    const result = await pool.query(
      `INSERT INTO awards (year, description, case_slug, external_url, sort_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [year, description, caseSlug || null, externalUrl || null, sortOrder || 0, isActive !== undefined ? isActive : true]
    );
    
    res.json(rowToAward(result.rows[0]));
  } catch (error) {
    console.error('Error creating award:', error);
    res.status(500).json({ error: 'Failed to create award' });
  }
});

// Админ API - обновить награду
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { year, description, caseSlug, externalUrl, sortOrder, isActive } = req.body;
    
    const result = await pool.query(
      `UPDATE awards 
       SET year = COALESCE($1, year),
           description = COALESCE($2, description),
           case_slug = $3,
           external_url = $4,
           sort_order = COALESCE($5, sort_order),
           is_active = COALESCE($6, is_active),
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [year, description, caseSlug !== undefined ? (caseSlug || null) : undefined, 
       externalUrl !== undefined ? (externalUrl || null) : undefined, 
       sortOrder, isActive, req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Award not found' });
    }
    
    res.json(rowToAward(result.rows[0]));
  } catch (error) {
    console.error('Error updating award:', error);
    res.status(500).json({ error: 'Failed to update award' });
  }
});

// Админ API - удалить награду
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM awards WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Award not found' });
    }
    res.json({ deleted: rowToAward(result.rows[0]) });
  } catch (error) {
    console.error('Error deleting award:', error);
    res.status(500).json({ error: 'Failed to delete award' });
  }
});

export default router;
