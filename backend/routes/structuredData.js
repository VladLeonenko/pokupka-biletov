import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Конфигурация
const SEO_CONFIG = {
  brandName: process.env.SEO_BRAND_NAME || 'PrimeCoder',
  siteUrl: process.env.SITE_URL || 'https://prime-coder.ru',
  logoUrl: process.env.SEO_LOGO_URL || 'https://prime-coder.ru/logo.png',
  lang: 'ru'
};

// Функция для извлечения структурированных данных из HTML
function extractStructuredData(html) {
  const structuredData = [];
  
  // Ищем все script теги с type="application/ld+json"
  const scriptMatches = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  
  if (scriptMatches) {
    scriptMatches.forEach(script => {
      const contentMatch = script.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
      if (contentMatch) {
        try {
          const json = JSON.parse(contentMatch[1]);
          structuredData.push(json);
        } catch (e) {
          console.warn('[structuredData] Failed to parse JSON-LD:', e);
        }
      }
    });
  }
  
  return structuredData;
}

// Валидация структурированных данных
function validateStructuredData(data) {
  const errors = [];
  const warnings = [];
  
  if (!data['@context']) {
    errors.push('Отсутствует @context');
  } else if (data['@context'] !== 'https://schema.org') {
    warnings.push('@context должен быть https://schema.org');
  }
  
  if (!data['@type']) {
    errors.push('Отсутствует @type');
  }
  
  // Валидация в зависимости от типа
  switch (data['@type']) {
    case 'Organization':
      if (!data.name) warnings.push('Organization должен иметь name');
      if (!data.url) warnings.push('Organization должен иметь url');
      break;
      
    case 'WebPage':
      if (!data.name) warnings.push('WebPage должен иметь name');
      if (!data.description) warnings.push('WebPage должен иметь description');
      break;
      
    case 'Article':
      if (!data.headline) errors.push('Article должен иметь headline');
      if (!data.author) warnings.push('Article должен иметь author');
      if (!data.publisher) warnings.push('Article должен иметь publisher');
      break;
      
    case 'Product':
      if (!data.name) errors.push('Product должен иметь name');
      if (!data.description) warnings.push('Product должен иметь description');
      break;
      
    case 'Service':
      if (!data.name) errors.push('Service должен иметь name');
      if (!data.description) warnings.push('Service должен иметь description');
      break;
      
    case 'BreadcrumbList':
      if (!data.itemListElement || !Array.isArray(data.itemListElement)) {
        errors.push('BreadcrumbList должен иметь itemListElement массив');
      }
      break;
  }
  
  return { errors, warnings, isValid: errors.length === 0 };
}

// Генерация Organization schema
function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SEO_CONFIG.brandName,
    url: SEO_CONFIG.siteUrl,
    logo: SEO_CONFIG.logoUrl ? {
      '@type': 'ImageObject',
      url: SEO_CONFIG.logoUrl
    } : undefined,
    sameAs: [
      // Можно добавить ссылки на соцсети
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: [SEO_CONFIG.lang]
    }
  };
}

// Генерация WebPage schema
function generateWebPageSchema(title, description, url, breadcrumbs = null) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description: description,
    url: url,
    inLanguage: SEO_CONFIG.lang,
    isPartOf: {
      '@type': 'WebSite',
      name: SEO_CONFIG.brandName,
      url: SEO_CONFIG.siteUrl
    }
  };
  
  if (breadcrumbs) {
    schema.breadcrumb = breadcrumbs;
  }
  
  return schema;
}

// Генерация Article schema
function generateArticleSchema(title, description, url, author, publishedDate, modifiedDate, imageUrl) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: description,
    author: {
      '@type': 'Organization',
      name: author || SEO_CONFIG.brandName
    },
    publisher: {
      '@type': 'Organization',
      name: SEO_CONFIG.brandName,
      logo: SEO_CONFIG.logoUrl ? {
        '@type': 'ImageObject',
        url: SEO_CONFIG.logoUrl
      } : undefined
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url
    },
    datePublished: publishedDate,
    dateModified: modifiedDate || publishedDate,
    image: imageUrl ? [imageUrl] : undefined,
    inLanguage: SEO_CONFIG.lang
  };
}

