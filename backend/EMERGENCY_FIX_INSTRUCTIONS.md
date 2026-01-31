# Экстренное восстановление на сервере

## ⚠️ ВАЖНО: Выполнять на СЕРВЕРЕ, не локально!

## Шаг 1: Подключиться к серверу

```bash
ssh root@ваш_сервер
# или
ssh root@85.239.44.40
```

## Шаг 2: Перейти в директорию проекта

```bash
cd /var/www/primecoder-gulp/backend
```

## Шаг 3: Создать отсутствующие файлы

### Создать routes/pages.js:

```bash
mkdir -p routes

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
PAGESEOF
```

### Создать routes/quiz.js:

```bash
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
```

## Шаг 4: Исправить app.js (добавить trust proxy)

```bash
# Для macOS/Linux
sed -i.bak '/const app = express();/a\
app.set('\''trust proxy'\'', true);' app.js

# Или вручную через nano:
nano app.js
# Найдите строку: const app = express();
# Добавьте после неё: app.set('trust proxy', true);
# Сохраните: Ctrl+O, Enter, Ctrl+X
```

## Шаг 5: Перезапустить backend

```bash
pm2 restart all --update-env
pm2 logs primecoder-backend --lines 30
```

## Шаг 6: Проверить работу

```bash
# Проверить, что backend запустился
curl http://localhost:3000/api/public/pages

# Проверить логи на ошибки
pm2 logs primecoder-backend | grep -i error
```

## Альтернатива: Использовать готовый скрипт

Если скрипт `EMERGENCY_FIX_SERVER.sh` есть в репозитории:

```bash
cd /var/www/primecoder-gulp/backend
git pull origin main
bash EMERGENCY_FIX_SERVER.sh
pm2 restart all --update-env
```
