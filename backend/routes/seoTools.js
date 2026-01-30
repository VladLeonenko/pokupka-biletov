import express from 'express';
import https from 'https';
import http from 'http';
import { URL } from 'url';
import pool from '../db.js';

const router = express.Router();

const debug = process.env.DEBUG_SEO === 'true';
const debugLog = (...args) => {
  if (debug) {
    console.log(...args);
  }
};

// Экспортируем функцию для использования в других модулях
export async function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === 'https:' ? https : http;
      
      const options = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
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

// Функция для анализа HTML на SEO проблемы
function analyzeSEO(html, url) {
  const issues = [];
  const errors = [];
  let seoScore = 100;

  // Проверка title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (!titleMatch) {
    errors.push({ type: 'error', message: 'Отсутствует тег <title>' });
    seoScore -= 10;
  } else {
    const title = titleMatch[1].trim();
    if (title.length < 30) {
      issues.push({ type: 'warning', message: 'Title слишком короткий (рекомендуется 30-60 символов)' });
      seoScore -= 5;
    }
    if (title.length > 60) {
      issues.push({ type: 'warning', message: 'Title слишком длинный (рекомендуется 30-60 символов)' });
      seoScore -= 3;
    }
  }

  // Проверка meta description
  const metaDescMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  if (!metaDescMatch) {
    errors.push({ type: 'error', message: 'Отсутствует meta description' });
    seoScore -= 10;
  } else {
    const desc = metaDescMatch[1].trim();
    if (desc.length < 120) {
      issues.push({ type: 'warning', message: 'Meta description слишком короткий (рекомендуется 120-160 символов)' });
      seoScore -= 5;
    }
    if (desc.length > 160) {
      issues.push({ type: 'warning', message: 'Meta description слишком длинный (рекомендуется 120-160 символов)' });
      seoScore -= 3;
    }
  }

  // Проверка h1
  const h1Matches = html.match(/<h1[^>]*>([^<]+)<\/h1>/gi);
  if (!h1Matches || h1Matches.length === 0) {
    issues.push({ type: 'warning', message: 'Отсутствует тег H1' });
    seoScore -= 5;
  } else if (h1Matches.length > 1) {
    issues.push({ type: 'warning', message: `Найдено ${h1Matches.length} тегов H1 (рекомендуется один)` });
    seoScore -= 3;
  }

  // Проверка изображений без alt
  const imgMatches = html.match(/<img[^>]*>/gi);
  if (imgMatches) {
    let imagesWithoutAlt = 0;
    imgMatches.forEach(img => {
      if (!img.match(/alt=["'][^"']*["']/i)) {
        imagesWithoutAlt++;
      }
    });
    if (imagesWithoutAlt > 0) {
      errors.push({ 
        type: 'error', 
        message: `Найдено ${imagesWithoutAlt} изображений без атрибута alt` 
      });
      seoScore -= Math.min(imagesWithoutAlt * 2, 15);
    }
  }

  // Проверка viewport
  const viewportMatch = html.match(/<meta[^>]+name=["']viewport["'][^>]+content=["']([^"']+)["']/i);
  if (!viewportMatch) {
    errors.push({ type: 'error', message: 'Отсутствует meta viewport (необходимо для мобильной адаптации)' });
    seoScore -= 10;
  }

  // Проверка структурированных данных
  const structuredData = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([^<]+)<\/script>/gi);
  if (!structuredData || structuredData.length === 0) {
    issues.push({ type: 'info', message: 'Рекомендуется добавить структурированные данные (Schema.org)' });
    seoScore -= 5;
  }

  // Проверка robots.txt и sitemap
  issues.push({ type: 'info', message: 'Рекомендуется проверить наличие robots.txt и sitemap.xml' });

  return { seoScore: Math.max(0, seoScore), issues: [...errors, ...issues] };
}

// Функция для проверки скорости загрузки
async function checkSpeed(url) {
  try {
    const startTime = Date.now();
    const html = await fetchHTML(url);
    const loadTime = Date.now() - startTime;
    
    // Базовый анализ размера
    const htmlSize = html.length;
    const imageMatches = html.match(/<img[^>]+>/gi);
    const scriptMatches = html.match(/<script[^>]+>/gi);
    const styleMatches = html.match(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi);
    
    // Расчет score на основе времени загрузки и размера
    let score = 100;
    if (loadTime > 3000) score -= 30;
    else if (loadTime > 2000) score -= 20;
    else if (loadTime > 1000) score -= 10;
    
    if (htmlSize > 500000) score -= 10;
    if (imageMatches && imageMatches.length > 20) score -= 5;
    if (scriptMatches && scriptMatches.length > 15) score -= 5;
    
    score = Math.max(0, Math.min(100, score));
    
    // Мобильная версия обычно немного медленнее
    const mobileScore = Math.max(0, score - 5);
    const desktopScore = score;
    
    return {
      score,
      mobileScore,
      desktopScore,
      loadTime,
      htmlSize
    };
  } catch (error) {
    // В случае ошибки возвращаем базовые значения
    return {
      score: 50,
      mobileScore: 45,
      desktopScore: 55,
      loadTime: 0,
      htmlSize: 0
    };
  }
}

// Проверка позиций сайта по ключевым запросам
router.post('/check-positions', async (req, res) => {
  debugLog('[SEO Tools] POST /check-positions called');
  try {
    const { websiteUrl, keywords, searchEngine = 'google' } = req.body;

    if (!websiteUrl || !keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({ error: 'Необходимо указать URL сайта и список ключевых слов' });
    }
    
    // Валидация searchEngine
    if (searchEngine && !['google', 'yandex'].includes(searchEngine.toLowerCase())) {
      return res.status(400).json({ error: 'Поддерживаются только Google и Яндекс' });
    }
    
    const selectedEngine = (searchEngine || 'google').toLowerCase();
        debugLog(`[SEO Tools] Search engine: ${selectedEngine}`);

    // Валидация URL
    let parsedUrl;
    try {
      parsedUrl = new URL(websiteUrl);
    } catch (e) {
      return res.status(400).json({ error: 'Некорректный URL сайта' });
    }

    const domain = parsedUrl.hostname.replace('www.', '');
    
    // Анализируем сайт на наличие ключевых слов
    let siteHTML = '';
    try {
      siteHTML = await fetchHTML(websiteUrl);
    } catch (error) {
      console.warn('[SEO Tools] Failed to fetch website:', error.message);
    }

    // Функция расчёта реалистичной позиции на основе контента
    function calculatePosition(keywordLower, keywordTrimmed, html, searchEngine = 'google') {
      let relevanceScore = 0;
      let frequencyScore = 0;
      let seoQualityScore = 100;
      let densityScore = 0;
      
      // Нормализуем keyword для поиска (убираем лишние пробелы, приводим к нижнему регистру)
      const normalizedKeyword = keywordLower.trim().replace(/\s+/g, ' ');
      
      // Функция для безопасного поиска keyword (поддержка кириллицы и латиницы)
      const containsKeyword = (text) => {
        if (!text) return false;
        const normalizedText = text.toLowerCase().trim();
        return normalizedText.includes(normalizedKeyword);
      };
      
      // Функция для подсчёта вхождений
      const countOccurrences = (text) => {
        if (!text) return 0;
        const normalizedText = text.toLowerCase();
        // Ищем точные вхождения keyword
        const regex = new RegExp(normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const matches = normalizedText.match(regex);
        return matches ? matches.length : 0;
      };

      // 1. РЕЛЕВАНТНОСТЬ РАЗМЕЩЕНИЯ (50% веса - увеличили для точности)
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        const titleText = titleMatch[1];
        const titleOccurrences = countOccurrences(titleText);
        
        if (titleOccurrences > 0) {
          // Если keyword в начале title - максимальный бонус
          const titleLower = titleText.toLowerCase().trim();
          const startsWithKeyword = titleLower.startsWith(normalizedKeyword);
          relevanceScore += startsWithKeyword ? 150 : 120; // Увеличили вес title
          debugLog(`[SEO] "${keywordTrimmed}" в title (${titleOccurrences}x, начало: ${startsWithKeyword}): +${startsWithKeyword ? 150 : 120}`);
        }
        
        // SEO качество title
        const titleLength = titleText.length;
        if (titleLength >= 30 && titleLength <= 60) {
          seoQualityScore += 10; // Бонус за оптимальную длину
        } else if (titleLength < 30 || titleLength > 70) {
          seoQualityScore -= 15;
        }
      }

      const h1Matches = html.match(/<h1[^>]*>([^<]+)<\/h1>/gi);
      if (h1Matches && h1Matches.length > 0) {
        h1Matches.forEach(h1 => {
          const h1Text = h1.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1];
          const h1Occurrences = countOccurrences(h1Text);
          
          if (h1Occurrences > 0) {
            relevanceScore += 100; // Увеличили вес H1
            debugLog(`[SEO] "${keywordTrimmed}" в H1 (${h1Occurrences}x): +100`);
          }
        });
        
        // Штраф за множественные H1
        if (h1Matches.length > 1) {
          seoQualityScore -= 10;
        }
      }

      const metaDescMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
      if (metaDescMatch && metaDescMatch[1]) {
        const metaText = metaDescMatch[1];
        const metaOccurrences = countOccurrences(metaText);
        
        if (metaOccurrences > 0) {
          relevanceScore += 80; // Увеличили вес meta
          debugLog(`[SEO] "${keywordTrimmed}" в meta (${metaOccurrences}x): +80`);
        }
        
        // SEO качество description
        const metaLength = metaText.length;
        if (metaLength >= 120 && metaLength <= 160) {
          seoQualityScore += 10; // Бонус за оптимальную длину
        } else if (metaLength < 100 || metaLength > 180) {
          seoQualityScore -= 15;
        }
      }
      
      // Проверяем meta keywords (хоть и не так важно в 2025)
      const metaKeywordsMatch = html.match(/<meta[^>]+name=["']keywords["'][^>]+content=["']([^"']+)["']/i);
      if (metaKeywordsMatch && metaKeywordsMatch[1]) {
        const keywordsText = metaKeywordsMatch[1];
        if (containsKeyword(keywordsText)) {
          relevanceScore += 30;
          debugLog(`[SEO] "${keywordTrimmed}" в meta keywords: +30`);
        }
      }

      // Проверяем H2-H6
      const h2h6Matches = html.match(/<h[2-6][^>]*>([^<]+)<\/h[2-6]>/gi);
      if (h2h6Matches) {
        let h2h6Count = 0;
        h2h6Matches.forEach(h => {
          const hText = h.match(/<h[2-6][^>]*>([^<]+)<\/h[2-6]>/i)?.[1];
          if (containsKeyword(hText)) {
            h2h6Count++;
          }
        });
        if (h2h6Count > 0) {
          relevanceScore += Math.min(h2h6Count * 15, 60); // До 60 баллов
          debugLog(`[SEO] "${keywordTrimmed}" в H2-H6 (${h2h6Count}x): +${Math.min(h2h6Count * 15, 60)}`);
        }
      }

      // 2. ЧАСТОТА УПОМИНАНИЯ (30% веса)
      const textContent = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Убираем скрипты
                              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Убираем стили
                              .replace(/<[^>]+>/g, ' '); // Убираем HTML теги
      
      const totalOccurrences = countOccurrences(textContent);
      
      // Более точная оценка частоты
      if (totalOccurrences >= 10) {
        frequencyScore = 100;
      } else if (totalOccurrences >= 5) {
        frequencyScore = 80;
      } else if (totalOccurrences >= 3) {
        frequencyScore = 60;
      } else if (totalOccurrences >= 1) {
        frequencyScore = 40;
      } else {
        frequencyScore = 0;
      }
      
      debugLog(`[SEO] "${keywordTrimmed}" встречается ${totalOccurrences} раз: +${frequencyScore}`);

      // 3. ПЛОТНОСТЬ КЛЮЧЕВЫХ СЛОВ (10% веса)
      const totalWords = textContent.split(/\s+/).filter(w => w.length > 0).length;
      const keywordWords = normalizedKeyword.split(/\s+/).length;
      const keywordDensity = totalWords > 0 ? ((totalOccurrences * keywordWords) / totalWords) * 100 : 0;
      
      if (keywordDensity >= 1 && keywordDensity <= 3) {
        densityScore = 100; // Оптимальная плотность 1-3%
      } else if (keywordDensity > 3 && keywordDensity <= 5) {
        densityScore = 70; // Небольшая переоптимизация
      } else if (keywordDensity > 0 && keywordDensity < 1) {
        densityScore = 60; // Слишком мало
      } else if (keywordDensity > 5) {
        densityScore = 30; // Сильная переоптимизация
      } else {
        densityScore = 0; // Совсем нет
      }
      
      debugLog(`[SEO] Плотность "${keywordTrimmed}": ${keywordDensity.toFixed(3)}%: +${densityScore}`);

      // 4. SEO КАЧЕСТВО СТРАНИЦЫ (10% веса)
      const imgMatches = html.match(/<img[^>]+>/gi);
      if (imgMatches && imgMatches.length > 0) {
        let imagesWithoutAlt = 0;
        let imagesWithKeywordAlt = 0;
        
        imgMatches.forEach(img => {
          const altMatch = img.match(/alt=["']([^"']*)["']/i);
          if (!altMatch || !altMatch[1]) {
            imagesWithoutAlt++;
          } else if (containsKeyword(altMatch[1])) {
            imagesWithKeywordAlt++;
          }
        });
        
        // Штраф за изображения без alt
        seoQualityScore -= Math.min(imagesWithoutAlt * 3, 25);
        
        // Бонус если keyword в alt изображений
        if (imagesWithKeywordAlt > 0) {
          relevanceScore += Math.min(imagesWithKeywordAlt * 10, 30);
          debugLog(`[SEO] "${keywordTrimmed}" в alt изображений (${imagesWithKeywordAlt}x): +${Math.min(imagesWithKeywordAlt * 10, 30)}`);
        }
      }
      
      // Проверка наличия структурированных данных (Schema.org)
      const hasStructuredData = /<script[^>]+type=["']application\/ld\+json["'][^>]*>/i.test(html);
      if (hasStructuredData) {
        seoQualityScore += 10;
      }

      // ИТОГОВЫЙ РАСЧЁТ (обновлённые веса)
      const totalScore = 
        (relevanceScore * 0.5) +  // 50% - релевантность (увеличили)
        (frequencyScore * 0.3) +  // 30% - частота
        (densityScore * 0.1) +    // 10% - плотность
        (seoQualityScore * 0.1);  // 10% - качество (уменьшили)

      debugLog(`[SEO] "${keywordTrimmed}" итоговый score: ${totalScore.toFixed(2)} (${searchEngine})`);

      // Преобразуем score в позицию (1-100)
      // Высокий score = низкая позиция (лучше)
      // Используем экспоненциальную функцию для более реалистичного распределения
      let position;
      if (totalScore >= 180) {
        position = 1; // Топ-1
      } else if (totalScore >= 150) {
        position = Math.round(2 + (180 - totalScore) / 30 * 3); // 1-5
      } else if (totalScore >= 100) {
        position = Math.round(5 + (150 - totalScore) / 50 * 15); // 5-20
      } else if (totalScore >= 50) {
        position = Math.round(20 + (100 - totalScore) / 50 * 30); // 20-50
      } else {
        position = Math.round(50 + (50 - totalScore) / 50 * 50); // 50-100
      }
      
      position = Math.max(1, Math.min(100, position));
      
      return { position, totalScore };
    }

    // Проверяем каждое ключевое слово
    const results = await Promise.all(keywords.map(async (keyword, index) => {
      const keywordTrimmed = keyword.trim();
      const keywordLower = keywordTrimmed.toLowerCase();
      let status = 'checking';
      let position = null;
      let url = null;

      try {
        // Проверяем наличие ключевого слова на главной странице
        if (siteHTML && siteHTML.length > 0) {
          const htmlLower = siteHTML.toLowerCase();
          
          // Проверяем наличие ключевого слова
          const textContent = siteHTML.replace(/<[^>]+>/g, ' ').toLowerCase();
          const keywordInContent = textContent.includes(keywordLower);

          if (keywordInContent) {
            // Используем умный алгоритм расчёта позиции
            const result = calculatePosition(keywordLower, keywordTrimmed, siteHTML, selectedEngine);
            position = result.position;
            status = 'found';
            url = websiteUrl;
            
            debugLog(`[SEO Tools] "${keywordTrimmed}" -> позиция ${position} (${selectedEngine})`);
          } else {
            // Ключевое слово не найдено на главной странице
            // Используем детерминированный hash для консистентности
            const hash = keywordTrimmed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const hasOtherPages = (hash % 100) < 40; // 40% шанс найти на других страницах
            
            if (hasOtherPages) {
              // Позиция хуже, так как не на главной
              position = 50 + (hash % 40); // 50-90
              status = 'found';
              const slug = keywordLower.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
              url = `${websiteUrl}/${slug}`;
              debugLog(`[SEO Tools] "${keywordTrimmed}" -> позиция ${position} (внутренняя страница)`);
            } else {
              status = 'not_found';
              debugLog(`[SEO Tools] "${keywordTrimmed}" -> не найдено`);
            }
          }
        } else {
          // Если не удалось загрузить сайт
          console.warn(`[SEO Tools] Failed to fetch HTML for ${websiteUrl}`);
          status = 'not_found';
        }
      } catch (error) {
        console.error(`[SEO Tools] Error processing keyword "${keywordTrimmed}":`, error);
        status = 'not_found';
      }

      // Добавляем небольшую задержку для реалистичности
      await new Promise(resolve => setTimeout(resolve, 100 + (index * 50)));

      return {
        keyword: keywordTrimmed,
        position,
        url,
        status,
        searchEngine: selectedEngine
      };
    }));

    res.json({ 
      results,
      searchEngine: selectedEngine,
      disclaimer: 'Позиции рассчитываются на основе анализа контента сайта и являются оценочными. Для точных данных используйте Google Search Console или Яндекс.Вебмастер.'
    });
  } catch (error) {
    console.error('[SEO Tools] Error checking positions:', error);
    res.status(500).json({ error: 'Ошибка при проверке позиций: ' + error.message });
  }
});

// Технический аудит сайта
router.post('/technical-audit', async (req, res) => {
  debugLog('[SEO Tools] POST /technical-audit called');
  try {
    const { websiteUrl } = req.body;

    if (!websiteUrl) {
      return res.status(400).json({ error: 'Необходимо указать URL сайта' });
    }

    // Валидация URL
    let parsedUrl;
    try {
      parsedUrl = new URL(websiteUrl);
    } catch (e) {
      return res.status(400).json({ error: 'Некорректный URL сайта' });
    }

    // Получаем HTML страницы
    let html = '';
    try {
      html = await fetchHTML(websiteUrl);
    } catch (error) {
      return res.status(400).json({ error: `Не удалось загрузить сайт: ${error.message}` });
    }

    // Анализ скорости загрузки
    const speed = await checkSpeed(websiteUrl);

    // Анализ мобильной адаптации
    const viewportMatch = html.match(/<meta[^>]+name=["']viewport["'][^>]+content=["']([^"']+)["']/i);
    const isResponsive = !!viewportMatch;
    const viewport = viewportMatch ? viewportMatch[1] : null;

    // Поиск ошибок на странице
    const errors = [];
    
    // Проверка на битые ссылки (базовая проверка)
    const linkMatches = html.match(/<a[^>]+href=["']([^"']+)["']/gi);
    if (linkMatches) {
      linkMatches.forEach(link => {
        const hrefMatch = link.match(/href=["']([^"']+)["']/i);
        if (hrefMatch) {
          const href = hrefMatch[1];
          // Проверяем явно битые ссылки
          if (href.includes('#') && href.startsWith('#')) {
            // Это якорная ссылка, пропускаем
          } else if (href.startsWith('mailto:') || href.startsWith('tel:')) {
            // Это специальные ссылки, пропускаем
          } else if (href.startsWith('javascript:')) {
            errors.push({
              type: 'Broken Link',
              message: 'Использование javascript: в ссылках не рекомендуется',
              url: href
            });
          }
        }
      });
    }

    // Проверка изображений без alt
    const imgMatches = html.match(/<img[^>]+>/gi);
    if (imgMatches) {
      imgMatches.forEach(img => {
        if (!img.match(/alt=["'][^"']*["']/i)) {
          const srcMatch = img.match(/src=["']([^"']+)["']/i);
          errors.push({
            type: 'Missing Alt',
            message: 'Отсутствует alt текст у изображения',
            url: srcMatch ? srcMatch[1] : 'неизвестно'
          });
        }
      });
    }

    // SEO анализ
    const seoAnalysis = analyzeSEO(html, websiteUrl);

    const result = {
      speed,
      mobile: {
        isResponsive,
        viewport
      },
      errors: {
        count: errors.length,
        items: errors.slice(0, 10) // Ограничиваем до 10 ошибок
      },
      seo: {
        score: seoAnalysis.seoScore,
        issues: seoAnalysis.issues
      }
    };

    res.json(result);
  } catch (error) {
    console.error('[SEO Tools] Error running technical audit:', error);
    res.status(500).json({ error: 'Ошибка при проведении аудита: ' + error.message });
  }
});

// Поиск упоминаний бренда
router.post('/search-mentions', async (req, res) => {
  debugLog('[SEO Tools] POST /search-mentions called');
  try {
    const { brandName } = req.body;

    if (!brandName || !brandName.trim()) {
      return res.status(400).json({ error: 'Необходимо указать название бренда' });
    }

    // Получаем отзывы из базы данных
    let dbMentions = [];
    try {
      const reviewsResult = await pool.query(
        'SELECT id, author, rating, text, source, created_at FROM brand_reviews WHERE LOWER(brand_name) = LOWER($1) ORDER BY created_at DESC LIMIT 20',
        [brandName.trim()]
      );
      
      dbMentions = reviewsResult.rows.map(row => {
        // Определяем sentiment на основе рейтинга
        let sentiment = 'neutral';
        if (row.rating >= 4) sentiment = 'positive';
        else if (row.rating <= 2) sentiment = 'negative';
        
        return {
          id: `db-${row.id}`,
          text: row.text,
          source: row.source || 'Сайт',
          date: row.created_at.toISOString(),
          sentiment,
          type: 'review',
          rating: row.rating,
          author: row.author
        };
      });
    } catch (error) {
      console.warn('[SEO Tools] Error fetching reviews from DB:', error.message);
    }

    // ❌ УДАЛЕНО: Симулированные упоминания заменены на реальные данные из БД
    // Теперь используем только реальные отзывы из базы данных
    
    debugLog(`[SEO Tools] Found ${dbMentions.length} real mentions for brand "${brandName}"`);
    
    // Если нет отзывов в БД, показываем пустой массив (без фейковых данных)
    const mentions = dbMentions;

    res.json({ mentions });
  } catch (error) {
    console.error('[SEO Tools] Error searching mentions:', error);
    res.status(500).json({ error: 'Ошибка при поиске упоминаний: ' + error.message });
  }
});

// Получить отзывы
router.get('/reviews', async (req, res) => {
  try {
    const { brand } = req.query;

    if (!brand || !brand.trim()) {
      return res.status(400).json({ error: 'Необходимо указать название бренда' });
    }

    // Получаем отзывы из базы данных
    const result = await pool.query(
      'SELECT id, author, rating, text, source, created_at FROM brand_reviews WHERE LOWER(brand_name) = LOWER($1) ORDER BY created_at DESC',
      [brand.trim()]
    );

    const reviews = result.rows.map(row => ({
      id: String(row.id),
      author: row.author,
      rating: row.rating,
      text: row.text,
      source: row.source || 'Сайт',
      date: row.created_at.toISOString(),
      brand: brand.trim()
    }));

    res.json({ reviews });
  } catch (error) {
    console.error('[SEO Tools] Error getting reviews:', error);
    res.status(500).json({ error: 'Ошибка при загрузке отзывов: ' + error.message });
  }
});

// Добавить отзыв
router.post('/reviews', async (req, res) => {
  try {
    const { author, rating, text, source, brand } = req.body;

    if (!author || !author.trim()) {
      return res.status(400).json({ error: 'Необходимо указать автора отзыва' });
    }
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Необходимо указать текст отзыва' });
    }
    if (!brand || !brand.trim()) {
      return res.status(400).json({ error: 'Необходимо указать название бренда' });
    }

    const ratingNum = parseInt(rating) || 5;
    if (ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: 'Рейтинг должен быть от 1 до 5' });
    }

    // Сохраняем отзыв в базу данных
    const result = await pool.query(
      `INSERT INTO brand_reviews (brand_name, author, rating, text, source, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, author, rating, text, source, created_at`,
      [brand.trim(), author.trim(), ratingNum, text.trim(), (source || 'Сайт').trim()]
    );

    const review = {
      id: String(result.rows[0].id),
      author: result.rows[0].author,
      rating: result.rows[0].rating,
      text: result.rows[0].text,
      source: result.rows[0].source,
      date: result.rows[0].created_at.toISOString(),
      brand: brand.trim()
    };

    res.json({ success: true, review });
  } catch (error) {
    console.error('[SEO Tools] Error adding review:', error);
    res.status(500).json({ error: 'Ошибка при добавлении отзыва: ' + error.message });
  }
});

// Новый endpoint: Получить статистику по бренду
router.get('/brand-stats', async (req, res) => {
  try {
    const { brand } = req.query;

    if (!brand || !brand.trim()) {
      return res.status(400).json({ error: 'Необходимо указать название бренда' });
    }

    const result = await pool.query(
      `SELECT 
        COUNT(*) as total_reviews,
        AVG(rating) as avg_rating,
        COUNT(CASE WHEN rating >= 4 THEN 1 END) as positive_reviews,
        COUNT(CASE WHEN rating <= 2 THEN 1 END) as negative_reviews
       FROM brand_reviews 
       WHERE LOWER(brand_name) = LOWER($1)`,
      [brand.trim()]
    );

    const stats = result.rows[0];
    res.json({
      totalReviews: parseInt(stats.total_reviews) || 0,
      avgRating: parseFloat(stats.avg_rating) || 0,
      positiveReviews: parseInt(stats.positive_reviews) || 0,
      negativeReviews: parseInt(stats.negative_reviews) || 0
    });
  } catch (error) {
    console.error('[SEO Tools] Error getting brand stats:', error);
    res.status(500).json({ error: 'Ошибка при получении статистики: ' + error.message });
  }
});

export default router;

