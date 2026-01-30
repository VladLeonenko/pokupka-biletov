import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Конфигурация для SEO оптимизации
const SEO_CONFIG = {
  brandName: process.env.SEO_BRAND_NAME || 'PrimeCoder',
  siteUrl: process.env.SITE_URL || 'https://prime-coder.ru',
  logoUrl: process.env.SEO_LOGO_URL || 'https://prime-coder.ru/logo.png',
  lang: 'ru'
};

// Функция для получения SEO рекомендаций
async function getSEORecommendations(slug, title, html, type = 'WebPage') {
  try {
    // Используем внутренний API через прямой вызов
    // Если API недоступен, используем fallback логику
    const response = await fetch(`http://localhost:${process.env.PORT || 3000}/api/seo/suggest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        slug,
        title,
        html,
        type,
        brandName: SEO_CONFIG.brandName,
        siteUrl: SEO_CONFIG.siteUrl,
        logoUrl: SEO_CONFIG.logoUrl,
        lang: SEO_CONFIG.lang
      })
    }).catch(() => null);

    if (response && response.ok) {
      return await response.json();
    }

    // Fallback: используем упрощенную логику
    return generateFallbackSEO(slug, title, html, type);
  } catch (error) {
    console.error(`[seoOptimize] Error getting SEO recommendations for ${slug}:`, error);
    return generateFallbackSEO(slug, title, html, type);
  }
}

// Упрощенная генерация SEO без AI
function generateFallbackSEO(slug, title, html, type = 'WebPage') {
  function truncate(str, n) {
    return (str || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
  }

  let metaTitle = (title || '').trim();
  if (metaTitle.length > 60) {
    metaTitle = metaTitle.slice(0, 57) + '...';
  }
  if (metaTitle.length < 40 && SEO_CONFIG.brandName) {
    const withBrand = `${metaTitle} | ${SEO_CONFIG.brandName}`;
    if (withBrand.length <= 60) {
      metaTitle = withBrand;
    }
  }

  const plain = truncate(html || '', 1000);
  const metaDescription = truncate(plain, 155);
  const canonicalUrl = `${SEO_CONFIG.siteUrl}${slug}`;

  // Простая структурированная разметка
  let structured = {
    '@context': 'https://schema.org',
    '@type': type === 'Article' ? 'Article' : 'WebPage',
    name: metaTitle,
    description: metaDescription,
    url: canonicalUrl,
    inLanguage: SEO_CONFIG.lang
  };

  if (type === 'Article') {
    structured.headline = metaTitle;
    structured.author = {
      '@type': 'Organization',
      name: SEO_CONFIG.brandName
    };
  }

  return {
    metaTitle,
    metaDescription,
    ogTitle: metaTitle,
    ogDescription: metaDescription,
    ogImageUrl: SEO_CONFIG.logoUrl,
    canonicalUrl,
    robotsIndex: true,
    robotsFollow: true,
    twitterCard: 'summary_large_image',
    twitterSite: '',
    twitterCreator: '',
    structuredDataJson: JSON.stringify(structured, null, 2),
    hreflang: []
  };
}

// Оптимизировать одну страницу
async function optimizePage(pageId, slug, title, body, type = 'WebPage') {
  try {
    const seo = await getSEORecommendations(slug, title, body, type);
    
    if (!seo) {
      return { success: false, error: 'Failed to get SEO recommendations' };
    }

    // Обновляем страницу с SEO данными
    await pool.query(
      `UPDATE pages 
       SET seo_title = $1,
           seo_description = $2,
           canonical_url = $3,
           robots_index = COALESCE($4, TRUE),
           robots_follow = COALESCE($5, TRUE),
           og_title = $6,
           og_description = $7,
           og_image_url = $8,
           twitter_card = $9,
           twitter_site = $10,
           twitter_creator = $11,
           structured_data = $12::jsonb,
           hreflang = $13::jsonb,
           updated_at = NOW()
       WHERE id = $14`,
      [
        seo.metaTitle,
        seo.metaDescription,
        seo.canonicalUrl,
        seo.robotsIndex,
        seo.robotsFollow,
        seo.ogTitle,
        seo.ogDescription,
        seo.ogImageUrl,
        seo.twitterCard,
        seo.twitterSite,
        seo.twitterCreator,
        seo.structuredDataJson ? JSON.parse(seo.structuredDataJson) : null,
        seo.hreflang ? JSON.stringify(seo.hreflang) : '[]',
        pageId
      ]
    );

    return { success: true, seo };
  } catch (error) {
    console.error(`[seoOptimize] Error optimizing page ${pageId}:`, error);
    return { success: false, error: error.message };
  }
}

// Оптимизировать один блог пост
async function optimizeBlogPost(postId, slug, title, body) {
  try {
    const seo = await getSEORecommendations(`/blog/${slug}`, title, body, 'Article');
    
    if (!seo) {
      return { success: false, error: 'Failed to get SEO recommendations' };
    }

    await pool.query(
      `UPDATE blog_posts 
       SET seo_title = $1,
           seo_description = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [seo.metaTitle, seo.metaDescription, postId]
    );

    return { success: true, seo };
  } catch (error) {
    console.error(`[seoOptimize] Error optimizing blog post ${postId}:`, error);
    return { success: false, error: error.message };
  }
}

