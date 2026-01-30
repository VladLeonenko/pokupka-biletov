import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

function rowToSocialProof(r) {
  return {
    id: r.id,
    type: r.type,
    title: r.title,
    description: r.description,
    imageUrl: r.image_url,
    value: r.value,
    label: r.label,
    authorName: r.author_name,
    authorPosition: r.author_position,
    authorCompany: r.author_company,
    rating: r.rating,
    linkUrl: r.link_url,
    isActive: r.is_active,
    sortOrder: r.sort_order,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}

// GET /api/public/social-proofs - Публичный список
router.get('/public', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM social_proofs 
      WHERE is_active = TRUE 
      ORDER BY sort_order ASC, created_at DESC
    `);
    res.json(result.rows.map(rowToSocialProof));
  } catch (error) {
    console.error('[SocialProofs] Error fetching:', error);
    res.status(500).json({ error: 'Failed to fetch social proofs' });
  }
});

// GET /api/social-proofs - Список (админ)
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM social_proofs 
      ORDER BY sort_order ASC, created_at DESC
    `);
    res.json(result.rows.map(rowToSocialProof));
  } catch (error) {
    console.error('[SocialProofs] Error fetching:', error);
    res.status(500).json({ error: 'Failed to fetch social proofs' });
  }
});

// POST /api/social-proofs - Создать
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      type, title, description, imageUrl, value, label,
      authorName, authorPosition, authorCompany, rating, linkUrl,
      isActive, sortOrder
    } = req.body;
    
    const result = await pool.query(`
      INSERT INTO social_proofs (
        type, title, description, image_url, value, label,
        author_name, author_position, author_company, rating, link_url,
        is_active, sort_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      type, title, description, imageUrl, value, label,
      authorName, authorPosition, authorCompany, rating, linkUrl,
      isActive !== false, sortOrder || 0
    ]);
    
    res.status(201).json(rowToSocialProof(result.rows[0]));
  } catch (error) {
    console.error('[SocialProofs] Error creating:', error);
    res.status(500).json({ error: 'Failed to create social proof' });
  }
});

// PUT /api/social-proofs/:id - Обновить
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      type, title, description, imageUrl, value, label,
      authorName, authorPosition, authorCompany, rating, linkUrl,
      isActive, sortOrder
    } = req.body;
    
    const result = await pool.query(`
      UPDATE social_proofs SET
        type = COALESCE($1, type),
        title = COALESCE($2, title),
        description = COALESCE($3, description),
        image_url = COALESCE($4, image_url),
        value = COALESCE($5, value),
        label = COALESCE($6, label),
        author_name = COALESCE($7, author_name),
        author_position = COALESCE($8, author_position),
        author_company = COALESCE($9, author_company),
        rating = COALESCE($10, rating),
        link_url = COALESCE($11, link_url),
        is_active = COALESCE($12, is_active),
        sort_order = COALESCE($13, sort_order),
        updated_at = NOW()
      WHERE id = $14
      RETURNING *
    `, [
      type, title, description, imageUrl, value, label,
      authorName, authorPosition, authorCompany, rating, linkUrl,
      isActive, sortOrder, id
    ]);
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Not found' });
    }
    
    res.json(rowToSocialProof(result.rows[0]));
  } catch (error) {
    console.error('[SocialProofs] Error updating:', error);
    res.status(500).json({ error: 'Failed to update social proof' });
  }
});

// DELETE /api/social-proofs/:id - Удалить
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM social_proofs WHERE id = $1', [id]);
    res.json({ deleted: true });
  } catch (error) {
    console.error('[SocialProofs] Error deleting:', error);
    res.status(500).json({ error: 'Failed to delete social proof' });
  }
});

export default router;
