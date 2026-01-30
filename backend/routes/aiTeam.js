import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Продуктовые ограничения по типам задач (какие задачи мы вообще исполняем)
const CONTENT_ONLY = ['CONTENT', 'ANALYTICS', 'SMM', 'ADS'];

function detectWrongTask(planCode, title, description) {
  const text = `${title || ''} ${description || ''}`.toLowerCase();

  const devKeywords = [
    'сделайте сайт',
    'сделать сайт',
    'создайте сайт',
    'создать сайт',
    'лендинг',
    'landing',
    'верстк',
    'frontend',
    'backend',
    'приложение',
    'mobile app',
    'разработайте приложение',
    'разработать приложение',
    'react',
    'next.js',
    'node.js',
  ];

  const coldSalesKeywords = [
    'найдите клиентов',
    'поиск клиентов',
    'холодные звонки',
    'cold call',
    'cold calls',
    'обзвон',
    'прозвон базы',
    'прозвонить базу',
  ];

  const isDevTask = devKeywords.some((k) => text.includes(k));
  const isColdSalesTask = coldSalesKeywords.some((k) => text.includes(k));

  const plan = String(planCode || '').toUpperCase();

  if (isColdSalesTask) {
    return {
      ok: false,
      code: 'TASK_NOT_SUPPORTED',
      message:
        'Мы не выполняем холодные звонки и прямой поиск клиентов. Доступно: контент, аналитика, SMM, реклама.',
      type: 'WRONG_TASK',
    };
  }

  if (isDevTask && plan !== 'ENTERPRISE') {
    return {
      ok: false,
      code: 'TASK_REQUIRES_ENTERPRISE',
      message:
        'Задачи разработки (сайты, приложения, верстка) доступны только на тарифе Enterprise. По текущему тарифу доступны: контент, аналитика, SMM, реклама.',
      type: 'WRONG_TASK',
    };
  }

  return { ok: true };
}

const PLAN_LIMITS = {
  JUNIOR: {
    code: 'JUNIOR',
    name: 'Junior',
    maxTasksPerWeek: 20,
    maxTasksPerDay: 5,
    maxRevisionsPerTask: 1,
  },
  PRO: {
    code: 'PRO',
    name: 'Pro',
    maxTasksPerWeek: 50,
    maxTasksPerDay: 10,
    maxRevisionsPerTask: 2,
  },
  ENTERPRISE: {
    code: 'ENTERPRISE',
    name: 'Enterprise',
    maxTasksPerWeek: 120,
    maxTasksPerDay: null, // без дневного лимита
    maxRevisionsPerTask: null, // неограниченные правки
  },
};

const ALLOWED_TASK_TYPES = ['CONTENT', 'ANALYTICS', 'SMM', 'ADS'];

function getPlan(planCode) {
  const key = String(planCode || '').toUpperCase();
  const plan = PLAN_LIMITS[key];
  if (!plan) {
    throw new Error(`Unknown plan code: ${planCode}`);
  }
  return plan;
}

async function getActiveSubscriptionForUser(userId) {
  const { rows } = await pool.query(
    `SELECT *
     FROM ai_team_subscriptions
     WHERE user_id = $1
       AND status = 'active'
       AND (valid_to IS NULL OR valid_to >= NOW())
       AND (paused_until IS NULL OR paused_until <= NOW())
     ORDER BY valid_from DESC
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

async function getSubscriptionUsage(subscriptionId) {
  const { rows } = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE t.created_at >= date_trunc('week', NOW()))::int AS tasks_this_week,
       COUNT(*) FILTER (WHERE t.created_at >= date_trunc('day', NOW()))::int AS tasks_today
     FROM ai_team_tasks att
     JOIN tasks t ON t.id = att.task_id
     WHERE att.subscription_id = $1`,
    [subscriptionId]
  );

  const row = rows[0] || { tasks_this_week: 0, tasks_today: 0 };
  return {
    tasksThisWeek: row.tasks_this_week || 0,
    tasksToday: row.tasks_today || 0,
  };
}

