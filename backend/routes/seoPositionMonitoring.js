import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';
// Импортируем функцию напрямую (скопируем логику, так как экспорт может не работать)
import https from 'https';
import http from 'http';
import { URL } from 'url';

async function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === 'https:' ? https : http;
      
      const options = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      };

      const req = client.request(options, (res) => {
        let html = '';
        res.on('data', (chunk) => {
          html += chunk.toString();
          if (html.length > 1000000) {
            res.destroy();
            resolve(html.substring(0, 1000000));
          }
        });
        res.on('end', () => resolve(html));
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout'));
      });

      req.end();
    } catch (error) {
      reject(error);
    }
  });
}

const router = express.Router();

// Функция для расчета позиции (из seoTools.js)
function calculatePosition(keywordLower, keywordTrimmed, html, searchEngine = 'google') {
  let relevanceScore = 0;
  let frequencyScore = 0;
  let seoQualityScore = 100;
  
  const normalizedKeyword = keywordLower.trim().replace(/\s+/g, ' ');
  
  const containsKeyword = (text) => {
    if (!text) return false;
    return text.toLowerCase().trim().includes(normalizedKeyword);
  };
  
  const countOccurrences = (text) => {
    if (!text) return 0;
    const regex = new RegExp(normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = text.toLowerCase().match(regex);
    return matches ? matches.length : 0;
  };

  // Title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    const titleText = titleMatch[1];
    const titleOccurrences = countOccurrences(titleText);
    if (titleOccurrences > 0) {
      const titleLower = titleText.toLowerCase().trim();
      const startsWithKeyword = titleLower.startsWith(normalizedKeyword);
      relevanceScore += startsWithKeyword ? 150 : 120;
    }
  }

  // H1
  const h1Matches = html.match(/<h1[^>]*>([^<]+)<\/h1>/gi);
  if (h1Matches && h1Matches.length > 0) {
    h1Matches.forEach(h1 => {
      const h1Text = h1.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1];
      if (countOccurrences(h1Text) > 0) {
        relevanceScore += 100;
      }
    });
  }

  // Meta description
  const metaDescMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  if (metaDescMatch && metaDescMatch[1]) {
    if (countOccurrences(metaDescMatch[1]) > 0) {
      relevanceScore += 80;
    }
  }

  // Частота в тексте
  const textContent = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                            .replace(/<[^>]+>/g, ' ');
  
  const totalOccurrences = countOccurrences(textContent);
  frequencyScore = Math.min(totalOccurrences * 2, 100);

  const totalScore = relevanceScore + frequencyScore + seoQualityScore;
  
  let position;
  if (totalScore >= 200) {
    position = 1;
  } else if (totalScore >= 180) {
    position = Math.round(2 + (180 - totalScore) / 30 * 3);
  } else if (totalScore >= 150) {
    position = Math.round(5 + (150 - totalScore) / 50 * 15);
  } else if (totalScore >= 100) {
    position = Math.round(20 + (100 - totalScore) / 50 * 30);
  } else {
    position = Math.round(50 + (50 - totalScore) / 50 * 50);
  }
  
  position = Math.max(1, Math.min(100, position));
  return { position, totalScore };
}

// Проверка позиции для одного ключевого слова
async function checkPosition(siteUrl, keyword, searchEngine = 'google') {
  try {
    const siteHTML = await fetchHTML(siteUrl);
    const keywordLower = keyword.toLowerCase();
    const keywordTrimmed = keyword.trim();
    
    const result = calculatePosition(keywordLower, keywordTrimmed, siteHTML, searchEngine);
    
    return {
      keyword,
      position: result.position,
      score: result.totalScore,
      url: siteUrl,
      checkedAt: new Date()
    };
  } catch (error) {
    console.error(`[seoPositionMonitoring] Error checking position for ${keyword}:`, error);
    return {
      keyword,
      position: null,
      error: error.message,
      checkedAt: new Date()
    };
  }
}

