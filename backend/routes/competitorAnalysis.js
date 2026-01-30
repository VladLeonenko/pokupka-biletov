import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Функция для парсинга HTML страницы
async function fetchAndParse(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    return html;
  } catch (error) {
    console.error(`[competitorAnalysis] Error fetching ${url}:`, error);
    return null;
  }
}

// Извлечение SEO данных из HTML
function extractSEOData(html, url) {
  const data = {
    url,
    title: '',
    description: '',
    h1: '',
    h2: [],
    keywords: [],
    links: [],
    images: [],
    wordCount: 0,
    loadTime: 0
  };

  if (!html) return data;

  // Title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    data.title = titleMatch[1].trim();
  }

  // Meta description
  const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  if (descMatch) {
    data.description = descMatch[1].trim();
  }

  // H1
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1Match) {
    data.h1 = h1Match[1].trim();
  }

  // H2
  const h2Matches = html.match(/<h2[^>]*>([^<]+)<\/h2>/gi);
  if (h2Matches) {
    data.h2 = h2Matches.map(h2 => h2.replace(/<[^>]+>/g, '').trim());
  }

  // Keywords (если есть)
  const keywordsMatch = html.match(/<meta[^>]+name=["']keywords["'][^>]+content=["']([^"']+)["']/i);
  if (keywordsMatch) {
    data.keywords = keywordsMatch[1].split(',').map(k => k.trim());
  }

  // Ссылки
  const linkMatches = html.match(/<a[^>]+href=["']([^"']+)["'][^>]*>/gi);
  if (linkMatches) {
    data.links = linkMatches.map(link => {
      const hrefMatch = link.match(/href=["']([^"']+)["']/i);
      return hrefMatch ? hrefMatch[1] : null;
    }).filter(Boolean);
  }

  // Изображения
  const imgMatches = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi);
  if (imgMatches) {
    data.images = imgMatches.map(img => {
      const srcMatch = img.match(/src=["']([^"']+)["']/i);
      return srcMatch ? srcMatch[1] : null;
    }).filter(Boolean);
  }

  // Подсчет слов (убираем HTML теги)
  const textContent = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  data.wordCount = textContent.split(/\s+/).length;

  return data;
}

// Анализ конкурента по URL
async function analyzeCompetitor(url) {
  const html = await fetchAndParse(url);
  if (!html) {
    return { error: 'Failed to fetch page' };
  }

  const seoData = extractSEOData(html, url);

  // Дополнительный анализ
  const analysis = {
    ...seoData,
    score: 0,
    strengths: [],
    weaknesses: [],
    recommendations: []
  };

  // Оценка SEO
  if (analysis.title && analysis.title.length >= 30 && analysis.title.length <= 60) {
    analysis.score += 20;
    analysis.strengths.push('Оптимальная длина title');
  } else {
    analysis.weaknesses.push('Неправильная длина title');
    analysis.recommendations.push('Оптимизировать title (30-60 символов)');
  }

  if (analysis.description && analysis.description.length >= 120 && analysis.description.length <= 160) {
    analysis.score += 20;
    analysis.strengths.push('Оптимальная длина description');
  } else {
    analysis.weaknesses.push('Неправильная длина description');
    analysis.recommendations.push('Оптимизировать description (120-160 символов)');
  }

  if (analysis.h1) {
    analysis.score += 15;
    analysis.strengths.push('Наличие H1');
  } else {
    analysis.weaknesses.push('Отсутствует H1');
    analysis.recommendations.push('Добавить H1 заголовок');
  }

  if (analysis.h2.length >= 3) {
    analysis.score += 10;
    analysis.strengths.push('Хорошая структура H2');
  } else {
    analysis.weaknesses.push('Мало H2 заголовков');
    analysis.recommendations.push('Добавить больше H2 заголовков для структуры');
  }

  if (analysis.wordCount >= 300) {
    analysis.score += 15;
    analysis.strengths.push('Достаточный объем контента');
  } else {
    analysis.weaknesses.push('Мало контента');
    analysis.recommendations.push('Увеличить объем контента (минимум 300 слов)');
  }

  if (analysis.images.length > 0) {
    analysis.score += 10;
    analysis.strengths.push('Использование изображений');
  } else {
    analysis.weaknesses.push('Нет изображений');
    analysis.recommendations.push('Добавить изображения с alt текстами');
  }

  if (analysis.links.length >= 5) {
    analysis.score += 10;
    analysis.strengths.push('Хорошая внутренняя перелинковка');
  } else {
    analysis.weaknesses.push('Мало внутренних ссылок');
    analysis.recommendations.push('Улучшить внутреннюю перелинковку');
  }

  return analysis;
}

// Анализ конкурентов по запросу
router.post('/analyze', requireAuth, async (req, res) => {
  try {
    const { query, competitors, maxResults = 10 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Если не указаны конкуренты, пытаемся найти их через поиск
    let competitorUrls = competitors || [];

    if (competitorUrls.length === 0) {
      // Здесь можно добавить интеграцию с поисковыми API (Google, Yandex)
      // Пока возвращаем ошибку, что нужны URL конкурентов
      return res.status(400).json({ 
        error: 'Competitor URLs required. Please provide competitor URLs to analyze.',
        note: 'Future: Will integrate with search APIs to find competitors automatically'
      });
    }

    const results = [];
    const errors = [];

    for (const url of competitorUrls.slice(0, maxResults)) {
      try {
        const analysis = await analyzeCompetitor(url);
        if (analysis.error) {
          errors.push({ url, error: analysis.error });
        } else {
          results.push(analysis);
        }
        // Задержка между запросами
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        errors.push({ url, error: error.message });
      }
    }

    // Сравнительный анализ
    const comparison = {
      averageScore: results.length > 0 
        ? results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length 
        : 0,
      bestTitle: results.length > 0 
        ? results.reduce((best, r) => 
            (!best || (r.title && r.title.length > best.title.length)) ? r : best
          , null)?.title 
        : null,
      bestDescription: results.length > 0
        ? results.reduce((best, r) => 
            (!best || (r.description && r.description.length > best.description.length)) ? r : best
          , null)?.description
        : null,
      averageWordCount: results.length > 0
        ? Math.round(results.reduce((sum, r) => sum + (r.wordCount || 0), 0) / results.length)
        : 0,
      commonKeywords: extractCommonKeywords(results)
    };

    res.json({
      query,
      totalAnalyzed: results.length,
      errors: errors.length,
      competitors: results,
      comparison,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('[competitorAnalysis] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Извлечение общих ключевых слов
function extractCommonKeywords(analyses) {
  const keywordCounts = {};
  
  analyses.forEach(analysis => {
    analysis.keywords.forEach(keyword => {
      keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
    });
  });

  return Object.entries(keywordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([keyword, count]) => ({ keyword, count }));
}

// Сохранение анализа конкурентов
router.post('/save', requireAuth, async (req, res) => {
  try {
    const { query, competitors, analysis } = req.body;

    if (!query || !competitors || !analysis) {
      return res.status(400).json({ error: 'Query, competitors and analysis are required' });
    }

    // Сохраняем в базу данных (нужно создать таблицу)
    // Пока просто возвращаем успех
    res.json({ 
      success: true, 
      message: 'Analysis saved',
      note: 'Database table for competitor analysis needs to be created'
    });
  } catch (error) {
    console.error('[competitorAnalysis] Error saving:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получить историю анализов
router.get('/history', requireAuth, async (req, res) => {
  try {
    // Пока возвращаем пустой массив, так как таблица еще не создана
    res.json({ 
      analyses: [],
      note: 'Database table for competitor analysis history needs to be created'
    });
  } catch (error) {
    console.error('[competitorAnalysis] Error getting history:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;







