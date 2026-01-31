#!/bin/bash
# Простой скрипт для создания pages.js на сервере
# Выполнить: bash CREATE_PAGES_JS_SIMPLE.sh

cd /var/www/primecoder-gulp/backend

cat > routes/pages.js << 'EOF'
import express from 'express';
import pool from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const isPublic = req.originalUrl.includes('/api/public');
    if (req.query.slug) {
      let slug = req.query.slug;
      if (typeof slug === 'string') {
        slug = slug.trim();
        if (slug === '/') {
          let query = 'SELECT * FROM pages WHERE slug = $1';
          if (isPublic) query += ' AND is_published = TRUE';
          const result = await pool.query(query, ['/']);
          if (result.rows.length === 0) return res.status(404).json({ error: 'Page not found' });
          return res.json(result.rows[0]);
        }
      }
    }
    let query = 'SELECT * FROM pages';
    if (isPublic) query += ' WHERE is_published = TRUE';
    query += ' ORDER BY id';
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const isPublic = req.originalUrl && req.originalUrl.includes('/api/public');
    let slug = req.params.slug;
    if (typeof slug === 'string') {
      try { slug = decodeURIComponent(slug); } catch (e) {}
      while (slug.includes('%')) {
        try { slug = decodeURIComponent(slug); } catch (e) { break; }
      }
    }
    slug = String(slug).trim();
    if (!slug || slug === '') slug = '/';
    else if (slug !== '/') slug = '/' + slug.replace(/^\/+|\/+$/g, '');
    let query = 'SELECT * FROM pages WHERE slug = $1';
    if (isPublic) query += ' AND is_published = TRUE';
    const result = await pool.query(query, [slug]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Page not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { slug, title, body, seo_title, seo_description, seo_keywords, is_published } = req.body;
    await pool.query(
      'INSERT INTO pages (slug, title, body, seo_title, seo_description, seo_keywords, is_published) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [slug, title, body, seo_title, seo_description, seo_keywords, is_published !== false]
    );
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:slug', async (req, res) => {
  try {
    const { title, body, seo_title, seo_description, seo_keywords, is_published } = req.body;
    const updates = [];
    const values = [];
    let paramIndex = 1;
    if (title !== undefined) { updates.push(`title=$${paramIndex}`); values.push(title); paramIndex++; }
    if (body !== undefined) { updates.push(`body=$${paramIndex}`); values.push(body); paramIndex++; }
    if (seo_title !== undefined) { updates.push(`seo_title=$${paramIndex}`); values.push(seo_title); paramIndex++; }
    if (seo_description !== undefined) { updates.push(`seo_description=$${paramIndex}`); values.push(seo_description); paramIndex++; }
    if (seo_keywords !== undefined) { updates.push(`seo_keywords=$${paramIndex}`); values.push(seo_keywords); paramIndex++; }
    if (is_published !== undefined) { updates.push(`is_published=$${paramIndex}`); values.push(Boolean(is_published)); paramIndex++; }
    updates.push('updated_at=NOW()');
    values.push(req.params.slug);
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    const query = `UPDATE pages SET ${updates.join(', ')} WHERE slug=$${paramIndex} RETURNING *`;
    const result = await pool.query(query, values);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Page not found' });
    res.json({ success: true, updated: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:slug', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM pages WHERE slug=$1 RETURNING *', [req.params.slug]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Page not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
EOF

echo "✅ routes/pages.js создан"
node -c routes/pages.js && echo "✅ Синтаксис правильный" || echo "❌ Ошибка синтаксиса"
