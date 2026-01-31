#!/bin/bash
# Исправление routes/pages.js на сервере
# Выполнить: bash FIX_PAGES_JS_ON_SERVER.sh

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
    const { slug, title, content_html, meta_title, meta_description, is_published } = req.body;
    const result = await pool.query(
      'INSERT INTO pages (slug, title, content_html, meta_title, meta_description, is_published) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [slug, title, content_html, meta_title, meta_description, is_published !== false]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { slug, title, content_html, meta_title, meta_description, is_published } = req.body;
    const result = await pool.query(
      'UPDATE pages SET slug = $1, title = $2, content_html = $3, meta_title = $4, meta_description = $5, is_published = $6, updated_at = NOW() WHERE id = $7 RETURNING *',
      [slug, title, content_html, meta_title, meta_description, is_published !== false, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Page not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM pages WHERE id = $1', [req.params.id]);
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
EOF

echo "✅ routes/pages.js пересоздан"
echo "Теперь выполните: pm2 restart all --update-env"
