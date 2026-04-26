import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { applyTaskTemplateToDeal } from '../utils/taskTemplates.js';
import { MAIN_SALES_FUNNEL_NAME } from '../utils/funnelHelper.js';

const router = express.Router();

// ===== SALES FUNNELS =====

// GET /api/funnels - List all funnels
router.get('/', requireAuth, async (req, res) => {
  try {
    // Исправляем дубликаты воронок перед получением списка
    const { removeDuplicateFunnels } = await import('../utils/funnelHelper.js');
    await removeDuplicateFunnels();
    
    const result = await pool.query('SELECT * FROM sales_funnels ORDER BY sort_order, created_at DESC');
    res.json(result.rows.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isActive: r.is_active,
      sortOrder: r.sort_order,
      clientId: r.client_id || null,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })));
  } catch (err) {
    console.error('Error fetching funnels:', err);
    res.status(500).json({ error: 'Failed to fetch funnels' });
  }
});

// GET /api/funnels/:id - Get funnel with stages
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const funnelResult = await pool.query('SELECT * FROM sales_funnels WHERE id = $1', [id]);
    if (funnelResult.rows.length === 0) {
      return res.status(404).json({ error: 'Funnel not found' });
    }
    const funnel = funnelResult.rows[0];
    
    // Исправляем дубликаты этапов перед получением
    const { fixDuplicateStages } = await import('../utils/funnelHelper.js');
    await fixDuplicateStages(id);
    
    let stagesResult = await pool.query(
      'SELECT * FROM funnel_stages WHERE funnel_id = $1 ORDER BY sort_order',
      [id]
    );
    
    // If no stages exist, create default stages
    if (stagesResult.rows.length === 0) {
      const defaultStages = [
        { name: 'Первичный контакт', color: '#ff9800', sortOrder: 1, probability: 10 },
        { name: 'Переговоры', color: '#2196f3', sortOrder: 2, probability: 30 },
        { name: 'Коммерческое предложение', color: '#9c27b0', sortOrder: 3, probability: 50 },
        { name: 'Согласование', color: '#00bcd4', sortOrder: 4, probability: 70 },
        { name: 'Закрытие', color: '#4caf50', sortOrder: 5, probability: 100 },
      ];
      
      for (const stage of defaultStages) {
        await pool.query(
          `INSERT INTO funnel_stages (funnel_id, name, color, sort_order, probability)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, stage.name, stage.color, stage.sortOrder, stage.probability]
        );
      }
      
      // Re-fetch stages
      stagesResult = await pool.query(
        'SELECT * FROM funnel_stages WHERE funnel_id = $1 ORDER BY sort_order',
        [id]
      );
    }
    
    const defaultStageColors = ['#f44336', '#ff9800', '#2196f3', '#9c27b0', '#00bcd4', '#4caf50', '#607d8b'];
    res.json({
      id: funnel.id,
      name: funnel.name,
      description: funnel.description,
      isActive: funnel.is_active,
      sortOrder: funnel.sort_order,
      createdAt: funnel.created_at,
      updatedAt: funnel.updated_at,
      stages: stagesResult.rows.map((s, idx) => {
        const c = (s.color && String(s.color).trim() && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(String(s.color).trim()))
          ? String(s.color).trim()
          : defaultStageColors[idx % defaultStageColors.length];
        return {
          id: s.id,
          funnelId: s.funnel_id,
          name: s.name,
          color: c,
          sortOrder: s.sort_order,
          probability: s.probability,
          createdAt: s.created_at,
        };
      }),
    });
  } catch (err) {
    console.error('Error fetching funnel:', err);
    res.status(500).json({ error: 'Failed to fetch funnel' });
  }
});

// POST /api/funnels - Create funnel
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, description, isActive, sortOrder } = req.body;
    const result = await pool.query(
      `INSERT INTO sales_funnels (name, description, is_active, sort_order, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING *`,
      [name, description || null, isActive !== false, sortOrder || 0]
    );
    const funnelId = result.rows[0].id;
    
    // Create default stages if none exist
    const defaultStages = [
      { name: 'Первичный контакт', color: '#ff9800', sortOrder: 1, probability: 10 },
      { name: 'Переговоры', color: '#2196f3', sortOrder: 2, probability: 30 },
      { name: 'Коммерческое предложение', color: '#9c27b0', sortOrder: 3, probability: 50 },
      { name: 'Согласование', color: '#00bcd4', sortOrder: 4, probability: 70 },
      { name: 'Закрытие', color: '#4caf50', sortOrder: 5, probability: 100 },
    ];
    
    for (const stage of defaultStages) {
      await pool.query(
        `INSERT INTO funnel_stages (funnel_id, name, color, sort_order, probability)
         VALUES ($1, $2, $3, $4, $5)`,
        [funnelId, stage.name, stage.color, stage.sortOrder, stage.probability]
      );
    }
    
    res.status(201).json({
      id: result.rows[0].id,
      name: result.rows[0].name,
      description: result.rows[0].description,
      isActive: result.rows[0].is_active,
      sortOrder: result.rows[0].sort_order,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
    });
  } catch (err) {
    console.error('Error creating funnel:', err);
    res.status(500).json({ error: 'Failed to create funnel' });
  }
});

// PUT /api/funnels/:id - Update funnel
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive, sortOrder } = req.body;
    const result = await pool.query(
      `UPDATE sales_funnels SET name = $1, description = $2, is_active = $3, sort_order = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 RETURNING *`,
      [name, description || null, isActive !== false, sortOrder || 0, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Funnel not found' });
    }
    res.json({
      id: result.rows[0].id,
      name: result.rows[0].name,
      description: result.rows[0].description,
      isActive: result.rows[0].is_active,
      sortOrder: result.rows[0].sort_order,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
    });
  } catch (err) {
    console.error('Error updating funnel:', err);
    res.status(500).json({ error: 'Failed to update funnel' });
  }
});

// DELETE /api/funnels/:id - Delete funnel
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await pool.query('SELECT name FROM sales_funnels WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Funnel not found' });
    }
    if (existing.rows[0].name === MAIN_SALES_FUNNEL_NAME) {
      return res.status(403).json({ error: `Воронку «${MAIN_SALES_FUNNEL_NAME}» нельзя удалить` });
    }
    await pool.query('DELETE FROM sales_funnels WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting funnel:', err);
    res.status(500).json({ error: 'Failed to delete funnel' });
  }
});

// ===== FUNNEL STAGES =====

// POST /api/funnels/:funnelId/stages - Create stage
router.post('/:funnelId/stages', requireAuth, async (req, res) => {
  try {
    const { funnelId } = req.params;
    const { name, color, sortOrder, probability } = req.body;
    const result = await pool.query(
      `INSERT INTO funnel_stages (funnel_id, name, color, sort_order, probability)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [funnelId, name, color || '#1976d2', sortOrder || 0, probability || 0]
    );
    res.status(201).json({
      id: result.rows[0].id,
      funnelId: result.rows[0].funnel_id,
      name: result.rows[0].name,
      color: result.rows[0].color,
      sortOrder: result.rows[0].sort_order,
      probability: result.rows[0].probability,
      createdAt: result.rows[0].created_at,
    });
  } catch (err) {
    console.error('Error creating stage:', err);
    res.status(500).json({ error: 'Failed to create stage' });
  }
});

