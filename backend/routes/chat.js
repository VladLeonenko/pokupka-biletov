import express from 'express';
import multer from 'multer';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pool from '../db.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { createAiTeamIncident } from './aiTeam.js';

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

function detectAggressiveMessage(messageText) {
  if (!messageText || typeof messageText !== 'string') return null;
  const text = messageText.toLowerCase();

  const patternsHigh = [
    'ненавижу',
    'сука',
    'убью',
    'урод',
    'мразь',
    'идиот',
    'дебил',
    'придурок',
    'вы издеваетесь',
  ];

  const patternsMedium = [
    'что за хрень',
    'вы что творите',
    'ужасный сервис',
    'вы меня достали',
    'совершенно неприемлемо',
    'подам в суд',
    'вы мошенники',
    'обман',
  ];

  const matchedHigh = patternsHigh.some((p) => text.includes(p));
  const matchedMedium = patternsMedium.some((p) => text.includes(p));

  if (matchedHigh) {
    return {
      severity: 'high',
      description: `Автообнаружение агрессивного сообщения: "${messageText.slice(0, 200)}"`,
    };
  }
  if (matchedMedium) {
    return {
      severity: 'medium',
      description: `Автообнаружение потенциально агрессивного сообщения: "${messageText.slice(0, 200)}"`,
    };
  }
  return null;
}

