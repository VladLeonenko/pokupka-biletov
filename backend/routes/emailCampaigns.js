import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const router = express.Router();

// Настройка multer для загрузки CSV
const upload = multer({ storage: multer.memoryStorage() });

// Получение email транспортера (используем существующую логику из auth.js)
let emailTransporter = null;

async function getEmailTransporter() {
  if (emailTransporter) {
    return emailTransporter;
  }

  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT) || 587;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !user || !pass) {
    throw new Error('Email transport is not configured');
  }

  emailTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return emailTransporter;
}

// ==================== ПОДПИСЧИКИ ====================

// Получить всех подписчиков
router.get('/subscribers', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50, status, search } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM email_subscribers WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(status);
    }

    if (search) {
      paramCount++;
      query += ` AND (email ILIKE $${paramCount} OR name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM email_subscribers' + (status || search ? ' WHERE ' + (status ? `status = '${status}'` : '') + (search ? ` AND (email ILIKE '%${search}%' OR name ILIKE '%${search}%')` : '') : '')
    );

    res.json({
      subscribers: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    res.status(500).json({ error: 'Ошибка при получении подписчиков' });
  }
});

// Создать подписчика
router.post('/subscribers', requireAuth, async (req, res) => {
  try {
    const { email, name, phone, tags, custom_fields } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email обязателен' });
    }

    const result = await pool.query(
      `INSERT INTO email_subscribers (email, name, phone, tags, custom_fields)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE SET
         name = COALESCE(EXCLUDED.name, email_subscribers.name),
         phone = COALESCE(EXCLUDED.phone, email_subscribers.phone),
         tags = COALESCE(EXCLUDED.tags, email_subscribers.tags),
         custom_fields = COALESCE(EXCLUDED.custom_fields, email_subscribers.custom_fields),
         status = 'active',
         updated_at = NOW()
       RETURNING *`,
      [email, name || null, phone || null, tags || [], custom_fields || {}]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating subscriber:', error);
    res.status(500).json({ error: 'Ошибка при создании подписчика' });
  }
});

// Импорт подписчиков из CSV
router.post('/subscribers/import', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    const results = [];
    const errors = [];
    const stream = Readable.from(req.file.buffer.toString());

    await new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on('data', async (row) => {
          try {
            const email = row.email || row.Email || row.EMAIL;
            if (!email) {
              errors.push({ row, error: 'Email не найден' });
              return;
            }

            const name = row.name || row.Name || row.NAME || null;
            const phone = row.phone || row.Phone || row.PHONE || null;
            const tags = row.tags ? row.tags.split(',').map(t => t.trim()) : [];

            const result = await pool.query(
              `INSERT INTO email_subscribers (email, name, phone, tags)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (email) DO UPDATE SET
                 name = COALESCE(EXCLUDED.name, email_subscribers.name),
                 phone = COALESCE(EXCLUDED.phone, email_subscribers.phone),
                 tags = COALESCE(EXCLUDED.tags, email_subscribers.tags),
                 status = 'active',
                 updated_at = NOW()
               RETURNING *`,
              [email, name, phone, tags]
            );

            results.push(result.rows[0]);
          } catch (error) {
            errors.push({ row, error: error.message });
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    res.json({
      imported: results.length,
      errors: errors.length,
      details: errors,
    });
  } catch (error) {
    console.error('Error importing subscribers:', error);
    res.status(500).json({ error: 'Ошибка при импорте подписчиков' });
  }
});

// Обновить подписчика
router.put('/subscribers/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, name, phone, tags, custom_fields, status } = req.body;

    const result = await pool.query(
      `UPDATE email_subscribers
       SET email = COALESCE($1, email),
           name = COALESCE($2, name),
           phone = COALESCE($3, phone),
           tags = COALESCE($4, tags),
           custom_fields = COALESCE($5, custom_fields),
           status = COALESCE($6, status),
           unsubscribed_at = CASE WHEN $6 = 'unsubscribed' AND status != 'unsubscribed' THEN NOW() ELSE unsubscribed_at END,
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [email, name, phone, tags, custom_fields, status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Подписчик не найден' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating subscriber:', error);
    res.status(500).json({ error: 'Ошибка при обновлении подписчика' });
  }
});

// Удалить подписчика
router.delete('/subscribers/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM email_subscribers WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting subscriber:', error);
    res.status(500).json({ error: 'Ошибка при удалении подписчика' });
  }
});