// PUT /api/funnels/:funnelId/stages/:id - Update stage
router.put('/:funnelId/stages/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color, sortOrder, probability } = req.body;
    const result = await pool.query(
      `UPDATE funnel_stages SET name = $1, color = $2, sort_order = $3, probability = $4
       WHERE id = $5 RETURNING *`,
      [name, color, sortOrder, probability, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Stage not found' });
    }
    res.json({
      id: result.rows[0].id,
      funnelId: result.rows[0].funnel_id,
      name: result.rows[0].name,
      color: result.rows[0].color,
      sortOrder: result.rows[0].sort_order,
      probability: result.rows[0].probability,
      createdAt: result.rows[0].created_at,
    });
  } catch (err) {
    console.error('Error updating stage:', err);
    res.status(500).json({ error: 'Failed to update stage' });
  }
});

// DELETE /api/funnels/:funnelId/stages/:id - Delete stage
router.delete('/:funnelId/stages/:id', requireAuth, async (req, res) => {
  try {
    const { id, funnelId } = req.params;
    
    // Get another stage to move deals to
    const otherStageResult = await pool.query(
      'SELECT id FROM funnel_stages WHERE funnel_id = $1 AND id != $2 ORDER BY sort_order LIMIT 1',
      [funnelId, id]
    );
    
    if (otherStageResult.rows.length === 0) {
      return res.status(400).json({ error: 'Cannot delete the last stage. Create another stage first.' });
    }
    
    const newStageId = otherStageResult.rows[0].id;
    
    // Move all deals from this stage to the first available stage
    await pool.query(
      'UPDATE deals SET stage_id = $1, moved_at = CURRENT_TIMESTAMP WHERE stage_id = $2',
      [newStageId, id]
    );
    
    // Delete the stage
    await pool.query('DELETE FROM funnel_stages WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting stage:', err);
    res.status(500).json({ error: 'Failed to delete stage' });
  }
});

