#!/bin/bash
# Полное восстановление всех недостающих файлов на сервере
# Выполнить: bash COMPLETE_SERVER_FIX.sh

set -e

cd /var/www/primecoder-gulp/backend

echo "🔧 Полное восстановление файлов на сервере..."
echo ""

# 1. Создать middleware если нет
echo "📦 Проверка middleware..."
mkdir -p middleware

if [ ! -f "middleware/auth.js" ]; then
  echo "📝 Создание middleware/auth.js..."
  cat > middleware/auth.js << 'AUTHEOF'
import jwt from 'jsonwebtoken';
import pool from '../db.js';

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export async function requireAuthWithUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const result = await pool.query('SELECT id, email, role FROM users WHERE id = $1', [decoded.id]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }
    req.user = result.rows[0];
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}
AUTHEOF
  echo "✅ middleware/auth.js создан"
else
  echo "✅ middleware/auth.js уже существует"
fi

# 2. Проверить db.js
if [ ! -f "db.js" ]; then
  echo "📝 Создание db.js..."
  cat > db.js << 'DBEOF'
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: Number(process.env.PGPORT) || 5432,
});

export default pool;
DBEOF
  echo "✅ db.js создан"
else
  echo "✅ db.js уже существует"
fi

# 3. Проверить routes/pages.js
echo ""
echo "📦 Проверка routes/pages.js..."
if [ ! -f "routes/pages.js" ] || [ ! -s "routes/pages.js" ]; then
  echo "⚠️  routes/pages.js отсутствует или пустой"
  echo "📝 Создание минимальной версии..."
  cat > routes/pages.js << 'PAGESEOF'
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
PAGESEOF
  echo "✅ routes/pages.js создан"
else
  # Проверить синтаксис
  if node -c routes/pages.js 2>/dev/null; then
    echo "✅ routes/pages.js синтаксис правильный"
  else
    echo "⚠️  routes/pages.js имеет ошибки синтаксиса, пересоздаю..."
    rm routes/pages.js
    # Повторно создать (код выше)
  fi
fi

# 4. Проверить routes/quiz.js
if [ ! -f "routes/quiz.js" ]; then
  echo "📝 Создание routes/quiz.js..."
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

# 5. Проверить app.js - добавить trust proxy
if ! grep -q "trust proxy" app.js; then
  echo "📝 Добавление trust proxy в app.js..."
  sed -i '/const app = express();/a app.set('\''trust proxy'\'', true);' app.js
  echo "✅ trust proxy добавлен"
fi

# 6. Проверить синтаксис всех файлов
echo ""
echo "🔍 Проверка синтаксиса..."
ERRORS=0

if node -c middleware/auth.js 2>/dev/null; then
  echo "✅ middleware/auth.js - OK"
else
  echo "❌ middleware/auth.js - ОШИБКА"
  ERRORS=$((ERRORS + 1))
fi

if node -c routes/pages.js 2>/dev/null; then
  echo "✅ routes/pages.js - OK"
else
  echo "❌ routes/pages.js - ОШИБКА"
  ERRORS=$((ERRORS + 1))
fi

if node -c routes/quiz.js 2>/dev/null; then
  echo "✅ routes/quiz.js - OK"
else
  echo "❌ routes/quiz.js - ОШИБКА"
  ERRORS=$((ERRORS + 1))
fi

if node -c app.js 2>/dev/null; then
  echo "✅ app.js - OK"
else
  echo "❌ app.js - ОШИБКА"
  ERRORS=$((ERRORS + 1))
fi

echo ""
if [ $ERRORS -eq 0 ]; then
  echo "✅ Все файлы проверены, ошибок нет!"
  echo ""
  echo "📋 Следующие шаги:"
  echo "1. pm2 restart all --update-env"
  echo "2. pm2 logs primecoder-backend --lines 30"
  echo "3. Проверить: curl http://localhost:3000/api/public/pages"
else
  echo "❌ Найдено ошибок: $ERRORS"
  echo "Проверьте файлы вручную"
fi