// ==================== ШАБЛОНЫ ====================

// Получить все шаблоны
router.get('/templates', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM email_templates ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Ошибка при получении шаблонов' });
  }
});

// Создать шаблон
router.post('/templates', requireAuth, async (req, res) => {
  try {
    const { name, subject, html_content, text_content } = req.body;
    const userId = req.user.id;

    const result = await pool.query(
      `INSERT INTO email_templates (name, subject, html_content, text_content, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, subject, html_content, text_content, userId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Ошибка при создании шаблона' });
  }
});

// Обновить шаблон
router.put('/templates/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, subject, html_content, text_content, is_active } = req.body;

    const result = await pool.query(
      `UPDATE email_templates
       SET name = COALESCE($1, name),
           subject = COALESCE($2, subject),
           html_content = COALESCE($3, html_content),
           text_content = COALESCE($4, text_content),
           is_active = COALESCE($5, is_active),
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [name, subject, html_content, text_content, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Шаблон не найден' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Ошибка при обновлении шаблона' });
  }
});

// Удалить шаблон
router.delete('/templates/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM email_templates WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Ошибка при удалении шаблона' });
  }
});

// ==================== РАССЫЛКИ ====================

// Получить все рассылки
router.get('/campaigns', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, 
              COUNT(DISTINCT m.id) as total_sent,
              COUNT(DISTINCT CASE WHEN m.status = 'delivered' THEN m.id END) as delivered,
              COUNT(DISTINCT CASE WHEN e.id IS NOT NULL THEN e.message_id END) as opened,
              COUNT(DISTINCT CASE WHEN cl.id IS NOT NULL THEN cl.message_id END) as clicked
       FROM email_campaigns c
       LEFT JOIN email_messages m ON m.campaign_id = c.id
       LEFT JOIN email_opens e ON e.message_id = m.id
       LEFT JOIN email_clicks cl ON cl.message_id = m.id
       GROUP BY c.id
       ORDER BY c.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: 'Ошибка при получении рассылок' });
  }
});

// Получить рассылку с детальной статистикой
router.get('/campaigns/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const campaignResult = await pool.query('SELECT * FROM email_campaigns WHERE id = $1', [id]);
    if (campaignResult.rows.length === 0) {
      return res.status(404).json({ error: 'Рассылка не найдена' });
    }

    const statsResult = await pool.query(
      `SELECT 
        COUNT(DISTINCT m.id) as total_sent,
        COUNT(DISTINCT CASE WHEN m.status = 'delivered' THEN m.id END) as delivered,
        COUNT(DISTINCT CASE WHEN m.status = 'bounced' THEN m.id END) as bounced,
        COUNT(DISTINCT CASE WHEN m.status = 'failed' THEN m.id END) as failed,
        COUNT(DISTINCT e.message_id) as opened,
        COUNT(DISTINCT cl.message_id) as clicked,
        COUNT(DISTINCT r.id) as replied
       FROM email_messages m
       LEFT JOIN email_opens e ON e.message_id = m.id
       LEFT JOIN email_clicks cl ON cl.message_id = m.id
       LEFT JOIN email_replies r ON r.message_id = m.id
       WHERE m.campaign_id = $1`,
      [id]
    );

    res.json({
      campaign: campaignResult.rows[0],
      stats: statsResult.rows[0],
    });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({ error: 'Ошибка при получении рассылки' });
  }
});

