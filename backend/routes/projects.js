import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { createNotification } from './notifications.js';
import { getOrCreateClientFunnel, createDealInClientFunnel } from '../utils/funnelHelper.js';

const router = express.Router();

// Hourly rates table (RUB/hour) by specialist and complexity
const RATES = {
  designer: { simple: 1200, medium: 1800, complex: 2500 },
  frontend: { simple: 1800, medium: 2500, complex: 3500 },
  backend: { simple: 2200, medium: 3000, complex: 4200 },
  mobile: { simple: 2500, medium: 3500, complex: 5000 },
  pm: { simple: 2000, medium: 2800, complex: 4000 },
  qa: { simple: 1500, medium: 2200, complex: 3000 },
};

const URGENCY_COEFF = {
  standard: 1,
  fast: 1.3,
  urgent: 1.6,
};

const PROJECT_TEMPLATES = {
  website: {
    defaultTitle: 'Разработка сайта',
    mode: 'RESULT_BASED',
    stages: [
      { name: 'Дизайн', plannedHours: 40 },
      { name: 'Верстка / Frontend', plannedHours: 60 },
      { name: 'Backend', plannedHours: 80 },
      { name: 'Тестирование', plannedHours: 16 },
    ],
  },
  mobile: {
    defaultTitle: 'Мобильное приложение',
    mode: 'RESULT_BASED',
    stages: [
      { name: 'Продуктовая аналитика', plannedHours: 24 },
      { name: 'UX/UI дизайн', plannedHours: 40 },
      { name: 'Мобильная разработка', plannedHours: 120 },
      { name: 'Тестирование и публикация', plannedHours: 32 },
    ],
  },
  design: {
    defaultTitle: 'Дизайн-проект',
    mode: 'RESULT_BASED',
    stages: [
      { name: 'Бриф и исследование', plannedHours: 16 },
      { name: 'Концепт', plannedHours: 24 },
      { name: 'Финальный дизайн', plannedHours: 32 },
    ],
  },
  complex: {
    defaultTitle: 'Комплексный проект',
    mode: 'RESULT_BASED',
    stages: [
      { name: 'Discovery / стратегия', plannedHours: 32 },
      { name: 'Разработка', plannedHours: 160 },
      { name: 'Запуск и оптимизация', plannedHours: 40 },
    ],
  },
  seo: {
    defaultTitle: 'SEO‑продвижение',
    mode: 'TASK_BASED',
    stages: [
      { name: 'Аналитика и аудит', plannedHours: 24 },
      { name: 'Сбор семантики', plannedHours: 32 },
      { name: 'Оптимизация и контент', plannedHours: 40 },
      { name: 'Отчётности и улучшения', plannedHours: 16 },
    ],
  },
  marketing: {
    defaultTitle: 'Маркетинговое сопровождение',
    mode: 'TASK_BASED',
    stages: [
      { name: 'Стратегия и план', plannedHours: 24 },
      { name: 'Запуск кампаний', plannedHours: 40 },
      { name: 'Аналитика и оптимизация', plannedHours: 32 },
    ],
  },
  content: {
    defaultTitle: 'Контент‑поддержка',
    mode: 'TASK_BASED',
    stages: [
      { name: 'Контент‑план', plannedHours: 16 },
      { name: 'Производство контента', plannedHours: 40 },
      { name: 'Публикация и анализ', plannedHours: 24 },
    ],
  },
};

function getIntegrationCoeff(count) {
  const n = Math.max(0, Number(count || 0));
  return 1 + 0.2 * n;
}

function normalizeSpecType(t) {
  const key = String(t || '').toLowerCase();
  if (key.startsWith('design')) return 'designer';
  if (key.startsWith('front')) return 'frontend';
  if (key.startsWith('back')) return 'backend';
  if (key.startsWith('mob')) return 'mobile';
  if (key === 'pm' || key.startsWith('proj')) return 'pm';
  if (key.startsWith('qa') || key.includes('test')) return 'qa';
  return 'frontend';
}

function detectProjectTypeFromText(title, slug) {
  const text = `${title || ''} ${slug || ''}`.toLowerCase();

  if (
    text.includes('мобил') ||
    text.includes('mobile') ||
    text.includes('android') ||
    text.includes('ios')
  ) {
    return 'mobile';
  }

  if (
    text.includes('дизайн') ||
    text.includes('design') ||
    text.includes('логотип') ||
    text.includes('logo') ||
    text.includes('бренд')
  ) {
    return 'design';
  }

  if (
    text.includes('сайт') ||
    text.includes('landing') ||
    text.includes('лендинг') ||
    text.includes('магазин') ||
    text.includes('shop') ||
    text.includes('ecommerce') ||
    text.includes('интернет-магазин')
  ) {
    return 'website';
  }

  if (
    text.includes('seo') ||
    text.includes('сео') ||
    text.includes('поисковая оптимизация') ||
    text.includes('продвижение') ||
    text.includes('search engine')
  ) {
    return 'seo';
  }

  if (
    text.includes('маркетинг') ||
    text.includes('marketing') ||
    text.includes('реклама') ||
    text.includes('ads') ||
    text.includes('контекст') ||
    text.includes('таргет')
  ) {
    return 'marketing';
  }

  if (
    text.includes('контент') ||
    text.includes('content') ||
    text.includes('копирайт') ||
    text.includes('copy') ||
    text.includes('статьи') ||
    text.includes('тексты')
  ) {
    return 'content';
  }

  if (
    text.includes('комплекс') ||
    text.includes('под ключ') ||
    text.includes('комбо') ||
    text.includes('all-in-one')
  ) {
    return 'complex';
  }

  return null;
}

async function getClientIdForUser(userId) {
  if (!userId) return null;

  const userRes = await pool.query(
    'SELECT email, phone FROM users WHERE id = $1',
    [userId]
  );
  const user = userRes.rows[0];
  if (!user) return null;

  let clientId = null;
  if (user.email) {
    const c = await pool.query(
      'SELECT id FROM clients WHERE email = $1 LIMIT 1',
      [user.email]
    );
    if (c.rows[0]) clientId = c.rows[0].id;
  }
  if (!clientId && user.phone) {
    const c = await pool.query(
      'SELECT id FROM clients WHERE phone = $1 LIMIT 1',
      [user.phone]
    );
    if (c.rows[0]) clientId = c.rows[0].id;
  }

  return clientId;
}