// Публичный эндпоинт для отправки сообщений от клиента (без авторизации)
router.post('/public/send', async (req, res) => {
  try {
    const { sessionId, chatId, message, clientName, clientEmail, clientPhone } = req.body;

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

    // Если чат не найден, создаем новый
    if (!chat) {
      // Ищем или создаем клиента
      let clientId = null;
      
      // Ищем существующего клиента по email или phone
      if (clientEmail) {
        const emailCheck = await pool.query('SELECT id FROM clients WHERE email = $1 LIMIT 1', [clientEmail]);
        if (emailCheck.rows.length > 0) {
          clientId = emailCheck.rows[0].id;
        }
      }
      if (!clientId && clientPhone) {
        const phoneCheck = await pool.query('SELECT id FROM clients WHERE phone = $1 LIMIT 1', [clientPhone]);
        if (phoneCheck.rows.length > 0) {
          clientId = phoneCheck.rows[0].id;
        }
      }
      
      // Создаем нового клиента (всегда, если не нашли существующего)
      if (!clientId) {
        const newClientResult = await pool.query(
          `INSERT INTO clients (name, email, phone, source, status)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [
            clientName || 'Гость из чата',
            clientEmail || null,
            clientPhone || null,
            'chatbot',
            'lead'
          ]
        );
        clientId = newClientResult.rows[0].id;
        
        // Автоматически создаем сделку в воронке продаж
        try {
          const { createDealForClient } = await import('../utils/funnelHelper.js');
          await createDealForClient(
            clientId,
            clientName || 'Гость из чата',
            clientEmail,
            clientPhone,
            'chatbot'
          );
        } catch (dealErr) {
          console.warn('[chat] Error creating deal for client:', dealErr);
        }
      }

      const chatResult = await pool.query(
        `INSERT INTO chats (client_id, client_name, client_email, client_phone, source, status, session_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [clientId, clientName || null, clientEmail || null, clientPhone || null, 'website', 'active', sessionId || null]
      );
      chat = chatResult.rows[0];
    }

    // Сохраняем сообщение клиента
    const messageResult = await pool.query(
      `INSERT INTO chat_messages (chat_id, sender_type, message_text, message_type)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [chat.id, 'client', message, 'text']
    );

    // Обновляем last_message_at в чате
    await pool.query(
      `UPDATE chats SET last_message_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [chat.id]
    );

    // Автоматическая фиксация агрессивных сообщений клиента
    try {
      const aggressive = detectAggressiveMessage(message);
      if (aggressive && chat.client_id) {
        await createAiTeamIncident({
          clientId: chat.client_id,
          type: 'AGGRESSIVE',
          severity: aggressive.severity,
          description: aggressive.description,
        });
      }
    } catch (e) {
      console.error('[chat] Failed to create AGGRESSIVE incident:', e);
    }

    // Создаем уведомление для админов о новом сообщении
    try {
      const { createNotification } = await import('./notifications.js');
      const clientName = chat.client_name || 'Гость';
      const messagePreview = message.length > 50 ? message.substring(0, 50) + '...' : message;
      
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

// Функция обработки сообщения чат-ботом
async function processBotMessage(chatId, userMessage) {
  try {
    const messageLower = userMessage.toLowerCase().trim();

    // Получаем активные правила чат-бота, отсортированные по приоритету
    const rulesResult = await pool.query(
      `SELECT * FROM chatbot_rules
       WHERE is_active = TRUE
       ORDER BY priority DESC, id ASC`
    );

    // Ищем подходящее правило
    for (const rule of rulesResult.rows) {
      const keywords = rule.keywords || [];
      const matched = keywords.some(keyword => 
        messageLower.includes(keyword.toLowerCase())
      );

      if (matched) {
        // Логируем срабатывание правила
        await pool.query(
          `INSERT INTO chatbot_logs (chat_id, rule_id, user_message, matched_keywords, response_type)
           VALUES ($1, $2, $3, $4, $5)`,
          [chatId, rule.id, userMessage, keywords, rule.response_type]
        );

        // Отправляем ответ в зависимости от типа
        let botMessage = null;
        let fileUrl = null;
        let fileName = null;

        if (rule.response_type === 'text') {
          botMessage = rule.response_text;
        } else if (rule.response_type === 'file' && rule.file_url) {
          botMessage = rule.response_text || 'Вот запрошенный файл:';
          fileUrl = rule.file_url;
          fileName = rule.file_name;
        } else if (rule.response_type === 'proposal' && rule.proposal_template_id) {
          // Получаем шаблон коммерческого предложения
          const templateResult = await pool.query(
            'SELECT * FROM proposal_templates WHERE id = $1 AND is_active = TRUE',
            [rule.proposal_template_id]
          );
          if (templateResult.rows.length > 0) {
            const template = templateResult.rows[0];
            botMessage = template.title;
            if (template.file_url) {
              fileUrl = template.file_url;
              fileName = template.name + '.pdf';
            } else {
              botMessage = template.content;
            }
          }
        } else if (rule.response_type === 'redirect' && rule.redirect_url) {
          botMessage = rule.response_text || 'Перейдите по ссылке: ' + rule.redirect_url;
        }

        if (botMessage) {
          const messageType = fileUrl ? 'file' : (rule.response_type === 'proposal' ? 'proposal' : 'text');
          const metadata = fileUrl ? { fileUrl, fileName, templateId: rule.proposal_template_id } : null;

          const botMessageResult = await pool.query(
            `INSERT INTO chat_messages (chat_id, sender_type, message_text, message_type, file_url, file_name, is_bot_message, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [chatId, 'bot', botMessage, messageType, fileUrl, fileName, true, metadata ? JSON.stringify(metadata) : null]
          );

          // Обновляем last_message_at в чате
          await pool.query(
            `UPDATE chats SET last_message_at = NOW(), updated_at = NOW() WHERE id = $1`,
            [chatId]
          );

          await pool.query(
            `UPDATE chatbot_logs SET bot_response = $1 WHERE chat_id = $2 AND rule_id = $3 AND created_at = (SELECT MAX(created_at) FROM chatbot_logs WHERE chat_id = $2)`,
            [botMessage, chatId, rule.id]
          );

          return botMessageResult.rows[0];
        }
      }
    }

    // Проверяем, есть ли контактные данные у клиента
    const chatInfo = await pool.query('SELECT client_name, client_email, client_phone FROM chats WHERE id = $1', [chatId]);
    const hasContactInfo = chatInfo.rows.length > 0 && 
      (chatInfo.rows[0].client_email || chatInfo.rows[0].client_phone);

    // Если не найдено подходящего правила, отправляем умный дефолтный ответ
    let defaultResponse = 'Спасибо за ваше сообщение! ';
    
    if (!hasContactInfo) {
      // Если нет контактных данных, запрашиваем их
      defaultResponse += 'Для того чтобы мы могли связаться с вами и отправить коммерческое предложение, пожалуйста, укажите:\n\n';
      defaultResponse += '📧 Email или 📱 Телефон\n\n';
      defaultResponse += 'Также укажите, как вам удобнее получить КП:\n';
      defaultResponse += '• Email\n';
      defaultResponse += '• Telegram\n';
      defaultResponse += '• WhatsApp\n';
      defaultResponse += '• Звонок менеджера\n\n';
      defaultResponse += 'После получения ваших данных мы подготовим персональное коммерческое предложение!';
    } else {
      // Если есть контакты, спрашиваем способ связи для КП
      defaultResponse += 'Наш менеджер свяжется с вами в ближайшее время.\n\n';
      defaultResponse += 'Как вам удобнее получить коммерческое предложение?\n';
      defaultResponse += '• Email\n';
      defaultResponse += '• Telegram\n';
      defaultResponse += '• WhatsApp\n';
      defaultResponse += '• Звонок менеджера';
    }
    
    const defaultMessageResult = await pool.query(
      `INSERT INTO chat_messages (chat_id, sender_type, message_text, message_type, is_bot_message)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [chatId, 'bot', defaultResponse, 'text', true]
    );

    // Обновляем last_message_at в чате
    await pool.query(
      `UPDATE chats SET last_message_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [chatId]
    );

    return defaultMessageResult.rows[0];
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

    res.json({
      chat: chatResult.rows[0],
      messages: messagesResult.rows
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

    // Если чат не найден, создаем новый
    if (!chat) {
      let clientId = null;
      if (clientEmail || clientPhone) {
        if (clientEmail) {
          const emailCheck = await pool.query('SELECT id FROM clients WHERE email = $1 LIMIT 1', [clientEmail]);
          if (emailCheck.rows.length > 0) {
            clientId = emailCheck.rows[0].id;
          }
        }
        if (!clientId && clientPhone) {
          const phoneCheck = await pool.query('SELECT id FROM clients WHERE phone = $1 LIMIT 1', [clientPhone]);
          if (phoneCheck.rows.length > 0) {
            clientId = phoneCheck.rows[0].id;
          }
        }
        if (!clientId && (clientName || clientEmail || clientPhone)) {
          const newClientResult = await pool.query(
            `INSERT INTO clients (name, email, phone, source, status)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [
              clientName || 'Гость из чата',
              clientEmail || null,
              clientPhone || null,
              'chatbot',
              'lead'
            ]
          );
          clientId = newClientResult.rows[0].id;
          
          // Автоматически создаем сделку в воронке продаж
          try {
            const { createDealForClient } = await import('../utils/funnelHelper.js');
            await createDealForClient(
              clientId,
              clientName || 'Гость из чата',
              clientEmail,
              clientPhone,
              'chatbot'
            );
          } catch (dealErr) {
            console.warn('[chat] Error creating deal for client:', dealErr);
          }
        }
      }

      const chatResult = await pool.query(
        `INSERT INTO chats (client_id, client_name, client_email, client_phone, source, status, session_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [clientId, clientName || null, clientEmail || null, clientPhone || null, 'website', 'active', sessionId || null]
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
router.post('/:chatId/upload', requireAuth, upload.single('file'), async (req, res) => {
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

// Получить список чатов (для админа)
router.get('/', requireAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      status = '',
      search = '',
      assignedTo = ''
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
        c.client_phone ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
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
        (SELECT COUNT(*) FROM chat_messages cm WHERE cm.chat_id = c.id AND cm.sender_type = 'client' AND cm.is_read = FALSE) as unread_count,
        (SELECT message_text FROM chat_messages cm WHERE cm.chat_id = c.id ORDER BY cm.created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM chat_messages cm WHERE cm.chat_id = c.id ORDER BY cm.created_at DESC LIMIT 1) as last_message_time,
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

// Получить чат с сообщениями (для админа)
router.get('/:chatId', requireAuth, async (req, res) => {
  try {
    const { chatId } = req.params;
    
    const chatResult = await pool.query(
      `SELECT 
        c.*,
        COALESCE(u.name, u.email) as assigned_to_name,
        COALESCE(cl.total_orders, 0) as total_orders,
        COALESCE(cl.total_revenue_cents, 0) as total_revenue_cents
      FROM chats c
      LEFT JOIN users u ON c.assigned_to = u.id
      LEFT JOIN clients cl ON c.client_id = cl.id
      WHERE c.id = $1`,
      [chatId]
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

// Отправить сообщение от админа
router.post('/:chatId/messages', requireAuth, async (req, res) => {
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

// Назначить чат админу
router.put('/:chatId/assign', requireAuth, async (req, res) => {
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
router.put('/:chatId/status', requireAuth, async (req, res) => {
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