// Создать рассылку
router.post('/campaigns', requireAuth, async (req, res) => {
  try {
    const {
      name,
      subject,
      html_content,
      text_content,
      template_id,
      from_email,
      from_name,
      reply_to,
      segment_filter,
      scheduled_at,
    } = req.body;

    const userId = req.user.id;

    const result = await pool.query(
      `INSERT INTO email_campaigns 
       (name, subject, html_content, text_content, template_id, from_email, from_name, reply_to, segment_filter, scheduled_at, created_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        name,
        subject,
        html_content,
        text_content,
        template_id || null,
        from_email || process.env.EMAIL_USER,
        from_name || 'PrimeCoder',
        reply_to || process.env.EMAIL_USER,
        segment_filter || {},
        scheduled_at || null,
        userId,
        scheduled_at ? 'scheduled' : 'draft',
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ error: 'Ошибка при создании рассылки' });
  }
});

// Обновить рассылку
router.put('/campaigns/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      subject,
      html_content,
      text_content,
      template_id,
      from_email,
      from_name,
      reply_to,
      segment_filter,
      scheduled_at,
      status,
    } = req.body;

    const result = await pool.query(
      `UPDATE email_campaigns
       SET name = COALESCE($1, name),
           subject = COALESCE($2, subject),
           html_content = COALESCE($3, html_content),
           text_content = COALESCE($4, text_content),
           template_id = COALESCE($5, template_id),
           from_email = COALESCE($6, from_email),
           from_name = COALESCE($7, from_name),
           reply_to = COALESCE($8, reply_to),
           segment_filter = COALESCE($9, segment_filter),
           scheduled_at = COALESCE($10, scheduled_at),
           status = COALESCE($11, status),
           updated_at = NOW()
       WHERE id = $12
       RETURNING *`,
      [
        name,
        subject,
        html_content,
        text_content,
        template_id,
        from_email,
        from_name,
        reply_to,
        segment_filter,
        scheduled_at,
        status,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Рассылка не найдена' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({ error: 'Ошибка при обновлении рассылки' });
  }
});

// Отправить рассылку
router.post('/campaigns/:id/send', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const transporter = await getEmailTransporter();

    // Получаем рассылку
    const campaignResult = await pool.query('SELECT * FROM email_campaigns WHERE id = $1', [id]);
    if (campaignResult.rows.length === 0) {
      return res.status(404).json({ error: 'Рассылка не найдена' });
    }

    const campaign = campaignResult.rows[0];

    // Получаем подписчиков с учетом фильтров
    let subscribersQuery = 'SELECT * FROM email_subscribers WHERE status = $1';
    const subscribersParams = ['active'];

    if (campaign.segment_filter && Object.keys(campaign.segment_filter).length > 0) {
      const filter = campaign.segment_filter;
      if (filter.tags && filter.tags.length > 0) {
        subscribersQuery += ` AND tags && $${subscribersParams.length + 1}`;
        subscribersParams.push(filter.tags);
      }
    }

    const subscribersResult = await pool.query(subscribersQuery, subscribersParams);
    const subscribers = subscribersResult.rows;

    // Обновляем статус рассылки
    await pool.query(
      "UPDATE email_campaigns SET status = 'sending', total_recipients = $1 WHERE id = $2",
      [subscribers.length, id]
    );

    // Создаем записи для каждого письма
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    let sentCount = 0;
    let errorCount = 0;

    for (const subscriber of subscribers) {
      try {
        const messageId = crypto.randomBytes(16).toString('hex');
        const trackingPixelUrl = `${baseUrl}/api/email/track/open/${messageId}`;
        const unsubscribeUrl = `${baseUrl}/api/email/unsubscribe/${subscriber.id}`;

        // Заменяем плейсхолдеры в контенте
        let htmlContent = campaign.html_content || '';
        htmlContent = htmlContent.replace(/\{\{name\}\}/g, subscriber.name || '');
        htmlContent = htmlContent.replace(/\{\{email\}\}/g, subscriber.email);
        htmlContent = htmlContent.replace(/\{\{unsubscribe\}\}/g, unsubscribeUrl);

        // Добавляем tracking pixel
        htmlContent += `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" />`;

        // Заменяем ссылки на отслеживаемые
        htmlContent = htmlContent.replace(
          /href="([^"]+)"/g,
          (match, url) => {
            if (url.startsWith('http') && !url.includes('/api/email/track/click/')) {
              const trackedUrl = `${baseUrl}/api/email/track/click/${messageId}?url=${encodeURIComponent(url)}`;
              return `href="${trackedUrl}"`;
            }
            return match;
          }
        );

        // Создаем запись письма
        const messageResult = await pool.query(
          `INSERT INTO email_messages (campaign_id, subscriber_id, message_id, status)
           VALUES ($1, $2, $3, 'pending')
           RETURNING id`,
          [id, subscriber.id, messageId]
        );

        // Отправляем письмо
        await transporter.sendMail({
          from: `"${campaign.from_name}" <${campaign.from_email}>`,
          to: subscriber.email,
          subject: campaign.subject,
          html: htmlContent,
          text: campaign.text_content || '',
          replyTo: campaign.reply_to,
          headers: {
            'X-Campaign-ID': id.toString(),
            'X-Message-ID': messageId,
          },
        });

        // Обновляем статус письма
        await pool.query(
          "UPDATE email_messages SET status = 'sent', sent_at = NOW() WHERE id = $1",
          [messageResult.rows[0].id]
        );

        sentCount++;
      } catch (error) {
        console.error(`Error sending to ${subscriber.email}:`, error);
        errorCount++;
      }
    }

    // Обновляем статус рассылки
    await pool.query(
      "UPDATE email_campaigns SET status = 'sent', sent_at = NOW() WHERE id = $1",
      [id]
    );

    res.json({
      success: true,
      sent: sentCount,
      errors: errorCount,
      total: subscribers.length,
    });
  } catch (error) {
    console.error('Error sending campaign:', error);
    res.status(500).json({ error: 'Ошибка при отправке рассылки' });
  }
});

