import express from 'express';
import pool from '../db.js';

const router = express.Router();

function rowToPromotion(r) {
  return {
    id: r.id,
    title: r.title || '',
    description: r.description || '',
    expiryDate: r.expiry_date ? r.expiry_date.toISOString().split('T')[0] : null,
    expiryText: r.expiry_text || null,
    buttonText: r.button_text || 'Получить скидку',
    formId: r.form_id || null,
    isActive: r.is_active ?? true,
    sortOrder: r.sort_order || 0,
    promoCode: r.promo_code || null,
    hiddenLocation: r.hidden_location || null,
    discountPercent: r.discount_percent || 0,
    discountAmount: r.discount_amount ? parseFloat(r.discount_amount) : 0,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// Get all promotions
router.get('/', async (req, res) => {
  try {
    const isPublic = req.originalUrl.includes('/api/public');
    let query = 'SELECT * FROM promotions';
    if (isPublic) {
      query += ' WHERE is_active = TRUE';
    }
    query += ' ORDER BY sort_order ASC, created_at DESC';
    const { rows } = await pool.query(query);
    res.json(rows.map(rowToPromotion));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single promotion by ID
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM promotions WHERE id = $1', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Promotion not found' });
    }
    res.json(rowToPromotion(rows[0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create promotion
router.post('/', async (req, res) => {
  try {
    const {
      title,
      description,
      expiryDate,
      expiryText,
      buttonText,
      formId,
      isActive,
      sortOrder,
      promoCode,
      hiddenLocation,
      discountPercent,
      discountAmount,
    } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO promotions (title, description, expiry_date, expiry_text, button_text, form_id, is_active, sort_order, promo_code, hidden_location, discount_percent, discount_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        title,
        description || null,
        expiryDate || null,
        expiryText || null,
        buttonText || 'Получить скидку',
        formId || null,
        isActive ?? true,
        sortOrder || 0,
        promoCode || null,
        hiddenLocation || null,
        discountPercent || 0,
        discountAmount || 0,
      ]
    );

    res.status(201).json(rowToPromotion(rows[0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update promotion
router.put('/:id', async (req, res) => {
  try {
    const {
      title,
      description,
      expiryDate,
      expiryText,
      buttonText,
      formId,
      isActive,
      sortOrder,
      promoCode,
      hiddenLocation,
      discountPercent,
      discountAmount,
    } = req.body;

    const { rows } = await pool.query(
      `UPDATE promotions
       SET title = $1, description = $2, expiry_date = $3, expiry_text = $4, button_text = $5, form_id = $6, is_active = $7, sort_order = $8, promo_code = $9, hidden_location = $10, discount_percent = $11, discount_amount = $12, updated_at = CURRENT_TIMESTAMP
       WHERE id = $13
       RETURNING *`,
      [
        title,
        description || null,
        expiryDate || null,
        expiryText || null,
        buttonText || 'Получить скидку',
        formId || null,
        isActive ?? true,
        sortOrder || 0,
        promoCode || null,
        hiddenLocation || null,
        discountPercent || 0,
        discountAmount || 0,
        req.params.id,
      ]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Promotion not found' });
    }

    res.json(rowToPromotion(rows[0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete promotion
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('DELETE FROM promotions WHERE id = $1 RETURNING *', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Promotion not found' });
    }
    res.json({ message: 'Promotion deleted', id: rows[0].id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Validate promo code
router.post('/validate-promo', async (req, res) => {
  try {
    const { promoCode } = req.body;
    
    if (!promoCode) {
      return res.status(400).json({ error: 'Promo code is required' });
    }

    const { rows } = await pool.query(
      `SELECT * FROM promotions 
       WHERE LOWER(promo_code) = LOWER($1) 
       AND is_active = TRUE 
       AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)`,
      [promoCode.trim()]
    );

    if (rows.length === 0) {
      return res.status(404).json({ 
        valid: false, 
        error: 'Промокод не найден или недействителен' 
      });
    }

    const promotion = rowToPromotion(rows[0]);
    res.json({
      valid: true,
      promotion: {
        id: promotion.id,
        title: promotion.title,
        discountPercent: promotion.discountPercent,
        discountAmount: promotion.discountAmount,
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;



