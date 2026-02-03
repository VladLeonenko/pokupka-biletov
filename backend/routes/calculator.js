import express from 'express';
import pool from '../db.js';

const router = express.Router();

router.get('/options', async (req, res) => {
  try {
    const siteTypes = await pool.query(
      'SELECT id, name, slug, base_price as "basePrice", base_days as "baseDays", description FROM calculator_site_types WHERE is_active = true ORDER BY sort_order'
    );
    const designComplexity = await pool.query(
      'SELECT id, name, slug, multiplier, description FROM calculator_design_complexity WHERE is_active = true ORDER BY sort_order'
    );
    const features = await pool.query(
      'SELECT id, name, slug, price, days, category, description FROM calculator_features WHERE is_active = true ORDER BY sort_order'
    );
    res.json({
      siteTypes: siteTypes.rows,
      designComplexity: designComplexity.rows,
      features: features.rows
    });
  } catch (error) {
    console.error('Calculator options error:', error);
    res.status(500).json({ error: 'Ошибка загрузки опций' });
  }
});

router.post('/calculate', async (req, res) => {
  try {
    const { siteTypeId, designComplexityId, featureIds = [] } = req.body;
    if (!siteTypeId || !designComplexityId) {
      return res.status(400).json({ error: 'Укажите тип сайта и сложность дизайна' });
    }
    const siteType = await pool.query(
      'SELECT base_price, base_days FROM calculator_site_types WHERE id = $1', [siteTypeId]
    );
    const design = await pool.query(
      'SELECT multiplier FROM calculator_design_complexity WHERE id = $1', [designComplexityId]
    );
    let featuresPrice = 0, featuresDays = 0;
    if (featureIds.length > 0) {
      const f = await pool.query(
        'SELECT SUM(price) as tp, SUM(days) as td FROM calculator_features WHERE id = ANY($1)', [featureIds]
      );
      featuresPrice = parseInt(f.rows[0].tp) || 0;
      featuresDays = parseInt(f.rows[0].td) || 0;
    }
    const basePrice = siteType.rows[0].base_price;
    const baseDays = siteType.rows[0].base_days;
    const multiplier = parseFloat(design.rows[0].multiplier);
    const totalPrice = Math.round((basePrice * multiplier) + featuresPrice);
    const totalDays = Math.round((baseDays * multiplier) + featuresDays);
    res.json({ basePrice, baseDays, multiplier, featuresPrice, featuresDays, totalPrice, totalDays });
  } catch (error) {
    console.error('Calculate error:', error);
    res.status(500).json({ error: 'Ошибка расчёта' });
  }
});

router.post('/request', async (req, res) => {
  try {
    const { siteTypeId, designComplexityId, featureIds, totalPrice, totalDays, clientName, clientEmail, clientPhone, comment } = req.body;
    const result = await pool.query(
      'INSERT INTO calculator_requests (site_type_id, design_complexity_id, feature_ids, total_price, total_days, client_name, client_email, client_phone, comment) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id',
      [siteTypeId, designComplexityId, featureIds || [], totalPrice, totalDays, clientName, clientEmail, clientPhone, comment]
    );
    res.json({ success: true, requestId: result.rows[0].id });
  } catch (error) {
    console.error('Request error:', error);
    res.status(500).json({ error: 'Ошибка сохранения' });
  }
});

export default router;
