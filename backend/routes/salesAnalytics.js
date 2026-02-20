import express from 'express';
import pool from '../db.js';
import { requireAuth, requireAdmin, requireAdminOrSalesManager } from '../middleware/auth.js';

const router = express.Router();

// Дашборд менеджера: адаптация, план, метрики
const emptyDashboard = {
  adaptationPercent: 0,
  completedSteps: [],
  newClients: 0,
  salesRub: 0,
  proposals: 0,
  plan: {},
  planProgress: { newClients: { current: 0, plan: 0 }, salesRub: { current: 0, plan: 0 }, deals: { current: 0, plan: 0 } }
};

router.get('/manager/dashboard', requireAuth, requireAdminOrSalesManager, async (req, res) => {
  try {
    const userId = req.user.id;
    if (req.user?.role !== 'sales_manager' && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const isManager = req.user?.role === 'sales_manager';
    const targetUserId = isManager ? userId : (req.query.userId ? parseInt(req.query.userId) : userId);
    const thisMonth = new Date().toISOString().slice(0, 7);

    const [adaptationRes, planRes, clientsCount, ordersSum, proposalsCount] = await Promise.all([
      pool.query('SELECT progress_percent, completed_steps FROM manager_adaptation WHERE user_id = $1', [targetUserId]),
      pool.query('SELECT * FROM manager_plans WHERE user_id = $1 AND month = $2', [targetUserId, thisMonth]),
      pool.query(
        `SELECT COUNT(*)::int as n FROM clients WHERE assigned_to = $1 AND created_at >= date_trunc('month', CURRENT_DATE)`,
        [targetUserId]
      ),
      pool.query(
        `SELECT COALESCE(SUM(o.total_cents), 0)::bigint as s FROM orders o
         JOIN client_orders co ON co.order_id = o.id
         JOIN clients c ON c.id = co.client_id AND c.assigned_to = $1
         WHERE o.status != 'cancelled' AND o.created_at >= date_trunc('month', CURRENT_DATE)`,
        [targetUserId]
      ),
      pool.query(
        `SELECT COUNT(*)::int as n FROM commercial_proposals WHERE user_id = $1 AND created_at >= date_trunc('month', CURRENT_DATE)`,
        [targetUserId]
      )
    ]);

    const adaptation = adaptationRes.rows[0] || { progress_percent: 0, completed_steps: [] };
    const plan = planRes.rows[0] || {};
    const newClients = clientsCount.rows[0]?.n ?? 0;
    const salesRub = Math.round((ordersSum.rows[0]?.s ?? 0) / 100);
    const proposals = proposalsCount.rows[0]?.n ?? 0;

    const completedSteps = Array.isArray(adaptation.completed_steps)
      ? adaptation.completed_steps
      : (adaptation.completed_steps ? (typeof adaptation.completed_steps === 'object' ? Object.values(adaptation.completed_steps) : []) : []);

    res.json({
      adaptationPercent: adaptation.progress_percent ?? 0,
      completedSteps,
      newClients,
      salesRub,
      proposals,
      plan,
      planProgress: {
        newClients: { current: newClients, plan: plan.plan_new_clients || 0 },
        salesRub: { current: salesRub, plan: plan.plan_sales_rub || 0 },
        deals: { current: proposals, plan: plan.plan_deals || 0 }
      }
    });
  } catch (e) {
    console.error('[manager-dashboard]', e);
    res.status(200).json(emptyDashboard);
  }
});

// Обновить прогресс адаптации (менеджер — себя, админ — любого)
router.put('/manager/adaptation', requireAuth, requireAdminOrSalesManager, async (req, res) => {
  try {
    const { progress_percent, completed_steps } = req.body || {};
    const userId = req.user?.role === 'admin' && req.body?.userId ? req.body.userId : req.user.id;

    await pool.query(
      `INSERT INTO manager_adaptation (user_id, progress_percent, completed_steps)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET
         progress_percent = COALESCE($2, manager_adaptation.progress_percent),
         completed_steps = COALESCE($3, manager_adaptation.completed_steps),
         updated_at = NOW()`,
      [userId, progress_percent ?? null, completed_steps ? JSON.stringify(completed_steps) : null]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ========== АДМИН: планы и общая аналитика ==========

router.get('/admin/overview', requireAuth, requireAdmin, async (req, res) => {
  try {
    const thisMonth = new Date().toISOString().slice(0, 7);
    const managersRes = await pool.query(
      `SELECT u.id, u.name, u.email FROM users u WHERE u.role = 'sales_manager' ORDER BY u.name`
    );
    const managers = managersRes.rows;

    const rows = await pool.query(
      `SELECT u.id, u.name,
        (SELECT COUNT(*) FROM clients c WHERE c.assigned_to = u.id AND c.created_at >= date_trunc('month', CURRENT_DATE)) as new_clients,
        (SELECT COALESCE(SUM(o.total_cents), 0) FROM orders o
         JOIN client_orders co ON co.order_id = o.id
         JOIN clients c ON c.id = co.client_id AND c.assigned_to = u.id
         WHERE o.status != 'cancelled' AND o.created_at >= date_trunc('month', CURRENT_DATE)) as sales_cents
       FROM users u WHERE u.role = 'sales_manager'`
    );

    const plansRes = await pool.query(
      'SELECT * FROM manager_plans WHERE month = $1',
      [thisMonth]
    );
    const plansByUser = plansRes.rows.reduce((acc, p) => ({ ...acc, [p.user_id]: p }), {});

    const overview = rows.rows.map((r) => ({
      userId: r.id,
      name: r.name,
      newClients: parseInt(r.new_clients) || 0,
      salesRub: Math.round((parseInt(r.sales_cents) || 0) / 100),
      plan: plansByUser[r.id] || {}
    }));

    const totals = overview.reduce(
      (a, m) => ({
        newClients: a.newClients + m.newClients,
        salesRub: a.salesRub + m.salesRub
      }),
      { newClients: 0, salesRub: 0 }
    );

    res.json({ managers: overview, totals, month: thisMonth });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/admin/plans', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { month } = req.query;
    const m = month || new Date().toISOString().slice(0, 7);
    const r = await pool.query(
      `SELECT mp.*, u.name as user_name, u.email
       FROM manager_plans mp
       JOIN users u ON u.id = mp.user_id
       WHERE mp.month = $1 ORDER BY u.name`,
      [m]
    );
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/admin/plans', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { user_id, month, plan_calls, plan_sales_rub, plan_deals, plan_new_clients } = req.body || {};
    if (!user_id || !month) return res.status(400).json({ error: 'user_id and month required' });
    const r = await pool.query(
      `INSERT INTO manager_plans (user_id, month, plan_calls, plan_sales_rub, plan_deals, plan_new_clients)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, month) DO UPDATE SET
         plan_calls = COALESCE($3, manager_plans.plan_calls),
         plan_sales_rub = COALESCE($4, manager_plans.plan_sales_rub),
         plan_deals = COALESCE($5, manager_plans.plan_deals),
         plan_new_clients = COALESCE($6, manager_plans.plan_new_clients),
         updated_at = NOW()
       RETURNING *`,
      [user_id, month, plan_calls ?? 0, plan_sales_rub ?? 0, plan_deals ?? 0, plan_new_clients ?? 0]
    );
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
