import express from 'express';
import pool from '../db.js';

const router = express.Router();

/**
 * POST /api/errors - Логирование ошибок с фронтенда
 * Публичный эндпоинт для отправки ошибок из браузера
 */
router.post('/', async (req, res) => {
  try {
    const { message, stack, url, userAgent, timestamp, userId, errorType } = req.body;

    // Логируем ошибку в консоль
    console.error('[Frontend Error]', {
      message,
      url,
      errorType,
      userId,
      timestamp: timestamp || new Date().toISOString(),
    });

    // Опционально: сохраняем в БД если таблица существует
    try {
      // Проверяем существование таблицы errors
      const tableExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'errors'
        );
      `);

      if (tableExists.rows[0].exists) {
        await pool.query(
          `INSERT INTO errors (message, stack, url, user_agent, timestamp, user_id, error_type)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            message || 'Unknown error',
            stack || null,
            url || null,
            userAgent || req.headers['user-agent'] || null,
            timestamp ? new Date(timestamp) : new Date(),
            userId || null,
            errorType || 'javascript',
          ]
        );
      }
    } catch (dbError) {
      // Игнорируем ошибки БД, просто логируем в консоль
      console.warn('[Errors] Failed to save to database:', dbError.message);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[Errors] Error processing error report:', error);
    res.status(200).json({ success: true }); // Всегда возвращаем успех, чтобы не ломать фронтенд
  }
});

export default router;