// POST /api/funnels/:funnelId/stages/reorder - Reorder stages
router.post('/:funnelId/stages/reorder', requireAuth, async (req, res) => {
  try {
    const { funnelId } = req.params;
    const { stageIds } = req.body; // Array of stage IDs in new order
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < stageIds.length; i++) {
        await client.query(
          'UPDATE funnel_stages SET sort_order = $1 WHERE id = $2 AND funnel_id = $3',
          [i + 1, stageIds[i], funnelId]
        );
      }
      await client.query('COMMIT');
      res.json({ success: true });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error reordering stages:', err);
    res.status(500).json({ error: 'Failed to reorder stages' });
  }
});

// ===== DEALS =====

// POST /api/funnels/apply-task-template - применить шаблон задач к сделке
// Используем отдельный путь без вложенности для избежания конфликтов маршрутизации
router.post('/apply-task-template', requireAuth, async (req, res) => {
  try {
    console.log('[funnels] ✅ apply-task-template route hit!', { 
      method: req.method, 
      path: req.path, 
      originalUrl: req.originalUrl,
      body: req.body 
    });
    
    const { dealId, funnelId, productSlug, productTitle } = req.body;
    const userId = req.user?.id;

    if (!dealId || !funnelId) {
      return res.status(400).json({ error: 'dealId и funnelId обязательны' });
    }

    if (!productSlug && !productTitle) {
      return res.status(400).json({ error: 'productSlug или productTitle обязательны' });
    }

    console.log('[funnels] Applying template:', { dealId, funnelId, productSlug, productTitle, userId });

    const result = await applyTaskTemplateToDeal(dealId, productSlug, productTitle, userId);

    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Не удалось применить шаблон' });
    }

    res.json({
      success: true,
      message: `Создано ${result.tasksCreated} задач`,
      tasksCreated: result.tasksCreated,
    });
  } catch (err) {
    console.error('[funnels] ❌ Error applying task template:', err);
    res.status(500).json({ error: 'Failed to apply task template', details: err.message });
  }
});

// GET /api/funnels/:funnelId/deals - Get deals in funnel
router.get('/:funnelId/deals', requireAuth, async (req, res) => {
  try {
    const { funnelId } = req.params;
    const result = await pool.query(
      `SELECT * FROM deals WHERE funnel_id = $1 ORDER BY created_at DESC`,
      [funnelId]
    );
    res.json(result.rows.map(d => ({
      id: d.id,
      funnelId: d.funnel_id,
      stageId: d.stage_id,
      title: d.title,
      description: d.description,
      clientName: d.client_name,
      clientEmail: d.client_email,
      clientPhone: d.client_phone,
      companyName: d.company_name,
      budget: d.budget ? parseFloat(d.budget) : null,
      currency: d.currency,
      expectedCloseDate: d.expected_close_date,
      actualCloseDate: d.actual_close_date,
      isWon: d.is_won,
      isLost: d.is_lost,
      lossReason: d.loss_reason,
      assignedTo: d.assigned_to,
      createdBy: d.created_by,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
      movedAt: d.moved_at,
      closedAt: d.closed_at,
    })));
  } catch (err) {
    console.error('Error fetching deals:', err);
    res.status(500).json({ error: 'Failed to fetch deals' });
  }
});

