import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Все роуты требуют авторизации
router.use(requireAuth);

// ========== УПРАВЛЕНИЕ ПРАВИЛАМИ ЧАТ-БОТА ==========

// Получить список правил
router.get('/rules', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM chatbot_rules ORDER BY priority DESC, id ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('[chatbot] Error fetching rules:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получить правило по ID
router.get('/rules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM chatbot_rules WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rule not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('[chatbot] Error fetching rule:', error);
    res.status(500).json({ error: error.message });
  }
});

// Создать правило
router.post('/rules', async (req, res) => {
  try {
    const {
      name,
      keywords,
      response_text,
      response_type = 'text',
      file_url,
      file_name,
      proposal_template_id,
      redirect_url,
      priority = 0,
      is_active = true
    } = req.body;

    if (!name || !keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({ error: 'Name and keywords are required' });
    }

    const result = await pool.query(
      `INSERT INTO chatbot_rules (
        name, keywords, response_text, response_type, file_url, file_name,
        proposal_template_id, redirect_url, priority, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        name,
        keywords,
        response_text || null,
        response_type,
        file_url || null,
        file_name || null,
        proposal_template_id || null,
        redirect_url || null,
        priority,
        is_active
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[chatbot] Error creating rule:', error);
    res.status(500).json({ error: error.message });
  }
});

// Обновить правило
router.put('/rules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      keywords,
      response_text,
      response_type,
      file_url,
      file_name,
      proposal_template_id,
      redirect_url,
      priority,
      is_active
    } = req.body;

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      params.push(name);
      paramIndex++;
    }
    if (keywords !== undefined) {
      updates.push(`keywords = $${paramIndex}`);
      params.push(Array.isArray(keywords) ? keywords : []);
      paramIndex++;
    }
    if (response_text !== undefined) {
      updates.push(`response_text = $${paramIndex}`);
      params.push(response_text || null);
      paramIndex++;
    }
    if (response_type !== undefined) {
      updates.push(`response_type = $${paramIndex}`);
      params.push(response_type);
      paramIndex++;
    }
    if (file_url !== undefined) {
      updates.push(`file_url = $${paramIndex}`);
      params.push(file_url || null);
      paramIndex++;
    }
    if (file_name !== undefined) {
      updates.push(`file_name = $${paramIndex}`);
      params.push(file_name || null);
      paramIndex++;
    }
    if (proposal_template_id !== undefined) {
      updates.push(`proposal_template_id = $${paramIndex}`);
      params.push(proposal_template_id || null);
      paramIndex++;
    }
    if (redirect_url !== undefined) {
      updates.push(`redirect_url = $${paramIndex}`);
      params.push(redirect_url || null);
      paramIndex++;
    }
    if (priority !== undefined) {
      updates.push(`priority = $${paramIndex}`);
      params.push(priority);
      paramIndex++;
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      params.push(is_active);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);

    const result = await pool.query(
      `UPDATE chatbot_rules SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[chatbot] Error updating rule:', error);
    res.status(500).json({ error: error.message });
  }
});

// Удалить правило
router.delete('/rules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM chatbot_rules WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rule not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('[chatbot] Error deleting rule:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== УПРАВЛЕНИЕ ШАБЛОНАМИ КОММЕРЧЕСКИХ ПРЕДЛОЖЕНИЙ ==========

// Получить список шаблонов
router.get('/proposals', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM proposal_templates ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('[chatbot] Error fetching proposals:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получить шаблон по ID
router.get('/proposals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM proposal_templates WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('[chatbot] Error fetching proposal:', error);
    res.status(500).json({ error: error.message });
  }
});

// Создать шаблон
router.post('/proposals', async (req, res) => {
  try {
    const { name, title, content, file_url, is_active = true } = req.body;

    if (!name || !title) {
      return res.status(400).json({ error: 'Name and title are required' });
    }

    const result = await pool.query(
      `INSERT INTO proposal_templates (name, title, content, file_url, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, title, content || '', file_url || null, is_active]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[chatbot] Error creating proposal:', error);
    res.status(500).json({ error: error.message });
  }
});

// Обновить шаблон
router.put('/proposals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, title, content, file_url, is_active } = req.body;

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      params.push(name);
      paramIndex++;
    }
    if (title !== undefined) {
      updates.push(`title = $${paramIndex}`);
      params.push(title);
      paramIndex++;
    }
    if (content !== undefined) {
      updates.push(`content = $${paramIndex}`);
      params.push(content);
      paramIndex++;
    }
    if (file_url !== undefined) {
      updates.push(`file_url = $${paramIndex}`);
      params.push(file_url || null);
      paramIndex++;
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      params.push(is_active);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);

    const result = await pool.query(
      `UPDATE proposal_templates SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[chatbot] Error updating proposal:', error);
    res.status(500).json({ error: error.message });
  }
});

// Удалить шаблон
router.delete('/proposals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM proposal_templates WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('[chatbot] Error deleting proposal:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== АНАЛИТИКА ЧАТ-БОТА ==========

// Получить статистику работы чат-бота
router.get('/stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = '';
    const params = [];
    if (startDate && endDate) {
      dateFilter = 'WHERE created_at BETWEEN $1 AND $2';
      params.push(startDate, endDate);
    }

    const statsResult = await pool.query(
      `SELECT 
        COUNT(*) as total_interactions,
        COUNT(DISTINCT chat_id) as unique_chats,
        COUNT(DISTINCT rule_id) as rules_used
      FROM chatbot_logs ${dateFilter}`,
      params
    );

    const topRulesResult = await pool.query(
      `SELECT 
        r.id,
        r.name,
        COUNT(*) as usage_count
      FROM chatbot_logs cl
      JOIN chatbot_rules r ON cl.rule_id = r.id
      ${dateFilter ? dateFilter.replace('created_at', 'cl.created_at') : ''}
      GROUP BY r.id, r.name
      ORDER BY usage_count DESC
      LIMIT 10`,
      params
    );

    res.json({
      overview: statsResult.rows[0],
      topRules: topRulesResult.rows
    });
  } catch (error) {
    console.error('[chatbot] Error fetching stats:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