// Генерация Product schema
function generateProductSchema(name, description, url, price, currency = 'RUB', imageUrl) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: name,
    description: description,
    url: url,
    image: imageUrl ? [imageUrl] : undefined,
    offers: price ? {
      '@type': 'Offer',
      price: price,
      priceCurrency: currency,
      availability: 'https://schema.org/InStock'
    } : undefined
  };
}

// Генерация Service schema
function generateServiceSchema(name, description, url, serviceType, areaServed = 'RU') {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: name,
    description: description,
    url: url,
    serviceType: serviceType,
    provider: {
      '@type': 'Organization',
      name: SEO_CONFIG.brandName,
      url: SEO_CONFIG.siteUrl
    },
    areaServed: {
      '@type': 'Country',
      name: areaServed
    }
  };
}

// Генерация BreadcrumbList schema
function generateBreadcrumbSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  };
}

// Генерация FAQPage schema
function generateFAQSchema(faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  };
}

// Проверка структурированных данных на странице
router.post('/check', requireAuth, async (req, res) => {
  try {
    const { pageId, slug } = req.body;
    
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
    
    // Извлекаем структурированные данные из HTML
    const html = page.body || '';
    const existingStructured = extractStructuredData(html);
    
    // Проверяем structured_data в базе
    let dbStructured = null;
    if (page.structured_data) {
      dbStructured = typeof page.structured_data === 'string' 
        ? JSON.parse(page.structured_data) 
        : page.structured_data;
    }
    
    // Валидация
    const validationResults = [];
    if (dbStructured) {
      validationResults.push({
        source: 'database',
        data: dbStructured,
        ...validateStructuredData(dbStructured)
      });
    }
    
    existingStructured.forEach((data, index) => {
      validationResults.push({
        source: `html_${index}`,
        data: data,
        ...validateStructuredData(data)
      });
    });
    
    // Определяем, какие типы отсутствуют
    const existingTypes = new Set();
    if (dbStructured) existingTypes.add(dbStructured['@type']);
    existingStructured.forEach(sd => existingTypes.add(sd['@type']));
    
    const missingTypes = [];
    const pageUrl = `${SEO_CONFIG.siteUrl}${page.slug}`;
    
    // Рекомендуемые типы в зависимости от типа страницы
    if (!existingTypes.has('WebPage')) {
      missingTypes.push({
        type: 'WebPage',
        recommended: true,
        schema: generateWebPageSchema(
          page.seo_title || page.title,
          page.seo_description || '',
          pageUrl
        )
      });
    }
    
    if (!existingTypes.has('Organization') && (page.slug === '/' || page.slug === '/about')) {
      missingTypes.push({
        type: 'Organization',
        recommended: true,
        schema: generateOrganizationSchema()
      });
    }
    
    if (!existingTypes.has('BreadcrumbList')) {
      // Генерируем breadcrumbs на основе slug
      const breadcrumbs = [
        { name: 'Главная', url: SEO_CONFIG.siteUrl }
      ];
      
      const slugParts = page.slug.split('/').filter(Boolean);
      let currentPath = '';
      slugParts.forEach(part => {
        currentPath += '/' + part;
        breadcrumbs.push({
          name: part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' '),
          url: SEO_CONFIG.siteUrl + currentPath
        });
      });
      
      missingTypes.push({
        type: 'BreadcrumbList',
        recommended: true,
        schema: generateBreadcrumbSchema(breadcrumbs)
      });
    }
    
    res.json({
      pageId: page.id,
      slug: page.slug,
      existing: {
        database: dbStructured,
        html: existingStructured
      },
      validation: validationResults,
      missingTypes,
      recommendations: missingTypes.filter(mt => mt.recommended)
    });
  } catch (error) {
    console.error('[structuredData] Error checking:', error);
    res.status(500).json({ error: error.message });
  }
});

