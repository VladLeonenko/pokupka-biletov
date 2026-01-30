import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Получить все страницы или страницу по query parameter slug
router.get('/', async (req, res) => {
  try {
    const isPublic = req.originalUrl.includes('/api/public');
    
    // If slug query parameter is provided, return single page
    if (req.query.slug) {
      let slug = req.query.slug;
      if (typeof slug === 'string') {
        slug = slug.trim();
        if (slug === '/') {
          let query = 'SELECT * FROM pages WHERE slug = $1';
          const params = ['/'];
          if (isPublic) {
            query += ' AND is_published = TRUE';
          }
          const result = await pool.query(query, params);
          if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Page not found' });
          }
          return res.json(result.rows[0]);
        }
      }
    }
    
    // Otherwise return all pages
    let query = 'SELECT * FROM pages';
    if (isPublic) {
      query += ' WHERE is_published = TRUE';
    }
    query += ' ORDER BY id';
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Special route for root slug (must come before :slug)
router.get('/root', async (req, res) => {
  try {
    const isPublic = req.originalUrl.includes('/api/public');
    let query = 'SELECT * FROM pages WHERE slug = $1';
    const params = ['/'];
    
    if (isPublic) {
      query += ' AND is_published = TRUE';
    }
    
    const result = await pool.query(query, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Получить страницу по slug
router.get('/:slug', async (req, res) => {
  try {
    // Check if this is a public request (from /api/public/pages)
    const isPublic = req.originalUrl && req.originalUrl.includes('/api/public');
    
    // Handle URL-encoded root slug (%2F) - Express automatically decodes it, but we might get it double-encoded
    let slug = req.params.slug;
    if (typeof slug === 'string') {
      try {
        slug = decodeURIComponent(slug);
      } catch (e) {
        // If decoding fails, use original slug
      }
      // If it's still encoded, decode again
      while (slug.includes('%')) {
        try {
          slug = decodeURIComponent(slug);
        } catch (e) {
          break; // Stop if decoding fails
        }
      }
    }
    
    // Remove leading/trailing slashes except for root
    slug = String(slug).trim();
    if (!slug || slug === '') {
      slug = '/';
    } else if (slug !== '/') {
      // Ensure slug starts with / and remove trailing slash
      slug = '/' + slug.replace(/^\/+|\/+$/g, '');
    }
    
    let query = 'SELECT * FROM pages WHERE slug = $1';
    const params = [slug];
    
    // For public requests, only return published pages
    if (isPublic) {
      query += ' AND is_published = TRUE';
    }
    
    const result = await pool.query(query, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('[pages] Error fetching page:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Создать новую страницу
router.post('/', async (req, res) => {
  const { slug, title, body, seo_title, seo_description, seo_keywords, is_published,
    canonical_url, robots_index, robots_follow, og_title, og_description, og_image_url, twitter_card, twitter_site, twitter_creator, structured_data, hreflang } = req.body;
  try {
    await pool.query(
      `INSERT INTO pages (slug, title, body, seo_title, seo_description, seo_keywords, is_published,
       canonical_url, robots_index, robots_follow, og_title, og_description, og_image_url, twitter_card, twitter_site, twitter_creator, structured_data, hreflang) 
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, FALSE), $8, COALESCE($9, TRUE), COALESCE($10, TRUE), $11, $12, $13, $14, $15, $16, $17, $18)`,
      [slug, title, body, seo_title, seo_description, seo_keywords, is_published,
        canonical_url, robots_index, robots_follow, og_title, og_description, og_image_url, twitter_card, twitter_site, twitter_creator, structured_data, hreflang]
    );
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Обновить страницу по slug
router.put('/:slug', async (req, res) => {
  const { title, body, seo_title, seo_description, seo_keywords, is_published,
    canonical_url, robots_index, robots_follow, og_title, og_description, og_image_url, twitter_card, twitter_site, twitter_creator, structured_data, hreflang } = req.body;
  try {
    // Build dynamic UPDATE query - only update fields that are provided (not undefined/null)
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (title !== undefined && title !== null) {
      updates.push(`title=$${paramIndex}`);
      values.push(title);
      paramIndex++;
    }
    
    if (body !== undefined && body !== null) {
      updates.push(`body=$${paramIndex}`);
      values.push(body);
      paramIndex++;
    }
    
    if (seo_title !== undefined && seo_title !== null) {
      updates.push(`seo_title=$${paramIndex}`);
      values.push(seo_title);
      paramIndex++;
    }
    
    if (seo_description !== undefined && seo_description !== null) {
      updates.push(`seo_description=$${paramIndex}`);
      values.push(seo_description);
      paramIndex++;
    }
    
    if (seo_keywords !== undefined && seo_keywords !== null) {
      updates.push(`seo_keywords=$${paramIndex}`);
      values.push(seo_keywords);
      paramIndex++;
    }
    
    if (is_published !== undefined && is_published !== null) {
      updates.push(`is_published=$${paramIndex}`);
      values.push(Boolean(is_published));
      paramIndex++;
    }
    
    if (canonical_url !== undefined && canonical_url !== null) {
      updates.push(`canonical_url=$${paramIndex}`);
      values.push(canonical_url);
      paramIndex++;
    }
    
    if (robots_index !== undefined && robots_index !== null) {
      updates.push(`robots_index=$${paramIndex}`);
      values.push(Boolean(robots_index));
      paramIndex++;
    }
    
    if (robots_follow !== undefined && robots_follow !== null) {
      updates.push(`robots_follow=$${paramIndex}`);
      values.push(Boolean(robots_follow));
      paramIndex++;
    }
    
    if (og_title !== undefined && og_title !== null) {
      updates.push(`og_title=$${paramIndex}`);
      values.push(og_title);
      paramIndex++;
    }
    
    if (og_description !== undefined && og_description !== null) {
      updates.push(`og_description=$${paramIndex}`);
      values.push(og_description);
      paramIndex++;
    }
    
    if (og_image_url !== undefined && og_image_url !== null) {
      updates.push(`og_image_url=$${paramIndex}`);
      values.push(og_image_url);
      paramIndex++;
    }
    
    if (twitter_card !== undefined && twitter_card !== null) {
      updates.push(`twitter_card=$${paramIndex}`);
      values.push(twitter_card);
      paramIndex++;
    }
    
    if (twitter_site !== undefined && twitter_site !== null) {
      updates.push(`twitter_site=$${paramIndex}`);
      values.push(twitter_site);
      paramIndex++;
    }
    
    if (twitter_creator !== undefined && twitter_creator !== null) {
      updates.push(`twitter_creator=$${paramIndex}`);
      values.push(twitter_creator);
      paramIndex++;
    }
    
    if (structured_data !== undefined && structured_data !== null) {
      updates.push(`structured_data=$${paramIndex}`);
      values.push(structured_data);
      paramIndex++;
    }
    
    if (hreflang !== undefined && hreflang !== null) {
      updates.push(`hreflang=$${paramIndex}`);
      values.push(hreflang);
      paramIndex++;
    }
    
    // Always update updated_at
    updates.push('updated_at=NOW()');
    
    // Add WHERE clause
    values.push(req.params.slug);
    const whereClause = `WHERE slug=$${paramIndex}`;
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    const query = `UPDATE pages SET ${updates.join(', ')} ${whereClause} RETURNING *`;
    
    const result = await pool.query(query, values);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }
    res.json({ success: true, updated: result.rows[0] });
  } catch (error) {
    console.error('[pages] Error updating page:', error);
    res.status(500).json({ error: error.message });
  }
});

// Публикация / скрытие
router.post('/:slug/publish', async (req, res) => {
  const { is_published } = req.body;
  try {
    const result = await pool.query(
      `UPDATE pages SET is_published=$1, updated_at=NOW() WHERE slug=$2 RETURNING *`,
      [Boolean(is_published), req.params.slug]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Page not found' });
    res.json({ success: true, updated: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Перенос / смена slug
router.post('/:slug/move', async (req, res) => {
  const { newSlug } = req.body;
  try {
    const result = await pool.query(
      `UPDATE pages SET slug=$1, updated_at=NOW() WHERE slug=$2 RETURNING *`,
      [newSlug, req.params.slug]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Page not found' });
    res.json({ success: true, updated: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Удалить страницу по slug
router.delete('/:slug', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM pages WHERE slug=$1 RETURNING *', [req.params.slug]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Перенос страницы в блог (создать блог-пост из текущей страницы)
router.post('/:slug/move-to-blog', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query('SELECT * FROM pages WHERE slug = $1 FOR UPDATE', [req.params.slug]);
      if (rows.length === 0) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(404).json({ error: 'Page not found' });
      }
      const p = rows[0];
      const blogSlug = (req.body?.slug || p.slug.replace(/^\/+/, '').replace(/\s+/g, '-')).toLowerCase();
      const safeTitle = String((req.body?.title ?? p.title ?? p.seo_title ?? p.slug ?? 'Без названия'));
      const bodyHtml = String(p.body || '');
      await client.query(
        `INSERT INTO blog_posts (slug, title, body, seo_title, seo_description, seo_keywords, is_published)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title, body=EXCLUDED.body, seo_title=EXCLUDED.seo_title, seo_description=EXCLUDED.seo_description, seo_keywords=EXCLUDED.seo_keywords, is_published=EXCLUDED.is_published, updated_at=NOW()`,
        [blogSlug, safeTitle, bodyHtml, p.seo_title, p.seo_description, p.seo_keywords, p.is_published]
      );
      // log before delete
      await client.query('INSERT INTO page_move_log (from_slug, to_type, to_slug, page_row) VALUES ($1,$2,$3,$4)', [p.slug, 'blog', blogSlug, p]);
      // удаляем страницу после переноса
      await client.query('DELETE FROM pages WHERE slug=$1', [p.slug]);
      await client.query('COMMIT');
      client.release();
      res.json({ success: true, blog_slug: blogSlug });
    } catch (e) {
      await client.query('ROLLBACK');
      client.release();
      throw e;
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Перенос страницы в кейсы
router.post('/:slug/move-to-case', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query('SELECT * FROM pages WHERE slug = $1 FOR UPDATE', [req.params.slug]);
      if (rows.length === 0) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(404).json({ error: 'Page not found' });
      }
      const p = rows[0];
      const caseSlug = (req.body?.slug || p.slug.replace(/^\/+/, '').replace(/\s+/g, '-')).toLowerCase();
      const safeTitle = String((req.body?.title ?? p.title ?? p.seo_title ?? p.slug ?? 'Без названия'));
      const bodyHtml = String(p.body || '');
      await client.query(
        `INSERT INTO cases (slug, title, summary, content_html, hero_image_url, gallery, metrics, tools, is_published)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title, summary=EXCLUDED.summary, content_html=EXCLUDED.content_html, hero_image_url=EXCLUDED.hero_image_url, gallery=EXCLUDED.gallery, metrics=EXCLUDED.metrics, tools=EXCLUDED.tools, is_published=EXCLUDED.is_published, updated_at=NOW()`,
        [caseSlug, safeTitle, req.body?.summary || null, bodyHtml, req.body?.hero_image_url || null, req.body?.gallery || [], req.body?.metrics || {}, req.body?.tools || [], p.is_published]
      );
      await client.query('INSERT INTO page_move_log (from_slug, to_type, to_slug, page_row) VALUES ($1,$2,$3,$4)', [p.slug, 'case', caseSlug, p]);
      await client.query('DELETE FROM pages WHERE slug=$1', [p.slug]);
      await client.query('COMMIT');
      client.release();
      res.json({ success: true, case_slug: caseSlug });
    } catch (e) {
      await client.query('ROLLBACK');
      client.release();
      throw e;
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Альтернативный вариант: перенос с указанием slug в теле запроса (избегаем проблем с "/" в slug)
router.post('/move-to-case', async (req, res) => {
  try {
    const sourceSlug = req.body?.page_slug || req.body?.slug;
    if (!sourceSlug) return res.status(400).json({ error: 'page_slug or slug required' });
    const destSlug = (req.body?.slug || String(sourceSlug).replace(/^\/+/, '').replace(/\s+/g, '-')).toLowerCase();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query('SELECT * FROM pages WHERE slug = $1 FOR UPDATE', [sourceSlug]);
      if (rows.length === 0) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(404).json({ error: 'Page not found' });
      }
      const p = rows[0];
      const safeTitle = String((req.body?.title ?? p.title ?? p.seo_title ?? p.slug ?? 'Без названия'));
      const bodyHtml = String(p.body || '');
      await client.query(
        `INSERT INTO cases (slug, title, summary, content_html, hero_image_url, gallery, metrics, tools, is_published)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title, summary=EXCLUDED.summary, content_html=EXCLUDED.content_html, hero_image_url=EXCLUDED.hero_image_url, gallery=EXCLUDED.gallery, metrics=EXCLUDED.metrics, tools=EXCLUDED.tools, is_published=EXCLUDED.is_published, updated_at=NOW()`,
        [destSlug, safeTitle, req.body?.summary || null, bodyHtml, req.body?.hero_image_url || null, req.body?.gallery || [], req.body?.metrics || {}, req.body?.tools || [], p.is_published]
      );
      await client.query('INSERT INTO page_move_log (from_slug, to_type, to_slug, page_row) VALUES ($1,$2,$3,$4)', [sourceSlug, 'case', destSlug, p]);
      await client.query('DELETE FROM pages WHERE slug=$1', [sourceSlug]);
      await client.query('COMMIT');
      client.release();
      res.json({ success: true, case_slug: destSlug });
    } catch (e) {
      await client.query('ROLLBACK');
      client.release();
      throw e;
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Перенос страницы в продукты (с ценой)
router.post('/:slug/move-to-product', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query('SELECT * FROM pages WHERE slug = $1 FOR UPDATE', [req.params.slug]);
      if (rows.length === 0) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(404).json({ error: 'Page not found' });
      }
      const p = rows[0];
      const productSlug = (req.body?.slug || p.slug.replace(/^\/+/, '').replace(/\s+/g, '-')).toLowerCase();
      const priceCents = Number(req.body?.price_cents) || 0;
      const currency = req.body?.currency || 'RUB';
      const pricePeriod = req.body?.price_period || 'one_time';
      const features = Array.isArray(req.body?.features) ? req.body?.features : [];
      const sortOrder = Number(req.body?.sort_order) || 0;
      const safeTitle = String((req.body?.title ?? p.title ?? p.seo_title ?? p.slug ?? 'Без названия'));
      const bodyHtml = String(p.body || '');
      await client.query(
        `INSERT INTO products (slug, title, description_html, price_cents, currency, price_period, features, is_active, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title, description_html=EXCLUDED.description_html, price_cents=EXCLUDED.price_cents, currency=EXCLUDED.currency, price_period=EXCLUDED.price_period, features=EXCLUDED.features, is_active=EXCLUDED.is_active, sort_order=EXCLUDED.sort_order, updated_at=NOW()`,
        [productSlug, safeTitle, bodyHtml, priceCents, currency, pricePeriod, features, true, sortOrder]
      );
      await client.query('INSERT INTO page_move_log (from_slug, to_type, to_slug, page_row) VALUES ($1,$2,$3,$4)', [p.slug, 'product', productSlug, p]);
      await client.query('DELETE FROM pages WHERE slug=$1', [p.slug]);
      await client.query('COMMIT');
      client.release();
      res.json({ success: true, product_slug: productSlug });
    } catch (e) {
      await client.query('ROLLBACK');
      client.release();
      throw e;
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/move-to-product', async (req, res) => {
  try {
    const sourceSlug = req.body?.page_slug || req.body?.slug;
    if (!sourceSlug) return res.status(400).json({ error: 'page_slug or slug required' });
    const destSlug = (req.body?.slug || String(sourceSlug).replace(/^\/+/, '').replace(/\s+/g, '-')).toLowerCase();
    const priceCents = Number(req.body?.price_cents) || 0;
    const currency = req.body?.currency || 'RUB';
    const pricePeriod = req.body?.price_period || 'one_time';
    const features = Array.isArray(req.body?.features) ? req.body?.features : [];
    const sortOrder = Number(req.body?.sort_order) || 0;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query('SELECT * FROM pages WHERE slug = $1 FOR UPDATE', [sourceSlug]);
      if (rows.length === 0) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(404).json({ error: 'Page not found' });
      }
      const p = rows[0];
      const safeTitle = String((req.body?.title ?? p.title ?? p.seo_title ?? p.slug ?? 'Без названия'));
      const bodyHtml = String(p.body || '');
      await client.query(
        `INSERT INTO products (slug, title, description_html, price_cents, currency, price_period, features, is_active, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title, description_html=EXCLUDED.description_html, price_cents=EXCLUDED.price_cents, currency=EXCLUDED.currency, price_period=EXCLUDED.price_period, features=EXCLUDED.features, is_active=EXCLUDED.is_active, sort_order=EXCLUDED.sort_order, updated_at=NOW()`,
        [destSlug, safeTitle, bodyHtml, priceCents, currency, pricePeriod, features, true, sortOrder]
      );
      await client.query('INSERT INTO page_move_log (from_slug, to_type, to_slug, page_row) VALUES ($1,$2,$3,$4)', [sourceSlug, 'product', destSlug, p]);
      await client.query('DELETE FROM pages WHERE slug=$1', [sourceSlug]);
      await client.query('COMMIT');
      client.release();
      res.json({ success: true, product_slug: destSlug });
    } catch (e) {
      await client.query('ROLLBACK');
      client.release();
      throw e;
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Undo last move: restore page and remove created target
router.post('/undo-last-move', async (_req, res) => {
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query('SELECT * FROM page_move_log ORDER BY created_at DESC LIMIT 1');
      if (!rows[0]) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(404).json({ error: 'No moves to undo' });
      }
      const log = rows[0];
      const p = log.page_row;
      // restore page (upsert)
      await client.query(
        `INSERT INTO pages (slug, title, body, seo_title, seo_description, seo_keywords, is_published, canonical_url, robots_index, robots_follow, og_title, og_description, og_image_url, twitter_card, twitter_site, twitter_creator, structured_data, hreflang)
         VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,FALSE),$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
         ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title, body=EXCLUDED.body, seo_title=EXCLUDED.seo_title, seo_description=EXCLUDED.seo_description, seo_keywords=EXCLUDED.seo_keywords, is_published=EXCLUDED.is_published, canonical_url=EXCLUDED.canonical_url, robots_index=EXCLUDED.robots_index, robots_follow=EXCLUDED.robots_follow, og_title=EXCLUDED.og_title, og_description=EXCLUDED.og_description, og_image_url=EXCLUDED.og_image_url, twitter_card=EXCLUDED.twitter_card, twitter_site=EXCLUDED.twitter_site, twitter_creator=EXCLUDED.twitter_creator, structured_data=EXCLUDED.structured_data, hreflang=EXCLUDED.hreflang, updated_at=NOW()`,
        [p.slug, p.title, p.body, p.seo_title, p.seo_description, p.seo_keywords, p.is_published, p.canonical_url, p.robots_index, p.robots_follow, p.og_title, p.og_description, p.og_image_url, p.twitter_card, p.twitter_site, p.twitter_creator, p.structured_data, p.hreflang]
      );
      // remove created target
      if (log.to_type === 'case') {
        await client.query('DELETE FROM cases WHERE slug=$1', [log.to_slug]);
      } else if (log.to_type === 'product') {
        await client.query('DELETE FROM products WHERE slug=$1', [log.to_slug]);
      } else if (log.to_type === 'blog') {
        await client.query('DELETE FROM blog_posts WHERE slug=$1', [log.to_slug]);
      }
      // delete log entry
      await client.query('DELETE FROM page_move_log WHERE id=$1', [log.id]);
      await client.query('COMMIT');
      client.release();
      res.json({ success: true, restored_slug: p.slug });
    } catch (e) {
      await client.query('ROLLBACK');
      client.release();
      throw e;
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
