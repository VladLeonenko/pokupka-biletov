import express from 'express';
import multer from 'multer';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pool from '../db.js';
import { requireAuth, requireAdminOrSalesManager } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Настройка multer для загрузки файлов
const uploadsRoot = path.resolve(__dirname, '..', 'uploads');
const chatFilesDir = path.join(uploadsRoot, 'chat-files');

const storage = multer.diskStorage({
  destination: async function (_req, _file, cb) {
    try { await fs.mkdir(chatFilesDir, { recursive: true }); } catch {}
    cb(null, chatFilesDir);
  },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase() || '';
    const base = path.basename(file.originalname || 'file', ext).replace(/[^a-zA-Z0-9-_]+/g, '-').slice(0, 64) || 'file';
    cb(null, `${base}-${Date.now()}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

function phoneTail(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length < 10) return null;
  return digits.slice(-10);
}

async function findOrdersForContact(email, phone) {
  const tail = phoneTail(phone);
  if (!email && !tail) return [];
  const result = await pool.query(
    `SELECT
       o.order_number,
       o.status,
       o.payment_status,
       o.total_cents,
       o.created_at,
       o.customer_name,
       o.customer_email,
       o.customer_phone,
       COALESCE((
         SELECT string_agg(DISTINCT oi.product_title, ', ')
         FROM order_items oi
         WHERE oi.order_id = o.id
       ), '') AS titles
     FROM orders o
     WHERE (
       ($1::text IS NOT NULL AND o.customer_email IS NOT NULL AND lower(o.customer_email) = lower($1))
       OR (
         $2::text IS NOT NULL
         AND length(regexp_replace(COALESCE(o.customer_phone, ''), '\\D', '', 'g')) >= 10
         AND right(regexp_replace(o.customer_phone, '\\D', '', 'g'), 10) = $2
       )
     )
     ORDER BY o.created_at DESC
     LIMIT 8`,
    [email || null, tail]
  );
  return result.rows;
}

const TICKET_REPLIES = [
  {
    test: (t) => /не приш|не получил|где билет|нет письм|не приход|спам/.test(t),
    text: 'Электронный билет приходит на почту после успешной оплаты — обычно за несколько минут, иногда до 24 часов. Проверьте «Спам» и поиск по названию мероприятия.\n\nЕсли письма нет, напишите номер заказа и почту из оформления — оператор сверит оплату. Также: info@biletvsem.ru, +7 (995) 657-42-92 (ежедневно 10:00–20:00).',
  },
  {
    test: (t) => /возврат|вернуть|обмен|перенос|отмен/.test(t),
    text: 'Возврат зависит от организатора и правил мероприятия. Чем раньше заявление, тем выше шанс вернуть больше.\n\nНапишите номер заказа, мероприятие и причину — передадим в поддержку. Подробности: /returns. Почта: info@biletvsem.ru.',
  },
  {
    test: (t) => /оплат|списал|деньг|не прошл|чек|карт/.test(t),
    text: 'Если оплата прошла, билет уходит на почту из заказа. Если деньги списались, а письма нет — пришлите номер заказа или почту и примерное время оплаты.\n\nЕсли банк отклонил платёж, заказ не оформлен: оплату можно повторить на странице события.',
  },
  {
    test: (t) => /мест|схем|зал|ряд|сектор|выбрать/.test(t),
    text: 'Места выбираются на схеме зала на странице события: цвет точки — цена. Серое или некликабельное место уже занято.\n\nНапишите название мероприятия и дату — подскажем, что сейчас доступно.',
  },
  {
    test: (t) => /именн|переоформ|фио|паспорт/.test(t),
    text: 'Смена ФИО на именном билете возможна только если это разрешает организатор. Напишите номер заказа и новые данные — уточним и передадим.',
  },
];

const OPERATOR_HANDOFF = 'Сообщение видит оператор «Билет Всем». Чтобы проверить заказ быстрее, напишите номер заказа и почту или телефон из оформления.\n\nСрочно: +7 (995) 657-42-92, info@biletvsem.ru (ежедневно 10:00–20:00). Частые вопросы: /faq, возврат: /returns.';

function ticketReply(userMessage) {
  const text = String(userMessage || '').toLowerCase();
  return TICKET_REPLIES.find((item) => item.test(text))?.text || null;
}

// Публичный эндпоинт для отправки сообщений от клиента (без авторизации)
router.post('/public/send', async (req, res) => {
  try {
    const { sessionId, chatId, message, clientName, clientEmail, clientPhone, pageUrl, pageTitle } = req.body;
    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'Empty message' });
    }

    let chat = null;

    // Приоритет 1: Ищем чат по sessionId (уникален для каждой вкладки браузера)
    if (sessionId) {
      const sessionChatResult = await pool.query('SELECT * FROM chats WHERE session_id = $1 ORDER BY created_at DESC LIMIT 1', [sessionId]);
      if (sessionChatResult.rows.length > 0) {
        chat = sessionChatResult.rows[0];
      }
    }

    // Приоритет 2: Если sessionId не помог, пробуем chatId
    if (!chat && chatId) {
      const chatResult = await pool.query('SELECT * FROM chats WHERE id = $1', [chatId]);
      if (chatResult.rows.length > 0) {
        chat = chatResult.rows[0];
        // Обновляем session_id у найденного чата
        if (sessionId && !chat.session_id) {
          await pool.query('UPDATE chats SET session_id = $1 WHERE id = $2', [sessionId, chat.id]);
          chat.session_id = sessionId;
        }
      }
    }

    if (!chat) {
      const chatResult = await pool.query(
        `INSERT INTO chats (client_name, client_email, client_phone, source, status, session_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [clientName || null, clientEmail || null, clientPhone || null, 'website', 'active', sessionId || null]
      );
      chat = chatResult.rows[0];
    } else if (clientName || clientEmail || clientPhone) {
      const updated = await pool.query(
        `UPDATE chats SET
           client_name = COALESCE(NULLIF($2, ''), client_name),
           client_email = COALESCE(NULLIF($3, ''), client_email),
           client_phone = COALESCE(NULLIF($4, ''), client_phone),
           updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [chat.id, clientName || null, clientEmail || null, clientPhone || null]
      );
      chat = updated.rows[0] || chat;
    }

    const meta = {};
    if (pageUrl) meta.pageUrl = String(pageUrl).slice(0, 500);
    if (pageTitle) meta.pageTitle = String(pageTitle).slice(0, 200);

    const messageResult = await pool.query(
      `INSERT INTO chat_messages (chat_id, sender_type, message_text, message_type, metadata)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       RETURNING *`,
      [chat.id, 'client', String(message).trim(), 'text', Object.keys(meta).length ? JSON.stringify(meta) : null]
    );

    await pool.query(
      `UPDATE chats SET last_message_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [chat.id]
    );

    // Создаем уведомление для админов о новом сообщении
    try {
      const { createNotification } = await import('./notifications.js');
      const clientName = chat.client_name || 'Гость';
      const text = String(message);
      const messagePreview = text.length > 50 ? text.substring(0, 50) + '...' : text;
      
      console.log('[chat] Создаем уведомление для чата:', chat.id, 'от', clientName);
      
      const notification = await createNotification({
        userId: 0, // для всех пользователей
        type: 'new_chat_message',
        title: `Новое сообщение от ${clientName}`,
        message: messagePreview,
        linkUrl: `/admin/chat/${chat.id}`,
        relatedEntityType: 'chat',
        relatedEntityId: chat.id
      });
      
      console.log('[chat] ✅ Уведомление создано:', notification?.id);
    } catch (notifyErr) {
      console.error('[chat] ❌ Ошибка создания уведомления:', notifyErr.message, notifyErr.stack);
    }

    // Обрабатываем сообщение чат-ботом
    const botResponse = await processBotMessage(chat.id, message);

    res.json({
      success: true,
      chatId: chat.id,
      message: messageResult.rows[0],
      botResponse: botResponse || null
    });
  } catch (error) {
    console.error('[chat] Error sending message:', error);
    res.status(500).json({ error: error.message });
  }
});

