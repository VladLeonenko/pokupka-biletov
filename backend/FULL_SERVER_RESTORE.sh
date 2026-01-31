#!/bin/bash
# Полное восстановление всех файлов на сервере
# Выполнить: bash FULL_SERVER_RESTORE.sh

set -e

cd /var/www/primecoder-gulp/backend

echo "🔧 Полное восстановление файлов..."
echo ""

# 1. Создать middleware
echo "📦 Создание middleware..."
mkdir -p middleware

cat > middleware/auth.js << 'AUTHEOF'
import jwt from 'jsonwebtoken';

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
AUTHEOF
echo "✅ middleware/auth.js создан"

# 2. Проверить db.js
if [ ! -f "db.js" ]; then
  cat > db.js << 'DBEOF'
import pg from 'pg';
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
DBEOF
  echo "✅ db.js создан"
fi

# 3. Создать полный routes/pages.js через Python (надежнее чем heredoc)
echo "📝 Создание routes/pages.js..."
python3 << 'PYEOF'
import sys

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

with open('routes/pages.js', 'w') as f:
    f.write(pages_js)

print("✅ routes/pages.js создан через Python")
PYEOF

# 4. Создать routes/quiz.js
if [ ! -f "routes/quiz.js" ]; then
  cat > routes/quiz.js << 'QUIZEOF'
import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/public/questions', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM quiz_questions WHERE is_active = TRUE ORDER BY sort_order ASC`);
    res.json(result.rows.map(q => ({ ...q, options: [] })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch quiz questions' });
  }
});

router.post('/public/submit', async (req, res) => {
  try {
    const { recommendedTariff, answers, userEmail } = req.body;
    await pool.query(`INSERT INTO quiz_results (recommended_tariff, answers, user_email) VALUES ($1, $2, $3)`, 
      [recommendedTariff, JSON.stringify(answers || {}), userEmail || null]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit quiz result' });
  }
});

export default router;
QUIZEOF
  echo "✅ routes/quiz.js создан"
fi

# 5. Добавить trust proxy в app.js
if ! grep -q "trust proxy" app.js; then
  echo "📝 Добавление trust proxy в app.js..."
  sed -i '/const app = express();/a app.set('\''trust proxy'\'', true);' app.js
  echo "✅ trust proxy добавлен"
fi

# 6. Проверка синтаксиса
echo ""
echo "🔍 Проверка синтаксиса..."
node -c middleware/auth.js && echo "✅ middleware/auth.js - OK" || echo "❌ middleware/auth.js - ОШИБКА"
node -c routes/pages.js && echo "✅ routes/pages.js - OK" || echo "❌ routes/pages.js - ОШИБКА"
node -c routes/quiz.js && echo "✅ routes/quiz.js - OK" || echo "❌ routes/quiz.js - ОШИБКА"
node -c app.js && echo "✅ app.js - OK" || echo "❌ app.js - ОШИБКА"

echo ""
echo "✅ Восстановление завершено!"
echo ""
echo "📋 Следующие шаги:"
echo "pm2 restart all --update-env"
echo "pm2 logs primecoder-backend --lines 30"
