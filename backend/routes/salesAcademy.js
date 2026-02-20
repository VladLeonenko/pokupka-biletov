import express from 'express';
import pool from '../db.js';
import { requireAuth, requireAdminOrSalesManager } from '../middleware/auth.js';

const router = express.Router();

// --- Курсы обучения (заглавная → страницы → тест) ---

// Список курсов
router.get('/courses', requireAuth, requireAdminOrSalesManager, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT c.id, c.slug, c.title, c.cover_description, c.estimated_test_minutes, c.sort_order,
        (SELECT COUNT(*) FROM training_course_pages p WHERE p.course_id = c.id) as total_pages
       FROM training_courses c ORDER BY c.sort_order, c.id`
    );
    res.json(r.rows);
  } catch (e) {
    if (e.message?.includes('training_courses')) return res.json([]);
    res.status(500).json({ error: e.message });
  }
});

// Курс по slug с страницами (для пошагового изучения)
router.get('/courses/:slug', requireAuth, requireAdminOrSalesManager, async (req, res) => {
  try {
    const { slug } = req.params;
    const courseRes = await pool.query(
      'SELECT id, slug, title, cover_description, estimated_test_minutes FROM training_courses WHERE slug = $1',
      [slug]
    );
    if (!courseRes.rows[0]) return res.status(404).json({ error: 'Course not found' });
    const course = courseRes.rows[0];

    const pagesRes = await pool.query(
      `SELECT p.id, p.page_index, p.page_type, p.title, p.content, p.content_blocks, p.objection_text, p.solution_text, p.material_id,
        m.title as material_title, m.objection_text as mat_objection, m.solution_text as mat_solution
       FROM training_course_pages p
       LEFT JOIN sales_training_materials m ON m.id = p.material_id
       WHERE p.course_id = $1 ORDER BY p.page_index`,
      [course.id]
    );
    const pages = (pagesRes.rows || []).map((r) => ({
      id: r.id,
      page_index: r.page_index,
      page_type: r.page_type,
      title: r.title || r.material_title,
      content: r.content,
      content_blocks: r.content_blocks,
      objection_text: r.objection_text ?? r.mat_objection,
      solution_text: r.solution_text ?? r.mat_solution,
      material_id: r.material_id,
    }));
    res.json({ ...course, pages, total_pages: pages.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Прогресс по курсу
router.get('/courses/:slug/progress', requireAuth, requireAdminOrSalesManager, async (req, res) => {
  try {
    const userId = req.user.id;
    const targetUserId = req.user?.role === 'admin' && req.query.userId ? parseInt(req.query.userId) : userId;
    const { slug } = req.params;

    const r = await pool.query(
      'SELECT last_page_index, completed_page_count, test_passed, test_score, updated_at FROM manager_course_progress WHERE user_id = $1 AND course_slug = $2',
      [targetUserId, slug]
    );
    const row = r.rows[0];
    const progress = {
      lastPageIndex: row?.last_page_index ?? 0,
      completedPageCount: row?.completed_page_count ?? 0,
      testPassed: row?.test_passed ?? false,
      testScore: row?.test_score ?? null,
      updatedAt: row?.updated_at?.toISOString?.() ?? null,
    };
    res.json(progress);
  } catch (e) {
    if (e.message?.includes('manager_course_progress')) return res.json({ lastPageIndex: 0, completedPageCount: 0, testPassed: false, testScore: null, updatedAt: null });
    res.status(500).json({ error: e.message });
  }
});

// Обновить прогресс (текущая страница, счётчик пройденных)
router.post('/courses/:slug/progress', requireAuth, requireAdminOrSalesManager, async (req, res) => {
  try {
    const userId = req.user.id;
    const { slug } = req.params;
    const { lastPageIndex, completedPageCount } = req.body || {};

    await pool.query(
      `INSERT INTO manager_course_progress (user_id, course_slug, last_page_index, completed_page_count, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id, course_slug)
       DO UPDATE SET
         last_page_index = GREATEST(COALESCE(manager_course_progress.last_page_index, 0), COALESCE($3, manager_course_progress.last_page_index)),
         completed_page_count = GREATEST(COALESCE(manager_course_progress.completed_page_count, 0), COALESCE($4, manager_course_progress.completed_page_count)),
         updated_at = NOW()`,
      [userId, slug, lastPageIndex ?? 0, completedPageCount ?? 0]
    );
    res.json({ success: true });
  } catch (e) {
    if (e.message?.includes('manager_course_progress')) return res.json({ success: true });
    res.status(500).json({ error: e.message });
  }
});

// Отметить тест как пройденный (после submit quiz)
router.post('/courses/:slug/test-passed', requireAuth, requireAdminOrSalesManager, async (req, res) => {
  try {
    const userId = req.user.id;
    const { slug } = req.params;
    const { score } = req.body || {};

    await pool.query(
      `INSERT INTO manager_course_progress (user_id, course_slug, test_passed, test_score, updated_at)
       VALUES ($1, $2, true, $3, NOW())
       ON CONFLICT (user_id, course_slug)
       DO UPDATE SET test_passed = true, test_score = COALESCE($3, manager_course_progress.test_score), updated_at = NOW()`,
      [userId, slug, score ?? null]
    );
    res.json({ success: true });
  } catch (e) {
    if (e.message?.includes('manager_course_progress')) return res.json({ success: true });
    res.status(500).json({ error: e.message });
  }
});

// Материалы обучения — менеджер + админ
router.get('/materials', requireAuth, requireAdminOrSalesManager, async (req, res) => {
  try {
    const { type } = req.query;
    let query = 'SELECT * FROM sales_training_materials WHERE 1=1';
    const params = [];
    if (type) {
      params.push(type);
      query += ` AND type = $${params.length}`;
    }
    query += ' ORDER BY sort_order ASC, id ASC';
    const r = await pool.query(query, params);
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Создать материал (админ)
router.post('/materials', requireAuth, async (req, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  try {
    const { type, title, content, objection_text, solution_text, sort_order } = req.body || {};
    if (!type || !title) return res.status(400).json({ error: 'type and title required' });
    const r = await pool.query(
      `INSERT INTO sales_training_materials (type, title, content, objection_text, solution_text, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [type, title, content || null, objection_text || null, solution_text || null, sort_order ?? 0]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Обновить материал (админ)
router.put('/materials/:id', requireAuth, async (req, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  try {
    const id = parseInt(req.params.id, 10);
    const body = req.body || {};
    if (!id || isNaN(id)) return res.status(400).json({ error: 'invalid id' });
    const updates = [];
    const params = [id];
    const fields = ['type', 'title', 'content', 'objection_text', 'solution_text', 'sort_order'];
    fields.forEach((f) => {
      if (body[f] !== undefined) {
        params.push(f === 'sort_order' ? body[f] : body[f]);
        updates.push(`${f} = $${params.length}`);
      }
    });
    if (updates.length === 0) return res.status(400).json({ error: 'nothing to update' });
    updates.push('updated_at = NOW()');
    const r = await pool.query(
      `UPDATE sales_training_materials SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
      params
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Material not found' });
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Удалить материал (админ)
router.delete('/materials/:id', requireAuth, async (req, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) return res.status(400).json({ error: 'invalid id' });
    const r = await pool.query('DELETE FROM sales_training_materials WHERE id = $1 RETURNING id', [id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Material not found' });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Продуктовая матрица (из каталога) — удобный формат для менеджера
router.get('/product-matrix', requireAuth, requireAdminOrSalesManager, async (req, res) => {
  try {
    const [productsRes, categoriesRes] = await Promise.all([
      pool.query(`SELECT p.slug, p.title, p.price_cents, p.currency, p.price_period, p.summary, p.case_slugs,
        (SELECT array_agg(pc.name) FROM product_categories pc
         JOIN product_category_links pcl ON pcl.category_id = pc.id WHERE pcl.product_slug = p.slug) as categories
        FROM products p WHERE p.is_active = TRUE ORDER BY p.sort_order`),
      pool.query('SELECT id, name, slug FROM product_categories WHERE is_active = TRUE ORDER BY sort_order')
    ]);
    const categories = categoriesRes.rows.reduce((acc, c) => ({ ...acc, [c.id]: c.name }), {});
    const matrix = productsRes.rows.map((p) => ({
      slug: p.slug,
      title: p.title,
      price: p.price_cents ? `${(p.price_cents / 100).toLocaleString('ru-RU')} ₽` : 'По запросу',
      period: p.price_period === 'month' ? '/мес' : p.price_period === 'year' ? '/год' : '',
      summary: p.summary || '',
      cases: p.case_slugs || [],
      categories: p.categories || []
    }));
    res.json({ products: matrix, categories: categoriesRes.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Вопросы тестов (по type или по course_slug для курсов)
router.get('/questions', requireAuth, requireAdminOrSalesManager, async (req, res) => {
  try {
    const { type, course_slug } = req.query;
    let query = 'SELECT * FROM sales_training_questions WHERE 1=1';
    const params = [];
    if (course_slug) {
      params.push(course_slug);
      query += ` AND course_slug = $${params.length}`;
    } else if (type) {
      params.push(type);
      query += ` AND type = $${params.length}`;
    }
    query += ' ORDER BY sort_order ASC, id ASC';
    const r = await pool.query(query, params);
    res.json(r.rows);
  } catch (e) {
    if (e.message?.includes('sales_training_questions')) return res.json([]);
    res.status(500).json({ error: e.message });
  }
});

// Прогресс менеджера: прочитанные материалы + попытки тестов
router.get('/progress', requireAuth, requireAdminOrSalesManager, async (req, res) => {
  try {
    const userId = req.user.id;
    const targetUserId = req.user?.role === 'admin' && req.query.userId ? parseInt(req.query.userId) : userId;

    const [completionsRes, attemptsRes] = await Promise.all([
      pool.query('SELECT material_id FROM manager_material_completions WHERE user_id = $1', [targetUserId]),
      pool.query(
        'SELECT question_type, score_percent, total_questions, completed_at FROM manager_quiz_attempts WHERE user_id = $1 ORDER BY completed_at DESC',
        [targetUserId]
      )
    ]);
    const completedMaterialIds = (completionsRes.rows || []).map((r) => r.material_id);
    const quizAttempts = (attemptsRes.rows || []).map((r) => ({ ...r, completed_at: r.completed_at?.toISOString?.() }));

    res.json({ completedMaterialIds, quizAttempts });
  } catch (e) {
    if (e.message?.includes('manager_material_completions') || e.message?.includes('manager_quiz_attempts')) {
      return res.json({ completedMaterialIds: [], quizAttempts: [] });
    }
    res.status(500).json({ error: e.message });
  }
});

// Отметить материал как прочитанный
router.post('/materials/:id/complete', requireAuth, requireAdminOrSalesManager, async (req, res) => {
  try {
    const materialId = parseInt(req.params.id, 10);
    const userId = req.user.id;
    if (!materialId || isNaN(materialId)) return res.status(400).json({ error: 'invalid id' });
    await pool.query(
      `INSERT INTO manager_material_completions (user_id, material_id) VALUES ($1, $2)
       ON CONFLICT (user_id, material_id) DO NOTHING`,
      [userId, materialId]
    );
    res.json({ success: true });
  } catch (e) {
    if (e.message?.includes('manager_material_completions')) return res.json({ success: true });
    res.status(500).json({ error: e.message });
  }
});

// Отправить результат теста
router.post('/quiz/submit', requireAuth, requireAdminOrSalesManager, async (req, res) => {
  try {
    const { question_type, score_percent, total_questions, correct_count } = req.body || {};
    if (!question_type || score_percent == null || !total_questions || correct_count == null) {
      return res.status(400).json({ error: 'question_type, score_percent, total_questions, correct_count required' });
    }
    const userId = req.user.id;
    await pool.query(
      `INSERT INTO manager_quiz_attempts (user_id, question_type, score_percent, total_questions, correct_count)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, question_type, Math.min(100, Math.max(0, score_percent)), total_questions, correct_count]
    );
    res.json({ success: true });
  } catch (e) {
    if (e.message?.includes('manager_quiz_attempts')) return res.json({ success: true });
    res.status(500).json({ error: e.message });
  }
});

// CRUD вопросов (админ)
router.post('/questions', requireAuth, async (req, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  try {
    const { material_id, type, course_slug, question_text, options, correct_index, sort_order } = req.body || {};
    if (!question_text) return res.status(400).json({ error: 'question_text required' });
    const qType = type || (course_slug ? 'general' : null);
    if (!qType && !course_slug) return res.status(400).json({ error: 'type or course_slug required' });
    const opts = Array.isArray(options) ? options : [];
    const r = await pool.query(
      `INSERT INTO sales_training_questions (material_id, type, course_slug, question_text, options, correct_index, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [material_id || null, qType || 'general', course_slug || null, question_text, JSON.stringify(opts), correct_index ?? (opts.length === 0 ? -1 : 0), sort_order ?? 0]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/questions/:id', requireAuth, async (req, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  try {
    const id = parseInt(req.params.id, 10);
    const body = req.body || {};
    if (!id || isNaN(id)) return res.status(400).json({ error: 'invalid id' });
    const updates = [];
    const params = [id];
    const fields = ['material_id', 'type', 'course_slug', 'question_text', 'options', 'correct_index', 'sort_order'];
    fields.forEach((f) => {
      if (body[f] !== undefined) {
        params.push(f === 'options' && Array.isArray(body[f]) ? JSON.stringify(body[f]) : body[f]);
        updates.push(`${f} = $${params.length}`);
      }
    });
    if (updates.length === 0) return res.status(400).json({ error: 'nothing to update' });
    const r = await pool.query(
      `UPDATE sales_training_questions SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
      params
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Question not found' });
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/questions/:id', requireAuth, async (req, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) return res.status(400).json({ error: 'invalid id' });
    const r = await pool.query('DELETE FROM sales_training_questions WHERE id = $1 RETURNING id', [id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Question not found' });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Кейсы (из таблицы cases) — для менеджера
router.get('/cases', requireAuth, requireAdminOrSalesManager, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT slug, title, summary, category, hero_image_url, created_at
       FROM cases WHERE is_published = TRUE
       ORDER BY home_order ASC NULLS LAST, created_at DESC`
    );
    res.json(r.rows);
  } catch (e) {
    if (e.message?.includes('home_order')) {
      const r = await pool.query(
        `SELECT slug, title, summary, category, hero_image_url, created_at
         FROM cases WHERE is_published = TRUE ORDER BY created_at DESC`
      );
      return res.json(r.rows);
    }
    res.status(500).json({ error: e.message });
  }
});

export default router;
