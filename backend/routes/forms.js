import express from 'express';
import pool from '../db.js';
import { requireAuth, requireAdminOrSalesManager } from '../middleware/auth.js';

const router = express.Router();

// Список известных форм на сайте (из кода, акций, страниц)
const KNOWN_FORMS = [
  { form_id: 'contact-form', form_name: 'Форма обратной связи (контакты)', page_path: '/contacts' },
  { form_id: 'contact', form_name: 'Заявка с карточки товара', page_path: '/products' },
  { form_id: 'quiz-form', form_name: 'Калькулятор стоимости (Quiz)', page_path: '/' },
  { form_id: 'regForm', form_name: 'Quiz (regForm)', page_path: '/' },
  { form_id: 'quizForm', form_name: 'Quiz (quizForm)', page_path: '/' },
  { form_id: 'new-client-form', form_name: 'Стать клиентом', page_path: '/new-client' },
  { form_id: 'submit', form_name: 'Форма в футере', page_path: '/' },
  { form_id: 'case-cost-form', form_name: 'Расчёт стоимости по кейсу', page_path: '/cases' },
];

async function ensureFormExists(pool, formId, formName, pagePath) {
  const check = await pool.query('SELECT form_id FROM forms WHERE form_id = $1', [formId]);
  if (check.rows.length === 0) {
    await pool.query(
      'INSERT INTO forms (form_id, form_name, page_path, fields, updated_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) ON CONFLICT (form_id) DO NOTHING',
      [formId, formName || `Форма ${formId}`, pagePath || null, JSON.stringify([])]
    );
  }
}

// GET /api/forms - List all forms (sync from submissions, abandonments, promotions, known list)
router.get('/', requireAuth, requireAdminOrSalesManager, async (req, res) => {
  try {
    // 1. Добавляем известные формы
    for (const f of KNOWN_FORMS) {
      await ensureFormExists(pool, f.form_id, f.form_name, f.page_path);
    }
    // 2. Формы из акций (promotions.form_id)
    const promos = await pool.query('SELECT DISTINCT form_id FROM promotions WHERE form_id IS NOT NULL AND form_id != \'\'');
    for (const r of promos.rows || []) {
      await ensureFormExists(pool, r.form_id, `Акция: ${r.form_id}`, '/promotion');
    }
    // 3. Формы из submission/abandonment (на случай если были до FK)
    const fromSub = await pool.query('SELECT DISTINCT form_id FROM form_submissions');
    const fromAb = await pool.query('SELECT DISTINCT form_id FROM form_abandonments');
    for (const r of [...(fromSub.rows || []), ...(fromAb.rows || [])]) {
      if (r.form_id) await ensureFormExists(pool, r.form_id);
    }

    const result = await pool.query('SELECT * FROM forms ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching forms:', err);
    res.status(500).json({ error: 'Failed to fetch forms' });
  }
});

// Статические пути выше /:formId, чтобы не пересекаться с form_id вроде "stats"
// GET /api/forms/stats/overview
router.get('/stats/overview', requireAuth, requireAdminOrSalesManager, async (req, res) => {
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

// GET /api/forms/submissions/recent — последние заявки по всем формам
router.get('/submissions/recent', requireAuth, requireAdminOrSalesManager, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const result = await pool.query(
      `SELECT s.*, f.form_name
       FROM form_submissions s
       LEFT JOIN forms f ON f.form_id = s.form_id
       ORDER BY s.submitted_at DESC
       LIMIT $1`,
      [limit]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching recent submissions:', err);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

// GET /api/forms/:formId - Get form details
router.get('/:formId', requireAuth, requireAdminOrSalesManager, async (req, res) => {
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
router.post('/', requireAuth, requireAdminOrSalesManager, async (req, res) => {
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
router.put('/:formId', requireAuth, requireAdminOrSalesManager, async (req, res) => {
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
router.delete('/:formId', requireAuth, requireAdminOrSalesManager, async (req, res) => {
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
    const formData = req.body || {};
    const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0]?.trim();
    const userAgent = req.headers['user-agent'];
    const referrer = req.headers['referer'] || req.headers['referrer'];

    console.log('[forms] Form submission received:', { formId, formData, ip });

    const known = KNOWN_FORMS.find(f => f.form_id === formId);
    await ensureFormExists(pool, formId, known?.form_name, known?.page_path);

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

      let resolvedClientId = null;

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

        // Пожелания по благотворительности (new-client-form)
        let charityPrefs = [];
        if (formId === 'new-client-form' && formData.charity_fund) {
          charityPrefs = [{ fund_id: formData.charity_fund, fund_name: formData.charity_fund_name || formData.charity_fund, percent: 10 }];
        }

        if (existingClient) {
          resolvedClientId = existingClient.id;
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
          if (charityPrefs.length > 0) {
            updates.push(`charity_preferences = $${paramIndex}`);
            params.push(JSON.stringify(charityPrefs));
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
            `INSERT INTO clients (name, email, phone, company, source, source_details, status, charity_preferences)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id`,
            [
              name || 'Неизвестно',
              email || null,
              phone || null,
              company || null,
              'form',
              formId,
              'lead',
              charityPrefs.length > 0 ? JSON.stringify(charityPrefs) : '[]'
            ]
          );
          
          resolvedClientId = newClientResult.rows[0].id;
          console.log('[forms] New client created:', resolvedClientId);
        }
      }

      // Каждая отправка формы — новая сделка в основной воронке (и для существующих клиентов)
      try {
        const { createDealForClient } = await import('../utils/funnelHelper.js');
        const dealTitleName = name || email || phone || `Заявка #${result.rows[0].id} (${formId})`;
        await createDealForClient(resolvedClientId, dealTitleName, email, phone, 'form');
        console.log('[forms] Deal created in main funnel for submission', result.rows[0].id);
      } catch (dealErr) {
        console.warn('[forms] Error creating deal:', dealErr);
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
    console.error('[forms] Error submitting form:', err.message, err.stack);
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

    // FK требует наличия формы — создаём при необходимости
    await ensureFormExists(pool, formId);

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
router.get('/:formId/submissions', requireAuth, requireAdminOrSalesManager, async (req, res) => {
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
router.get('/:formId/submissions/:submissionId', requireAuth, requireAdminOrSalesManager, async (req, res) => {
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
router.put('/:formId/submissions/:submissionId/status', requireAuth, requireAdminOrSalesManager, async (req, res) => {
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
router.delete('/:formId/submissions/:submissionId', requireAuth, requireAdminOrSalesManager, async (req, res) => {
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
router.get('/:formId/abandonments', requireAuth, requireAdminOrSalesManager, async (req, res) => {
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

export default router;

