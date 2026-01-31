#!/bin/bash
# Экстренное восстановление файлов на сервере
# Выполнить на сервере: bash EMERGENCY_FIX_SERVER.sh

set -e

cd /var/www/primecoder-gulp/backend

echo "🔧 Восстановление отсутствующих файлов..."

# Создать директорию routes если её нет
mkdir -p routes

# Проверить и создать pages.js если отсутствует
if [ ! -f "routes/pages.js" ]; then
  echo "📝 Создание routes/pages.js..."
  cat > routes/pages.js << 'PAGES_EOF'
import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Получить все страницы или страницу по query parameter slug
router.get('/', async (req, res) => {
  try {
    const isPublic = req.originalUrl.includes('/api/public');
    
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

router.get('/:slug', async (req, res) => {
  try {
    const isPublic = req.originalUrl && req.originalUrl.includes('/api/public');
    let slug = req.params.slug;
    if (typeof slug === 'string') {
      try {
        slug = decodeURIComponent(slug);
      } catch (e) {}
      while (slug.includes('%')) {
        try {
          slug = decodeURIComponent(slug);
        } catch (e) {
          break;
        }
      }
    }
    slug = String(slug).trim();
    if (!slug || slug === '') {
      slug = '/';
    } else if (slug !== '/') {
      slug = '/' + slug.replace(/^\/+|\/+$/g, '');
    }
    let query = 'SELECT * FROM pages WHERE slug = $1';
    const params = [slug];
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
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM pages WHERE id = $1', [id]);
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
PAGES_EOF
  echo "✅ routes/pages.js создан"
fi

# Проверить и создать quiz.js если отсутствует
if [ ! -f "routes/quiz.js" ]; then
  echo "📝 Создание routes/quiz.js..."
  cat > routes/quiz.js << 'QUIZ_EOF'
import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

function rowToQuestion(r) {
  return {
    id: r.id,
    questionText: r.question_text,
    questionType: r.question_type,
    sortOrder: r.sort_order,
    isActive: r.is_active,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}

function rowToOption(r) {
  return {
    id: r.id,
    questionId: r.question_id,
    optionText: r.option_text,
    optionDescription: r.option_description,
    pointsStart: r.points_start,
    pointsBusiness: r.points_business,
    pointsPremium: r.points_premium,
    sortOrder: r.sort_order,
    isActive: r.is_active,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}

router.get('/public/questions', async (req, res) => {
  try {
    const questionsResult = await pool.query(`
      SELECT * FROM quiz_questions 
      WHERE is_active = TRUE 
      ORDER BY sort_order ASC, created_at ASC
    `);
    const questions = questionsResult.rows.map(rowToQuestion);
    const questionsWithOptions = await Promise.all(
      questions.map(async (question) => {
        const optionsResult = await pool.query(`
          SELECT * FROM quiz_options 
          WHERE question_id = $1 AND is_active = TRUE 
          ORDER BY sort_order ASC, created_at ASC
        `, [question.id]);
        return { ...question, options: optionsResult.rows.map(rowToOption) };
      })
    );
    res.json(questionsWithOptions);
  } catch (error) {
    console.error('[Quiz] Error fetching questions:', error);
    res.status(500).json({ error: 'Failed to fetch quiz questions' });
  }
});

router.post('/public/submit', async (req, res) => {
  try {
    const { answers, recommendedTariff, userEmail } = req.body;
    await pool.query(`
      INSERT INTO quiz_results (recommended_tariff, answers, user_email)
      VALUES ($1, $2, $3)
    `, [recommendedTariff, JSON.stringify(answers || {}), userEmail || null]);
    res.json({ success: true, recommendedTariff });
  } catch (error) {
    console.error('[Quiz] Error submitting result:', error);
    res.status(500).json({ error: 'Failed to submit quiz result' });
  }
});

router.get('/questions', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM quiz_questions ORDER BY sort_order ASC, created_at ASC`);
    const questions = result.rows.map(rowToQuestion);
    const questionsWithOptions = await Promise.all(
      questions.map(async (question) => {
        const optionsResult = await pool.query(`SELECT * FROM quiz_options WHERE question_id = $1 ORDER BY sort_order ASC, created_at ASC`, [question.id]);
        return { ...question, options: optionsResult.rows.map(rowToOption) };
      })
    );
    res.json(questionsWithOptions);
  } catch (error) {
    console.error('[Quiz] Error fetching questions:', error);
    res.status(500).json({ error: 'Failed to fetch quiz questions' });
  }
});

export default router;
QUIZ_EOF
  echo "✅ routes/quiz.js создан"
fi

# Исправить app.js - добавить trust proxy
if ! grep -q "trust proxy" app.js; then
  echo "🔧 Добавление trust proxy в app.js..."
  sed -i '/const app = express();/a app.set('\''trust proxy'\'', true);' app.js
  echo "✅ trust proxy добавлен"
fi

echo ""
echo "✅ Файлы восстановлены!"
echo ""
echo "📋 Следующие шаги:"
echo "1. pm2 restart all --update-env"
echo "2. pm2 logs primecoder-backend --lines 20"
echo "3. Проверить: curl http://localhost:3000/api/public/pages"
