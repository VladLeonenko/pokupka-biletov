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

function rowToProduct(r, categoryIds = null) {
  const catIds = categoryIds ?? (r.category_ids ? r.category_ids.map(Number).filter(Boolean) : null);
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
    categoryIds: catIds?.length ? catIds : (r.category_id ? [r.category_id] : undefined),
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
  
  let query = `SELECT p.*, 
    COALESCE(
      (SELECT array_agg(pcl.category_id ORDER BY pcl.category_id) FROM product_category_links pcl WHERE pcl.product_slug = p.slug),
      CASE WHEN p.category_id IS NOT NULL THEN ARRAY[p.category_id] ELSE ARRAY[]::integer[] END
    ) as category_ids
    FROM products p`;
  if (activeOnly) {
    query += ' WHERE p.is_active = TRUE';
  }
  query += ' ORDER BY p.sort_order ASC, p.created_at DESC';
  
  const r = await pool.query(query);
  res.json(r.rows.map((row) => rowToProduct(row, row.category_ids)));
});

router.get('/:slug', async (req, res) => {
  const r = await pool.query(`
    SELECT p.*, 
      COALESCE(
        (SELECT array_agg(pcl.category_id ORDER BY pcl.category_id) FROM product_category_links pcl WHERE pcl.product_slug = p.slug),
        CASE WHEN p.category_id IS NOT NULL THEN ARRAY[p.category_id] ELSE ARRAY[]::integer[] END
      ) as category_ids
    FROM products p WHERE p.slug=$1
  `, [req.params.slug]);
  if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rowToProduct(r.rows[0], r.rows[0].category_ids));
});

router.post('/', async (req, res) => {
  const { 
    slug, title, descriptionHtml, summary, fullDescriptionHtml,
    priceCents, currency, pricePeriod, features, isActive, sortOrder, 
    contentJson, categoryId, categoryIds, imageUrl, gallery, stockQuantity, sku, tags,
    metaTitle, metaDescription, metaKeywords, caseSlugs
  } = req.body || {};
  
  const ids = Array.isArray(categoryIds) && categoryIds.length
    ? categoryIds.filter(Boolean).map(Number)
    : (categoryId != null ? [Number(categoryId)] : []);
  const primaryCatId = ids[0] ?? categoryId ?? null;

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
      primaryCatId, imageUrl, gallery || [], stockQuantity, sku, tags || [],
      metaTitle, metaDescription, metaKeywords, caseSlugs || []
    ]
  );

  if (ids.length > 0) {
    await pool.query(
      'DELETE FROM product_category_links WHERE product_slug = $1',
      [slug]
    );
    for (const cid of ids) {
      await pool.query(
        'INSERT INTO product_category_links (product_slug, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [slug, cid]
      );
    }
  }

  const r = await pool.query(`
    SELECT p.*, (SELECT array_agg(pcl.category_id ORDER BY pcl.category_id) FROM product_category_links pcl WHERE pcl.product_slug = p.slug) as category_ids
    FROM products p WHERE p.slug=$1
  `, [slug]);
  const row = r.rows[0];
  row.category_ids = row.category_ids || (row.category_id ? [row.category_id] : []);
  res.json({ created: rowToProduct(row, row.category_ids) });
});

router.put('/:slug', async (req, res) => {
  const { 
    title, descriptionHtml, summary, fullDescriptionHtml,
    priceCents, currency, pricePeriod, features, isActive, sortOrder, 
    contentJson, categoryId, categoryIds, imageUrl, gallery, stockQuantity, sku, tags,
    metaTitle, metaDescription, metaKeywords, caseSlugs
  } = req.body || {};
  
  const ids = categoryIds !== undefined
    ? (Array.isArray(categoryIds) ? categoryIds : [categoryIds]).filter(Boolean).map(Number)
    : (categoryId !== undefined ? [Number(categoryId)] : null);
  const primaryCatId = ids !== null ? (ids[0] ?? null) : undefined;
  
  const finalImageUrl = imageUrl !== undefined ? imageUrl : null;
  const finalGallery = gallery !== undefined ? gallery : [];

  const updateFields = [
    req.params.slug, title, descriptionHtml, summary, fullDescriptionHtml,
    priceCents, currency, pricePeriod, features || [], isActive, sortOrder, 
    contentJson ? JSON.stringify(contentJson) : null, 
    primaryCatId !== undefined ? primaryCatId : null, finalImageUrl, finalGallery, stockQuantity, sku, tags || [],
    metaTitle, metaDescription, metaKeywords, caseSlugs || []
  ];

  let r;
  if (primaryCatId !== undefined) {
    r = await pool.query(
      `UPDATE products SET 
        title=COALESCE($2,title), description_html=COALESCE($3,description_html), summary=$4,
        full_description_html=$5, price_cents=COALESCE($6,price_cents), currency=COALESCE($7,currency),
        price_period=COALESCE($8,price_period), features=COALESCE($9,features), is_active=COALESCE($10,is_active),
        sort_order=COALESCE($11,sort_order), content_json=$12, category_id=$13, image_url=$14,
        gallery=$15, stock_quantity=$16, sku=COALESCE($17,sku), tags=COALESCE($18,tags),
        meta_title=$19, meta_description=$20, meta_keywords=$21, case_slugs=COALESCE($22,case_slugs),
        updated_at=NOW() WHERE slug=$1 RETURNING *`,
      updateFields
    );
  } else {
    r = await pool.query(
      `UPDATE products SET 
        title=COALESCE($2,title), description_html=COALESCE($3,description_html), summary=$4,
        full_description_html=$5, price_cents=COALESCE($6,price_cents), currency=COALESCE($7,currency),
        price_period=COALESCE($8,price_period), features=COALESCE($9,features), is_active=COALESCE($10,is_active),
        sort_order=COALESCE($11,sort_order), content_json=$12, image_url=$14,
        gallery=$15, stock_quantity=$16, sku=COALESCE($17,sku), tags=COALESCE($18,tags),
        meta_title=$19, meta_description=$20, meta_keywords=$21, case_slugs=COALESCE($22,case_slugs),
        updated_at=NOW() WHERE slug=$1 RETURNING *`,
      updateFields.slice(0, 12).concat(updateFields.slice(13))
    );
  }
  
  if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });

  if (ids !== null) {
    await pool.query('DELETE FROM product_category_links WHERE product_slug = $1', [req.params.slug]);
    for (const cid of ids) {
      await pool.query(
        'INSERT INTO product_category_links (product_slug, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [req.params.slug, cid]
      );
    }
  }

  const rowRes = await pool.query(`
    SELECT p.*, (SELECT array_agg(pcl.category_id ORDER BY pcl.category_id) FROM product_category_links pcl WHERE pcl.product_slug = p.slug) as category_ids
    FROM products p WHERE p.slug=$1
  `, [req.params.slug]);
  const row = rowRes.rows[0];
  row.category_ids = row.category_ids || (row.category_id ? [row.category_id] : []);
  res.json({ updated: rowToProduct(row, row.category_ids) });
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




