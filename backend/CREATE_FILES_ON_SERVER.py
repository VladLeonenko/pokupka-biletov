#!/usr/bin/env python3
"""
Скрипт для создания всех необходимых файлов на сервере
Использование: python3 CREATE_FILES_ON_SERVER.py
"""

import os

# 1. Создать db.js
db_js = """import pg from 'pg';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });
const { Pool } = pg;
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: Number(process.env.PGPORT),
});
export default pool;
"""

# 2. Создать middleware/auth.js
auth_js = """import jwt from 'jsonwebtoken';

if (!process.env.JWT_SECRET) {
  console.error('❌ CRITICAL ERROR: JWT_SECRET environment variable is not set!');
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET;

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function signUser(user) {
  const payload = { id: user.id, email: user.email, role: user.role };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = payload;
    } catch (error) {}
  }
  next();
}
"""

# 3. Создать routes/pages.js (минимальная версия)
pages_js = """import express from 'express';
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
    else if (slug !== '/') slug = '/' + slug.replace(/^\\/+|\\/+$/g, '');
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
"""

# Создать файлы
os.makedirs('middleware', exist_ok=True)
os.makedirs('routes', exist_ok=True)

with open('db.js', 'w') as f:
    f.write(db_js)
print("✅ db.js создан")

with open('middleware/auth.js', 'w') as f:
    f.write(auth_js)
print("✅ middleware/auth.js создан")

with open('routes/pages.js', 'w') as f:
    f.write(pages_js)
print("✅ routes/pages.js создан")

print("\n✅ Все файлы созданы!")