// Массовая оптимизация всех страниц
router.post('/pages/bulk', requireAuth, async (req, res) => {
  try {
    const { type, limit, offset } = req.body;
    const limitValue = limit || 100;
    const offsetValue = offset || 0;

    // Получаем все опубликованные страницы
    const pagesResult = await pool.query(
      `SELECT id, slug, title, body 
       FROM pages 
       WHERE is_published = TRUE 
       ORDER BY updated_at DESC
       LIMIT $1 OFFSET $2`,
      [limitValue, offsetValue]
    );

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const page of pagesResult.rows) {
      // Определяем тип страницы
      let pageType = 'WebPage';
      if (page.slug.includes('/blog/')) {
        pageType = 'Article';
      } else if (page.slug === '/about' || page.slug === '/') {
        pageType = 'Organization';
      }

      const result = await optimizePage(
        page.id,
        page.slug,
        page.title,
        page.body,
        pageType
      );

      results.push({
        id: page.id,
        slug: page.slug,
        ...result
      });

      if (result.success) {
        successCount++;
      } else {
        errorCount++;
      }

      // Небольшая задержка между запросами, чтобы не перегружать API
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    res.json({
      success: true,
      total: pagesResult.rows.length,
      optimized: successCount,
      errors: errorCount,
      results
    });
  } catch (error) {
    console.error('[seoOptimize] Error in bulk optimization:', error);
    res.status(500).json({ error: error.message });
  }
});

// Оптимизировать одну страницу
router.post('/pages/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body;

    const pageResult = await pool.query(
      'SELECT id, slug, title, body FROM pages WHERE id = $1',
      [id]
    );

    if (pageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }

    const page = pageResult.rows[0];
    let pageType = type || 'WebPage';
    
    if (page.slug.includes('/blog/')) {
      pageType = 'Article';
    } else if (page.slug === '/about' || page.slug === '/') {
      pageType = 'Organization';
    }

    const result = await optimizePage(
      page.id,
      page.slug,
      page.title,
      page.body,
      pageType
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('[seoOptimize] Error optimizing page:', error);
    res.status(500).json({ error: error.message });
  }
});

// Массовая оптимизация блог постов
router.post('/blog/bulk', requireAuth, async (req, res) => {
  try {
    const { limit, offset } = req.body;
    const limitValue = limit || 100;
    const offsetValue = offset || 0;

    const postsResult = await pool.query(
      `SELECT id, slug, title, body 
       FROM blog_posts 
       WHERE is_published = TRUE 
       ORDER BY updated_at DESC
       LIMIT $1 OFFSET $2`,
      [limitValue, offsetValue]
    );

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const post of postsResult.rows) {
      const result = await optimizeBlogPost(
        post.id,
        post.slug,
        post.title,
        post.body
      );

      results.push({
        id: post.id,
        slug: post.slug,
        ...result
      });

      if (result.success) {
        successCount++;
      } else {
        errorCount++;
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    res.json({
      success: true,
      total: postsResult.rows.length,
      optimized: successCount,
      errors: errorCount,
      results
    });
  } catch (error) {
    console.error('[seoOptimize] Error in bulk blog optimization:', error);
    res.status(500).json({ error: error.message });
  }
});

// Оптимизировать один блог пост
router.post('/blog/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const postResult = await pool.query(
      'SELECT id, slug, title, body FROM blog_posts WHERE id = $1',
      [id]
    );

    if (postResult.rows.length === 0) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    const post = postResult.rows[0];
    const result = await optimizeBlogPost(
      post.id,
      post.slug,
      post.title,
      post.body
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('[seoOptimize] Error optimizing blog post:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получить статистику SEO оптимизации
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const pagesStats = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN seo_title IS NOT NULL THEN 1 END) as with_seo_title,
        COUNT(CASE WHEN seo_description IS NOT NULL THEN 1 END) as with_seo_description,
        COUNT(CASE WHEN structured_data IS NOT NULL THEN 1 END) as with_structured_data
       FROM pages 
       WHERE is_published = TRUE`
    );

    const blogStats = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN seo_title IS NOT NULL THEN 1 END) as with_seo_title,
        COUNT(CASE WHEN seo_description IS NOT NULL THEN 1 END) as with_seo_description
       FROM blog_posts 
       WHERE is_published = TRUE`
    );

    res.json({
      pages: pagesStats.rows[0],
      blog: blogStats.rows[0]
    });
  } catch (error) {
    console.error('[seoOptimize] Error getting stats:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

