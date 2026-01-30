import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { callOpenAIJSON } from './ai.js';
import { callOpenAIText } from './ai.js';
import { callLocalAI } from './localAI.js';

const router = express.Router();

// POST /api/tasks/parse-voice - Парсинг голосового ввода задачи через AI
// ВАЖНО: Этот роут должен быть ПЕРЕД /:id, иначе Express будет интерпретировать "parse-voice" как ID
router.post('/parse-voice', requireAuth, async (req, res) => {
  console.log('[tasks/parse-voice] Route called');
  try {
    const { voiceText, availableProjects = [] } = req.body;

    if (!voiceText || typeof voiceText !== 'string' || voiceText.trim().length === 0) {
      return res.status(400).json({ error: 'Текст голосового ввода обязателен' });
    }

    // Получаем список проектов для контекста
    const projectsList = availableProjects.map((p) => `ID: ${p.id}, Название: ${p.name}`).join('\n') || 'Проекты не указаны';

    const systemPrompt = `Ты - AI-ассистент для парсинга голосового ввода задач. Твоя задача - извлечь структурированную информацию из естественного языка пользователя.

Доступные статусы: new (новая), in_progress (в работе), completed (выполнена), cancelled (отменена)
Доступные приоритеты: low (низкий), medium (средний), high (высокий), urgent (срочный)
Доступные категории: development (разработка), marketing (маркетинг), business (построение бизнеса), operations (операции), support (поддержка), other (другое)

Доступные проекты:
${projectsList}

ВАЖНО: Верни ответ ТОЛЬКО в формате валидного JSON объекта (без markdown разметки, без тройных кавычек).

JSON должен содержать следующие поля:
- "title": string - название задачи (обязательно, минимум 3 символа)
- "description": string - описание задачи (опционально, может быть пустым)
- "status": string - статус из списка выше (по умолчанию "new")
- "priority": string - приоритет из списка выше (определи по словам: срочно/urgent, важно/high, обычное/medium, низкий/low)
- "category": string - категория из списка выше (определи по контексту)
- "project_id": number | null - ID проекта из списка выше (если упомянут проект, найди его ID по названию, иначе null)
- "due_date": string | null - дата в формате ISO 8601 (YYYY-MM-DDTHH:mm:ss) или null. Распознай относительные даты: "сегодня", "завтра", "через неделю", "через месяц", "в понедельник" и т.д.
- "tags": string[] - массив тегов (извлеки ключевые слова, максимум 5 тегов)
- "deal_id": number | null - ID сделки если упомянут (null если не упомянут)

Примеры:
- "Срочно сделать лендинг для нового клиента, проект Веб-сайт, срок завтра" → {"title": "Создать лендинг для нового клиента", "description": "", "status": "new", "priority": "urgent", "category": "development", "project_id": <ID проекта "Веб-сайт">, "due_date": "2025-01-XXT12:00:00", "tags": ["лендинг", "клиент"], "deal_id": null}
- "Обычная задача по маркетингу, написать пост в блог" → {"title": "Написать пост в блог", "description": "", "status": "new", "priority": "medium", "category": "marketing", "project_id": null, "due_date": null, "tags": ["блог", "пост"], "deal_id": null}`;

    const userPrompt = `Распарсь следующую голосовую команду для создания задачи:\n\n"${voiceText.trim()}"\n\nВерни только JSON объект без дополнительных пояснений.`;

    // Определяем, какой AI использовать
    const useLocalAI = process.env.USE_LOCAL_AI === 'true' || process.env.USE_LOCAL_AI === '1';
    let aiResponse = null;

    if (useLocalAI) {
      try {
        const messages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ];
        aiResponse = await callLocalAI(messages, {
          model: process.env.LOCAL_AI_MODEL,
          temperature: 0.3, // Низкая температура для более точного парсинга
          maxTokens: 1000,
        });
        if (aiResponse?.content) {
          // Парсим JSON из текстового ответа
          let jsonText = aiResponse.content.trim();
          if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
          }
          aiResponse = JSON.parse(jsonText);
        }
      } catch (error) {
        console.error('[tasks/parse-voice] Local AI error, falling back to OpenAI:', error.message);
        if (process.env.OPENAI_API_KEY) {
          aiResponse = await callOpenAIJSON(systemPrompt, userPrompt);
        } else {
          throw new Error('Local AI недоступен, а OpenAI API ключ не настроен');
        }
      }
    } else {
      aiResponse = await callOpenAIJSON(systemPrompt, userPrompt);
    }

    if (!aiResponse) {
      return res.status(500).json({ error: 'Не удалось распарсить голосовой ввод' });
    }

    // Валидация и нормализация ответа
    const parsed = {
      title: aiResponse.title || voiceText.trim().substring(0, 100),
      description: aiResponse.description || '',
      status: ['new', 'in_progress', 'completed', 'cancelled'].includes(aiResponse.status) 
        ? aiResponse.status 
        : 'new',
      priority: ['low', 'medium', 'high', 'urgent'].includes(aiResponse.priority)
        ? aiResponse.priority
        : 'medium',
      category: ['development', 'marketing', 'business', 'operations', 'support', 'other'].includes(aiResponse.category)
        ? aiResponse.category
        : 'other',
      project_id: aiResponse.project_id && Number.isInteger(Number(aiResponse.project_id))
        ? Number(aiResponse.project_id)
        : null,
      due_date: aiResponse.due_date || null,
      tags: Array.isArray(aiResponse.tags) ? aiResponse.tags.slice(0, 5) : [],
      deal_id: aiResponse.deal_id && Number.isInteger(Number(aiResponse.deal_id))
        ? Number(aiResponse.deal_id)
        : null,
    };

    // Обработка относительных дат
    if (parsed.due_date && (parsed.due_date.includes('TODAY') || parsed.due_date.includes('TOMORROW'))) {
      const today = new Date();
      if (parsed.due_date.includes('TOMORROW')) {
        today.setDate(today.getDate() + 1);
      }
      today.setHours(12, 0, 0, 0);
      parsed.due_date = today.toISOString();
    }
    
    // Обработка относительных дат на русском языке
    if (parsed.due_date && typeof parsed.due_date === 'string') {
      const lowerDate = parsed.due_date.toLowerCase();
      const today = new Date();
      today.setHours(12, 0, 0, 0);
      
      if (lowerDate.includes('сегодня') || lowerDate.includes('today')) {
        parsed.due_date = today.toISOString();
      } else if (lowerDate.includes('завтра') || lowerDate.includes('tomorrow')) {
        today.setDate(today.getDate() + 1);
        parsed.due_date = today.toISOString();
      } else if (lowerDate.includes('через неделю') || lowerDate.includes('через 7 дней')) {
        today.setDate(today.getDate() + 7);
        parsed.due_date = today.toISOString();
      } else if (lowerDate.includes('через месяц')) {
        today.setMonth(today.getMonth() + 1);
        parsed.due_date = today.toISOString();
      }
    }

    res.json({
      success: true,
      task: parsed,
    });

  } catch (error) {
    console.error('[tasks/parse-voice] Error:', error);
    res.status(500).json({ 
      error: error.message || 'Ошибка при парсинге голосового ввода',
      details: error.message?.includes('JSON') ? 'Не удалось распарсить ответ AI' : undefined
    });
  }
});

