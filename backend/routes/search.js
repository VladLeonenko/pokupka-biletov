import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Умный поиск товаров
router.get('/', async (req, res) => {
  try {
    const {
      q, // поисковый запрос
      categoryId,
      minPrice,
      maxPrice,
      tags,
      inStock,
      sortBy = 'created_desc', // price_asc, price_desc, name_asc, name_desc, created_desc, popularity
      limit = 50,
      offset = 0,
    } = req.query || {};
    
    let query = 'SELECT p.* FROM products p';
    const conditions = [];
    const params = [];
    let paramIndex = 1;
    
    // Всегда фильтруем по активности если не указано иное
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' || req.query.isActive === true : true;
    if (isActive) {
      conditions.push(`p.is_active = TRUE`);
    }
    
    // Поиск по тексту (title, description, tags)
    if (q) {
      conditions.push(`(
        p.title ILIKE $${paramIndex} OR 
        p.description_html ILIKE $${paramIndex} OR
        EXISTS (SELECT 1 FROM unnest(p.tags) tag WHERE tag ILIKE $${paramIndex})
      )`);
      params.push(`%${q}%`);
      paramIndex++;
    }
    
    // Фильтр по категории
    if (categoryId) {
      conditions.push(`p.category_id = $${paramIndex}`);
      params.push(categoryId);
      paramIndex++;
    }
    
    // Фильтр по цене
    if (minPrice !== undefined) {
      conditions.push(`p.price_cents >= $${paramIndex}`);
      params.push(minPrice * 100); // конвертируем в центы
      paramIndex++;
    }
    if (maxPrice !== undefined) {
      conditions.push(`p.price_cents <= $${paramIndex}`);
      params.push(maxPrice * 100);
      paramIndex++;
    }
    
    // Фильтр по тегам
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      conditions.push(`p.tags && $${paramIndex}::text[]`);
      params.push(tagArray);
      paramIndex++;
    }
    
    // Фильтр по наличию
    if (inStock === 'true') {
      conditions.push(`(p.stock_quantity IS NULL OR p.stock_quantity > 0)`);
    }
    
    // Всегда добавляем WHERE, так как isActive уже добавлен выше
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    // Сортировка
    switch (sortBy) {
      case 'price_asc':
        query += ' ORDER BY p.price_cents ASC NULLS LAST';
        break;
      case 'price_desc':
        query += ' ORDER BY p.price_cents DESC NULLS LAST';
        break;
      case 'name_asc':
        query += ' ORDER BY p.title ASC';
        break;
      case 'name_desc':
        query += ' ORDER BY p.title DESC';
        break;
      case 'popularity':
        query += ` ORDER BY (
          SELECT COUNT(*) FROM product_analytics pa 
          WHERE pa.product_slug = p.slug 
          AND pa.event_type IN ('view', 'click', 'add_to_cart', 'purchase')
          AND pa.created_at > NOW() - INTERVAL '30 days'
        ) DESC NULLS LAST, p.created_at DESC`;
        break;
      case 'created_desc':
      default:
        query += ' ORDER BY p.sort_order ASC, p.created_at DESC';
        break;
    }
    
    // Лимит и оффсет
    const limitValue = parseInt(limit) || 50;
    const offsetValue = parseInt(offset) || 0;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limitValue, offsetValue);
    
    // Логируем для отладки
    
    try {
      const r = await pool.query(query, params);
      
      // Получаем общее количество для пагинации
      let countQuery = 'SELECT COUNT(*) as total FROM products p';
      const countParams = [];
      let countParamIndex = 1;
      
      // Строим условия для countQuery с нумерацией параметров заново
      const countConditions = [];
      
      // Всегда фильтруем по активности если не указано иное
      const countIsActive = req.query.isActive !== undefined ? req.query.isActive === 'true' || req.query.isActive === true : true;
      if (countIsActive) {
        countConditions.push(`p.is_active = TRUE`);
      }
      
      if (q) {
        countConditions.push(`(
          p.title ILIKE $${countParamIndex} OR 
          p.description_html ILIKE $${countParamIndex} OR
          EXISTS (SELECT 1 FROM unnest(p.tags) tag WHERE tag ILIKE $${countParamIndex})
        )`);
        countParams.push(`%${q}%`);
        countParamIndex++;
      }
      
      if (categoryId) {
        countConditions.push(`p.category_id = $${countParamIndex}`);
        countParams.push(categoryId);
        countParamIndex++;
      }
      
      if (minPrice !== undefined) {
        countConditions.push(`p.price_cents >= $${countParamIndex}`);
        countParams.push(minPrice * 100);
        countParamIndex++;
      }
      if (maxPrice !== undefined) {
        countConditions.push(`p.price_cents <= $${countParamIndex}`);
        countParams.push(maxPrice * 100);
        countParamIndex++;
      }
      
      if (tags) {
        const tagArray = Array.isArray(tags) ? tags : [tags];
        countConditions.push(`p.tags && $${countParamIndex}::text[]`);
        countParams.push(tagArray);
        countParamIndex++;
      }
      
      if (inStock === 'true') {
        countConditions.push(`(p.stock_quantity IS NULL OR p.stock_quantity > 0)`);
      }
      
      // Всегда добавляем WHERE, так как isActive уже добавлен выше
      if (countConditions.length > 0) {
        countQuery += ' WHERE ' + countConditions.join(' AND ');
      }
    
      
      const countResult = await pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);
      
      const products = r.rows.map(row => ({
        slug: row.slug,
        title: row.title,
        descriptionHtml: row.description_html,
        priceCents: row.price_cents,
        currency: row.currency,
        pricePeriod: row.price_period,
        features: row.features || [],
        isActive: row.is_active,
        sortOrder: row.sort_order,
        categoryId: row.category_id,
        imageUrl: row.image_url,
        gallery: row.gallery || [],
        stockQuantity: row.stock_quantity,
        sku: row.sku,
        tags: row.tags || [],
        contentJson: row.content_json,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
      
      res.json({
        products,
        total,
        limit: limitValue,
        offset: offsetValue,
      });
    } catch (queryError) {
      console.error('[SEARCH] Query error:', queryError);
      throw queryError;
    }
  } catch (e) {
    console.error('[SEARCH] Error:', e);
    console.error('[SEARCH] Stack:', e.stack);
    res.status(500).json({ error: e.message });
  }
});

// Получить категории для фильтров
router.get('/categories', async (req, res) => {
  try {
    // Проверяем, существует ли колонка is_active в product_categories
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'product_categories' AND column_name = 'is_active'
    `);
    
    const hasIsActive = columnCheck.rows.length > 0;
    const isActiveFilter = hasIsActive ? 'WHERE c.is_active = TRUE' : '';
    
    const r = await pool.query(`
      SELECT c.*, COUNT(p.id) as product_count
      FROM product_categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.is_active = TRUE
      ${isActiveFilter}
      GROUP BY c.id
      ORDER BY c.sort_order ASC, c.name ASC
    `);
    
    res.json(r.rows.map(row => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      parentId: row.parent_id,
      sortOrder: row.sort_order,
      productCount: parseInt(row.product_count),
    })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Получить все теги
router.get('/tags', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT DISTINCT unnest(tags) as tag
      FROM products
      WHERE is_active = TRUE AND tags IS NOT NULL AND array_length(tags, 1) > 0
      ORDER BY tag ASC
    `);
    
    res.json(r.rows.map(row => row.tag));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

