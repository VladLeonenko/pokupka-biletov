import express from 'express';
import pool from '../db.js';

const router = express.Router();

function parseJsonField(value, fallback = null) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function rowToProduct(r) {
  return {
    slug: r.slug,
    title: r.title,
    descriptionHtml: r.description_html,
    summary: r.summary,
    fullDescriptionHtml: r.full_description_html,
    priceCents: r.price_cents,
    currency: r.currency,
    pricePeriod: r.price_period,
    features: r.features || [],
    isActive: r.is_active,
    sortOrder: r.sort_order || 0,
    contentJson: parseJsonField(r.content_json),
    categoryId: r.category_id,
    imageUrl: r.image_url,
    gallery: r.gallery || [],
    stockQuantity: r.stock_quantity,
    sku: r.sku,
    tags: r.tags || [],
    metaTitle: r.meta_title,
    metaDescription: r.meta_description,
    metaKeywords: r.meta_keywords,
    caseSlugs: r.case_slugs || [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

router.get('/', async (req, res) => {
  const isPublic = req.originalUrl.includes('/api/public');
  const activeOnly = isPublic || req.query.active === 'true';
  
  let query = 'SELECT * FROM products';
  if (activeOnly) {
    query += ' WHERE is_active = TRUE';
  }
  query += ' ORDER BY sort_order ASC, created_at DESC';
  
  const r = await pool.query(query);
  res.json(r.rows.map(rowToProduct));
});

router.get('/:slug', async (req, res) => {
  const r = await pool.query('SELECT * FROM products WHERE slug=$1', [req.params.slug]);
  if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rowToProduct(r.rows[0]));
});

router.post('/', async (req, res) => {
  const { 
    slug, title, descriptionHtml, summary, fullDescriptionHtml,
    priceCents, currency, pricePeriod, features, isActive, sortOrder, 
    contentJson, categoryId, imageUrl, gallery, stockQuantity, sku, tags,
    metaTitle, metaDescription, metaKeywords, caseSlugs
  } = req.body || {};
  
  await pool.query(
    `INSERT INTO products(
      slug, title, description_html, summary, full_description_html,
      price_cents, currency, price_period, features, is_active, sort_order,
      content_json, category_id, image_url, gallery, stock_quantity, sku, tags,
      meta_title, meta_description, meta_keywords, case_slugs
    ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)`,
    [
      slug, title, descriptionHtml, summary, fullDescriptionHtml,
      priceCents || 0, currency || 'RUB', pricePeriod || 'one_time', 
      features || [], isActive !== false, sortOrder || 0, 
      contentJson ? JSON.stringify(contentJson) : null, 
      categoryId, imageUrl, gallery || [], stockQuantity, sku, tags || [],
      metaTitle, metaDescription, metaKeywords, caseSlugs || []
    ]
  );
  const r = await pool.query('SELECT * FROM products WHERE slug=$1', [slug]);
  res.json({ created: rowToProduct(r.rows[0]) });
});

router.put('/:slug', async (req, res) => {
  const { 
    title, descriptionHtml, summary, fullDescriptionHtml,
    priceCents, currency, pricePeriod, features, isActive, sortOrder, 
    contentJson, categoryId, imageUrl, gallery, stockQuantity, sku, tags,
    metaTitle, metaDescription, metaKeywords, caseSlugs
  } = req.body || {};
  
  // Важно: если imageUrl передан (даже пустая строка), обновляем его
  // COALESCE не обновит поле если передан NULL/undefined
  const finalImageUrl = imageUrl !== undefined ? imageUrl : null;
  const finalGallery = gallery !== undefined ? gallery : [];
  
  const r = await pool.query(
    `UPDATE products SET 
      title=COALESCE($2,title), 
      description_html=COALESCE($3,description_html),
      summary=$4,
      full_description_html=$5,
      price_cents=COALESCE($6,price_cents), 
      currency=COALESCE($7,currency), 
      price_period=COALESCE($8,price_period), 
      features=COALESCE($9,features), 
      is_active=COALESCE($10,is_active), 
      sort_order=COALESCE($11,sort_order), 
      content_json=$12, 
      category_id=$13, 
      image_url=$14, 
      gallery=$15, 
      stock_quantity=$16, 
      sku=COALESCE($17,sku), 
      tags=COALESCE($18,tags),
      meta_title=$19,
      meta_description=$20,
      meta_keywords=$21,
      case_slugs=COALESCE($22,case_slugs),
      updated_at=NOW() 
    WHERE slug=$1 RETURNING *`,
    [
      req.params.slug, title, descriptionHtml, summary, fullDescriptionHtml,
      priceCents, currency, pricePeriod, features || [], isActive, sortOrder, 
      contentJson ? JSON.stringify(contentJson) : null, 
      categoryId, finalImageUrl, finalGallery, stockQuantity, sku, tags || [],
      metaTitle, metaDescription, metaKeywords, caseSlugs || []
    ]
  );
  
  if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json({ updated: rowToProduct(r.rows[0]) });
});

// Обновить сортировку продуктов (drag & drop)
router.post('/reorder', async (req, res) => {
  try {
    const { items } = req.body || {}; // массив { slug, sortOrder }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array required' });
    }
    
    // Обновляем sort_order для каждого продукта
    for (const item of items) {
      await pool.query('UPDATE products SET sort_order=$1, updated_at=NOW() WHERE slug=$2', [item.sortOrder, item.slug]);
    }
    
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:slug', async (req, res) => {
  await pool.query('DELETE FROM products WHERE slug=$1', [req.params.slug]);
  res.json({ ok: true });
});

export default router;