// GET /api/tasks - List tasks
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status, priority, assignedTo, dealId, archived, category } = req.query;
    let query = 'SELECT * FROM tasks WHERE 1=1';
    const params = [];
    let paramCount = 1;
    
    if (status) {
      query += ` AND status = $${paramCount++}`;
      params.push(status);
    }
    if (priority) {
      query += ` AND priority = $${paramCount++}`;
      params.push(priority);
    }
    if (assignedTo) {
      query += ` AND assigned_to = $${paramCount++}`;
      params.push(parseInt(assignedTo));
    }
    if (dealId) {
      query += ` AND deal_id = $${paramCount++}`;
      params.push(parseInt(dealId));
    }
    if (category) {
      query += ` AND COALESCE(category, 'development') = $${paramCount++}`;
      params.push(category);
    }
    if (archived !== undefined) {
      query += ` AND is_archived = $${paramCount++}`;
      params.push(archived === 'true');
    } else {
      query += ` AND is_archived = false`;
    }
    
    query += ` ORDER BY 
      CASE priority
        WHEN 'urgent' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
      END,
      due_date NULLS LAST,
      created_at DESC`;
    
    const result = await pool.query(query, params);
    
    // Получаем информацию о назначенных пользователях
    const userIds = [...new Set(result.rows.map(t => t.assigned_to).filter(Boolean))];
    const usersMap = new Map();
    if (userIds.length > 0) {
      const usersResult = await pool.query(
        `SELECT id, email, name FROM users WHERE id = ANY($1)`,
        [userIds]
      );
      usersResult.rows.forEach(u => {
        usersMap.set(u.id, { id: u.id, email: u.email, name: u.name });
      });
    }
    
    res.json(result.rows.map(t => {
      const assignedUser = t.assigned_to ? usersMap.get(t.assigned_to) : null;
      return {
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        assignedTo: t.assigned_to,
        assignedToName: assignedUser?.name || assignedUser?.email || null,
        assignedToEmail: assignedUser?.email || null,
        createdBy: t.created_by,
        dueDate: t.due_date,
        completedAt: t.completed_at,
        dealId: t.deal_id,
        projectId: t.project_id,
        tags: t.tags || [],
        category: t.category || 'development',
        isArchived: t.is_archived,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      };
    }));
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// GET /api/tasks/stats - Get task statistics
// ВАЖНО: Этот роут должен быть ПЕРЕД /:id, иначе Express будет интерпретировать "stats" как ID
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysNum = parseInt(days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);
    startDate.setHours(0, 0, 0, 0);
    const startDateStr = startDate.toISOString();

    const totalStats = await pool.query(`
      SELECT 
        COUNT(*)::text as total,
        COUNT(*) FILTER (WHERE status = 'new')::text as new_count,
        COUNT(*) FILTER (WHERE status = 'in_progress')::text as in_progress_count,
        COUNT(*) FILTER (WHERE status = 'completed')::text as completed_count,
        COUNT(*) FILTER (WHERE status = 'cancelled')::text as cancelled_count,
        COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('completed', 'cancelled'))::text as overdue_count,
        COUNT(*) FILTER (WHERE priority = 'urgent')::text as urgent_count,
        COUNT(*) FILTER (WHERE priority = 'high')::text as high_count,
        COUNT(*) FILTER (WHERE priority = 'medium')::text as medium_count,
        COUNT(*) FILTER (WHERE priority = 'low')::text as low_count
      FROM tasks
      WHERE is_archived = false
    `);

    const dailyStats = await pool.query(`
      SELECT 
        DATE(created_at)::text as date,
        COUNT(*)::text as created,
        COUNT(*) FILTER (WHERE status = 'completed')::text as completed
      FROM tasks
      WHERE created_at >= $1 AND is_archived = false
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, [startDateStr]);

    const avgCompletionTime = await pool.query(`
      SELECT 
        COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400), 0)::float as avg_days
      FROM tasks
      WHERE status = 'completed' 
        AND completed_at IS NOT NULL 
        AND created_at IS NOT NULL
        AND completed_at >= $1
    `, [startDateStr]);

    res.json({
      total: totalStats.rows[0] || {},
      dailyStats: dailyStats.rows || [],
      avgCompletionDays: avgCompletionTime.rows[0]?.avg_days || 0,
      priorityStatusStats: [],
      weeklyStats: [],
      hourlyStats: [],
      completionTrend: [],
      workloadByDate: [],
      productivity: [],
      categoryStats: [],
    });
  } catch (err) {
    console.error('Error fetching task stats:', err);
    res.status(500).json({ error: 'Failed to fetch task stats' });
  }
});

// GET /api/tasks/:id - Get single task
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const task = result.rows[0];
    const comments = await pool.query('SELECT * FROM task_comments WHERE task_id = $1 ORDER BY created_at DESC', [id]);
    
    res.json({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assignedTo: task.assigned_to,
      createdBy: task.created_by,
      dueDate: task.due_date,
      completedAt: task.completed_at,
      dealId: task.deal_id,
      projectId: task.project_id,
      tags: task.tags || [],
      category: task.category || 'development',
      isArchived: task.is_archived,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
      comments: comments.rows.map(c => ({
        id: c.id,
        taskId: c.task_id,
        comment: c.comment,
        createdBy: c.created_by,
        createdAt: c.created_at,
      })),
    });
  } catch (err) {
    console.error('Error fetching task:', err);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// POST /api/tasks - Create task
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, description, status, priority, assignedTo, dueDate, dealId, projectId, tags, category } = req.body;
    
    const result = await pool.query(
      `INSERT INTO tasks (title, description, status, priority, assigned_to, created_by, due_date, deal_id, project_id, tags, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [title, description || null, status || 'new', priority || 'medium', assignedTo || null, userId, dueDate || null, dealId || null, projectId || null, tags || [], category || 'development']
    );
    
    const task = result.rows[0];
    res.json({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assignedTo: task.assigned_to,
      createdBy: task.created_by,
      dueDate: task.due_date,
      completedAt: task.completed_at,
      dealId: task.deal_id,
      projectId: task.project_id,
      tags: task.tags || [],
      category: task.category || 'development',
      isArchived: task.is_archived,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
    });
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// PUT /api/tasks/:id - Update task
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, assignedTo, dueDate, dealId, projectId, tags, category, isArchived } = req.body;
    
    const result = await pool.query(
      `UPDATE tasks
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           status = COALESCE($3, status),
           priority = COALESCE($4, priority),
           assigned_to = COALESCE($5, assigned_to),
           due_date = COALESCE($6, due_date),
           deal_id = COALESCE($7, deal_id),
           project_id = COALESCE($8, project_id),
           tags = COALESCE($9, tags),
           category = COALESCE($10, category),
           is_archived = COALESCE($11, is_archived),
           completed_at = CASE WHEN $3 = 'completed' AND status != 'completed' THEN NOW() ELSE completed_at END,
           updated_at = NOW()
       WHERE id = $12
       RETURNING *`,
      [title, description, status, priority, assignedTo, dueDate, dealId, projectId, tags, category, isArchived, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const task = result.rows[0];
    res.json({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assignedTo: task.assigned_to,
      createdBy: task.created_by,
      dueDate: task.due_date,
      completedAt: task.completed_at,
      dealId: task.deal_id,
      projectId: task.project_id,
      tags: task.tags || [],
      category: task.category || 'development',
      isArchived: task.is_archived,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
    });
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// POST /api/tasks/:id/comments - Add comment
router.post('/:id/comments', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { comment } = req.body;
    
    const result = await pool.query(
      'INSERT INTO task_comments (task_id, comment, created_by) VALUES ($1, $2, $3) RETURNING *',
      [id, comment, userId]
    );
    
    res.json({
      id: result.rows[0].id,
      taskId: result.rows[0].task_id,
      comment: result.rows[0].comment,
      createdBy: result.rows[0].created_by,
      createdAt: result.rows[0].created_at,
    });
  } catch (err) {
    console.error('Error adding comment:', err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// DELETE /api/tasks/:id/comments/:commentId - Delete comment
router.delete('/:id/comments/:commentId', requireAuth, async (req, res) => {
  try {
    const { id, commentId } = req.params;
    await pool.query('DELETE FROM task_comments WHERE id = $1 AND task_id = $2', [commentId, id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting comment:', err);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// POST /api/tasks/ai-recommendations - Get AI recommendations
// ВАЖНО: Этот роут должен быть ПЕРЕД /:id
router.post('/ai-recommendations', requireAuth, async (req, res) => {
  try {
    const aiRecommendations = await callOpenAIJSON(
      'Ты - AI-ассистент для управления задачами. Предложи рекомендации по задачам.',
      'Предложи несколько задач для веб-разработки и маркетинга.'
    );
    
    res.json({
      type: 'info',
      title: 'AI Рекомендации',
      message: 'Рекомендации по задачам',
      tasks: [],
    });
  } catch (err) {
    console.error('Error getting AI recommendations:', err);
    res.status(500).json({ error: 'Failed to get AI recommendations' });
  }
});

export default router;