async function createProjectWithTemplate(options) {
  const {
    clientId,
    userId,
    orderId,
    templateKey,
    title,
    budgetTotalCents,
    deadline,
  } = options || {};

  if (!clientId || !templateKey || !PROJECT_TEMPLATES[templateKey]) {
    return null;
  }

  const template = PROJECT_TEMPLATES[templateKey];
  const projectTitle = title || template.defaultTitle;

  // Получаем информацию о клиенте для создания воронки
  let clientInfo = null;
  try {
    const clientRes = await pool.query(
      'SELECT name, company, email, phone FROM clients WHERE id = $1',
      [clientId]
    );
    clientInfo = clientRes.rows[0];
  } catch (err) {
    console.error('[projects] Error fetching client info:', err);
  }

  // Создаем воронку для клиента
  let funnelId = null;
  let dealId = null;
  try {
    funnelId = await getOrCreateClientFunnel(
      clientId,
      projectTitle,
      clientInfo?.name || null,
      clientInfo?.company || null
    );

    if (funnelId) {
      // Получаем product_slug из заказа если есть orderId
      let productSlug = null;
      if (orderId) {
        try {
          const productRes = await pool.query(
            'SELECT product_slug FROM order_items WHERE order_id = $1 LIMIT 1',
            [orderId]
          );
          if (productRes.rows.length > 0) {
            productSlug = productRes.rows[0].product_slug;
          }
        } catch (err) {
          console.error('[projects] Error fetching product_slug:', err);
        }
      }

      // Создаем сделку в воронке
      dealId = await createDealInClientFunnel(
        funnelId,
        clientId,
        projectTitle,
        `Проект: ${projectTitle}`,
        clientInfo?.name || null,
        clientInfo?.email || null,
        clientInfo?.phone || null,
        userId || null,
        productSlug
      );
    }
  } catch (err) {
    console.error('[projects] Error creating funnel/deal for project:', err);
    // Продолжаем создание проекта даже если воронка не создалась
  }

  const projectRes = await pool.query(
    `INSERT INTO client_projects (
       client_id, user_id, deal_id, title, mode, status, progress_percent,
       budget_total_cents, budget_used_cents, deadline, order_id, primary_type
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [
      clientId,
      userId || null,
      dealId, // deal_id из созданной сделки
      projectTitle,
      template.mode || 'RESULT_BASED',
      'active',
      0, // progress_percent
      typeof budgetTotalCents === 'number' ? budgetTotalCents : null,
      0, // budget_used_cents
      deadline || null,
      orderId || null,
      templateKey || null,
    ]
  );
  const project = projectRes.rows[0];

  let sortOrder = 1;
  for (const stage of template.stages || []) {
    await pool.query(
      `INSERT INTO client_project_stages (
         project_id, name, sort_order, status, progress_percent, planned_hours
       )
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        project.id,
        stage.name,
        sortOrder,
        'pending',
        0,
        typeof stage.plannedHours === 'number' ? stage.plannedHours : null,
      ]
    );
    sortOrder += 1;
  }

  return project;
}

export async function createClientProjectFromOrder(orderRow) {
  try {
    if (!orderRow || !orderRow.id) return null;

    const orderId = orderRow.id;

    // Не дублируем проекты для одного и того же заказа
    const existing = await pool.query(
      'SELECT id FROM client_projects WHERE order_id = $1 LIMIT 1',
      [orderId]
    );
    if (existing.rows[0]) {
      return existing.rows[0];
    }

    const clientRes = await pool.query(
      'SELECT client_id FROM client_orders WHERE order_id = $1 LIMIT 1',
      [orderId]
    );
    const clientRow = clientRes.rows[0];
    if (!clientRow) {
      return null;
    }
    const clientId = clientRow.client_id;

    const itemsRes = await pool.query(
      'SELECT product_slug, product_title, price_cents, quantity FROM order_items WHERE order_id = $1',
      [orderId]
    );
    const items = itemsRes.rows;
    if (!items.length) return null;

    let budgetTotalCents = 0;
    for (const it of items) {
      const price = it.price_cents || 0;
      const qty = it.quantity || 1;
      budgetTotalCents += price * qty;
    }

    const types = [];
    for (const it of items) {
      const t = detectProjectTypeFromText(it.product_title, it.product_slug);
      if (t) types.push(t);
    }
    if (!types.length) {
      return null;
    }
    const uniqueTypes = Array.from(new Set(types));
    let mainType = uniqueTypes[0];
    if (uniqueTypes.length > 1) {
      mainType = 'complex';
    }

    if (!PROJECT_TEMPLATES[mainType]) {
      return null;
    }

    const firstTitle = items[0].product_title || PROJECT_TEMPLATES[mainType].defaultTitle;
    const projectTitle = firstTitle;
    const userId = orderRow.user_id || null;

    const project = await createProjectWithTemplate({
      clientId,
      userId,
      orderId,
      templateKey: mainType,
      title: projectTitle,
      budgetTotalCents,
      deadline: null,
    });

    return project;
  } catch (e) {
    console.error('[projects] Failed to create client project from order', orderRow && orderRow.id, e);
    return null;
  }
}

// POST /api/projects/calc-upsell - интеллектуальный калькулятор доп. услуг
router.post('/calc-upsell', requireAuth, async (req, res) => {
  try {
    const {
      specialistType,
      complexity,
      urgency,
      integrations = 0,
      hours,
    } = req.body || {};

    const specKey = normalizeSpecType(specialistType);
    const compKey = String(complexity || 'medium').toLowerCase();
    const urgKey = String(urgency || 'standard').toLowerCase();

    const ratesBySpec = RATES[specKey];
    if (!ratesBySpec) {
      return res.status(400).json({ error: 'INVALID_SPECIALIST_TYPE' });
    }
    const ratePerHour = ratesBySpec[compKey];
    if (!ratePerHour) {
      return res.status(400).json({ error: 'INVALID_COMPLEXITY' });
    }

    const urgCoeff = URGENCY_COEFF[urgKey] || 1;
    const intCoeff = getIntegrationCoeff(integrations);

    const baseHours = hours && Number(hours) > 0 ? Number(hours) : 8;
    const basePrice = baseHours * ratePerHour;
    const finalPrice = Math.round(basePrice * urgCoeff * intCoeff);

    res.json({
      specialistType: specKey,
      complexity: compKey,
      urgency: urgKey,
      integrations: Number(integrations || 0),
      hours: baseHours,
      ratePerHourCents: ratePerHour * 100,
      basePriceCents: basePrice * 100,
      finalPriceCents: finalPrice * 100,
      coeffs: {
        urgency: urgCoeff,
        integrations: intCoeff,
      },
    });
  } catch (error) {
    console.error('[projects] /calc-upsell error:', error);
    res.status(500).json({ error: 'Failed to calculate upsell' });
  }
});