async function insertBotMessage(chatId, botMessage) {
  const botMessageResult = await pool.query(
    `INSERT INTO chat_messages (chat_id, sender_type, message_text, message_type, is_bot_message)
     VALUES ($1, 'bot', $2, 'text', TRUE)
     RETURNING *`,
    [chatId, botMessage]
  );
  await pool.query(
    `UPDATE chats SET last_message_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [chatId]
  );
  return botMessageResult.rows[0];
}

async function processBotMessage(chatId, userMessage) {
  try {
    const answer = ticketReply(userMessage);
    if (answer) return await insertBotMessage(chatId, answer);

    const lastBot = await pool.query(
      `SELECT message_text FROM chat_messages
       WHERE chat_id = $1 AND sender_type = 'bot'
       ORDER BY created_at DESC LIMIT 1`,
      [chatId]
    );
    if (String(lastBot.rows[0]?.message_text || '').includes('оператор «Билет Всем»')) {
      return null;
    }
    return await insertBotMessage(chatId, OPERATOR_HANDOFF);
  } catch (error) {
    console.error('[chat] Error processing bot message:', error);
    return null;
  }
}

// Получить историю чата (публичный, для клиента)
router.get('/public/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    const messagesResult = await pool.query(
      `SELECT * FROM chat_messages
       WHERE chat_id = $1
       ORDER BY created_at ASC`,
      [chatId]
    );

    const chatResult = await pool.query('SELECT * FROM chats WHERE id = $1', [chatId]);
    if (chatResult.rows.length === 0) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const chat = chatResult.rows[0];
    const orders = await findOrdersForContact(chat.client_email, chat.client_phone);
    const pageRow = [...messagesResult.rows].reverse().find((row) => {
      const meta = row.metadata;
      return row.sender_type === 'client' && meta && (meta.pageUrl || meta.pageTitle);
    });
    if (pageRow?.metadata) {
      chat.page_url = pageRow.metadata.pageUrl || null;
      chat.page_title = pageRow.metadata.pageTitle || null;
    }

    res.json({
      chat,
      messages: messagesResult.rows,
      orders,
    });
  } catch (error) {
    console.error('[chat] Error fetching chat:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получить или создать чат для клиента (публичный)
router.post('/public/get-or-create', async (req, res) => {
  try {
    const { sessionId, clientEmail, clientPhone, clientName } = req.body;

    // Приоритет 1: Ищем по sessionId
    let chat = null;
    if (sessionId) {
      const sessionResult = await pool.query(
        'SELECT * FROM chats WHERE session_id = $1 ORDER BY created_at DESC LIMIT 1',
        [sessionId]
      );
      if (sessionResult.rows.length > 0) {
        chat = sessionResult.rows[0];
      }
    }

    // Приоритет 2: Ищем по email
    if (!chat && clientEmail) {
      const emailResult = await pool.query(
        'SELECT * FROM chats WHERE client_email = $1 AND status = $2 ORDER BY created_at DESC LIMIT 1',
        [clientEmail, 'active']
      );
      if (emailResult.rows.length > 0) {
        chat = emailResult.rows[0];
        // Обновляем session_id
        if (sessionId && !chat.session_id) {
          await pool.query('UPDATE chats SET session_id = $1 WHERE id = $2', [sessionId, chat.id]);
          chat.session_id = sessionId;
        }
      }
    }

    // Приоритет 3: Ищем по телефону
    if (!chat && clientPhone) {
      const phoneResult = await pool.query(
        'SELECT * FROM chats WHERE client_phone = $1 AND status = $2 ORDER BY created_at DESC LIMIT 1',
        [clientPhone, 'active']
      );
      if (phoneResult.rows.length > 0) {
        chat = phoneResult.rows[0];
        // Обновляем session_id
        if (sessionId && !chat.session_id) {
          await pool.query('UPDATE chats SET session_id = $1 WHERE id = $2', [sessionId, chat.id]);
          chat.session_id = sessionId;
        }
      }
    }

    if (!chat) {
      const chatResult = await pool.query(
        `INSERT INTO chats (client_name, client_email, client_phone, source, status, session_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [clientName || null, clientEmail || null, clientPhone || null, 'website', 'active', sessionId || null]
      );
      chat = chatResult.rows[0];
    }

    res.json({ chat });
  } catch (error) {
    console.error('[chat] Error getting or creating chat:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== АДМИНСКИЕ ЭНДПОИНТЫ (требуют авторизации) ==========

// Загрузить файл для чата (админ) - ДОЛЖЕН БЫТЬ ПЕРЕД ВСЕМИ МАРШРУТАМИ С :chatId
// Используем более специфичный путь, чтобы избежать конфликтов
router.post('/:chatId/upload', requireAuth, requireAdminOrSalesManager, upload.single('file'), async (req, res) => {
  try {
    const { chatId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const chatCheck = await pool.query('SELECT id FROM chats WHERE id = $1', [chatId]);
    if (chatCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const fileUrl = `/uploads/chat-files/${file.filename}`;
    const fileSize = file.size;

    res.json({
      url: fileUrl,
      filename: file.originalname,
      size: fileSize,
      type: file.mimetype
    });
  } catch (error) {
    console.error('[chat] Error uploading file:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получить список чатов (для админа/менеджера)
router.get('/', requireAuth, requireAdminOrSalesManager, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      status = '',
      search = '',
      assignedTo = '',
      includeEmpty = ''
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`c.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (assignedTo) {
      conditions.push(`c.assigned_to = $${paramIndex}`);
      params.push(parseInt(assignedTo));
      paramIndex++;
    }

    if (search) {
      conditions.push(`(
        c.client_name ILIKE $${paramIndex} OR
        c.client_email ILIKE $${paramIndex} OR
        c.client_phone ILIKE $${paramIndex} OR
        EXISTS (
          SELECT 1 FROM chat_messages sm
          WHERE sm.chat_id = c.id AND sm.message_text ILIKE $${paramIndex}
        )
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (includeEmpty !== '1' && includeEmpty !== 'true') {
      conditions.push(`EXISTS (SELECT 1 FROM chat_messages mx WHERE mx.chat_id = c.id AND mx.sender_type = 'client')`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Получаем общее количество
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM chats c ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Получаем чаты с информацией о последнем сообщении и количестве непрочитанных
    const result = await pool.query(
      `SELECT 
        c.*,
        (SELECT COUNT(*)::int FROM chat_messages cm WHERE cm.chat_id = c.id AND cm.sender_type = 'client' AND cm.is_read = FALSE) as unread_count,
        (SELECT COUNT(*)::int FROM chat_messages cm WHERE cm.chat_id = c.id AND cm.sender_type = 'client') as message_count,
        (SELECT message_text FROM chat_messages cm WHERE cm.chat_id = c.id ORDER BY cm.created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM chat_messages cm WHERE cm.chat_id = c.id ORDER BY cm.created_at DESC LIMIT 1) as last_message_time,
        (SELECT cm.metadata->>'pageUrl' FROM chat_messages cm WHERE cm.chat_id = c.id AND cm.sender_type = 'client' AND cm.metadata ? 'pageUrl' ORDER BY cm.created_at DESC LIMIT 1) as page_url,
        (SELECT cm.metadata->>'pageTitle' FROM chat_messages cm WHERE cm.chat_id = c.id AND cm.sender_type = 'client' AND cm.metadata ? 'pageTitle' ORDER BY cm.created_at DESC LIMIT 1) as page_title,
        (
          SELECT COUNT(*)::int FROM orders o
          WHERE (
            (c.client_email IS NOT NULL AND o.customer_email IS NOT NULL AND lower(o.customer_email) = lower(c.client_email))
            OR (
              c.client_phone IS NOT NULL
              AND length(regexp_replace(COALESCE(c.client_phone, ''), '\\D', '', 'g')) >= 10
              AND length(regexp_replace(COALESCE(o.customer_phone, ''), '\\D', '', 'g')) >= 10
              AND right(regexp_replace(o.customer_phone, '\\D', '', 'g'), 10) = right(regexp_replace(c.client_phone, '\\D', '', 'g'), 10)
            )
          )
        ) as orders_count,
        COALESCE(u.name, u.email) as assigned_to_name,
        COALESCE(cl.total_orders, 0) as total_orders,
        COALESCE(cl.total_revenue_cents, 0) as total_revenue_cents
      FROM chats c
      LEFT JOIN users u ON c.assigned_to = u.id
      LEFT JOIN clients cl ON c.client_id = cl.id
      ${whereClause}
      ORDER BY COALESCE(c.last_message_at, c.created_at) DESC, c.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      chats: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('[chat] Error fetching chats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получить чат с сообщениями (для админа/менеджера)
router.get('/:chatId', requireAuth, requireAdminOrSalesManager, async (req, res) => {
  try {
    const { chatId } = req.params;
    const chatWhere = 'c.id = $1';
    const chatParams = [chatId];
    const chatResult = await pool.query(
      `SELECT 
        c.*,
        COALESCE(u.name, u.email) as assigned_to_name,
        COALESCE(cl.total_orders, 0) as total_orders,
        COALESCE(cl.total_revenue_cents, 0) as total_revenue_cents
      FROM chats c
      LEFT JOIN users u ON c.assigned_to = u.id
      LEFT JOIN clients cl ON c.client_id = cl.id
      WHERE ${chatWhere}`,
      chatParams
    );

    if (chatResult.rows.length === 0) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const messagesResult = await pool.query(
      `SELECT 
        cm.*,
        COALESCE(u.name, u.email) as sender_name
      FROM chat_messages cm
      LEFT JOIN users u ON cm.sender_id = u.id
      WHERE cm.chat_id = $1
      ORDER BY cm.created_at ASC`,
      [chatId]
    );

    // Помечаем сообщения как прочитанные
    await pool.query(
      `UPDATE chat_messages SET is_read = TRUE WHERE chat_id = $1 AND sender_type = 'client' AND is_read = FALSE`,
      [chatId]
    );

    res.json({
      chat: chatResult.rows[0],
      messages: messagesResult.rows
    });
  } catch (error) {
    console.error('[chat] Error fetching chat:', error);
    res.status(500).json({ error: error.message });
  }
});

// Отправить сообщение от админа/менеджера
router.post('/:chatId/messages', requireAuth, requireAdminOrSalesManager, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { message, messageType = 'text', fileUrl, fileName, fileSize } = req.body;
    const userId = req.user.id;

    const chatCheck = await pool.query('SELECT id FROM chats WHERE id = $1', [chatId]);
    if (chatCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const result = await pool.query(
      `INSERT INTO chat_messages (chat_id, sender_type, sender_id, message_text, message_type, file_url, file_name, file_size)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [chatId, 'admin', userId, message || null, messageType, fileUrl || null, fileName || null, fileSize || null]
    );

    // Обновляем last_message_at в чате
    await pool.query(
      `UPDATE chats SET last_message_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [chatId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[chat] Error sending admin message:', error);
    res.status(500).json({ error: error.message });
  }
});

// Назначить чат админу/менеджеру
router.put('/:chatId/assign', requireAuth, requireAdminOrSalesManager, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { userId } = req.body;
    const currentUserId = req.user.id;

    // Если userId не указан, назначаем на текущего пользователя
    const assignTo = userId || currentUserId;

    const result = await pool.query(
      `UPDATE chats SET assigned_to = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [assignTo, chatId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[chat] Error assigning chat:', error);
    res.status(500).json({ error: error.message });
  }
});

// Изменить статус чата
router.put('/:chatId/status', requireAuth, requireAdminOrSalesManager, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { status } = req.body;

    const validStatuses = ['active', 'closed', 'archived'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await pool.query(
      `UPDATE chats SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, chatId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[chat] Error updating chat status:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