export async function createAiTeamSubscriptionForUser({
  userId,
  clientId,
  planCode,
  status = 'active',
}) {
  const normalizedPlan = String(planCode).toUpperCase();
  getPlan(normalizedPlan);

  // Если уже есть активная подписка AI Team для пользователя — не дублируем
  const existing = await pool.query(
    `SELECT id FROM ai_team_subscriptions
     WHERE user_id = $1 AND status = 'active'
       AND (valid_to IS NULL OR valid_to >= NOW())
       AND (paused_until IS NULL OR paused_until <= NOW())
     LIMIT 1`,
    [userId]
  );
  if (existing.rows[0]) {
    return existing.rows[0];
  }

  let effectiveClientId = clientId || null;

  if (!effectiveClientId) {
    const userRes = await pool.query(
      'SELECT id, email, name, phone FROM users WHERE id = $1',
      [userId]
    );
    const userRow = userRes.rows[0];
    if (!userRow || !userRow.email) {
      throw new Error('USER_WITH_EMAIL_REQUIRED_FOR_CLIENT_LINK');
    }

    const clientRes = await pool.query(
      'SELECT id FROM clients WHERE email = $1 LIMIT 1',
      [userRow.email]
    );

    if (clientRes.rows[0]) {
      effectiveClientId = clientRes.rows[0].id;
    } else {
      const insertClient = await pool.query(
        `INSERT INTO clients (name, email, phone, source, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING id`,
        [
          userRow.name || userRow.email,
          userRow.email,
          userRow.phone || null,
          'ai_team',
          'client',
        ]
      );
      effectiveClientId = insertClient.rows[0].id;
    }
  }

  const subRes = await pool.query(
    `INSERT INTO ai_team_subscriptions (
       user_id,
       client_id,
       plan_code,
       primary_task_type,
       status
     ) VALUES ($1, $2, $3, NULL, $4)
     RETURNING *`,
    [userId, effectiveClientId, normalizedPlan, status]
  );

  return subRes.rows[0];
}