// Генерация и сохранение структурированных данных
router.post('/generate', requireAuth, async (req, res) => {
  try {
    const { pageId, types, slug } = req.body;
    
    if (!pageId && !slug) {
      return res.status(400).json({ error: 'pageId or slug is required' });
    }
    
    if (!types || !Array.isArray(types) || types.length === 0) {
      return res.status(400).json({ error: 'types array is required' });
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
    
    const pageUrl = `${SEO_CONFIG.siteUrl}${page.slug}`;
    const schemas = [];
    
    // Генерируем запрошенные типы
    for (const type of types) {
      switch (type) {
        case 'Organization':
          schemas.push(generateOrganizationSchema());
          break;
          
        case 'WebPage':
          schemas.push(generateWebPageSchema(
            page.seo_title || page.title,
            page.seo_description || '',
            pageUrl
          ));
          break;
          
        case 'Article':
          // Для блог постов
          schemas.push(generateArticleSchema(
            page.seo_title || page.title,
            page.seo_description || '',
            pageUrl,
            SEO_CONFIG.brandName,
            page.created_at,
            page.updated_at,
            null
          ));
          break;
          
        case 'BreadcrumbList':
          const breadcrumbs = [
            { name: 'Главная', url: SEO_CONFIG.siteUrl }
          ];
          const slugParts = page.slug.split('/').filter(Boolean);
          let currentPath = '';
          slugParts.forEach(part => {
            currentPath += '/' + part;
            breadcrumbs.push({
              name: part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' '),
              url: SEO_CONFIG.siteUrl + currentPath
            });
          });
          schemas.push(generateBreadcrumbSchema(breadcrumbs));
          break;
          
        default:
          console.warn(`[structuredData] Unknown type: ${type}`);
      }
    }
    
    // Объединяем все схемы в один объект или массив
    let finalSchema;
    if (schemas.length === 1) {
      finalSchema = schemas[0];
    } else {
      // Если несколько схем, можно использовать массив или объединить
      finalSchema = schemas[0]; // Сохраняем первую как основную
      // Остальные можно добавить в отдельное поле или объединить
    }
    
    // Сохраняем в базу данных
    await pool.query(
      `UPDATE pages 
       SET structured_data = $1::jsonb, 
           updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(finalSchema), page.id]
    );
    
    res.json({
      success: true,
      pageId: page.id,
      schemas: schemas,
      saved: finalSchema
    });
  } catch (error) {
    console.error('[structuredData] Error generating:', error);
    res.status(500).json({ error: error.message });
  }
});

// Массовая проверка всех страниц
router.post('/check-all', requireAuth, async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.body;
    
    const pagesResult = await pool.query(
      `SELECT id, slug, title, body, structured_data, seo_title, seo_description
       FROM pages 
       WHERE is_published = TRUE
       ORDER BY updated_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    
    const results = [];
    
    for (const page of pagesResult.rows) {
      const html = page.body || '';
      const existingStructured = extractStructuredData(html);
      const dbStructured = page.structured_data 
        ? (typeof page.structured_data === 'string' ? JSON.parse(page.structured_data) : page.structured_data)
        : null;
      
      const existingTypes = new Set();
      if (dbStructured) existingTypes.add(dbStructured['@type']);
      existingStructured.forEach(sd => existingTypes.add(sd['@type']));
      
      const hasWebPage = existingTypes.has('WebPage');
      const hasOrganization = existingTypes.has('Organization');
      const hasBreadcrumb = existingTypes.has('BreadcrumbList');
      
      results.push({
        id: page.id,
        slug: page.slug,
        hasStructuredData: !!(dbStructured || existingStructured.length > 0),
        types: Array.from(existingTypes),
        missing: {
          WebPage: !hasWebPage,
          Organization: !hasOrganization && (page.slug === '/' || page.slug === '/about'),
          BreadcrumbList: !hasBreadcrumb
        }
      });
    }
    
    const stats = {
      total: results.length,
      withStructuredData: results.filter(r => r.hasStructuredData).length,
      missingWebPage: results.filter(r => r.missing.WebPage).length,
      missingOrganization: results.filter(r => r.missing.Organization).length,
      missingBreadcrumb: results.filter(r => r.missing.BreadcrumbList).length
    };
    
    res.json({
      stats,
      results
    });
  } catch (error) {
    console.error('[structuredData] Error checking all:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;