// ==================== ОТСЛЕЖИВАНИЕ ====================

// Отслеживание открытий (tracking pixel)
router.get('/track/open/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent') || '';

    // Находим письмо
    const messageResult = await pool.query(
      'SELECT id FROM email_messages WHERE message_id = $1',
      [messageId]
    );

    if (messageResult.rows.length > 0) {
      const messageId_db = messageResult.rows[0].id;

      // Проверяем, было ли уже открытие
      const existingOpen = await pool.query(
        'SELECT id, opened_count FROM email_opens WHERE message_id = $1 LIMIT 1',
        [messageId_db]
      );

      if (existingOpen.rows.length > 0) {
        // Увеличиваем счетчик
        await pool.query(
          'UPDATE email_opens SET opened_count = opened_count + 1 WHERE id = $1',
          [existingOpen.rows[0].id]
        );
      } else {
        // Создаем новую запись
        await pool.query(
          `INSERT INTO email_opens (message_id, ip_address, user_agent)
           VALUES ($1, $2, $3)`,
          [messageId_db, ip, userAgent]
        );

        // Обновляем статус письма
        await pool.query(
          "UPDATE email_messages SET opened_at = NOW() WHERE id = $1 AND opened_at IS NULL",
          [messageId_db]
        );
      }
    }

    // Возвращаем прозрачный 1x1 пиксель
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );
    res.set('Content-Type', 'image/gif');
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send(pixel);
  } catch (error) {
    console.error('Error tracking open:', error);
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );
    res.set('Content-Type', 'image/gif');
    res.send(pixel);
  }
});

// Отслеживание кликов
router.get('/track/click/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { url } = req.query;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent') || '';

    if (!url) {
      return res.redirect('/');
    }

    // Находим письмо
    const messageResult = await pool.query(
      'SELECT id FROM email_messages WHERE message_id = $1',
      [messageId]
    );

    if (messageResult.rows.length > 0) {
      const messageId_db = messageResult.rows[0].id;

      // Проверяем, был ли уже клик
      const existingClick = await pool.query(
        'SELECT id, clicked_count FROM email_clicks WHERE message_id = $1 AND url = $2 LIMIT 1',
        [messageId_db, url]
      );

      if (existingClick.rows.length > 0) {
        await pool.query(
          'UPDATE email_clicks SET clicked_count = clicked_count + 1 WHERE id = $1',
          [existingClick.rows[0].id]
        );
      } else {
        await pool.query(
          `INSERT INTO email_clicks (message_id, url, ip_address, user_agent)
           VALUES ($1, $2, $3, $4)`,
          [messageId_db, url, ip, userAgent]
        );
      }

      // Обновляем статус письма
      await pool.query(
        "UPDATE email_messages SET clicked_at = NOW() WHERE id = $1 AND clicked_at IS NULL",
        [messageId_db]
      );
    }

    res.redirect(decodeURIComponent(url));
  } catch (error) {
    console.error('Error tracking click:', error);
    const url = req.query.url ? decodeURIComponent(req.query.url) : '/';
    res.redirect(url);
  }
});

// Отписка от рассылок
router.get('/unsubscribe/:subscriberId', async (req, res) => {
  try {
    const { subscriberId } = req.params;
    await pool.query(
      "UPDATE email_subscribers SET status = 'unsubscribed', unsubscribed_at = NOW() WHERE id = $1",
      [subscriberId]
    );
    res.send(`
      <html>
        <head><title>Отписка от рассылки</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1>Вы успешно отписались от рассылки</h1>
          <p>Мы больше не будем присылать вам письма.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error unsubscribing:', error);
    res.status(500).send('Ошибка при отписке');
  }
});

export default router;


