import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Все роуты требуют авторизации
router.use(requireAuth);

// ==================== ПРОЕКТЫ ====================

// Получить все проекты пользователя
router.get('/projects', async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      'SELECT * FROM projects WHERE user_id = $1 AND is_archived = false ORDER BY priority DESC, created_at DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Получить один проект
router.get('/projects/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Создать проект
router.post('/projects', async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, color, description, goals, deadline, budget, priority } = req.body;
    
    const result = await pool.query(
      `INSERT INTO projects (user_id, name, color, description, goals, deadline, budget, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [userId, name, color || '#667eea', description, goals, deadline, budget, priority || 3]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Обновить проект
router.put('/projects/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, color, description, goals, deadline, budget, priority, status } = req.body;
    
    const result = await pool.query(
      `UPDATE projects
       SET name = COALESCE($1, name),
           color = COALESCE($2, color),
           description = COALESCE($3, description),
           goals = COALESCE($4, goals),
           deadline = COALESCE($5, deadline),
           budget = COALESCE($6, budget),
           priority = COALESCE($7, priority),
           status = COALESCE($8, status),
           updated_at = NOW()
       WHERE id = $9 AND user_id = $10
       RETURNING *`,
      [name, color, description, goals, deadline, budget, priority, status, id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Удалить проект
router.delete('/projects/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM projects WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json({ message: 'Project deleted' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// ==================== ДАШБОРД ====================

router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    
    // Получаем метрики сегодня
    const metricsResult = await pool.query(
      'SELECT * FROM daily_metrics WHERE user_id = $1 AND date = $2',
      [userId, today]
    );
    
    // Получаем проекты с количеством активных задач
    const projectsResult = await pool.query(
      `SELECT p.*, 
              COUNT(t.id) FILTER (WHERE t.status != 'completed') as active_tasks
       FROM projects p
       LEFT JOIN tasks t ON t.project_id = p.id
       WHERE p.user_id = $1 AND p.is_archived = false
       GROUP BY p.id
       ORDER BY p.priority DESC`,
      [userId]
    );
    
    // Получаем стрики
    const streaksResult = await pool.query(
      'SELECT * FROM streaks WHERE user_id = $1 ORDER BY current_count DESC LIMIT 5',
      [userId]
    );
    
    // Получаем AI-рекомендации
    const recommendationsResult = await pool.query(
      `SELECT * FROM ai_recommendations 
       WHERE user_id = $1 AND is_dismissed = false AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY priority DESC, created_at DESC
       LIMIT 5`,
      [userId]
    );
    
    // Получаем недельную статистику
    const weeklyResult = await pool.query(
      `SELECT date, completion_rate, tasks_completed
       FROM daily_metrics
       WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '7 days'
       ORDER BY date`,
      [userId]
    );
    
    res.json({
      today: metricsResult.rows[0] || {
        tasks_completed: 0,
        tasks_total: 0,
        completion_rate: 0,
      },
      projects: projectsResult.rows,
      streaks: streaksResult.rows,
      recommendations: recommendationsResult.rows,
      weekly_trend: weeklyResult.rows,
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

// ==================== ЛИЧНОЕ РАЗВИТИЕ ====================

// Получить категории
router.get('/personal/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM personal_categories ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Получить записи по категории
router.get('/personal/:categoryId/entries', async (req, res) => {
  try {
    const userId = req.user.id;
    const { categoryId } = req.params;
    const { from, to } = req.query;
    
    let query = 'SELECT * FROM personal_entries WHERE user_id = $1 AND category_id = $2';
    const params = [userId, categoryId];
    
    if (from && to) {
      query += ' AND date BETWEEN $3 AND $4';
      params.push(from, to);
    }
    
    query += ' ORDER BY date DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching entries:', error);
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

// Удалить запись
router.delete('/personal/entries/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM personal_entries WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    
    res.json({ message: 'Entry deleted' });
  } catch (error) {
    console.error('Error deleting entry:', error);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

// Обновить запись
router.put('/personal/entries/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { category_id, date, ...data } = req.body;
    
    console.log('[Planner API] Updating entry:', { id, userId, data });
    
    // Проверяем, что запись принадлежит пользователю
    const checkResult = await pool.query(
      'SELECT id FROM personal_entries WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    
    // Строим UPDATE запрос
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;
    
    if (date) {
      updateFields.push(`date = $${paramIndex++}`);
      updateValues.push(date);
    }
    
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        updateFields.push(`${key} = $${paramIndex++}`);
        updateValues.push(value);
      } else {
        // Если значение пустое, устанавливаем NULL
        updateFields.push(`${key} = NULL`);
      }
    });
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updateValues.push(id, userId);
    const query = `
      UPDATE personal_entries
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
      RETURNING *
    `;
    
    const result = await pool.query(query, updateValues);
    console.log('[Planner API] Entry updated:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('[Planner API] Error updating entry:', error);
    res.status(500).json({ error: 'Failed to update entry', details: error.message });
  }
});

// Создать запись
router.post('/personal/entries', async (req, res) => {
  try {
    const userId = req.user.id;
    const { category_id, date, id, ...data } = req.body; // Игнорируем id при создании
    
    console.log('[Planner API] Creating entry:', { userId, category_id, date, data });
    
    if (!category_id) {
      return res.status(400).json({ error: 'category_id is required' });
    }
    
    if (!date) {
      return res.status(400).json({ error: 'date is required' });
    }
    
    // Динамически строим запрос на основе переданных полей
    const columns = ['user_id', 'category_id', 'date'];
    const values = [userId, category_id, date];
    const placeholders = ['$1', '$2', '$3'];
    
    let paramIndex = 4;
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        columns.push(key);
        values.push(value);
        placeholders.push(`$${paramIndex++}`);
      }
    });
    
    const query = `
      INSERT INTO personal_entries (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;
    
    console.log('[Planner API] SQL:', query);
    console.log('[Planner API] Values:', values);
    
    const result = await pool.query(query, values);
    console.log('[Planner API] Entry created:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('[Planner API] Error creating entry:', error);
    res.status(500).json({ error: 'Failed to create entry', details: error.message });
  }
});

// ==================== МЕТРИКИ ====================

// Обновить ежедневные метрики
router.put('/metrics/daily', async (req, res) => {
  try {
    const userId = req.user.id;
    const { date, energy_level, mood, sleep_hours } = req.body;
    
    const result = await pool.query(
      `INSERT INTO daily_metrics (user_id, date, energy_level, mood, sleep_hours)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, date) 
       DO UPDATE SET 
         energy_level = COALESCE($3, daily_metrics.energy_level),
         mood = COALESCE($4, daily_metrics.mood),
         sleep_hours = COALESCE($5, daily_metrics.sleep_hours),
         updated_at = NOW()
       RETURNING *`,
      [userId, date, energy_level, mood, sleep_hours]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating metrics:', error);
    res.status(500).json({ error: 'Failed to update metrics' });
  }
});

// ==================== ПРОФИЛИ ПОЛЬЗОВАТЕЛЯ ====================

// Получить профиль тренировок
router.get('/profile/workout', async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      'SELECT * FROM user_workout_profile WHERE user_id = $1',
      [userId]
    );
    res.json(result.rows[0] || null);
  } catch (error) {
    console.error('Error fetching workout profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Сохранить/обновить профиль тренировок
router.put('/profile/workout', async (req, res) => {
  try {
    const userId = req.user.id;
    const data = req.body;
    
    const result = await pool.query(
      `INSERT INTO user_workout_profile (
        user_id, height, weight, age, gender, fitness_level, goals, target_weight,
        injuries, health_conditions, preferred_workouts, training_days_per_week
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (user_id) 
      DO UPDATE SET
        height = COALESCE($2, user_workout_profile.height),
        weight = COALESCE($3, user_workout_profile.weight),
        age = COALESCE($4, user_workout_profile.age),
        gender = COALESCE($5, user_workout_profile.gender),
        fitness_level = COALESCE($6, user_workout_profile.fitness_level),
        goals = COALESCE($7, user_workout_profile.goals),
        target_weight = COALESCE($8, user_workout_profile.target_weight),
        injuries = COALESCE($9, user_workout_profile.injuries),
        health_conditions = COALESCE($10, user_workout_profile.health_conditions),
        preferred_workouts = COALESCE($11, user_workout_profile.preferred_workouts),
        training_days_per_week = COALESCE($12, user_workout_profile.training_days_per_week),
        updated_at = NOW()
      RETURNING *`,
      [
        userId,
        data.height,
        data.weight,
        data.age,
        data.gender,
        data.fitness_level,
        data.goals,
        data.target_weight,
        data.injuries,
        data.health_conditions,
        data.preferred_workouts,
        data.training_days_per_week,
      ]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error saving workout profile:', error);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

// Аналогичные эндпоинты для других профилей
router.get('/profile/nutrition', async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      'SELECT * FROM user_nutrition_profile WHERE user_id = $1',
      [userId]
    );
    res.json(result.rows[0] || null);
  } catch (error) {
    console.error('Error fetching nutrition profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.put('/profile/nutrition', async (req, res) => {
  try {
    const userId = req.user.id;
    const data = req.body;
    
    const result = await pool.query(
      `INSERT INTO user_nutrition_profile (
        user_id, daily_calories_goal, daily_protein_goal, daily_carbs_goal,
        daily_fats_goal, daily_water_goal, diet_type, allergies, dislikes, meals_per_day
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (user_id)
      DO UPDATE SET
        daily_calories_goal = COALESCE($2, user_nutrition_profile.daily_calories_goal),
        daily_protein_goal = COALESCE($3, user_nutrition_profile.daily_protein_goal),
        daily_carbs_goal = COALESCE($4, user_nutrition_profile.daily_carbs_goal),
        daily_fats_goal = COALESCE($5, user_nutrition_profile.daily_fats_goal),
        daily_water_goal = COALESCE($6, user_nutrition_profile.daily_water_goal),
        diet_type = COALESCE($7, user_nutrition_profile.diet_type),
        allergies = COALESCE($8, user_nutrition_profile.allergies),
        dislikes = COALESCE($9, user_nutrition_profile.dislikes),
        meals_per_day = COALESCE($10, user_nutrition_profile.meals_per_day),
        updated_at = NOW()
      RETURNING *`,
      [
        userId,
        data.daily_calories_goal,
        data.daily_protein_goal,
        data.daily_carbs_goal,
        data.daily_fats_goal,
        data.daily_water_goal,
        data.diet_type,
        data.allergies,
        data.dislikes,
        data.meals_per_day,
      ]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error saving nutrition profile:', error);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

// Reading profile
router.get('/profile/reading', async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      'SELECT * FROM user_reading_profile WHERE user_id = $1',
      [userId]
    );
    res.json(result.rows[0] || null);
  } catch (error) {
    console.error('Error fetching reading profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.put('/profile/reading', async (req, res) => {
  try {
    const userId = req.user.id;
    const data = req.body;
    
    const result = await pool.query(
      `INSERT INTO user_reading_profile (
        user_id, favorite_genres, favorite_authors, reading_speed,
        books_per_month_goal, pages_per_day_goal, books_read
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id)
      DO UPDATE SET
        favorite_genres = COALESCE($2, user_reading_profile.favorite_genres),
        favorite_authors = COALESCE($3, user_reading_profile.favorite_authors),
        reading_speed = COALESCE($4, user_reading_profile.reading_speed),
        books_per_month_goal = COALESCE($5, user_reading_profile.books_per_month_goal),
        pages_per_day_goal = COALESCE($6, user_reading_profile.pages_per_day_goal),
        books_read = COALESCE($7, user_reading_profile.books_read),
        updated_at = NOW()
      RETURNING *`,
      [
        userId,
        data.favorite_genres,
        data.favorite_authors,
        data.reading_speed,
        data.books_per_month_goal,
        data.pages_per_day_goal,
        data.books_read,
      ]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error saving reading profile:', error);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

// Education profile
router.get('/profile/education', async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      'SELECT * FROM user_education_profile WHERE user_id = $1',
      [userId]
    );
    res.json(result.rows[0] || null);
  } catch (error) {
    console.error('Error fetching education profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.put('/profile/education', async (req, res) => {
  try {
    const userId = req.user.id;
    const data = req.body;
    
    const result = await pool.query(
      `INSERT INTO user_education_profile (
        user_id, areas_of_interest, current_skills, target_skills,
        learning_goals, hours_per_week, preferred_formats
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id)
      DO UPDATE SET
        areas_of_interest = COALESCE($2, user_education_profile.areas_of_interest),
        current_skills = COALESCE($3, user_education_profile.current_skills),
        target_skills = COALESCE($4, user_education_profile.target_skills),
        learning_goals = COALESCE($5, user_education_profile.learning_goals),
        hours_per_week = COALESCE($6, user_education_profile.hours_per_week),
        preferred_formats = COALESCE($7, user_education_profile.preferred_formats),
        updated_at = NOW()
      RETURNING *`,
      [
        userId,
        data.areas_of_interest,
        data.current_skills,
        data.target_skills,
        data.learning_goals,
        data.hours_per_week,
        data.preferred_formats,
      ]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error saving education profile:', error);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

// Finance profile
router.get('/profile/finance', async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      'SELECT * FROM user_finance_profile WHERE user_id = $1',
      [userId]
    );
    res.json(result.rows[0] || null);
  } catch (error) {
    console.error('Error fetching finance profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.put('/profile/finance', async (req, res) => {
  try {
    const userId = req.user.id;
    const data = req.body;
    
    const result = await pool.query(
      `INSERT INTO user_finance_profile (
        user_id, monthly_income, monthly_budget, savings_goal,
        investment_goal, expense_categories
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id)
      DO UPDATE SET
        monthly_income = COALESCE($2, user_finance_profile.monthly_income),
        monthly_budget = COALESCE($3, user_finance_profile.monthly_budget),
        savings_goal = COALESCE($4, user_finance_profile.savings_goal),
        investment_goal = COALESCE($5, user_finance_profile.investment_goal),
        expense_categories = COALESCE($6, user_finance_profile.expense_categories),
        updated_at = NOW()
      RETURNING *`,
      [
        userId,
        data.monthly_income,
        data.monthly_budget,
        data.savings_goal,
        data.investment_goal,
        data.expense_categories,
      ]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error saving finance profile:', error);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

// ==================== AI РЕКОМЕНДАЦИИ ====================

// Пометить рекомендацию как прочитанную
router.put('/recommendations/:id/read', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    const result = await pool.query(
      'UPDATE ai_recommendations SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating recommendation:', error);
    res.status(500).json({ error: 'Failed to update recommendation' });
  }
});

// Отклонить рекомендацию
router.put('/recommendations/:id/dismiss', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    const result = await pool.query(
      'UPDATE ai_recommendations SET is_dismissed = true WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error dismissing recommendation:', error);
    res.status(500).json({ error: 'Failed to dismiss recommendation' });
  }
});

export default router;