// POST /api/projects/:projectId/create-funnel - создать воронку для существующего проекта
// ВАЖНО: Этот роут должен быть ПЕРЕД /:projectId, иначе Express будет интерпретировать "create-funnel" как ID
router.post('/:projectId/create-funnel', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user?.id;

    // Проверяем доступ клиента к проекту
    const clientId = await getClientIdForUser(userId);
    if (!clientId) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    // Получаем проект с проверкой принадлежности клиенту
    const projectRes = await pool.query(
      `SELECT p.*, c.name AS client_name, c.company, c.email, c.phone
       FROM client_projects p
       JOIN clients c ON c.id = p.client_id
       WHERE p.id = $1 AND p.client_id = $2`,
      [projectId, clientId]
    );

    if (projectRes.rows.length === 0) {
      return res.status(404).json({ error: 'Проект не найден' });
    }

    const project = projectRes.rows[0];

    // Проверяем, есть ли уже воронка
    if (project.deal_id) {
      const dealRes = await pool.query(
        'SELECT funnel_id FROM deals WHERE id = $1',
        [project.deal_id]
      );
      if (dealRes.rows.length > 0) {
        return res.json({
          success: true,
          message: 'Воронка уже существует',
          funnelId: dealRes.rows[0].funnel_id,
          dealId: project.deal_id,
        });
      }
    }

    // Создаем воронку для клиента
    const funnelId = await getOrCreateClientFunnel(
      project.client_id,
      project.title,
      project.client_name,
      project.company
    );

    if (!funnelId) {
      return res.status(500).json({ error: 'Не удалось создать воронку' });
    }

    // Создаем сделку в воронке
    const dealId = await createDealInClientFunnel(
      funnelId,
      project.client_id,
      project.title,
      `Проект: ${project.title}`,
      project.client_name,
      project.email,
      project.phone,
      userId || null
    );

    if (!dealId) {
      return res.status(500).json({ error: 'Не удалось создать сделку' });
    }

    // Обновляем проект со ссылкой на сделку
    await pool.query(
      'UPDATE client_projects SET deal_id = $1 WHERE id = $2',
      [dealId, projectId]
    );

    res.json({
      success: true,
      message: 'Воронка и сделка успешно созданы',
      funnelId,
      dealId,
    });
  } catch (error) {
    console.error('[projects] /:projectId/create-funnel error:', error);
    res.status(500).json({ error: 'Failed to create funnel' });
  }
});

