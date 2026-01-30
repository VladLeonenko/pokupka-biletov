import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Функция для извлечения текста из HTML
function extractText(html) {
  if (!html) return '';
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Функция для извлечения ключевых слов из текста
function extractKeywords(text, minLength = 3, maxKeywords = 20) {
  // Убираем знаки препинания и приводим к нижнему регистру
  const words = text
    .toLowerCase()
    .replace(/[^\w\sа-яё]/gi, ' ')
    .split(/\s+/)
    .filter(word => word.length >= minLength);
  
  // Подсчитываем частоту
  const frequency = {};
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });
  
  // Сортируем по частоте и возвращаем топ ключевых слов
  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

// Функция для расчета релевантности между страницами
function calculateRelevance(sourceText, targetTitle, targetKeywords, targetText) {
  let score = 0;
  
  const sourceKeywords = extractKeywords(sourceText);
  const targetKeywordsSet = new Set(targetKeywords || []);
  
  // Проверяем совпадение ключевых слов
  sourceKeywords.forEach(keyword => {
    if (targetKeywordsSet.has(keyword)) {
      score += 10; // Совпадение ключевого слова
    }
    
    // Проверяем наличие в заголовке целевой страницы
    if (targetTitle && targetTitle.toLowerCase().includes(keyword)) {
      score += 15; // Ключевое слово в заголовке
    }
    
    // Проверяем наличие в тексте целевой страницы
    if (targetText && targetText.toLowerCase().includes(keyword)) {
      score += 5; // Ключевое слово в тексте
    }
  });
  
  // Проверяем общие фразы (2-3 слова)
  const sourcePhrases = extractPhrases(sourceText, 2);
  const targetPhrases = extractPhrases(targetText, 2);
  const commonPhrases = sourcePhrases.filter(phrase => targetPhrases.includes(phrase));
  score += commonPhrases.length * 20;
  
  return score;
}

// Извлечение фраз из текста
function extractPhrases(text, phraseLength = 2) {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length >= 3);
  const phrases = [];
  
  for (let i = 0; i <= words.length - phraseLength; i++) {
    phrases.push(words.slice(i, i + phraseLength).join(' '));
  }
  
  return phrases;
}

