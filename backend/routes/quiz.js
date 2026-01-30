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

// GET /api/public/quiz/questions - Публичный список вопросов с вариантами
router.get('/public/questions', async (req, res) => {
  try {
    const questionsResult = await pool.query(`
      SELECT * FROM quiz_questions 
      WHERE is_active = TRUE 
      ORDER BY sort_order ASC, created_at ASC
    `);
    
    const questions = questionsResult.rows.map(rowToQuestion);
    
    // Загружаем варианты ответов для каждого вопроса
    const questionsWithOptions = await Promise.all(
      questions.map(async (question) => {
        const optionsResult = await pool.query(`
          SELECT * FROM quiz_options 
          WHERE question_id = $1 AND is_active = TRUE 
          ORDER BY sort_order ASC, created_at ASC
        `, [question.id]);
        
        return {
          ...question,
          options: optionsResult.rows.map(rowToOption)
        };
      })
    );
    
    res.json(questionsWithOptions);
  } catch (error) {
    console.error('[Quiz] Error fetching questions:', error);
    res.status(500).json({ error: 'Failed to fetch quiz questions' });
  }
});

// POST /api/public/quiz/submit - Отправить результат квиза
router.post('/public/submit', async (req, res) => {
  try {
    const { answers, recommendedTariff, userEmail } = req.body;
    
    await pool.query(`
      INSERT INTO quiz_results (recommended_tariff, answers, user_email)
      VALUES ($1, $2, $3)
    `, [
      recommendedTariff,
      JSON.stringify(answers || {}),
      userEmail || null
    ]);
    
    res.json({ success: true, recommendedTariff });
  } catch (error) {
    console.error('[Quiz] Error submitting result:', error);
    res.status(500).json({ error: 'Failed to submit quiz result' });
  }
});

// ========== АДМИНСКИЕ ЭНДПОИНТЫ ==========

// GET /api/quiz/questions - Список всех вопросов (админ)
router.get('/questions', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM quiz_questions 
      ORDER BY sort_order ASC, created_at ASC
    `);
    
    const questions = result.rows.map(rowToQuestion);
    
    // Загружаем варианты ответов
    const questionsWithOptions = await Promise.all(
      questions.map(async (question) => {
        const optionsResult = await pool.query(`
          SELECT * FROM quiz_options 
          WHERE question_id = $1 
          ORDER BY sort_order ASC, created_at ASC
        `, [question.id]);
        
        return {
          ...question,
          options: optionsResult.rows.map(rowToOption)
        };
      })
    );
    
    res.json(questionsWithOptions);
  } catch (error) {
    console.error('[Quiz] Error fetching questions:', error);
    res.status(500).json({ error: 'Failed to fetch quiz questions' });
  }
});

// POST /api/quiz/questions - Создать вопрос
router.post('/questions', requireAuth, async (req, res) => {
  try {
    const { questionText, questionType, sortOrder, isActive } = req.body;
    
    const result = await pool.query(`
      INSERT INTO quiz_questions (question_text, question_type, sort_order, is_active)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [
      questionText,
      questionType || 'single',
      sortOrder || 0,
      isActive !== false
    ]);
    
    res.status(201).json(rowToQuestion(result.rows[0]));
  } catch (error) {
    console.error('[Quiz] Error creating question:', error);
    res.status(500).json({ error: 'Failed to create question' });
  }
});

// PUT /api/quiz/questions/:id - Обновить вопрос
router.put('/questions/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { questionText, questionType, sortOrder, isActive } = req.body;
    
    const result = await pool.query(`
      UPDATE quiz_questions SET
        question_text = COALESCE($1, question_text),
        question_type = COALESCE($2, question_type),
        sort_order = COALESCE($3, sort_order),
        is_active = COALESCE($4, is_active),
        updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [questionText, questionType, sortOrder, isActive, id]);
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    res.json(rowToQuestion(result.rows[0]));
  } catch (error) {
    console.error('[Quiz] Error updating question:', error);
    res.status(500).json({ error: 'Failed to update question' });
  }
});

// DELETE /api/quiz/questions/:id - Удалить вопрос
router.delete('/questions/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM quiz_questions WHERE id = $1', [id]);
    res.json({ deleted: true });
  } catch (error) {
    console.error('[Quiz] Error deleting question:', error);
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

// POST /api/quiz/questions/:questionId/options - Создать вариант ответа
router.post('/questions/:questionId/options', requireAuth, async (req, res) => {
  try {
    const { questionId } = req.params;
    const {
      optionText,
      optionDescription,
      pointsStart,
      pointsBusiness,
      pointsPremium,
      sortOrder,
      isActive
    } = req.body;
    
    const result = await pool.query(`
      INSERT INTO quiz_options (
        question_id, option_text, option_description,
        points_start, points_business, points_premium,
        sort_order, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      questionId,
      optionText,
      optionDescription,
      pointsStart || 0,
      pointsBusiness || 0,
      pointsPremium || 0,
      sortOrder || 0,
      isActive !== false
    ]);
    
    res.status(201).json(rowToOption(result.rows[0]));
  } catch (error) {
    console.error('[Quiz] Error creating option:', error);
    res.status(500).json({ error: 'Failed to create option' });
  }
});

// PUT /api/quiz/options/:id - Обновить вариант ответа
router.put('/options/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      optionText,
      optionDescription,
      pointsStart,
      pointsBusiness,
      pointsPremium,
      sortOrder,
      isActive
    } = req.body;
    
    const result = await pool.query(`
      UPDATE quiz_options SET
        option_text = COALESCE($1, option_text),
        option_description = COALESCE($2, option_description),
        points_start = COALESCE($3, points_start),
        points_business = COALESCE($4, points_business),
        points_premium = COALESCE($5, points_premium),
        sort_order = COALESCE($6, sort_order),
        is_active = COALESCE($7, is_active),
        updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `, [
      optionText,
      optionDescription,
      pointsStart,
      pointsBusiness,
      pointsPremium,
      sortOrder,
      isActive,
      id
    ]);
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Option not found' });
    }
    
    res.json(rowToOption(result.rows[0]));
  } catch (error) {
    console.error('[Quiz] Error updating option:', error);
    res.status(500).json({ error: 'Failed to update option' });
  }
});

// DELETE /api/quiz/options/:id - Удалить вариант ответа
router.delete('/options/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM quiz_options WHERE id = $1', [id]);
    res.json({ deleted: true });
  } catch (error) {
    console.error('[Quiz] Error deleting option:', error);
    res.status(500).json({ error: 'Failed to delete option' });
  }
});

// GET /api/quiz/results - Статистика результатов квиза (админ)
router.get('/results', requireAuth, async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    
    const results = await pool.query(`
      SELECT * FROM quiz_results 
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    const stats = await pool.query(`
      SELECT 
        recommended_tariff,
        COUNT(*) as count,
        COUNT(*) * 100.0 / (SELECT COUNT(*) FROM quiz_results) as percentage
      FROM quiz_results 
      GROUP BY recommended_tariff
      ORDER BY count DESC
    `);
    
    res.json({
      results: results.rows.map(r => ({
        id: r.id,
        recommendedTariff: r.recommended_tariff,
        answers: r.answers,
        userEmail: r.user_email,
        createdAt: r.created_at
      })),
      statistics: stats.rows
    });
  } catch (error) {
    console.error('[Quiz] Error fetching results:', error);
    res.status(500).json({ error: 'Failed to fetch quiz results' });
  }
});

export default router;