export async function createAiTeamIncident({
  clientId,
  type,
  severity = 'medium',
  description,
}) {
  const incidentRes = await pool.query(
    `INSERT INTO ai_team_incidents (client_id, type, severity, description)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [clientId, String(type).toUpperCase(), severity, description || null]
  );

  const incident = incidentRes.rows[0];

  let aggressiveCount = null;
  let paused = false;
  let cancelled = false;

  if (String(type).toUpperCase() === 'AGGRESSIVE') {
    const cntRes = await pool.query(
      `SELECT COUNT(*)::int AS cnt
       FROM ai_team_incidents
       WHERE client_id = $1 AND type = 'AGGRESSIVE'`,
      [clientId]
    );
    aggressiveCount = cntRes.rows[0]?.cnt || 0;

    if (aggressiveCount === 2) {
      await pool.query(
        `UPDATE ai_team_subscriptions
         SET paused_until = NOW() + INTERVAL '24 hours',
             updated_at = NOW()
         WHERE client_id = $1 AND status = 'active'`,
        [clientId]
      );
      paused = true;
    } else if (aggressiveCount >= 3) {
      await pool.query(
        `UPDATE ai_team_subscriptions
         SET status = 'cancelled',
             updated_at = NOW()
         WHERE client_id = $1 AND status <> 'cancelled'`,
        [clientId]
      );
      cancelled = true;
    }
  }

  return {
    incident,
    aggressiveCount,
    actions: {
      paused,
      cancelled,
    },
  };
}

function mapTaskRow(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    taskType: row.task_type,
    revisionsCount: row.revisions_count || 0,
    awaitingSince: row.awaiting_since,
    rating: row.rating_score ? Number(row.rating_score) : null,
  };
}

// Планы тарифов (общедоступно для авторизованных)
router.get('/plans', async (req, res) => {
  try {
    res.json({
      plans: Object.values(PLAN_LIMITS),
    });
  } catch (error) {
    console.error('[aiTeam] /plans error:', error);
    res.status(500).json({ error: 'Failed to load plans' });
  }
});

// Обзор подписки и использования лимитов для текущего пользователя
router.get('/me/overview', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const subscription = await getActiveSubscriptionForUser(userId);
    if (!subscription) {
      return res.status(404).json({ error: 'NO_ACTIVE_SUBSCRIPTION' });
    }

    const plan = getPlan(subscription.plan_code);
    const usage = await getSubscriptionUsage(subscription.id);

    const weekUsagePercent =
      plan.maxTasksPerWeek && plan.maxTasksPerWeek > 0
        ? Math.round((usage.tasksThisWeek / plan.maxTasksPerWeek) * 100)
        : null;

    res.json({
      subscription: {
        id: subscription.id,
        planCode: subscription.plan_code,
        status: subscription.status,
        primaryTaskType: subscription.primary_task_type,
        validFrom: subscription.valid_from,
        validTo: subscription.valid_to,
      },
      planLimits: plan,
      usage,
      overload: {
        weekLimitReached:
          !!plan.maxTasksPerWeek && usage.tasksThisWeek >= plan.maxTasksPerWeek,
        dayLimitReached:
          !!plan.maxTasksPerDay && usage.tasksToday >= plan.maxTasksPerDay,
        weekUsagePercent,
      },
    });
  } catch (error) {
    console.error('[aiTeam] /me/overview error:', error);
    res.status(500).json({ error: 'Failed to load AI Team overview' });
  }
});

// Список задач текущего пользователя в рамках AI Team
router.get('/me/tasks', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { status } = req.query;

    const params = [userId];
    let statusFilter = '';

    if (status) {
      params.push(status);
      statusFilter = 'AND t.status = $2';
    }

    const { rows } = await pool.query(
      `SELECT
         t.*,
         att.task_type,
         att.revisions_count,
         att.awaiting_since,
         r.score AS rating_score
       FROM ai_team_tasks att
       JOIN ai_team_subscriptions s ON s.id = att.subscription_id
       JOIN tasks t ON t.id = att.task_id
       LEFT JOIN ai_team_task_ratings r ON r.task_id = t.id
       WHERE s.user_id = $1
         AND s.status = 'active'
         ${statusFilter}
       ORDER BY t.created_at DESC`,
      params
    );

    res.json({
      tasks: rows.map(mapTaskRow),
    });
  } catch (error) {
    console.error('[aiTeam] /me/tasks error:', error);
    res.status(500).json({ error: 'Failed to load tasks' });
  }
});

// Создание новой задачи клиентом (AI Boost Team)
router.post('/me/tasks', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { title, description, taskType, priority } = req.body || {};

    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return res.status(400).json({ error: 'INVALID_TITLE' });
    }

    const normalizedType = String(taskType || '').toUpperCase();
    if (!ALLOWED_TASK_TYPES.includes(normalizedType)) {
      return res.status(400).json({ error: 'INVALID_TASK_TYPE' });
    }

    const subscription = await getActiveSubscriptionForUser(userId);
    if (!subscription) {
      return res.status(400).json({ error: 'NO_ACTIVE_SUBSCRIPTION' });
    }

    // Валидация типа задачи и содержания (WRONG_TASK)
    if (!CONTENT_ONLY.includes(normalizedType)) {
      return res.status(400).json({
        error: 'TASK_TYPE_NOT_ALLOWED',
        message: 'Поддерживаются только задачи по контенту, аналитике, SMM и рекламе.',
      });
    }

    const wrong = detectWrongTask(subscription.plan_code, title, description);
    if (!wrong.ok) {
      // Регистрируем инцидент WRONG_TASK
      try {
        await pool.query(
          `INSERT INTO ai_team_incidents (client_id, type, severity, description)
           SELECT client_id, 'WRONG_TASK', 'medium', $1
           FROM ai_team_subscriptions
           WHERE id = $2`,
          [wrong.message, subscription.id]
        );
      } catch (e) {
        console.error('[aiTeam] Failed to log WRONG_TASK incident:', e);
      }

      return res.status(400).json({
        error: wrong.code,
        message: wrong.message,
      });
    }

    const plan = getPlan(subscription.plan_code);
    const usage = await getSubscriptionUsage(subscription.id);

    if (plan.maxTasksPerWeek && usage.tasksThisWeek >= plan.maxTasksPerWeek) {
      return res.status(400).json({
        error: 'WEEK_LIMIT_REACHED',
        message: 'Лимит задач на неделю исчерпан',
        usage,
        plan,
      });
    }

    if (plan.maxTasksPerDay && usage.tasksToday >= plan.maxTasksPerDay) {
      return res.status(400).json({
        error: 'DAY_LIMIT_REACHED',
        message: 'Лимит задач на сегодня исчерпан',
        usage,
        plan,
      });
    }

    // Ограничение тарифа JUNIOR: один тип задач
    if (subscription.plan_code === 'JUNIOR') {
      if (
        subscription.primary_task_type &&
        subscription.primary_task_type !== normalizedType
      ) {
        return res.status(400).json({
          error: 'JUNIOR_ONE_TASK_TYPE_ONLY',
          message:
            'По тарифу JUNIOR можно использовать только один тип задач. Обратитесь к менеджеру для изменения типа или апгрейда тарифа.',
          primaryTaskType: subscription.primary_task_type,
        });
      }

      if (!subscription.primary_task_type) {
        // Фиксируем первый выбранный тип задач в подписке
        await pool.query(
          `UPDATE ai_team_subscriptions
           SET primary_task_type = $1, updated_at = NOW()
           WHERE id = $2`,
          [normalizedType, subscription.id]
        );
        subscription.primary_task_type = normalizedType;
      }
    }

    // Определяем дедлайн исходя из лимитов по часам (если нужно)
    let dueDate = null;
    if (plan.maxHoursPerTask && Number(plan.maxHoursPerTask) > 0) {
      const d = new Date();
      d.setHours(d.getHours() + Number(plan.maxHoursPerTask));
      dueDate = d.toISOString();
    }

    // Создаём задачу в общей таблице tasks
    const insertTask = await pool.query(
      `INSERT INTO tasks (
         title,
         description,
         status,
         priority,
         assigned_to,
         created_by,
         due_date,
         deal_id,
         project_id,
         tags,
         category
       ) VALUES (
         $1, $2, 'new', $3, NULL, $4, $5, NULL, NULL, $6, $7
       )
       RETURNING *`,
      [
        title.trim(),
        description || null,
        priority || 'medium',
        userId,
        dueDate,
        [], // tags
        'marketing',
      ]
    );

    const task = insertTask.rows[0];

    // Привязываем к AI Team подписке
    await pool.query(
      `INSERT INTO ai_team_tasks (task_id, subscription_id, task_type)
       VALUES ($1, $2, $3)`,
      [task.id, subscription.id, normalizedType]
    );

    res.status(201).json({
      task: mapTaskRow({
        ...task,
        task_type: normalizedType,
        revisions_count: 0,
        awaiting_since: null,
        rating_score: null,
      }),
    });
  } catch (error) {
    console.error('[aiTeam] /me/tasks POST error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Запрос правки по задаче (учитывает лимиты по тарифу)
router.post('/me/tasks/:taskId/revision', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const taskId = Number(req.params.taskId);
    if (!Number.isInteger(taskId) || taskId <= 0) {
      return res.status(400).json({ error: 'INVALID_TASK_ID' });
    }

    const { rows } = await pool.query(
      `SELECT 
         att.task_id,
         att.subscription_id,
         att.revisions_count,
         att.awaiting_since,
         s.plan_code,
         s.user_id,
         s.client_id,
         t.status
       FROM ai_team_tasks att
       JOIN ai_team_subscriptions s ON s.id = att.subscription_id
       JOIN tasks t ON t.id = att.task_id
       WHERE att.task_id = $1
         AND s.user_id = $2
         AND s.status = 'active'`,
      [taskId, userId]
    );

    const row = rows[0];
    if (!row) {
      return res.status(404).json({ error: 'TASK_NOT_FOUND' });
    }

    const plan = getPlan(row.plan_code);
    const currentRevisions = row.revisions_count || 0;

    if (
      plan.maxRevisionsPerTask !== null &&
      typeof plan.maxRevisionsPerTask === 'number' &&
      currentRevisions >= plan.maxRevisionsPerTask
    ) {
      return res.status(400).json({
        error: 'REVISION_LIMIT_REACHED',
        message:
          'Лимит правок по этой задаче исчерпан. Новые изменения считаются отдельной задачей из лимита тарифа.',
        currentRevisions,
        maxRevisionsPerTask: plan.maxRevisionsPerTask,
      });
    }

    await pool.query(
      `UPDATE ai_team_tasks
       SET revisions_count = revisions_count + 1,
           awaiting_since = NOW(),
           updated_at = NOW()
       WHERE task_id = $1`,
      [taskId]
    );

    await pool.query(
      `UPDATE tasks
       SET status = 'revision',
           updated_at = NOW()
       WHERE id = $1`,
      [taskId]
    );

    const newRevisions = currentRevisions + 1;

    // Фиксация сценария CHAOS (слишком много правок)
    try {
      let chaosSeverity = null;
      if (newRevisions >= 5) {
        chaosSeverity = 'high';
      } else if (newRevisions >= 3) {
        chaosSeverity = 'medium';
      }
      if (chaosSeverity) {
        await pool.query(
          `INSERT INTO ai_team_incidents (client_id, type, severity, description)
           VALUES ($1, 'CHAOS', $2, 'Частые изменения задачи, количество правок: ' || $3)
           ON CONFLICT DO NOTHING`,
          [row.client_id, chaosSeverity, newRevisions]
        );
      }
    } catch (e) {
      console.error('[aiTeam] Failed to log CHAOS incident:', e);
    }

    res.json({ success: true, revisions: newRevisions });
  } catch (error) {
    console.error('[aiTeam] /me/tasks/:taskId/revision error:', error);
    res.status(500).json({ error: 'Failed to request revision' });
  }
});

// Подтверждение задачи клиентом (одобрение результата)
router.post('/me/tasks/:taskId/approve', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const taskId = Number(req.params.taskId);
    if (!Number.isInteger(taskId) || taskId <= 0) {
      return res.status(400).json({ error: 'INVALID_TASK_ID' });
    }

    const { rows } = await pool.query(
      `SELECT 
         att.task_id,
         att.subscription_id,
         s.user_id
       FROM ai_team_tasks att
       JOIN ai_team_subscriptions s ON s.id = att.subscription_id
       WHERE att.task_id = $1
         AND s.user_id = $2
         AND s.status = 'active'`,
      [taskId, userId]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'TASK_NOT_FOUND' });
    }

    await pool.query(
      `UPDATE tasks
       SET status = 'completed',
           completed_at = COALESCE(completed_at, NOW()),
           updated_at = NOW()
       WHERE id = $1`,
      [taskId]
    );

    await pool.query(
      `UPDATE ai_team_tasks
       SET awaiting_since = NULL,
           updated_at = NOW()
       WHERE task_id = $1`,
      [taskId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('[aiTeam] /me/tasks/:taskId/approve error:', error);
    res.status(500).json({ error: 'Failed to approve task' });
  }
});

// Оценка качества задачи (1-5 звёзд)
router.post('/me/tasks/:taskId/rating', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const taskId = Number(req.params.taskId);
    const { score, comment } = req.body || {};

    if (!Number.isInteger(score) || score < 1 || score > 5) {
      return res.status(400).json({ error: 'INVALID_SCORE' });
    }

    const { rows } = await pool.query(
      `SELECT 
         att.task_id,
         s.client_id
       FROM ai_team_tasks att
       JOIN ai_team_subscriptions s ON s.id = att.subscription_id
       WHERE att.task_id = $1
         AND s.user_id = $2
         AND s.status = 'active'`,
      [taskId, userId]
    );

    const row = rows[0];
    if (!row) {
      return res.status(404).json({ error: 'TASK_NOT_FOUND' });
    }

    const clientId = row.client_id;

    await pool.query(
      `INSERT INTO ai_team_task_ratings (task_id, client_id, score, comment)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (task_id)
       DO UPDATE SET
         score = EXCLUDED.score,
         comment = EXCLUDED.comment,
         created_at = NOW()`,
      [taskId, clientId, score, comment || null]
    );

    // Регистрация инцидентов качества (QUALITY ISSUE)
    if (score <= 2) {
      await pool.query(
        `INSERT INTO ai_team_incidents (client_id, type, severity, description)
         VALUES ($1, 'QUALITY', 'medium', 'Низкая оценка задачи (1-2 из 5)')
         ON CONFLICT DO NOTHING`,
        [clientId]
      );
    }

    const avgRes = await pool.query(
      `SELECT AVG(score)::numeric(10,2) AS avg_score
       FROM ai_team_task_ratings
       WHERE client_id = $1
         AND created_at >= NOW() - INTERVAL '14 days'`,
      [clientId]
    );

    const avgScore = Number(avgRes.rows[0]?.avg_score || 0);

    if (avgScore > 0 && avgScore < 3) {
      await pool.query(
        `INSERT INTO ai_team_incidents (client_id, type, severity, description)
         VALUES ($1, 'QUALITY', 'high', 'Средняя оценка за 14 дней ниже 3')
         ON CONFLICT DO NOTHING`,
        [clientId]
      );
    }

    res.json({ success: true, score });
  } catch (error) {
    console.error('[aiTeam] /me/tasks/:taskId/rating error:', error);
    res.status(500).json({ error: 'Failed to save rating' });
  }
});

// --- Админские эндпоинты для управления подписками и мониторинга ---

// Список подписок (для PM / админа)
router.get('/admin/subscriptions', async (req, res) => {
  try {
    const role = req.user?.role;
    if (role !== 'admin') {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }

    const { status = 'active' } = req.query;

    const { rows } = await pool.query(
      `SELECT 
         s.*,
         u.email AS user_email,
         u.name AS user_name,
         c.name AS client_name,
         c.email AS client_email
       FROM ai_team_subscriptions s
       JOIN users u ON u.id = s.user_id
       JOIN clients c ON c.id = s.client_id
       WHERE ($1::text IS NULL OR s.status = $1)
       ORDER BY s.created_at DESC`,
      [status || null]
    );

    res.json({ subscriptions: rows });
  } catch (error) {
    console.error('[aiTeam] /admin/subscriptions GET error:', error);
    res.status(500).json({ error: 'Failed to load subscriptions' });
  }
});

// Создание / обновление подписки админом
router.post('/admin/subscriptions', async (req, res) => {
  try {
    const role = req.user?.role;
    if (role !== 'admin') {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }

    const { userId, clientId, planCode, status } = req.body || {};

    if (!userId || !Number.isInteger(userId)) {
      return res.status(400).json({ error: 'INVALID_USER_ID' });
    }

    if (!planCode) {
      return res.status(400).json({ error: 'PLAN_CODE_REQUIRED' });
    }
    const sub = await createAiTeamSubscriptionForUser({
      userId,
      clientId: clientId || null,
      planCode,
      status: status || 'active',
    });

    res.status(201).json({ subscription: sub });
  } catch (error) {
    console.error('[aiTeam] /admin/subscriptions POST error:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// Список инцидентов (red flags) по клиентам
router.get('/admin/incidents', async (req, res) => {
  try {
    const role = req.user?.role;
    if (role !== 'admin') {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }

    const { type, status } = req.query;
    const params = [];
    const conditions = [];

    if (type) {
      params.push(type);
      conditions.push(`i.type = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`i.status = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await pool.query(
      `SELECT 
         i.*,
         c.name AS client_name,
         c.email AS client_email
       FROM ai_team_incidents i
       JOIN clients c ON c.id = i.client_id
       ${where}
       ORDER BY i.created_at DESC
       LIMIT 200`,
      params
    );

    res.json({ incidents: rows });
  } catch (error) {
    console.error('[aiTeam] /admin/incidents GET error:', error);
    res.status(500).json({ error: 'Failed to load incidents' });
  }
});

// Ручное создание инцидента (AGGRESSIVE, OVERLOAD, CHAOS, WRONG_TASK и т.п.)
router.post('/admin/incidents', async (req, res) => {
  try {
    const role = req.user?.role;
    if (role !== 'admin') {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }

    const { clientId, type, severity = 'medium', description } = req.body || {};

    if (!clientId || !Number.isInteger(clientId)) {
      return res.status(400).json({ error: 'INVALID_CLIENT_ID' });
    }
    if (!type || typeof type !== 'string') {
      return res.status(400).json({ error: 'TYPE_REQUIRED' });
    }

    const result = await createAiTeamIncident({ clientId, type, severity, description });
    res.status(201).json(result);
  } catch (error) {
    console.error('[aiTeam] /admin/incidents POST error:', error);
    res.status(500).json({ error: 'Failed to create incident' });
  }
});

// Обработка \"тишины\" (SILENCE) по задачам, ожидающим ответа клиента
router.post('/admin/process-silence', async (req, res) => {
  try {
    const role = req.user?.role;
    if (role !== 'admin') {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }

    const now = new Date();

    const { rows } = await pool.query(
      `SELECT 
         att.task_id,
         att.subscription_id,
         att.awaiting_since,
         s.client_id
       FROM ai_team_tasks att
       JOIN ai_team_subscriptions s ON s.id = att.subscription_id
       JOIN tasks t ON t.id = att.task_id
       WHERE t.status = 'awaiting_client'
         AND att.awaiting_since IS NOT NULL`
    );

    let processed24 = 0;
    let processed48 = 0;
    let processed72 = 0;

    for (const row of rows) {
      const awaitingSince = row.awaiting_since;
      if (!awaitingSince) continue;

      const sinceDate = new Date(awaitingSince);
      const diffMs = now.getTime() - sinceDate.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours >= 72) {
        // Авто-завершение задачи
        await pool.query(
          `UPDATE tasks
           SET status = 'completed',
               completed_at = COALESCE(completed_at, NOW()),
               updated_at = NOW()
           WHERE id = $1`,
          [row.task_id]
        );

        await pool.query(
          `UPDATE ai_team_tasks
           SET auto_completed = TRUE,
               auto_completed_reason = 'SILENCE_72H',
               updated_at = NOW()
           WHERE task_id = $1`,
          [row.task_id]
        );

        processed72 += 1;
      } else if (diffHours >= 48) {
        // Эскалация к PM / инцидент SILENCE
        await pool.query(
          `INSERT INTO ai_team_incidents (client_id, type, severity, description)
           VALUES ($1, 'SILENCE', 'high', 'Клиент не отвечает более 48 часов')
           ON CONFLICT DO NOTHING`,
          [row.client_id]
        );
        processed48 += 1;
      } else if (diffHours >= 24) {
        // Мягкое напоминание — фиксируем как low severity инцидент
        await pool.query(
          `INSERT INTO ai_team_incidents (client_id, type, severity, description)
           VALUES ($1, 'SILENCE', 'low', 'Клиент не отвечает более 24 часов')
           ON CONFLICT DO NOTHING`,
          [row.client_id]
        );
        processed24 += 1;
      }
    }

    res.json({
      success: true,
      processed24,
      processed48,
      processed72,
    });
  } catch (error) {
    console.error('[aiTeam] /admin/process-silence error:', error);
    res.status(500).json({ error: 'Failed to process silence rules' });
  }
});

export default router;