// GET /api/funnels/:funnelId/deals/:id - Get single deal
router.get('/:funnelId/deals/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM deals WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    const d = result.rows[0];
    res.json({
      id: d.id,
      funnelId: d.funnel_id,
      stageId: d.stage_id,
      title: d.title,
      description: d.description,
      clientName: d.client_name,
      clientEmail: d.client_email,
      clientPhone: d.client_phone,
      companyName: d.company_name,
      budget: d.budget ? parseFloat(d.budget) : null,
      currency: d.currency,
      expectedCloseDate: d.expected_close_date,
      actualCloseDate: d.actual_close_date,
      isWon: d.is_won,
      isLost: d.is_lost,
      lossReason: d.loss_reason,
      assignedTo: d.assigned_to,
      createdBy: d.created_by,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
      movedAt: d.moved_at,
      closedAt: d.closed_at,
    });
  } catch (err) {
    console.error('Error fetching deal:', err);
    res.status(500).json({ error: 'Failed to fetch deal' });
  }
});

// POST /api/funnels/:funnelId/deals - Create deal
router.post('/:funnelId/deals', requireAuth, async (req, res) => {
  try {
    const { funnelId } = req.params;
    const {
      stageId, title, description, clientName, clientEmail, clientPhone, companyName,
      budget, currency, expectedCloseDate, assignedTo
    } = req.body;
    
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    // Get first stage if stageId not provided or invalid
    let finalStageId = stageId;
    if (!finalStageId || finalStageId <= 0) {
      const stageResult = await pool.query(
        'SELECT id FROM funnel_stages WHERE funnel_id = $1 ORDER BY sort_order LIMIT 1',
        [funnelId]
      );
      if (stageResult.rows.length === 0) {
        return res.status(400).json({ error: 'Funnel has no stages' });
      }
      finalStageId = stageResult.rows[0].id;
    }
    
    const result = await pool.query(
      `INSERT INTO deals (funnel_id, stage_id, title, description, client_name, client_email, client_phone,
        company_name, budget, currency, expected_close_date, assigned_to, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [funnelId, finalStageId, title, description || null, clientName || null, clientEmail || null,
        clientPhone || null, companyName || null, budget || null, currency || 'RUB',
        expectedCloseDate ? new Date(expectedCloseDate) : null, assignedTo || null]
    );
    res.status(201).json({
      id: result.rows[0].id,
      funnelId: result.rows[0].funnel_id,
      stageId: result.rows[0].stage_id,
      title: result.rows[0].title,
      description: result.rows[0].description,
      clientName: result.rows[0].client_name,
      clientEmail: result.rows[0].client_email,
      clientPhone: result.rows[0].client_phone,
      companyName: result.rows[0].company_name,
      budget: result.rows[0].budget ? parseFloat(result.rows[0].budget) : null,
      currency: result.rows[0].currency,
      expectedCloseDate: result.rows[0].expected_close_date,
      actualCloseDate: result.rows[0].actual_close_date,
      isWon: result.rows[0].is_won,
      isLost: result.rows[0].is_lost,
      lossReason: result.rows[0].loss_reason,
      assignedTo: result.rows[0].assigned_to,
      createdBy: result.rows[0].created_by,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
      movedAt: result.rows[0].moved_at,
      closedAt: result.rows[0].closed_at,
    });
  } catch (err) {
    console.error('Error creating deal:', err);
    res.status(500).json({ error: 'Failed to create deal' });
  }
});

// PUT /api/funnels/:funnelId/deals/:id - Update deal
router.put('/:funnelId/deals/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      stageId, title, description, clientName, clientEmail, clientPhone, companyName,
      budget, currency, expectedCloseDate, actualCloseDate, isWon, isLost, lossReason, assignedTo
    } = req.body;
    
    // Check if stage is being changed
    const currentDeal = await pool.query('SELECT stage_id FROM deals WHERE id = $1', [id]);
    const isStageChanged = currentDeal.rows[0] && currentDeal.rows[0].stage_id !== stageId;
    
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (stageId !== undefined) {
      updates.push(`stage_id = $${paramCount++}`);
      values.push(stageId);
    }
    if (title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (clientName !== undefined) {
      updates.push(`client_name = $${paramCount++}`);
      values.push(clientName);
    }
    if (clientEmail !== undefined) {
      updates.push(`client_email = $${paramCount++}`);
      values.push(clientEmail);
    }
    if (clientPhone !== undefined) {
      updates.push(`client_phone = $${paramCount++}`);
      values.push(clientPhone);
    }
    if (companyName !== undefined) {
      updates.push(`company_name = $${paramCount++}`);
      values.push(companyName);
    }
    if (budget !== undefined) {
      updates.push(`budget = $${paramCount++}`);
      values.push(budget);
    }
    if (currency !== undefined) {
      updates.push(`currency = $${paramCount++}`);
      values.push(currency);
    }
    if (expectedCloseDate !== undefined) {
      updates.push(`expected_close_date = $${paramCount++}`);
      values.push(expectedCloseDate ? new Date(expectedCloseDate) : null);
    }
    if (actualCloseDate !== undefined) {
      updates.push(`actual_close_date = $${paramCount++}`);
      values.push(actualCloseDate ? new Date(actualCloseDate) : null);
    }
    if (isWon !== undefined) {
      updates.push(`is_won = $${paramCount++}`);
      values.push(isWon);
    }
    if (isLost !== undefined) {
      updates.push(`is_lost = $${paramCount++}`);
      values.push(isLost);
    }
    if (lossReason !== undefined) {
      updates.push(`loss_reason = $${paramCount++}`);
      values.push(lossReason);
    }
    if (assignedTo !== undefined) {
      updates.push(`assigned_to = $${paramCount++}`);
      values.push(assignedTo);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    if (isStageChanged) updates.push(`moved_at = CURRENT_TIMESTAMP`);
    if (isWon || isLost) updates.push(`closed_at = CURRENT_TIMESTAMP`);
    if (!isWon && !isLost) updates.push(`closed_at = NULL`);
    
    values.push(id);
    const whereParam = paramCount;
    
    const result = await pool.query(
      `UPDATE deals SET ${updates.join(', ')} WHERE id = $${whereParam} RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    
    const d = result.rows[0];
    res.json({
      id: d.id,
      funnelId: d.funnel_id,
      stageId: d.stage_id,
      title: d.title,
      description: d.description,
      clientName: d.client_name,
      clientEmail: d.client_email,
      clientPhone: d.client_phone,
      companyName: d.company_name,
      budget: d.budget ? parseFloat(d.budget) : null,
      currency: d.currency,
      expectedCloseDate: d.expected_close_date,
      actualCloseDate: d.actual_close_date,
      isWon: d.is_won,
      isLost: d.is_lost,
      lossReason: d.loss_reason,
      assignedTo: d.assigned_to,
      createdBy: d.created_by,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
      movedAt: d.moved_at,
      closedAt: d.closed_at,
    });
  } catch (err) {
    console.error('Error updating deal:', err);
    res.status(500).json({ error: 'Failed to update deal' });
  }
});

// DELETE /api/funnels/:funnelId/deals/:id - Delete deal
router.delete('/:funnelId/deals/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM deals WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting deal:', err);
    res.status(500).json({ error: 'Failed to delete deal' });
  }
});

export default router;