// Добавить ключевое слово для мониторинга
router.post('/add', requireAuth, async (req, res) => {
  try {
    const { siteUrl, keyword, searchEngine = 'google', checkFrequency = 'daily', notifyOnChange = true, notifyOnTop10 = true, targetPosition } = req.body;

    if (!siteUrl || !keyword) {
      return res.status(400).json({ error: 'siteUrl and keyword are required' });
    }

    // Проверяем, существует ли уже такая настройка
    const existing = await pool.query(
      'SELECT id FROM seo_monitoring_settings WHERE site_url = $1 AND keyword = $2 AND search_engine = $3',
      [siteUrl, keyword, searchEngine]
    );

    if (existing.rows.length > 0) {
      // Обновляем существующую настройку
      await pool.query(
        `UPDATE seo_monitoring_settings 
         SET is_active = TRUE,
             check_frequency = $1,
             notify_on_change = $2,
             notify_on_top_10 = $3,
             target_position = $4,
             updated_at = NOW()
         WHERE id = $5`,
        [checkFrequency, notifyOnChange, notifyOnTop10, targetPosition, existing.rows[0].id]
      );
      return res.json({ success: true, message: 'Monitoring settings updated', id: existing.rows[0].id });
    }

    // Создаем новую настройку
    const result = await pool.query(
      `INSERT INTO seo_monitoring_settings 
       (site_url, keyword, search_engine, check_frequency, notify_on_change, notify_on_top_10, target_position)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [siteUrl, keyword, searchEngine, checkFrequency, notifyOnChange, notifyOnTop10, targetPosition]
    );

    res.json({ success: true, message: 'Monitoring added', id: result.rows[0].id });
  } catch (error) {
    console.error('[seoPositionMonitoring] Error adding monitoring:', error);
    res.status(500).json({ error: error.message });
  }
});

// Удалить ключевое слово из мониторинга
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      'UPDATE seo_monitoring_settings SET is_active = FALSE, updated_at = NOW() WHERE id = $1',
      [id]
    );

    res.json({ success: true, message: 'Monitoring disabled' });
  } catch (error) {
    console.error('[seoPositionMonitoring] Error deleting monitoring:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получить список мониторинга
router.get('/list', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, 
              (SELECT position FROM seo_position_monitoring 
               WHERE site_url = s.site_url AND keyword = s.keyword AND search_engine = s.search_engine 
               ORDER BY checked_at DESC LIMIT 1) as current_position,
              (SELECT checked_at FROM seo_position_monitoring 
               WHERE site_url = s.site_url AND keyword = s.keyword AND search_engine = s.search_engine 
               ORDER BY checked_at DESC LIMIT 1) as last_checked
       FROM seo_monitoring_settings s
       WHERE s.is_active = TRUE
       ORDER BY s.created_at DESC`
    );

    res.json({ settings: result.rows });
  } catch (error) {
    console.error('[seoPositionMonitoring] Error getting list:', error);
    res.status(500).json({ error: error.message });
  }
});

