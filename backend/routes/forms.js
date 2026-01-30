import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/forms - List all forms
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM forms ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching forms:', err);
    res.status(500).json({ error: 'Failed to fetch forms' });
  }
});

// GET /api/forms/:formId - Get form details
router.get('/:formId', requireAuth, async (req, res) => {
  try {
    const { formId } = req.params;
    const result = await pool.query('SELECT * FROM forms WHERE form_id = $1', [formId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Form not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching form:', err);
    res.status(500).json({ error: 'Failed to fetch form' });
  }
});

// POST /api/forms - Create new form definition
router.post('/', requireAuth, async (req, res) => {
  try {
    const { form_id, form_name, page_path, fields } = req.body;
    const result = await pool.query(
      'INSERT INTO forms (form_id, form_name, page_path, fields, updated_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING *',
      [form_id, form_name, page_path, JSON.stringify(fields || [])]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating form:', err);
    if (err.code === '23505') { // unique_violation
      res.status(409).json({ error: 'Form with this ID already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create form' });
    }
  }
});

// PUT /api/forms/:formId - Update form
router.put('/:formId', requireAuth, async (req, res) => {
  try {
    const { formId } = req.params;
    const { form_name, page_path, fields } = req.body;
    const result = await pool.query(
      'UPDATE forms SET form_name = $1, page_path = $2, fields = $3, updated_at = CURRENT_TIMESTAMP WHERE form_id = $4 RETURNING *',
      [form_name, page_path, JSON.stringify(fields || []), formId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Form not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating form:', err);
    res.status(500).json({ error: 'Failed to update form' });
  }
});

// DELETE /api/forms/:formId - Delete form
router.delete('/:formId', requireAuth, async (req, res) => {
  try {
    const { formId } = req.params;
    await pool.query('DELETE FROM forms WHERE form_id = $1', [formId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting form:', err);
    res.status(500).json({ error: 'Failed to delete form' });
  }
});

// POST /api/forms/:formId/submit - Submit form (public, no auth)
router.post('/:formId/submit', async (req, res) => {
  try {
    const { formId } = req.params;
    const formData = req.body;
    const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0]?.trim();
    const userAgent = req.headers['user-agent'];
    const referrer = req.headers['referer'] || req.headers['referrer'];

    console.log('[forms] Form submission received:', { formId, formData, ip });

    // Check if form exists, if not create it automatically
    let formCheck = await pool.query('SELECT form_id FROM forms WHERE form_id = $1', [formId]);
    if (formCheck.rows.length === 0) {
      // Auto-create form if it doesn't exist
      try {
        let formName = `Form ${formId}`;
        let pagePath = null;
        
        // Устанавливаем правильное название для известных форм
        if (formId === 'quiz-form' || formId === 'regForm' || formId === 'quizForm') {
          formName = 'Форма калькулятора стоимости (Quiz)';
          pagePath = '/';
        }
        
        await pool.query(
          'INSERT INTO forms (form_id, form_name, page_path, fields, updated_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',
          [formId, formName, pagePath, JSON.stringify([])]
        );
        console.log('[forms] Auto-created form:', formId, formName);
      } catch (createErr) {
        // If creation fails, still try to submit (form might have been created by another request)
        console.warn('Could not auto-create form, continuing anyway:', createErr);
      }
    } else {
      console.log('[forms] Form exists:', formId);
    }

    const result = await pool.query(
      `INSERT INTO form_submissions (form_id, form_data, ip_address, user_agent, referrer)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [formId, JSON.stringify(formData), ip, userAgent || null, referrer || null]
    );

    console.log('[forms] Form submission saved:', result.rows[0].id);

    // Автоматически создаем или обновляем клиента из данных формы
    try {
      const name = formData.name || formData['quiz-name'] || formData['callback-name'] || null;
      const email = formData.email || formData['quiz-email'] || formData['callback-email'] || null;
      const phone = formData.phone || formData.tel || formData['quiz-tel'] || formData['callback-tel'] || null;
      const company = formData.company || null;

      console.log('[forms] Extracted client data:', { name, email, phone, company });

      if (name || email || phone) {
        // Ищем существующего клиента по email или телефону
        let existingClient = null;
        if (email) {
          const emailCheck = await pool.query('SELECT id, name, email, phone, company FROM clients WHERE email = $1 LIMIT 1', [email]);
          if (emailCheck.rows.length > 0) {
            existingClient = emailCheck.rows[0];
          }
        }
        if (!existingClient && phone) {
          const phoneCheck = await pool.query('SELECT id, name, email, phone, company FROM clients WHERE phone = $1 LIMIT 1', [phone]);
          if (phoneCheck.rows.length > 0) {
            existingClient = phoneCheck.rows[0];
          }
        }

        if (existingClient) {
          // Обновляем существующего клиента - обновляем все данные, которые пришли
          const updates = [];
          const params = [];
          let paramIndex = 1;
          
          // Обновляем имя, если оно передано (даже если уже есть)
          if (name) {
            updates.push(`name = $${paramIndex}`);
            params.push(name);
            paramIndex++;
          }
          // Обновляем email, если он передан (даже если уже есть)
          if (email) {
            updates.push(`email = $${paramIndex}`);
            params.push(email);
            paramIndex++;
          }
          // Обновляем телефон, если он передан (даже если уже есть)
          if (phone) {
            updates.push(`phone = $${paramIndex}`);
            params.push(phone);
            paramIndex++;
          }
          // Обновляем компанию, если она передана (даже если уже есть)
          if (company) {
            updates.push(`company = $${paramIndex}`);
            params.push(company);
            paramIndex++;
          }

          // Всегда обновляем updated_at
          updates.push(`updated_at = NOW()`);
          params.push(existingClient.id);
          
          // Обновляем клиента, если есть хотя бы одно поле для обновления
          if (updates.length > 1) { // больше 1, потому что updated_at всегда есть
            await pool.query(
              `UPDATE clients SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
              params
            );
          }
        } else {
          // Создаем нового клиента
          console.log('[forms] Creating new client...');
          const newClientResult = await pool.query(
            `INSERT INTO clients (name, email, phone, company, source, source_details, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id`,
            [
              name || 'Неизвестно',
              email || null,
              phone || null,
              company || null,
              'form',
              formId,
              'lead'
            ]
          );
          
          console.log('[forms] New client created:', newClientResult.rows[0].id);
          
          // Автоматически создаем сделку в воронке продаж
          try {
            const { createDealForClient } = await import('../utils/funnelHelper.js');
            await createDealForClient(
              newClientResult.rows[0].id,
              name || 'Неизвестно',
              email,
              phone,
              'form'
            );
            console.log('[forms] Deal created for client:', newClientResult.rows[0].id);
          } catch (dealErr) {
            console.warn('[forms] Error creating deal:', dealErr);
          }
        }
      }
    } catch (clientErr) {
      // Логируем ошибку, но не прерываем отправку формы
      console.warn('[forms] Error creating/updating client from form submission:', clientErr);
    }

    // Создаем чат из формы, если есть контакты
    try {
      const name = formData.name || formData['quiz-name'] || formData['callback-name'] || null;
      const email = formData.email || formData['quiz-email'] || formData['callback-email'] || null;
      const phone = formData.phone || formData.tel || formData['quiz-tel'] || formData['callback-tel'] || null;

      if (name || email || phone) {
        // Ищем или создаем клиента (код уже есть выше)
        let clientId = null;
        if (email) {
          const emailCheck = await pool.query('SELECT id FROM clients WHERE email = $1 LIMIT 1', [email]);
          if (emailCheck.rows.length > 0) {
            clientId = emailCheck.rows[0].id;
          }
        }
        if (!clientId && phone) {
          const phoneCheck = await pool.query('SELECT id FROM clients WHERE phone = $1 LIMIT 1', [phone]);
          if (phoneCheck.rows.length > 0) {
            clientId = phoneCheck.rows[0].id;
          }
        }

        // Создаем чат из формы (проверяем, что чата еще нет)
        const existingChat = await pool.query(
          'SELECT id FROM chats WHERE form_id = $1 AND client_email = COALESCE($2, client_email) AND client_phone = COALESCE($3, client_phone) LIMIT 1',
          [formId, email, phone]
        );
        if (existingChat.rows.length === 0) {
          await pool.query(
            `INSERT INTO chats (client_id, client_name, client_email, client_phone, source, form_id, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [clientId, name || null, email || null, phone || null, 'form', formId, 'active']
          );
        }
      }
    } catch (chatErr) {
      console.warn('[forms] Error creating chat from form:', chatErr);
    }

    // Создаем уведомление для админов о новой форме
    try {
      const { createNotification } = await import('./notifications.js');
      // Получаем актуальную информацию о форме
      const formInfo = await pool.query('SELECT form_name FROM forms WHERE form_id = $1', [formId]);
      const formName = formInfo.rows.length > 0 ? formInfo.rows[0].form_name : `Форма ${formId}`;
      const name = formData.name || formData['quiz-name'] || formData['callback-name'] || 'Неизвестно';
      const email = formData.email || formData['quiz-email'] || formData['callback-email'] || null;
      const phone = formData.phone || formData.tel || formData['quiz-tel'] || formData['callback-tel'] || null;
      
      const contactInfo = [email, phone].filter(Boolean).join(', ') || 'без контактов';
      
      await createNotification({
        userId: 0, // для всех пользователей
        type: 'new_form_submission',
        title: `Новая заявка: ${formName}`,
        message: `От ${name} (${contactInfo})`,
        linkUrl: `/admin/forms/${formId}/submissions/${result.rows[0].id}`,
        relatedEntityType: 'form_submission',
        relatedEntityId: result.rows[0].id
      });
    } catch (notifyErr) {
      console.error('[forms] ❌ Ошибка создания уведомления:', notifyErr);
    }

    console.log('[forms] Form submission completed successfully');
    res.status(201).json({ success: true, submission: result.rows[0] });
  } catch (err) {
    console.error('Error submitting form:', err);
    res.status(500).json({ error: 'Failed to submit form' });
  }
});

// POST /api/forms/:formId/abandon - Track abandoned form (public, no auth)
router.post('/:formId/abandon', async (req, res) => {
  try {
    const { formId } = req.params;
    const { form_data, started_at } = req.body;
    const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0]?.trim();
    const userAgent = req.headers['user-agent'];
    const referrer = req.headers['referer'] || req.headers['referrer'];

    await pool.query(
      `INSERT INTO form_abandonments (form_id, form_data, started_at, abandoned_at, ip_address, user_agent, referrer)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5, $6)`,
      [formId, JSON.stringify(form_data || {}), new Date(started_at), ip, userAgent || null, referrer || null]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Error tracking abandonment:', err);
    res.status(500).json({ error: 'Failed to track abandonment' });
  }
});

// GET /api/forms/:formId/submissions - Get form submissions (auth required)
router.get('/:formId/submissions', requireAuth, async (req, res) => {
  try {
    const { formId } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;
    let query = 'SELECT * FROM form_submissions WHERE form_id = $1';
    const params = [formId];

    if (status) {
      query += ' AND status = $2';
      params.push(status);
      query += ' ORDER BY submitted_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
      params.push(parseInt(limit), parseInt(offset));
    } else {
      query += ' ORDER BY submitted_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
      params.push(parseInt(limit), parseInt(offset));
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching submissions:', err);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

// GET /api/forms/:formId/submissions/:submissionId - Get single submission
router.get('/:formId/submissions/:submissionId', requireAuth, async (req, res) => {
  try {
    const { formId, submissionId } = req.params;
    const result = await pool.query(
      'SELECT * FROM form_submissions WHERE form_id = $1 AND id = $2',
      [formId, submissionId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching submission:', err);
    res.status(500).json({ error: 'Failed to fetch submission' });
  }
});

// PUT /api/forms/:formId/submissions/:submissionId/status - Update submission status
router.put('/:formId/submissions/:submissionId/status', requireAuth, async (req, res) => {
  try {
    const { formId, submissionId } = req.params;
    const { status } = req.body;

    const updates = ['status = $1'];
    const params = [status];
    if (status === 'read') {
      updates.push('read_at = CURRENT_TIMESTAMP');
    } else if (status === 'replied') {
      updates.push('replied_at = CURRENT_TIMESTAMP');
    }
    params.push(formId, submissionId);

    const result = await pool.query(
      `UPDATE form_submissions SET ${updates.join(', ')} WHERE form_id = $${params.length - 1} AND id = $${params.length} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating submission:', err);
    res.status(500).json({ error: 'Failed to update submission' });
  }
});

// DELETE /api/forms/:formId/submissions/:submissionId - Delete submission
router.delete('/:formId/submissions/:submissionId', requireAuth, async (req, res) => {
  try {
    const { formId, submissionId } = req.params;
    await pool.query('DELETE FROM form_submissions WHERE form_id = $1 AND id = $2', [formId, submissionId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting submission:', err);
    res.status(500).json({ error: 'Failed to delete submission' });
  }
});

// GET /api/forms/:formId/abandonments - Get form abandonments (auth required)
router.get('/:formId/abandonments', requireAuth, async (req, res) => {
  try {
    const { formId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const result = await pool.query(
      'SELECT * FROM form_abandonments WHERE form_id = $1 ORDER BY abandoned_at DESC LIMIT $2 OFFSET $3',
      [formId, parseInt(limit), parseInt(offset)]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching abandonments:', err);
    res.status(500).json({ error: 'Failed to fetch abandonments' });
  }
});

// GET /api/forms/stats/overview - Get overall statistics
router.get('/stats/overview', requireAuth, async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM forms) as total_forms,
        (SELECT COUNT(*) FROM form_submissions) as total_submissions,
        (SELECT COUNT(*) FROM form_submissions WHERE status = 'new') as new_submissions,
        (SELECT COUNT(*) FROM form_submissions WHERE status = 'read') as read_submissions,
        (SELECT COUNT(*) FROM form_submissions WHERE status = 'replied') as replied_submissions,
        (SELECT COUNT(*) FROM form_abandonments) as total_abandonments,
        (SELECT COUNT(*) FROM form_submissions WHERE submitted_at >= CURRENT_DATE) as submissions_today,
        (SELECT COUNT(*) FROM form_submissions WHERE submitted_at >= CURRENT_DATE - INTERVAL '7 days') as submissions_week,
        (SELECT COUNT(*) FROM form_submissions WHERE submitted_at >= CURRENT_DATE - INTERVAL '30 days') as submissions_month
    `);

    // Per-form stats
    const perFormStats = await pool.query(`
      SELECT 
        f.form_id,
        f.form_name,
        COUNT(DISTINCT s.id) as submission_count,
        COUNT(DISTINCT a.id) as abandonment_count,
        COUNT(DISTINCT CASE WHEN s.status = 'new' THEN s.id END) as new_count
      FROM forms f
      LEFT JOIN form_submissions s ON f.form_id = s.form_id
      LEFT JOIN form_abandonments a ON f.form_id = a.form_id
      GROUP BY f.form_id, f.form_name
      ORDER BY submission_count DESC
    `);

    res.json({
      overview: stats.rows[0],
      byForm: perFormStats.rows
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;

