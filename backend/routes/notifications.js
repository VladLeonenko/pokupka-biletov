import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/notifications - Get user notifications
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id || 0; // 0 = for all users
    const { unreadOnly } = req.query;
    
    console.log('[notifications] Запрос уведомлений:', { userId, unreadOnly });
    
    // Проверяем существование таблицы
    try {
      await pool.query('SELECT 1 FROM notifications LIMIT 1');
    } catch (tableErr) {
      // Если таблица не существует, создаем её
      if (tableErr.code === '42P01') {
        console.warn('[notifications] Таблица notifications не найдена, создаем...');
        await pool.query(`
          CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            type VARCHAR(50) NOT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT,
            link_url VARCHAR(500),
            related_entity_type VARCHAR(50),
            related_entity_id INTEGER,
            is_read BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            read_at TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
          CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
          CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
        `);
      } else {
        throw tableErr;
      }
    }
    
    let query = 'SELECT * FROM notifications WHERE user_id = $1 OR user_id = 0';
    const params = [userId];
    
    if (unreadOnly === 'true') {
      query += ' AND is_read = false';
    }
    
    query += ' ORDER BY created_at DESC LIMIT 50';
    
    const result = await pool.query(query, params);
    console.log('[notifications] Найдено уведомлений:', result.rows.length);
    
    const notifications = result.rows.map(n => ({
      id: n.id,
      userId: n.user_id,
      type: n.type,
      title: n.title,
      message: n.message,
      linkUrl: n.link_url,
      relatedEntityType: n.related_entity_type,
      relatedEntityId: n.related_entity_id,
      isRead: n.is_read,
      createdAt: n.created_at,
      readAt: n.read_at,
    }));
    
    res.json(notifications);
  } catch (err) {
    console.error('[notifications] Error fetching notifications:', err.message, err.stack);
    
    // Если это ошибка таблицы, пробуем создать её снова
    if (err.code === '42P01' || err.message?.includes('does not exist')) {
      try {
        console.warn('[notifications] Повторная попытка создания таблицы...');
        await pool.query(`
          CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            type VARCHAR(50) NOT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT,
            link_url VARCHAR(500),
            related_entity_type VARCHAR(50),
            related_entity_id INTEGER,
            is_read BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            read_at TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
          CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
          CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
        `);
        // Возвращаем пустой массив после создания таблицы
        return res.json([]);
      } catch (createErr) {
        console.error('[notifications] Ошибка создания таблицы:', createErr.message);
        // Возвращаем пустой массив при ошибке создания таблицы
        return res.json([]);
      }
    }
    
    // Если это ошибка пула БД, возвращаем пустой массив
    if (err.message?.includes('pool') || err.message?.includes('connection')) {
      console.warn('[notifications] Проблема с подключением к БД, возвращаем пустой массив');
      return res.json([]);
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch notifications',
      details: err.message,
      code: err.code
    });
  }
});

// PUT /api/notifications/:id/read - Mark notification as read
router.put('/:id/read', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      'UPDATE notifications SET is_read = true, read_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// PUT /api/notifications/read-all - Mark all user notifications as read
router.put('/read-all', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id || 0;
    await pool.query(
      'UPDATE notifications SET is_read = true, read_at = CURRENT_TIMESTAMP WHERE (user_id = $1 OR user_id = 0) AND is_read = false',
      [userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// Helper function to create notification (can be imported by other routes)
export async function createNotification(data) {
  const {
    userId = 0, // 0 = for all users
    type,
    title,
    message,
    linkUrl,
    relatedEntityType,
    relatedEntityId
  } = data;

  try {
    // Проверяем существование таблицы
    await pool.query('SELECT 1 FROM notifications LIMIT 1');
  } catch (tableErr) {
    if (tableErr.code === '42P01') {
      console.warn('[notifications] Таблица notifications не найдена, создаем...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          type VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT,
          link_url VARCHAR(500),
          related_entity_type VARCHAR(50),
          related_entity_id INTEGER,
          is_read BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          read_at TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
        CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
      `);
    } else {
      throw tableErr;
    }
  }

  console.log('[notifications] Создаем уведомление:', { userId, type, title });
  
  const result = await pool.query(
    `INSERT INTO notifications (user_id, type, title, message, link_url, related_entity_type, related_entity_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [userId, type, title, message || null, linkUrl || null, relatedEntityType || null, relatedEntityId || null]
  );

  console.log('[notifications] ✅ Уведомление создано с ID:', result.rows[0]?.id);
  return result.rows[0];
}

export default router;