// Запустить проверку позиций (для всех активных настроек или для конкретной)
router.post('/check', requireAuth, async (req, res) => {
  try {
    const { id, siteUrl, keyword, searchEngine } = req.body;

    let settings;

    if (id) {
      // Проверка конкретной настройки
      const result = await pool.query(
        'SELECT * FROM seo_monitoring_settings WHERE id = $1 AND is_active = TRUE',
        [id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Monitoring setting not found' });
      }
      settings = result.rows;
    } else if (siteUrl && keyword && searchEngine) {
      // Проверка по параметрам
      settings = [{
        site_url: siteUrl,
        keyword,
        search_engine: searchEngine
      }];
    } else {
      // Проверка всех активных настроек
      const result = await pool.query(
        'SELECT * FROM seo_monitoring_settings WHERE is_active = TRUE'
      );
      settings = result.rows;
    }

    const results = [];
    const notifications = [];

    for (const setting of settings) {
      // Получаем предыдущую позицию
      const previousResult = await pool.query(
        `SELECT position FROM seo_position_monitoring 
         WHERE site_url = $1 AND keyword = $2 AND search_engine = $3 
         ORDER BY checked_at DESC LIMIT 1`,
        [setting.site_url, setting.keyword, setting.search_engine]
      );

      const previousPosition = previousResult.rows[0]?.position || null;

      // Проверяем текущую позицию
      const checkResult = await checkPosition(
        setting.site_url,
        setting.keyword,
        setting.search_engine
      );

      // Сохраняем результат
      const insertResult = await pool.query(
        `INSERT INTO seo_position_monitoring 
         (site_url, keyword, search_engine, current_position, previous_position, url, checked_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING id`,
        [
          setting.site_url,
          setting.keyword,
          setting.search_engine,
          checkResult.position,
          previousPosition,
          checkResult.url
        ]
      );

      const monitoringId = insertResult.rows[0].id;

      // Сохраняем в историю, если позиция изменилась
      if (previousPosition !== null && previousPosition !== checkResult.position) {
        const changeDelta = previousPosition - checkResult.position; // положительное = улучшение
        
        await pool.query(
          `INSERT INTO seo_position_history 
           (monitoring_id, position, change_from, change_delta, checked_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [monitoringId, checkResult.position, previousPosition, changeDelta]
        );

        // Уведомление об изменении
        if (setting.notify_on_change) {
          notifications.push({
            type: 'position_changed',
            keyword: setting.keyword,
            previousPosition,
            currentPosition: checkResult.position,
            change: changeDelta > 0 ? 'improved' : 'degraded',
            delta: Math.abs(changeDelta)
          });
        }
      }

      // Уведомление о попадании в топ-10
      if (checkResult.position <= 10 && setting.notify_on_top_10 && previousPosition > 10) {
        notifications.push({
          type: 'top_10',
          keyword: setting.keyword,
          position: checkResult.position
        });
      }

      // Уведомление о достижении целевой позиции
      if (setting.target_position && checkResult.position <= setting.target_position && previousPosition > setting.target_position) {
        notifications.push({
          type: 'target_reached',
          keyword: setting.keyword,
          position: checkResult.position,
          target: setting.target_position
        });
      }

      results.push({
        id: monitoringId,
        keyword: setting.keyword,
        position: checkResult.position,
        previousPosition,
        checkedAt: checkResult.checkedAt
      });

      // Задержка между проверками
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    res.json({
      success: true,
      checked: results.length,
      results,
      notifications: notifications.length > 0 ? notifications : undefined
    });
  } catch (error) {
    console.error('[seoPositionMonitoring] Error checking positions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получить историю позиций
router.get('/history/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 30 } = req.query;

    const result = await pool.query(
      `SELECT h.*, m.keyword, m.site_url, m.search_engine
       FROM seo_position_history h
       JOIN seo_position_monitoring m ON h.monitoring_id = m.id
       WHERE m.id = $1
       ORDER BY h.checked_at DESC
       LIMIT $2`,
      [id, limit]
    );

    res.json({ history: result.rows });
  } catch (error) {
    console.error('[seoPositionMonitoring] Error getting history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получить статистику
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const statsResult = await pool.query(
      `SELECT 
        COUNT(DISTINCT keyword) as total_keywords,
        COUNT(*) FILTER (WHERE is_active = TRUE) as active_keywords,
        COUNT(*) FILTER (WHERE current_position <= 10) as top_10_count,
        COUNT(*) FILTER (WHERE current_position <= 3) as top_3_count,
        AVG(current_position) FILTER (WHERE current_position IS NOT NULL) as avg_position
       FROM seo_monitoring_settings s
       LEFT JOIN LATERAL (
         SELECT position as current_position
         FROM seo_position_monitoring m
         WHERE m.site_url = s.site_url 
           AND m.keyword = s.keyword 
           AND m.search_engine = s.search_engine
         ORDER BY m.checked_at DESC
         LIMIT 1
       ) latest ON true
       WHERE s.is_active = TRUE`
    );

    res.json({ stats: statsResult.rows[0] });
  } catch (error) {
    console.error('[seoPositionMonitoring] Error getting stats:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

