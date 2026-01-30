import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Генерация session_id для неавторизованных пользователей
function getSessionId(req) {
  // Используем заголовок x-session-id или создаем новый
  let sessionId = req.headers['x-session-id'];
  
  if (!sessionId) {
    // Генерируем новый session_id
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  return sessionId;
}

// Получение IP-адреса
function getClientIp(req) {
  return req.ip || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
         'unknown';
}

// POST /api/consents - Сохранение согласия
router.post('/', async (req, res) => {
  try {
    const { type, category, necessary, functional, analytical, marketing, accepted = true } = req.body;
    const userId = req.user?.id || null;
    const sessionId = userId ? null : getSessionId(req);
    const ipAddress = getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'unknown';

    if (!type) {
      return res.status(400).json({ error: 'Type is required' });
    }

    if (!['cookies', 'privacy', 'marketing', 'analytics'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type' });
    }

    // Проверяем, есть ли уже согласие этого типа
    const existingQuery = userId
      ? 'SELECT * FROM user_consents WHERE user_id = $1 AND type = $2'
      : 'SELECT * FROM user_consents WHERE session_id = $1 AND type = $2';
    const existingParams = userId ? [userId, type] : [sessionId, type];
    
    const existing = await pool.query(existingQuery, existingParams);

    let result;
    if (existing.rows.length > 0) {
      // Обновляем существующее согласие
      const updateQuery = `
        UPDATE user_consents 
        SET 
          category = COALESCE($1, category),
          necessary = COALESCE($2, necessary),
          functional = COALESCE($3, functional),
          analytical = COALESCE($4, analytical),
          marketing = COALESCE($5, marketing),
          accepted = $6,
          ip_address = $7,
          user_agent = $8,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $9
        RETURNING *
      `;
      result = await pool.query(updateQuery, [
        category || null,
        necessary !== undefined ? necessary : null,
        functional !== undefined ? functional : null,
        analytical !== undefined ? analytical : null,
        marketing !== undefined ? marketing : null,
        accepted,
        ipAddress,
        userAgent,
        existing.rows[0].id,
      ]);
    } else {
      // Создаем новое согласие
      const insertQuery = `
        INSERT INTO user_consents (
          user_id, session_id, type, category,
          necessary, functional, analytical, marketing,
          accepted, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      result = await pool.query(insertQuery, [
        userId,
        sessionId,
        type,
        category || null,
        necessary !== undefined ? necessary : false,
        functional !== undefined ? functional : false,
        analytical !== undefined ? analytical : false,
        marketing !== undefined ? marketing : false,
        accepted,
        ipAddress,
        userAgent,
      ]);
    }

    res.json({
      id: result.rows[0].id,
      user_id: result.rows[0].user_id,
      session_id: result.rows[0].session_id,
      type: result.rows[0].type,
      category: result.rows[0].category,
      necessary: result.rows[0].necessary,
      functional: result.rows[0].functional,
      analytical: result.rows[0].analytical,
      marketing: result.rows[0].marketing,
      accepted: result.rows[0].accepted,
      created_at: result.rows[0].created_at,
      updated_at: result.rows[0].updated_at,
    });
  } catch (error) {
    console.error('Error saving consent:', error);
    res.status(500).json({ error: 'Failed to save consent' });
  }
});

// GET /api/consents - Получение всех согласий пользователя
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    const sessionId = getSessionId(req);

    // Получаем согласия для авторизованного пользователя или по session_id
    const query = userId
      ? 'SELECT * FROM user_consents WHERE user_id = $1 ORDER BY created_at DESC'
      : 'SELECT * FROM user_consents WHERE session_id = $1 ORDER BY created_at DESC';
    const params = userId ? [userId] : [sessionId];

    const result = await pool.query(query, params);

    res.json(result.rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      session_id: row.session_id,
      type: row.type,
      category: row.category,
      necessary: row.necessary,
      functional: row.functional,
      analytical: row.analytical,
      marketing: row.marketing,
      accepted: row.accepted,
      created_at: row.created_at,
      updated_at: row.updated_at,
    })));
  } catch (error) {
    console.error('Error fetching consents:', error);
    res.status(500).json({ error: 'Failed to fetch consents' });
  }
});

// PUT /api/consents/:id - Обновление согласия
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { accepted, necessary, functional, analytical, marketing } = req.body;
    const userId = req.user?.id;

    // Проверяем, что согласие принадлежит пользователю
    const checkQuery = 'SELECT * FROM user_consents WHERE id = $1 AND user_id = $2';
    const checkResult = await pool.query(checkQuery, [id, userId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Consent not found' });
    }

    const updateQuery = `
      UPDATE user_consents 
      SET 
        accepted = COALESCE($1, accepted),
        necessary = COALESCE($2, necessary),
        functional = COALESCE($3, functional),
        analytical = COALESCE($4, analytical),
        marketing = COALESCE($5, marketing),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      accepted,
      necessary,
      functional,
      analytical,
      marketing,
      id,
    ]);

    res.json({
      id: result.rows[0].id,
      user_id: result.rows[0].user_id,
      type: result.rows[0].type,
      accepted: result.rows[0].accepted,
      necessary: result.rows[0].necessary,
      functional: result.rows[0].functional,
      analytical: result.rows[0].analytical,
      marketing: result.rows[0].marketing,
      updated_at: result.rows[0].updated_at,
    });
  } catch (error) {
    console.error('Error updating consent:', error);
    res.status(500).json({ error: 'Failed to update consent' });
  }
});

// DELETE /api/consents/:id - Отзыв согласия (удаление)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Проверяем, что согласие принадлежит пользователю
    const checkQuery = 'SELECT * FROM user_consents WHERE id = $1 AND user_id = $2';
    const checkResult = await pool.query(checkQuery, [id, userId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Consent not found' });
    }

    await pool.query('DELETE FROM user_consents WHERE id = $1', [id]);

    res.json({ message: 'Consent revoked successfully' });
  } catch (error) {
    console.error('Error deleting consent:', error);
    res.status(500).json({ error: 'Failed to delete consent' });
  }
});

export default router;

