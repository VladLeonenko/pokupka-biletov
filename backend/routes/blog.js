import express from 'express';
import pool from '../db.js';

const router = express.Router();

function normalizeCarouselItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (!item) return null;
      const image =
        typeof item.image_url === 'string' && item.image_url.trim()
          ? item.image_url.trim()
          : typeof item.imageUrl === 'string' && item.imageUrl.trim()
            ? item.imageUrl.trim()
            : '';
      if (!image) return null;
      const caption =
        typeof item.caption === 'string' && item.caption.trim()
          ? item.caption.trim()
          : typeof item.caption_html === 'string' && item.caption_html.trim()
            ? item.caption_html.trim()
            : null;
      const alt =
        typeof item.alt === 'string' && item.alt.trim()
          ? item.alt.trim()
          : typeof item.alt_text === 'string' && item.alt_text.trim()
            ? item.alt_text.trim()
            : null;
      const link =
        typeof item.link_url === 'string' && item.link_url.trim()
          ? item.link_url.trim()
          : typeof item.linkUrl === 'string' && item.linkUrl.trim()
            ? item.linkUrl.trim()
            : null;
      return {
        image_url: image,
        caption,
        alt,
        link_url: link,
      };
    })
    .filter(Boolean);
}

router.get('/', async (req, res) => {
  try {
    const isPublic = req.originalUrl.includes('/api/public');
    const publishedOnly = isPublic || req.query.published === 'true';
    const featuredOnly = req.query.featured === 'true';
    
    let query = `
      SELECT bp.*, bc.slug AS category_slug,
             COALESCE(array_remove(array_agg(bt.slug), NULL), '{}') AS tags
      FROM blog_posts bp
      LEFT JOIN blog_categories bc ON bc.id = bp.category_id
      LEFT JOIN blog_post_tags bpt ON bpt.post_id = bp.id
      LEFT JOIN blog_tags bt ON bt.id = bpt.tag_id
    `;
    
    const conditions = [];
    // Фильтруем статьи с валидными данными (не пустые title и slug)
    conditions.push('bp.title IS NOT NULL AND bp.title != \'\'');
    conditions.push('bp.slug IS NOT NULL AND bp.slug != \'\'');
    
    if (publishedOnly) {
      conditions.push('bp.is_published = TRUE');
    }
    if (featuredOnly) {
      conditions.push('bp.is_featured = TRUE');
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += `
      GROUP BY bp.id, bc.slug
      ORDER BY bp.created_at DESC
    `;
    
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (e) {
    console.error('[blog] Error fetching posts:', e.message, e.stack);
    res.status(500).json({ error: e.message });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const isPublic = req.originalUrl.includes('/api/public');
    const publishedOnly = isPublic || req.query.published === 'true';
    
    // Decode slug from URL (handle Cyrillic characters)
    let slug = req.params.slug;
    try {
      slug = decodeURIComponent(slug);
    } catch (e) {
      // If decoding fails, use original
      slug = req.params.slug;
    }
    
    let query = `
      SELECT bp.*, bc.slug AS category_slug,
             COALESCE(array_remove(array_agg(bt.slug), NULL), '{}') AS tags
      FROM blog_posts bp
      LEFT JOIN blog_categories bc ON bc.id = bp.category_id
      LEFT JOIN blog_post_tags bpt ON bpt.post_id = bp.id
      LEFT JOIN blog_tags bt ON bt.id = bpt.tag_id
      WHERE bp.slug=$1
    `;
    
    if (publishedOnly) {
      query += ' AND bp.is_published = TRUE';
    }
    
    query += ' GROUP BY bp.id, bc.slug';
    
    const { rows } = await pool.query(query, [slug]);
    if (rows.length === 0) return res.status(404).json({ error: 'Post not found' });
    res.json(rows[0]);
  } catch (e) {
    console.error('[blog] Error fetching post:', e.message, e.stack);
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  const {
    slug,
    title,
    body,
    seo_title,
    seo_description,
    seo_keywords,
    is_published,
    is_featured,
    category_slug,
    tags,
    cover_image_url,
    carousel_enabled,
    carousel_title,
    carousel_items,
  } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ins = await client.query(
      `INSERT INTO blog_posts (
         slug, title, body, seo_title, seo_description, seo_keywords,
         is_published, is_featured, cover_image_url, carousel_enabled,
         carousel_title, carousel_items
       )
       VALUES (
         $1, $2, $3, $4, $5, $6,
         COALESCE($7, FALSE), COALESCE($8, FALSE), $9,
         COALESCE($10, FALSE), $11, $12
       )
       RETURNING id`,
      [
        slug,
        title,
        body,
        seo_title,
        seo_description,
        seo_keywords,
        is_published,
        is_featured,
        cover_image_url && typeof cover_image_url === 'string' && cover_image_url.trim() ? cover_image_url.trim() : null,
        carousel_enabled,
        carousel_title && typeof carousel_title === 'string' && carousel_title.trim() ? carousel_title.trim() : null,
        JSON.stringify(normalizeCarouselItems(carousel_items)),
      ]
    );
    const postId = ins.rows[0].id;
    if (category_slug) {
      const cat = await client.query(`INSERT INTO blog_categories (slug, name) VALUES ($1, $2)
        ON CONFLICT(slug) DO UPDATE SET name=EXCLUDED.name RETURNING id`, [category_slug, category_slug]);
      await client.query('UPDATE blog_posts SET category_id=$1 WHERE id=$2', [cat.rows[0].id, postId]);
    }
    if (Array.isArray(tags)) {
      for (const t of tags) {
        const tg = await client.query(`INSERT INTO blog_tags (slug, name) VALUES ($1, $1)
          ON CONFLICT(slug) DO UPDATE SET name=EXCLUDED.name RETURNING id`, [t]);
        await client.query(`INSERT INTO blog_post_tags (post_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [postId, tg.rows[0].id]);
      }
    }
    await client.query('COMMIT');
    
    // Возвращаем созданную статью
    const { rows: savedRows } = await pool.query(`
      SELECT bp.*, bc.slug AS category_slug,
             COALESCE(array_remove(array_agg(bt.slug), NULL), '{}') AS tags
      FROM blog_posts bp
      LEFT JOIN blog_categories bc ON bc.id = bp.category_id
      LEFT JOIN blog_post_tags bpt ON bpt.post_id = bp.id
      LEFT JOIN blog_tags bt ON bt.id = bpt.tag_id
      WHERE bp.slug = $1
      GROUP BY bp.id, bc.slug
    `, [slug]);
    
    res.status(201).json(savedRows[0] || { success: true, slug });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

router.put('/:slug', async (req, res) => {
  const {
    title,
    body,
    seo_title,
    seo_description,
    seo_keywords,
    is_published,
    is_featured,
    category_slug,
    tags,
    cover_image_url,
    carousel_enabled,
    carousel_title,
    carousel_items,
  } = req.body;
  const client = await pool.connect();
  try {
    // Decode slug from URL (handle Cyrillic characters)
    let slug = req.params.slug;
    try {
      slug = decodeURIComponent(slug);
    } catch (e) {
      // If decoding fails, use original
      slug = req.params.slug;
    }
    
    await client.query('BEGIN');
    
    // Build dynamic UPDATE query - only update fields that are provided
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    // title - обязательное поле, но для обновления можно не передавать, если не меняем
    // Однако если передано пустое значение, это ошибка
    if (title !== undefined && title !== null) {
      if (title === '') {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Title cannot be empty' });
      }
      updates.push(`title=$${paramIndex}`);
      values.push(title);
      paramIndex++;
    }
    
    // body может быть пустым, но если передано null - это ошибка
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
      // seo_keywords может быть массивом или строкой - преобразуем в массив для JSONB
      let keywordsValue = seo_keywords;
      if (Array.isArray(keywordsValue)) {
        // Уже массив - оставляем как есть
      } else if (typeof keywordsValue === 'string') {
        // Если строка, пытаемся распарсить JSON, иначе создаем массив из одного элемента
        try {
          keywordsValue = JSON.parse(keywordsValue);
        } catch {
          // Если не JSON, создаем массив из строки
          keywordsValue = keywordsValue.trim() ? [keywordsValue] : [];
        }
      } else {
        // Другой тип - преобразуем в массив
        keywordsValue = [];
      }
      values.push(keywordsValue);
      paramIndex++;
    }
    
    if (is_published !== undefined && is_published !== null) {
      updates.push(`is_published=$${paramIndex}`);
      values.push(Boolean(is_published));
      paramIndex++;
    }
    
    if (is_featured !== undefined && is_featured !== null) {
      updates.push(`is_featured=$${paramIndex}`);
      values.push(Boolean(is_featured));
      paramIndex++;
    }

    if (cover_image_url !== undefined) {
      updates.push(`cover_image_url=$${paramIndex}`);
      const normalizedCover =
        typeof cover_image_url === 'string' && cover_image_url.trim()
          ? cover_image_url.trim()
          : null;
      values.push(normalizedCover);
      paramIndex++;
    }

    if (carousel_enabled !== undefined && carousel_enabled !== null) {
      updates.push(`carousel_enabled=$${paramIndex}`);
      values.push(Boolean(carousel_enabled));
      paramIndex++;
    }

    if (carousel_title !== undefined) {
      updates.push(`carousel_title=$${paramIndex}`);
      const normalizedTitle =
        typeof carousel_title === 'string' && carousel_title.trim()
          ? carousel_title.trim()
          : null;
      values.push(normalizedTitle);
      paramIndex++;
    }

    if (carousel_items !== undefined) {
      updates.push(`carousel_items=$${paramIndex}`);
      values.push(JSON.stringify(normalizeCarouselItems(carousel_items)));
      paramIndex++;
    }
    
    // Always update updated_at
    updates.push('updated_at=NOW()');
    
    // Проверяем, есть ли хотя бы одно поле для обновления (кроме updated_at)
    if (updates.length <= 1) {
      // Только updated_at - это нормально, продолжаем
      // Но если вообще нет полей, это ошибка
      if (updates.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'No fields to update' });
      }
    }
    
    // Add WHERE clause
    values.push(slug);
    const whereClause = `WHERE slug=$${paramIndex}`;
    
    const updateQuery = `UPDATE blog_posts SET ${updates.join(', ')} ${whereClause} RETURNING id`;
    const result = await client.query(updateQuery, values);
    
    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Post not found' });
    }
    
    const postId = result.rows[0].id;
    
    // Update category if provided
    if (category_slug !== undefined && category_slug !== null) {
      if (category_slug && category_slug.trim()) {
        try {
          const cat = await client.query(`INSERT INTO blog_categories (slug, name) VALUES ($1, $2)
            ON CONFLICT(slug) DO UPDATE SET name=EXCLUDED.name RETURNING id`, [category_slug.trim(), category_slug.trim()]);
          if (cat.rows && cat.rows.length > 0) {
            await client.query('UPDATE blog_posts SET category_id=$1 WHERE id=$2', [cat.rows[0].id, postId]);
          }
        } catch (catErr) {
          console.error('[blog] Error updating category:', catErr.message);
          // Не прерываем транзакцию из-за ошибки категории
        }
      } else {
        // Clear category if empty string
        await client.query('UPDATE blog_posts SET category_id=NULL WHERE id=$1', [postId]);
      }
    }
    
    // Update tags if provided
    if (Array.isArray(tags)) {
      await client.query('DELETE FROM blog_post_tags WHERE post_id=$1', [postId]);
      for (const t of tags) {
        if (t && t.trim()) {
          const tg = await client.query(`INSERT INTO blog_tags (slug, name) VALUES ($1, $1)
            ON CONFLICT(slug) DO UPDATE SET name=EXCLUDED.name RETURNING id`, [t.trim()]);
          await client.query(`INSERT INTO blog_post_tags (post_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [postId, tg.rows[0].id]);
        }
      }
    }
    
    await client.query('COMMIT');
    
    // Fetch updated post with all relations
    const { rows } = await pool.query(`
      SELECT bp.*, bc.slug AS category_slug,
             COALESCE(array_remove(array_agg(bt.slug), NULL), '{}') AS tags
      FROM blog_posts bp
      LEFT JOIN blog_categories bc ON bc.id = bp.category_id
      LEFT JOIN blog_post_tags bpt ON bpt.post_id = bp.id
      LEFT JOIN blog_tags bt ON bt.id = bpt.tag_id
      WHERE bp.slug=$1
      GROUP BY bp.id, bc.slug
    `, [slug]);
    
    res.json({ success: true, updated: rows[0] });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('[blog] Error updating post:', e.message);
    console.error('[blog] Stack:', e.stack);
    console.error('[blog] Request body:', JSON.stringify(req.body, null, 2));
    console.error('[blog] Slug:', req.params.slug);
    res.status(500).json({ error: e.message, details: process.env.NODE_ENV === 'development' ? e.stack : undefined });
  } finally {
    client.release();
  }
});

router.delete('/:slug', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM blog_posts WHERE slug=$1 RETURNING *', [req.params.slug]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Post not found' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;