// GET /api/projects/admin/all - все проекты (только для админа)
router.get('/admin/all', requireAuth, async (req, res) => {
  try {
    const role = req.user?.role;
    if (role !== 'admin') {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }

    const { clientId, status } = req.query;

    let query = `
      SELECT 
        p.*,
        c.name AS client_name,
        c.email AS client_email,
        c.company AS client_company,
        d.title AS deal_title,
        d.id AS deal_id
      FROM client_projects p
      JOIN clients c ON p.client_id = c.id
      LEFT JOIN deals d ON p.deal_id = d.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (clientId) {
      query += ` AND p.client_id = $${paramIndex}`;
      params.push(clientId);
      paramIndex++;
    }

    if (status) {
      query += ` AND p.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY p.created_at DESC`;

    const result = await pool.query(query, params);

    res.json({
      projects: result.rows.map((p) => ({
        id: p.id,
        title: p.title,
        mode: p.mode,
        status: p.status,
        progressPercent: p.progress_percent,
        budgetTotalCents: p.budget_total_cents,
        budgetUsedCents: p.budget_used_cents,
        deadline: p.deadline,
        clientId: p.client_id,
        clientName: p.client_name,
        clientEmail: p.client_email,
        clientCompany: p.client_company,
        dealId: p.deal_id,
        dealTitle: p.deal_title,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      })),
    });
  } catch (error) {
    console.error('[projects] GET /admin/all error:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// GET /api/projects/me - проекты текущего клиента (по email/phone)
router.get('/me', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const clientId = await getClientIdForUser(userId);

    if (!clientId) {
      return res.json({ projects: [] });
    }

    const projectsRes = await pool.query(
      `SELECT p.*, d.title AS deal_title, d.id AS deal_id
       FROM client_projects p
       LEFT JOIN deals d ON p.deal_id = d.id
       WHERE p.client_id = $1
       ORDER BY p.created_at DESC`,
      [clientId]
    );

    const projectIds = projectsRes.rows.map((p) => p.id);
    const dealIds = projectsRes.rows.map((p) => p.deal_id).filter(Boolean);
    
    let stagesByProject = {};
    if (projectIds.length > 0) {
      const stagesRes = await pool.query(
        `SELECT * FROM client_project_stages
         WHERE project_id = ANY($1::int[])
         ORDER BY project_id, sort_order, id`,
        [projectIds]
      );
      stagesByProject = stagesRes.rows.reduce((acc, row) => {
        if (!acc[row.project_id]) acc[row.project_id] = [];
        acc[row.project_id].push(row);
        return acc;
      }, {});
    }

    // Получаем задачи для всех проектов (через deal_id)
    let tasksByProject = {};
    if (dealIds.length > 0) {
      const tasksRes = await pool.query(
        `SELECT t.*, u.name AS assigned_to_name, u.email AS assigned_to_email
         FROM tasks t
         LEFT JOIN users u ON t.assigned_to = u.id
         WHERE t.deal_id = ANY($1::int[]) AND t.is_archived = FALSE
         ORDER BY t.created_at DESC`,
        [dealIds]
      );
      
      // Группируем задачи по deal_id, а затем находим соответствующий project_id
      const dealIdToProjectId = {};
      projectsRes.rows.forEach((p) => {
        if (p.deal_id) {
          dealIdToProjectId[p.deal_id] = p.id;
        }
      });
      
      tasksRes.rows.forEach((task) => {
        if (task.deal_id && dealIdToProjectId[task.deal_id]) {
          const projectId = dealIdToProjectId[task.deal_id];
          if (!tasksByProject[projectId]) {
            tasksByProject[projectId] = [];
          }
          tasksByProject[projectId].push({
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            assignedTo: task.assigned_to,
            assignedToName: task.assigned_to_name,
            assignedToEmail: task.assigned_to_email,
            dueDate: task.due_date,
            completedAt: task.completed_at,
            createdAt: task.created_at,
            updatedAt: task.updated_at,
          });
        }
      });
    }

    // Получаем допродажи для этапов проектов
    let upsellOffersByStage = {};
    if (projectIds.length > 0) {
      const upsellRes = await pool.query(
        `SELECT * FROM client_project_upsell_offers
         WHERE project_id = ANY($1::int[])
           AND status = 'suggested'
         ORDER BY project_id, stage_id, created_at DESC`,
        [projectIds]
      );
      upsellRes.rows.forEach((offer) => {
        const stageId = offer.stage_id || 'project';
        const key = `${offer.project_id}-${stageId}`;
        if (!upsellOffersByStage[key]) {
          upsellOffersByStage[key] = [];
        }
        upsellOffersByStage[key].push({
          id: offer.id,
          title: offer.title,
          description: offer.description,
          priceCents: offer.price_cents,
          status: offer.status,
        });
      });
    }

    const projects = projectsRes.rows.map((p) => ({
      id: p.id,
      title: p.title,
      mode: p.mode,
      status: p.status,
      progressPercent: p.progress_percent,
      budgetTotalCents: p.budget_total_cents,
      budgetUsedCents: p.budget_used_cents,
      deadline: p.deadline,
      dealTitle: p.deal_title,
      dealId: p.deal_id,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      stages: (stagesByProject[p.id] || []).map((s) => ({
        id: s.id,
        name: s.name,
        sortOrder: s.sort_order,
        status: s.status,
        progressPercent: s.progress_percent,
        plannedHours: s.planned_hours,
        spentHours: s.spent_hours,
        budgetPlannedCents: s.budget_planned_cents,
        budgetSpentCents: s.budget_spent_cents,
        upsellPotentialCents: s.upsell_potential_cents,
        upsellOffers: upsellOffersByStage[`${p.id}-${s.id}`] || [],
      })),
      tasks: tasksByProject[p.id] || [],
      upsellOffers: upsellOffersByStage[`${p.id}-project`] || [],
    }));

    res.json({ projects });
  } catch (error) {
    console.error('[projects] /me error:', error);
    res.status(500).json({ error: 'Failed to load projects' });
  }
});

// POST /api/projects/:projectId/change-requests/estimate - расчёт change request
router.post('/:projectId/change-requests/estimate', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { stageId, changeType, priority } = req.body || {};

    // Маппинг changeType -> specialist/complexity/hours по умолчанию
    let specialistType = 'frontend';
    let complexity = 'medium'; // 'simple' | 'medium' | 'complex'
    let hours = 6;

    const t = String(changeType || '').toLowerCase();
    if (t.includes('design') || t.includes('дизайн')) {
      specialistType = 'designer';
      complexity = 'simple';
      hours = 4;
    } else if (t.includes('backend') || t.includes('api') || t.includes('crm') || t.includes('интегра')) {
      specialistType = 'backend';
      complexity = 'medium';
      hours = 8;
    } else if (t.includes('text') || t.includes('текст') || t.includes('контент')) {
      specialistType = 'designer';
      complexity = 'simple';
      hours = 3;
    }

    if (priority === 'high') {
      hours = Math.ceil(hours * 1.3);
    }

    const calcRes = await pool.query(
      'SELECT 1' // placeholder to keep connection warm; расчёт делаем на уровне JS ниже
    );
    void calcRes; // silence linter

    const specKey = normalizeSpecType(specialistType);
    const ratesBySpec = RATES[specKey];
    const ratePerHour = ratesBySpec ? ratesBySpec[complexity] : null;
    if (!ratePerHour) {
      return res.status(500).json({ error: 'RATE_NOT_FOUND' });
    }
    const urgCoeff = URGENCY_COEFF['fast'];
    const basePrice = hours * ratePerHour;
    const finalPrice = Math.round(basePrice * urgCoeff);

    res.json({
      projectId: Number(projectId),
      stageId: stageId ? Number(stageId) : null,
      specialistType: specKey,
      complexity,
      hours,
      ratePerHourCents: ratePerHour * 100,
      basePriceCents: basePrice * 100,
      finalPriceCents: finalPrice * 100,
      priority: priority || 'medium',
      urgency: 'fast',
      message: `Изменение требует ~${hours} ч работы (${specKey}, ${complexity}). Доп. стоимость: ${(finalPrice * 100) / 100} ₽.`,
    });
  } catch (error) {
    console.error('[projects] /:projectId/change-requests/estimate error:', error);
    res.status(500).json({ error: 'Failed to estimate change request' });
  }
});

// POST /api/projects/:projectId/change-requests - подтверждение change request с созданием записи
router.post('/:projectId/change-requests', requireAuth, async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    const { projectId } = req.params;
    const { stageId, changeType, priority } = req.body || {};

    const clientId = await getClientIdForUser(userId);
    if (!clientId) {
      return res.status(404).json({ error: 'PROJECT_NOT_FOUND' });
    }

    const projectRes = await pool.query(
      'SELECT id, client_id FROM client_projects WHERE id = $1 AND client_id = $2',
      [projectId, clientId]
    );
    const project = projectRes.rows[0];
    if (!project) {
      return res.status(404).json({ error: 'PROJECT_NOT_FOUND' });
    }

    const descriptionText = String(changeType || '').trim();
    if (!descriptionText) {
      return res.status(400).json({ error: 'CHANGE_DESCRIPTION_REQUIRED' });
    }

    // Та же логика оценки, что и в /estimate
    let specialistType = 'frontend';
    let complexity = 'medium';
    let hours = 6;

    const t = descriptionText.toLowerCase();
    if (t.includes('design') || t.includes('дизайн')) {
      specialistType = 'designer';
      complexity = 'simple';
      hours = 4;
    } else if (t.includes('backend') || t.includes('api') || t.includes('crm') || t.includes('интегра')) {
      specialistType = 'backend';
      complexity = 'medium';
      hours = 8;
    } else if (t.includes('text') || t.includes('текст') || t.includes('контент')) {
      specialistType = 'designer';
      complexity = 'simple';
      hours = 3;
    }

    const effectivePriority = priority || 'medium';
    if (effectivePriority === 'high') {
      hours = Math.ceil(hours * 1.3);
    }

    const specKey = normalizeSpecType(specialistType);
    const ratesBySpec = RATES[specKey];
    const ratePerHour = ratesBySpec ? ratesBySpec[complexity] : null;
    if (!ratePerHour) {
      return res.status(500).json({ error: 'RATE_NOT_FOUND' });
    }
    const urgCoeff = URGENCY_COEFF['fast'];
    const basePrice = hours * ratePerHour;
    const finalPrice = Math.round(basePrice * urgCoeff);

    const changeTypeCode =
      t.includes('design') || t.includes('дизайн')
        ? 'design'
        : t.includes('backend') || t.includes('api') || t.includes('crm') || t.includes('интегра')
        ? 'backend'
        : t.includes('text') || t.includes('текст') || t.includes('контент')
        ? 'content'
        : 'other';

    const changeRes = await pool.query(
      `INSERT INTO client_project_change_requests (
         project_id, stage_id, change_type, description,
         priority, status, estimated_hours, estimated_price_cents, client_approved
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        projectId,
        stageId || null,
        changeTypeCode,
        descriptionText,
        effectivePriority,
        'approved',
        hours,
        finalPrice * 100,
        true,
      ]
    );
    const change = changeRes.rows[0];

    const upsellRes = await pool.query(
      `INSERT INTO client_project_upsell_offers (
         project_id, stage_id, title, description,
         specialist_type, complexity, urgency, integrations_count,
         hours, rate_per_hour_cents, price_cents, status
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        projectId,
        stageId || null,
        `Change request: ${descriptionText.slice(0, 80)}`,
        descriptionText,
        specKey,
        complexity,
        'fast',
        0,
        hours,
        ratePerHour * 100,
        finalPrice * 100,
        'accepted',
      ]
    );
    const upsell = upsellRes.rows[0];

    res.json({
      changeRequest: {
        id: change.id,
        projectId: change.project_id,
        stageId: change.stage_id,
        changeType: change.change_type,
        description: change.description,
        priority: change.priority,
        status: change.status,
        estimatedHours: change.estimated_hours,
        estimatedPriceCents: change.estimated_price_cents,
        clientApproved: change.client_approved,
      },
      upsellOfferId: upsell.id,
    });
  } catch (error) {
    console.error('[projects] POST /:projectId/change-requests error:', error);
    res.status(500).json({ error: 'Failed to create change request' });
  }
});

async function generateDefaultUpsellsForProject(projectId) {
  const projectRes = await pool.query(
    'SELECT id, primary_type FROM client_projects WHERE id = $1',
    [projectId]
  );
  const project = projectRes.rows[0];
  if (!project) return;

  const primaryType = project.primary_type || 'website';
  if (primaryType !== 'website') {
    // Пока генерим автодопродажи только для сайтов
    return;
  }

  const stagesRes = await pool.query(
    'SELECT id, name, status, progress_percent FROM client_project_stages WHERE project_id = $1',
    [projectId]
  );
  const stages = stagesRes.rows || [];

  const designStage = stages.find(
    (s) =>
      /дизайн|design/i.test(s.name || '') &&
      (s.status === 'done' || (s.progress_percent || 0) >= 100)
  );
  const frontendStage = stages.find(
    (s) =>
      /верстка|frontend|ui/i.test(s.name || '') &&
      (s.status === 'done' || (s.progress_percent || 0) >= 100)
  );
  const backendStage = stages.find(
    (s) =>
      /backend|бэкенд|сервер/i.test(s.name || '') &&
      (s.status === 'done' || (s.progress_percent || 0) >= 100)
  );

  // Для каждого этапа добавляем не более одного default‑оффера

  if (designStage) {
    const title = 'Анимации интерфейса';
    const exists = await pool.query(
      `SELECT 1 FROM client_project_upsell_offers
       WHERE project_id = $1 AND (stage_id IS NULL OR stage_id = $2)
         AND title = $3
       LIMIT 1`,
      [projectId, designStage.id, title]
    );
    if (!exists.rows[0]) {
      const hours = 8;
      const rate = RATES.frontend.medium;
      const urgCoeff = URGENCY_COEFF.fast;
      const basePrice = hours * rate;
      const finalPrice = Math.round(basePrice * urgCoeff);
      await pool.query(
        `INSERT INTO client_project_upsell_offers (
           project_id, stage_id, title, description,
           specialist_type, complexity, urgency, integrations_count,
           hours, rate_per_hour_cents, price_cents, status
         )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          projectId,
          designStage.id,
          title,
          'Добавление анимаций и микровзаимодействий для улучшения UX',
          'frontend',
          'medium',
          'fast',
          0,
          hours,
          rate * 100,
          finalPrice * 100,
          'suggested',
        ]
      );
    }
  }

  if (frontendStage) {
    const title = 'Адаптивная / мобильная версия';
    const exists = await pool.query(
      `SELECT 1 FROM client_project_upsell_offers
       WHERE project_id = $1 AND (stage_id IS NULL OR stage_id = $2)
         AND title = $3
       LIMIT 1`,
      [projectId, frontendStage.id, title]
    );
    if (!exists.rows[0]) {
      const hours = 20;
      const rate = RATES.frontend.complex;
      const urgCoeff = URGENCY_COEFF.fast;
      const basePrice = hours * rate;
      const finalPrice = Math.round(basePrice * urgCoeff);
      await pool.query(
        `INSERT INTO client_project_upsell_offers (
           project_id, stage_id, title, description,
           specialist_type, complexity, urgency, integrations_count,
           hours, rate_per_hour_cents, price_cents, status
         )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          projectId,
          frontendStage.id,
          title,
          'Полноценная мобильная и планшетная адаптация сайта',
          'frontend',
          'complex',
          'fast',
          0,
          hours,
          rate * 100,
          finalPrice * 100,
          'suggested',
        ]
      );
    }
  }

  if (backendStage) {
    const title = 'Интеграция CRM';
    const exists = await pool.query(
      `SELECT 1 FROM client_project_upsell_offers
       WHERE project_id = $1 AND (stage_id IS NULL OR stage_id = $2)
         AND title = $3
       LIMIT 1`,
      [projectId, backendStage.id, title]
    );
    if (!exists.rows[0]) {
      const hours = 32;
      const rate = RATES.backend.complex;
      const urgCoeff = URGENCY_COEFF.fast;
      const basePrice = hours * rate;
      const finalPrice = Math.round(basePrice * urgCoeff);
      await pool.query(
        `INSERT INTO client_project_upsell_offers (
           project_id, stage_id, title, description,
           specialist_type, complexity, urgency, integrations_count,
           hours, rate_per_hour_cents, price_cents, status
         )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          projectId,
          backendStage.id,
          title,
          'Подключение CRM (Bitrix24, amoCRM и др.) с передачей лидов с сайта',
          'backend',
          'complex',
          'fast',
          0,
          hours,
          rate * 100,
          finalPrice * 100,
          'suggested',
        ]
      );
    }
  }
}