// Поиск мест для вставки ссылок в HTML
function findLinkInsertionPoints(html, keyword, maxLinks = 3) {
  const insertionPoints = [];
  const textContent = extractText(html);
  const keywordLower = keyword.toLowerCase();
  
  // Ищем вхождения ключевого слова в тексте
  const regex = new RegExp(keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  const matches = [...textContent.matchAll(regex)];
  
  // Фильтруем, чтобы не было слишком близко друг к другу
  const minDistance = 200; // Минимальное расстояние между ссылками (символов)
  let lastPosition = -minDistance;
  
  matches.forEach(match => {
    const position = match.index;
    if (position - lastPosition >= minDistance) {
      insertionPoints.push({
        position,
        keyword: match[0],
        context: textContent.substring(Math.max(0, position - 30), position + 50)
      });
      lastPosition = position;
      
      if (insertionPoints.length >= maxLinks) {
        return;
      }
    }
  });
  
  return insertionPoints;
}

// Вставка ссылки в HTML
function insertLink(html, keyword, targetUrl, anchorText = null) {
  const keywordLower = keyword.toLowerCase();
  const anchor = anchorText || keyword;
  
  // Ищем первое подходящее место для вставки
  const textContent = extractText(html);
  const regex = new RegExp(keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const match = textContent.match(regex);
  
  if (!match) return html;
  
  // Находим позицию в HTML (учитывая теги)
  let htmlPosition = 0;
  let textPosition = 0;
  let inTag = false;
  
  for (let i = 0; i < html.length; i++) {
    if (html[i] === '<') inTag = true;
    if (html[i] === '>') inTag = false;
    
    if (!inTag && html[i] !== '>') {
      if (textPosition === match.index) {
        htmlPosition = i;
        break;
      }
      textPosition++;
    }
  }
  
  // Проверяем, не находится ли уже ссылка здесь
  const beforeText = html.substring(Math.max(0, htmlPosition - 50), htmlPosition);
  if (beforeText.includes('<a ') && !beforeText.includes('</a>')) {
    return html; // Уже есть незакрытая ссылка
  }
  
  // Вставляем ссылку
  const before = html.substring(0, htmlPosition);
  const keywordMatch = html.substring(htmlPosition).match(new RegExp(keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
  
  if (!keywordMatch) return html;
  
  const keywordLength = keywordMatch[0].length;
  const after = html.substring(htmlPosition + keywordLength);
  
  const link = `<a href="${targetUrl}" title="${anchor}">${anchor}</a>`;
  
  return before + link + after;
}

// Анализ страницы и поиск возможностей для перелинковки
router.post('/analyze', requireAuth, async (req, res) => {
  try {
    const { pageId, slug, maxSuggestions = 10 } = req.body;
    
    if (!pageId && !slug) {
      return res.status(400).json({ error: 'pageId or slug is required' });
    }
    
    // Получаем страницу
    let page;
    if (pageId) {
      const result = await pool.query('SELECT * FROM pages WHERE id = $1', [pageId]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Page not found' });
      }
      page = result.rows[0];
    } else {
      const result = await pool.query('SELECT * FROM pages WHERE slug = $1', [slug]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Page not found' });
      }
      page = result.rows[0];
    }
    
    const sourceText = extractText(page.body || '');
    const sourceKeywords = extractKeywords(sourceText);
    
    // Получаем все другие опубликованные страницы
    const otherPagesResult = await pool.query(
      `SELECT id, slug, title, body, seo_title, seo_keywords 
       FROM pages 
       WHERE is_published = TRUE 
       AND id != $1
       ORDER BY updated_at DESC`,
      [page.id]
    );
    
    // Рассчитываем релевантность для каждой страницы
    const relevances = [];
    
    for (const targetPage of otherPagesResult.rows) {
      const targetText = extractText(targetPage.body || '');
      const targetKeywords = targetPage.seo_keywords || extractKeywords(targetText);
      const targetTitle = targetPage.seo_title || targetPage.title;
      
      const relevance = calculateRelevance(
        sourceText,
        targetTitle,
        targetKeywords,
        targetText
      );
      
      if (relevance > 0) {
        relevances.push({
          pageId: targetPage.id,
          slug: targetPage.slug,
          title: targetPage.title,
          relevance,
          keywords: sourceKeywords.filter(kw => 
            targetText.toLowerCase().includes(kw) || 
            targetTitle.toLowerCase().includes(kw)
          )
        });
      }
    }
    
    // Сортируем по релевантности
    relevances.sort((a, b) => b.relevance - a.relevance);
    
    // Проверяем, какие ссылки уже есть
    const existingLinks = [];
    const linkMatches = (page.body || '').match(/<a[^>]+href=["']([^"']+)["'][^>]*>/gi);
    if (linkMatches) {
      linkMatches.forEach(link => {
        const hrefMatch = link.match(/href=["']([^"']+)["']/i);
        if (hrefMatch) {
          existingLinks.push(hrefMatch[1]);
        }
      });
    }
    
    // Фильтруем уже существующие ссылки
    const suggestions = relevances
      .slice(0, maxSuggestions)
      .map(rel => ({
        ...rel,
        url: rel.slug.startsWith('/') ? rel.slug : '/' + rel.slug,
        alreadyLinked: existingLinks.some(link => link.includes(rel.slug)),
        insertionPoints: findLinkInsertionPoints(page.body || '', rel.keywords[0] || '', 3)
      }));
    
    res.json({
      pageId: page.id,
      slug: page.slug,
      sourceKeywords,
      suggestions,
      existingLinksCount: existingLinks.length
    });
  } catch (error) {
    console.error('[internalLinking] Error analyzing:', error);
    res.status(500).json({ error: error.message });
  }
});

// Автоматическое добавление ссылок
router.post('/add-links', requireAuth, async (req, res) => {
  try {
    const { pageId, suggestions, maxLinks = 5 } = req.body;
    
    if (!pageId) {
      return res.status(400).json({ error: 'pageId is required' });
    }
    
    if (!suggestions || !Array.isArray(suggestions) || suggestions.length === 0) {
      return res.status(400).json({ error: 'suggestions array is required' });
    }
    
    // Получаем страницу
    const pageResult = await pool.query('SELECT * FROM pages WHERE id = $1', [pageId]);
    if (pageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }
    
    let page = pageResult.rows[0];
    let html = page.body || '';
    const addedLinks = [];
    
    // Добавляем ссылки
    for (const suggestion of suggestions.slice(0, maxLinks)) {
      if (suggestion.alreadyLinked) continue;
      
      const targetUrl = suggestion.url || (suggestion.slug.startsWith('/') ? suggestion.slug : '/' + suggestion.slug);
      const keyword = suggestion.keywords && suggestion.keywords.length > 0 
        ? suggestion.keywords[0] 
        : suggestion.title.split(' ')[0];
      
      const newHtml = insertLink(html, keyword, targetUrl, suggestion.title);
      
      if (newHtml !== html) {
        html = newHtml;
        addedLinks.push({
          keyword,
          targetUrl,
          targetTitle: suggestion.title
        });
      }
    }
    
    // Сохраняем обновленный HTML
    await pool.query(
      'UPDATE pages SET body = $1, updated_at = NOW() WHERE id = $2',
      [html, pageId]
    );
    
    res.json({
      success: true,
      pageId,
      addedLinks: addedLinks.length,
      links: addedLinks
    });
  } catch (error) {
    console.error('[internalLinking] Error adding links:', error);
    res.status(500).json({ error: error.message });
  }
});

// Массовая оптимизация перелинковки для всех страниц
router.post('/optimize-all', requireAuth, async (req, res) => {
  try {
    const { maxLinksPerPage = 3, minRelevance = 20 } = req.body;
    
    const pagesResult = await pool.query(
      `SELECT id, slug, title, body 
       FROM pages 
       WHERE is_published = TRUE
       ORDER BY updated_at DESC`
    );
    
    const results = [];
    
    for (const page of pagesResult.rows) {
      const sourceText = extractText(page.body || '');
      const sourceKeywords = extractKeywords(sourceText);
      
      // Получаем релевантные страницы
      const otherPagesResult = await pool.query(
        `SELECT id, slug, title, body, seo_title, seo_keywords 
         FROM pages 
         WHERE is_published = TRUE 
         AND id != $1`,
        [page.id]
      );
      
      const relevances = [];
      for (const targetPage of otherPagesResult.rows) {
        const targetText = extractText(targetPage.body || '');
        const targetKeywords = targetPage.seo_keywords || extractKeywords(targetText);
        const targetTitle = targetPage.seo_title || targetPage.title;
        
        const relevance = calculateRelevance(
          sourceText,
          targetTitle,
          targetKeywords,
          targetText
        );
        
        if (relevance >= minRelevance) {
          relevances.push({
            pageId: targetPage.id,
            slug: targetPage.slug,
            title: targetPage.title,
            relevance
          });
        }
      }
      
      relevances.sort((a, b) => b.relevance - a.relevance);
      
      // Проверяем существующие ссылки
      const existingLinks = [];
      const linkMatches = (page.body || '').match(/<a[^>]+href=["']([^"']+)["'][^>]*>/gi);
      if (linkMatches) {
        linkMatches.forEach(link => {
          const hrefMatch = link.match(/href=["']([^"']+)["']/i);
          if (hrefMatch) {
            existingLinks.push(hrefMatch[1]);
          }
        });
      }
      
      const suggestions = relevances
        .slice(0, maxLinksPerPage)
        .filter(rel => !existingLinks.some(link => link.includes(rel.slug)));
      
      results.push({
        pageId: page.id,
        slug: page.slug,
        suggestionsCount: suggestions.length,
        existingLinksCount: existingLinks.length
      });
    }
    
    res.json({
      total: results.length,
      withSuggestions: results.filter(r => r.suggestionsCount > 0).length,
      results
    });
  } catch (error) {
    console.error('[internalLinking] Error optimizing all:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получить статистику перелинковки
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const statsResult = await pool.query(
      `SELECT 
        COUNT(*) as total_pages,
        AVG(
          (SELECT COUNT(*) FROM regexp_split_to_table(body, '<a[^>]+href') WHERE body IS NOT NULL) - 1
        ) as avg_links_per_page,
        SUM(
          CASE WHEN body LIKE '%<a%href%' THEN 1 ELSE 0 END
        ) as pages_with_links
       FROM pages 
       WHERE is_published = TRUE`
    );
    
    res.json({ stats: statsResult.rows[0] });
  } catch (error) {
    console.error('[internalLinking] Error getting stats:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;