// GET /api/projects/:projectId/upsell-offers - список upsell-офферов по проекту (для клиента)
router.get('/:projectId/upsell-offers', requireAuth, async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    const { projectId } = req.params;
    const { status } = req.query;

    const clientId = await getClientIdForUser(userId);
    if (!clientId) {
      return res.status(404).json({ error: 'PROJECT_NOT_FOUND' });
    }

    const projectRes = await pool.query(
      'SELECT id, client_id FROM client_projects WHERE id = $1 AND client_id = $2',
      [projectId, clientId]
    );
    if (!projectRes.rows[0]) {
      return res.status(404).json({ error: 'PROJECT_NOT_FOUND' });
    }

    const params = [projectId];
    let where = 'project_id = $1';
    if (status) {
      params.push(status);
      where += ' AND status = $2';
    }

    let offersRes = await pool.query(
      `SELECT * FROM client_project_upsell_offers
       WHERE ${where}
       ORDER BY created_at DESC`,
      params
    );

    // Если клиент запрашивает suggested‑офферы, а их нет — генерируем дефолтные для проекта
    if (status === 'suggested' && offersRes.rows.length === 0) {
      await generateDefaultUpsellsForProject(projectId);
      offersRes = await pool.query(
        `SELECT * FROM client_project_upsell_offers
         WHERE ${where}
         ORDER BY created_at DESC`,
        params
      );
    }

    const offers = offersRes.rows.map((row) => ({
      id: row.id,
      projectId: row.project_id,
      stageId: row.stage_id,
      title: row.title,
      description: row.description,
      specialistType: row.specialist_type,
      complexity: row.complexity,
      urgency: row.urgency,
      integrationsCount: row.integrations_count,
      hours: row.hours,
      ratePerHourCents: row.rate_per_hour_cents,
      priceCents: row.price_cents,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.json({ offers });
  } catch (error) {
    console.error('[projects] /:projectId/upsell-offers error:', error);
    res.status(500).json({ error: 'Failed to load upsell offers' });
  }
});

async function updateUpsellStatus(req, res, newStatus) {
  try {
    const userId = req.user && req.user.id;
    const { projectId, offerId } = req.params;

    const clientId = await getClientIdForUser(userId);
    if (!clientId) {
      return res.status(404).json({ error: 'PROJECT_NOT_FOUND' });
    }

    const projectRes = await pool.query(
      'SELECT id, client_id FROM client_projects WHERE id = $1 AND client_id = $2',
      [projectId, clientId]
    );
    if (!projectRes.rows[0]) {
      return res.status(404).json({ error: 'PROJECT_NOT_FOUND' });
    }

    const offerRes = await pool.query(
      'SELECT * FROM client_project_upsell_offers WHERE id = $1 AND project_id = $2',
      [offerId, projectId]
    );
    const offer = offerRes.rows[0];
    if (!offer) {
      return res.status(404).json({ error: 'OFFER_NOT_FOUND' });
    }

    if (offer.status === newStatus) {
      return res.json({
        offer: {
          id: offer.id,
          projectId: offer.project_id,
          stageId: offer.stage_id,
          title: offer.title,
          description: offer.description,
          specialistType: offer.specialist_type,
          complexity: offer.complexity,
          urgency: offer.urgency,
          integrationsCount: offer.integrations_count,
          hours: offer.hours,
          ratePerHourCents: offer.rate_per_hour_cents,
          priceCents: offer.price_cents,
          status: offer.status,
          createdAt: offer.created_at,
          updatedAt: offer.updated_at,
        },
      });
    }

    const updatedRes = await pool.query(
      `UPDATE client_project_upsell_offers
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [newStatus, offerId]
    );
    const updated = updatedRes.rows[0];

    return res.json({
      offer: {
        id: updated.id,
        projectId: updated.project_id,
        stageId: updated.stage_id,
        title: updated.title,
        description: updated.description,
        specialistType: updated.specialist_type,
        complexity: updated.complexity,
        urgency: updated.urgency,
        integrationsCount: updated.integrations_count,
        hours: updated.hours,
        ratePerHourCents: updated.rate_per_hour_cents,
        priceCents: updated.price_cents,
        status: updated.status,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
      },
    });
  } catch (error) {
    console.error('[projects] updateUpsellStatus error:', error);
    return res.status(500).json({ error: 'Failed to update upsell status' });
  }
}

// POST /api/projects/:projectId/upsell-offers/:offerId/accept
router.post('/:projectId/upsell-offers/:offerId/accept', requireAuth, (req, res) =>
  updateUpsellStatus(req, res, 'accepted')
);

// POST /api/projects/:projectId/upsell-offers/:offerId/decline
router.post('/:projectId/upsell-offers/:offerId/decline', requireAuth, (req, res) =>
  updateUpsellStatus(req, res, 'declined')
);

// POST /api/projects/process-passive - сценарий PASSIVE ("клиент не ставит задачи")
router.post('/process-passive', requireAuth, async (req, res) => {
  try {
    const role = req.user?.role;
    if (role !== 'admin') {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }

    // Берем активные проекты
    const projectsRes = await pool.query(
      `SELECT p.*, c.name AS client_name
       FROM client_projects p
       JOIN clients c ON c.id = p.client_id
       WHERE p.status = 'active'`
    );

    let processed = 0;

    for (const p of projectsRes.rows) {
      const stagesRes = await pool.query(
        `SELECT * FROM client_project_stages
         WHERE project_id = $1
         ORDER BY sort_order, id`,
        [p.id]
      );
      const stages = stagesRes.rows;
      const doneStages = stages.filter((s) => s.status === 'done');
      const inProgressStages = stages.filter((s) => s.status === 'in_progress');

      const title = p.title || 'Проект';
      const donePart = doneStages.map((s) => `✅ ${s.name} — ${s.progress_percent || 100}%`).join('\n');
      const inProgressPart = inProgressStages.map((s) => `⏳ ${s.name} — ${s.progress_percent || 0}%`).join('\n');

      const suggestedUpsell = inProgressStages.find((s) => (s.upsell_potential_cents || 0) > 0) || doneStages[0];

      let upsellLine = '';
      if (suggestedUpsell) {
        const upsellRes = await pool.query(
          `SELECT * FROM client_project_upsell_offers
           WHERE project_id = $1 AND (stage_id IS NULL OR stage_id = $2)
             AND status = 'suggested'
           ORDER BY created_at DESC
           LIMIT 1`,
          [p.id, suggestedUpsell.id]
        );
        const offer = upsellRes.rows[0];
        if (offer) {
          upsellLine = `\n\n💡 Рекомендация: ${offer.title} (${Math.round((offer.price_cents || 0) / 100)} ₽)`;
        }
      }

      const msg =
        `День проекта "${title}":\n` +
        (donePart ? `${donePart}\n` : '') +
        (inProgressPart ? `${inProgressPart}\n` : '') +
        upsellLine;

      await createNotification({
        userId: 0,
        type: 'project_passive_update',
        title: `Статус проекта "${title}"`,
        message: msg,
        linkUrl: '/account/projects',
        relatedEntityType: 'client_project',
        relatedEntityId: p.id,
      });

      processed += 1;
    }

    res.json({ success: true, processed });
  } catch (error) {
    console.error('[projects] /process-passive error:', error);
    res.status(500).json({ error: 'Failed to process passive projects' });
  }
});

// POST /api/projects/admin/client/:clientId/projects - создать проект для клиента (админ)
router.post('/admin/client/:clientId/projects', requireAuth, async (req, res) => {
  try {
    const role = req.user && req.user.role;
    if (role !== 'admin') {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }

    const clientId = parseInt(req.params.clientId, 10);
    if (!clientId || Number.isNaN(clientId)) {
      return res.status(400).json({ error: 'INVALID_CLIENT_ID' });
    }

    const { type, title, budgetTotalCents, deadline } = req.body || {};
    const templateKey = type || 'website';
    if (!PROJECT_TEMPLATES[templateKey]) {
      return res.status(400).json({ error: 'INVALID_PROJECT_TYPE' });
    }

    const clientRes = await pool.query(
      'SELECT id, name, email, phone FROM clients WHERE id = $1',
      [clientId]
    );
    const client = clientRes.rows[0];
    if (!client) {
      return res.status(404).json({ error: 'CLIENT_NOT_FOUND' });
    }

    let userId = null;
    if (client.email || client.phone) {
      const userRes = await pool.query(
        'SELECT id FROM users WHERE (email = $1 AND $1 IS NOT NULL) OR (phone = $2 AND $2 IS NOT NULL) LIMIT 1',
        [client.email || null, client.phone || null]
      );
      if (userRes.rows[0]) {
        userId = userRes.rows[0].id;
      }
    }

    const project = await createProjectWithTemplate({
      clientId,
      userId,
      orderId: null,
      templateKey,
      title: title || PROJECT_TEMPLATES[templateKey].defaultTitle,
      budgetTotalCents:
        typeof budgetTotalCents === 'number' ? budgetTotalCents : null,
      deadline: deadline || null,
    });

    res.json({ project });
  } catch (error) {
    console.error('[projects] /admin/client/:clientId/projects error:', error);
    res.status(500).json({ error: 'Failed to create client project' });
  }
});

// GET /api/projects/admin/overview - UPSALE DASHBOARD для PM/CEO
router.get('/admin/overview', requireAuth, async (req, res) => {
  try {
    const role = req.user && req.user.role;
    if (role !== 'admin') {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }

    const totalProjectsRes = await pool.query(
      "SELECT COUNT(*)::int AS count FROM client_projects WHERE status = 'active'"
    );
    const totalActiveProjects = totalProjectsRes.rows[0]?.count || 0;

    const potentialRes = await pool.query(
      "SELECT COALESCE(SUM(price_cents), 0)::bigint AS sum FROM client_project_upsell_offers WHERE status = 'suggested'"
    );
    const upsellPotentialCents = Number(potentialRes.rows[0]?.sum || 0);

    const convRes = await pool.query(
      `SELECT status, COUNT(*)::int AS count
       FROM client_project_upsell_offers
       WHERE created_at >= NOW() - INTERVAL '90 days'
         AND status IN ('accepted', 'declined')
       GROUP BY status`
    );
    let accepted = 0;
    let declined = 0;
    convRes.rows.forEach((r) => {
      if (r.status === 'accepted') accepted = r.count;
      if (r.status === 'declined') declined = r.count;
    });
    const totalDecided = accepted + declined;
    const conversion = totalDecided > 0 ? accepted / totalDecided : 0;

    const avgCheckRes = await pool.query(
      `SELECT AVG(price_cents)::numeric AS avg
       FROM client_project_upsell_offers
       WHERE status = 'accepted'
         AND created_at >= NOW() - INTERVAL '90 days'`
    );
    const avgUpsellCheckCentsRaw = avgCheckRes.rows[0]?.avg;
    const avgUpsellCheckCents = avgUpsellCheckCentsRaw ? Number(avgUpsellCheckCentsRaw) : 0;

    const alerts = [];

    const nearDoneRes = await pool.query(
      `SELECT p.id, p.title, p.progress_percent, c.name AS client_name
       FROM client_projects p
       JOIN clients c ON c.id = p.client_id
       WHERE p.status = 'active' AND p.progress_percent >= 95
       ORDER BY p.progress_percent DESC
       LIMIT 50`
    );
    nearDoneRes.rows.forEach((row) => {
      alerts.push({
        type: 'PROJECT_NEAR_DONE',
        projectId: row.id,
        clientName: row.client_name,
        message: `Клиент "${row.client_name}" на ${row.progress_percent}% проекта "${row.title}"`,
      });
    });

    const delayedStagesRes = await pool.query(
      `SELECT s.id, s.name, s.project_id, c.name AS client_name, p.title AS project_title
       FROM client_project_stages s
       JOIN client_projects p ON p.id = s.project_id
       JOIN clients c ON c.id = p.client_id
       WHERE s.status = 'in_progress'
         AND s.created_at <= NOW() - INTERVAL '2 days'
       ORDER BY s.created_at ASC
       LIMIT 50`
    );
    delayedStagesRes.rows.forEach((row) => {
      alerts.push({
        type: 'STAGE_DELAYED',
        projectId: row.project_id,
        stageId: row.id,
        clientName: row.client_name,
        message: `Этап "${row.name}" по проекту "${row.project_title}" задержан более 2 дней`,
      });
    });

    const staleUpsellRes = await pool.query(
      `SELECT o.id, o.project_id, o.title, o.created_at, c.name AS client_name, p.title AS project_title
       FROM client_project_upsell_offers o
       JOIN client_projects p ON p.id = o.project_id
       JOIN clients c ON c.id = p.client_id
       WHERE o.status = 'suggested'
         AND o.created_at <= NOW() - INTERVAL '48 hours'
       ORDER BY o.created_at ASC
       LIMIT 50`
    );
    staleUpsellRes.rows.forEach((row) => {
      alerts.push({
        type: 'UPSELL_STALE',
        projectId: row.project_id,
        offerId: row.id,
        clientName: row.client_name,
        message: `Upsell "${row.title}" по проекту "${row.project_title}" открыт более 48 часов`,
      });
    });

    res.json({
      totals: {
        totalActiveProjects,
        upsellPotentialCents,
        conversion,
        accepted,
        declined,
        avgUpsellCheckCents,
      },
      alerts,
    });
  } catch (error) {
    console.error('[projects] /admin/overview error:', error);
    res.status(500).json({ error: 'Failed to load projects overview' });
  }
});

// ===== КОММЕНТАРИИ К ПРОЕКТАМ =====

// GET /api/projects/:projectId/comments - получить комментарии проекта
router.get('/:projectId/comments', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user?.id;
    const clientId = await getClientIdForUser(userId);
    const isAdmin = req.user?.role === 'admin';

    // Проверяем доступ
    const projectRes = await pool.query(
      'SELECT client_id FROM client_projects WHERE id = $1',
      [projectId]
    );
    if (projectRes.rows.length === 0) {
      return res.status(404).json({ error: 'Проект не найден' });
    }

    if (!isAdmin && projectRes.rows[0].client_id !== clientId) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const { stageId, taskId } = req.query;
    let query = `
      SELECT c.*, 
             u.name AS created_by_name, u.email AS created_by_email,
             cl.name AS client_name
      FROM client_project_comments c
      LEFT JOIN users u ON c.created_by = u.id AND NOT c.created_by_client
      LEFT JOIN clients cl ON c.client_id = cl.id AND c.created_by_client
      WHERE c.project_id = $1
    `;
    const params = [projectId];

    if (stageId) {
      query += ' AND c.stage_id = $2';
      params.push(stageId);
    }
    if (taskId) {
      query += ` AND c.task_id = $${params.length + 1}`;
      params.push(taskId);
    }

    // Клиент видит только не-внутренние комментарии
    if (!isAdmin) {
      query += ` AND c.is_internal = FALSE`;
    }

    query += ' ORDER BY c.created_at ASC';

    const result = await pool.query(query, params);

    res.json({
      comments: result.rows.map((r) => ({
        id: r.id,
        projectId: r.project_id,
        stageId: r.stage_id,
        taskId: r.task_id,
        comment: r.comment,
        createdBy: r.created_by,
        createdByClient: r.created_by_client,
        createdByName: r.created_by_name || r.client_name,
        createdByEmail: r.created_by_email,
        isInternal: r.is_internal,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
    });
  } catch (error) {
    console.error('[projects] GET /:projectId/comments error:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// POST /api/projects/:projectId/comments - создать комментарий
router.post('/:projectId/comments', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user?.id;
    const { comment, stageId, taskId, isInternal } = req.body;

    if (!comment || !comment.trim()) {
      return res.status(400).json({ error: 'Комментарий обязателен' });
    }

    const clientId = await getClientIdForUser(userId);
    const isAdmin = req.user?.role === 'admin';

    // Проверяем доступ
    const projectRes = await pool.query(
      'SELECT client_id FROM client_projects WHERE id = $1',
      [projectId]
    );
    if (projectRes.rows.length === 0) {
      return res.status(404).json({ error: 'Проект не найден' });
    }

    const projectClientId = projectRes.rows[0].client_id;

    if (!isAdmin && projectClientId !== clientId) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    // Клиенты не могут создавать внутренние комментарии
    const finalIsInternal = isAdmin && isInternal ? true : false;
    const createdByClient = !isAdmin && clientId === projectClientId;

    const result = await pool.query(
      `INSERT INTO client_project_comments 
       (project_id, stage_id, task_id, comment, created_by, created_by_client, client_id, is_internal)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        projectId,
        stageId || null,
        taskId || null,
        comment.trim(),
        createdByClient ? null : userId,
        createdByClient,
        createdByClient ? clientId : null,
        finalIsInternal,
      ]
    );

    // Получаем информацию о создателе для ответа
    let createdByName = null;
    let createdByEmail = null;

    if (createdByClient) {
      const clientRes = await pool.query('SELECT name, email FROM clients WHERE id = $1', [clientId]);
      if (clientRes.rows[0]) {
        createdByName = clientRes.rows[0].name;
        createdByEmail = clientRes.rows[0].email;
      }
    } else {
      const userRes = await pool.query('SELECT name, email FROM users WHERE id = $1', [userId]);
      if (userRes.rows[0]) {
        createdByName = userRes.rows[0].name || userRes.rows[0].email;
        createdByEmail = userRes.rows[0].email;
      }
    }

    res.status(201).json({
      id: result.rows[0].id,
      projectId: result.rows[0].project_id,
      stageId: result.rows[0].stage_id,
      taskId: result.rows[0].task_id,
      comment: result.rows[0].comment,
      createdBy: result.rows[0].created_by,
      createdByClient: result.rows[0].created_by_client,
      createdByName,
      createdByEmail,
      isInternal: result.rows[0].is_internal,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
    });
  } catch (error) {
    console.error('[projects] POST /:projectId/comments error:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// DELETE /api/projects/:projectId - удалить проект (только для админа)
router.delete('/:projectId', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const role = req.user?.role;

    if (role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    // Проверяем существование проекта
    const projectRes = await pool.query(
      'SELECT id, title FROM client_projects WHERE id = $1',
      [projectId]
    );

    if (projectRes.rows.length === 0) {
      return res.status(404).json({ error: 'Проект не найден' });
    }

    // Удаляем проект (каскадное удаление настроено в БД для связанных данных)
    await pool.query('DELETE FROM client_projects WHERE id = $1', [projectId]);

    res.json({
      success: true,
      message: 'Проект успешно удален',
    });
  } catch (error) {
    console.error('[projects] DELETE /:projectId error:', error);
    res.status(500).json({ error: 'Не удалось удалить проект' });
  }
});

export default router;

