import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Получить базовый URL из переменных окружения или использовать дефолтный
const BASE_URL = process.env.SITE_URL || 'https://prime-coder.ru';

// Функция для форматирования даты в формат ISO
function formatDate(date) {
  if (!date) return new Date().toISOString().split('T')[0];
  if (date instanceof Date) {
    return date.toISOString().split('T')[0];
  }
  // Если это строка, пытаемся распарсить
  try {
    return new Date(date).toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

// Функция для определения приоритета страницы
function getPriority(slug, type = 'page') {
  // Главная страница - максимальный приоритет
  if (slug === '/' || slug === '') return '1.0';
  
  // Важные разделы
  if (['/catalog', '/services', '/about', '/contacts'].includes(slug)) return '0.9';
  
  // Услуги и продукты
  if (type === 'product') return '0.8';
  if (type === 'case') return '0.7';
  
  // Блог
  if (type === 'blog') return '0.6';
  
  // Остальные страницы
  return '0.5';
}

// Функция для определения частоты обновления
function getChangeFreq(slug, type = 'page', updatedAt) {
  // Главная страница - ежедневно
  if (slug === '/' || slug === '') return 'daily';
  
  // Каталог и услуги - еженедельно
  if (['/catalog', '/services'].includes(slug)) return 'weekly';
  
  // Блог - еженедельно
  if (type === 'blog') return 'weekly';
  
  // Кейсы и продукты - ежемесячно
  if (type === 'case' || type === 'product') return 'monthly';
  
  // Остальные - ежемесячно
  return 'monthly';
}

// Генерация XML sitemap
router.get('/sitemap.xml', async (req, res) => {
  try {
    const urls = [];
    
    // 1. Главная страница
    urls.push({
      loc: BASE_URL + '/',
      lastmod: formatDate(new Date()),
      changefreq: 'daily',
      priority: '1.0'
    });
    
    // 2. Публичные страницы
    const pagesResult = await pool.query(
      `SELECT slug, updated_at, robots_index 
       FROM pages 
       WHERE is_published = TRUE 
       AND (robots_index IS NULL OR robots_index = TRUE)
       ORDER BY updated_at DESC`
    );
    
    for (const page of pagesResult.rows) {
      const slug = page.slug === '/' ? '' : page.slug;
      urls.push({
        loc: BASE_URL + slug,
        lastmod: formatDate(page.updated_at),
        changefreq: getChangeFreq(page.slug, 'page', page.updated_at),
        priority: getPriority(page.slug, 'page')
      });
    }
    
    // 3. Блог посты
    const blogResult = await pool.query(
      `SELECT slug, updated_at 
       FROM blog_posts 
       WHERE is_published = TRUE 
       ORDER BY updated_at DESC`
    );
    
    for (const post of blogResult.rows) {
      urls.push({
        loc: BASE_URL + '/blog/' + post.slug,
        lastmod: formatDate(post.updated_at),
        changefreq: getChangeFreq(post.slug, 'blog', post.updated_at),
        priority: getPriority(post.slug, 'blog')
      });
    }
    
    // 4. Категории блога
    const categoriesResult = await pool.query(
      `SELECT slug FROM blog_categories ORDER BY id`
    );
    
    for (const category of categoriesResult.rows) {
      urls.push({
        loc: BASE_URL + '/blog/category/' + category.slug,
        lastmod: formatDate(new Date()),
        changefreq: 'weekly',
        priority: '0.7'
      });
    }
    
    // 5. Продукты
    const productsResult = await pool.query(
      `SELECT slug, updated_at 
       FROM products 
       WHERE is_active = TRUE 
       ORDER BY updated_at DESC`
    );
    
    for (const product of productsResult.rows) {
      urls.push({
        loc: BASE_URL + '/products/' + product.slug,
        lastmod: formatDate(product.updated_at),
        changefreq: getChangeFreq(product.slug, 'product', product.updated_at),
        priority: getPriority(product.slug, 'product')
      });
    }
    
    // 6. Кейсы
    const casesResult = await pool.query(
      `SELECT slug, updated_at 
       FROM cases 
       WHERE is_published = TRUE 
       ORDER BY updated_at DESC`
    );
    
    for (const caseItem of casesResult.rows) {
      urls.push({
        loc: BASE_URL + '/cases/' + caseItem.slug,
        lastmod: formatDate(caseItem.updated_at),
        changefreq: getChangeFreq(caseItem.slug, 'case', caseItem.updated_at),
        priority: getPriority(caseItem.slug, 'case')
      });
    }
    
    // 7. Статические важные страницы
    const staticPages = [
      { path: '/catalog', priority: '0.9', changefreq: 'weekly' },
      { path: '/blog', priority: '0.8', changefreq: 'weekly' },
      { path: '/contacts', priority: '0.7', changefreq: 'monthly' },
      { path: '/about', priority: '0.7', changefreq: 'monthly' }
    ];
    
    for (const staticPage of staticPages) {
      // Проверяем, не добавлена ли уже эта страница из базы
      if (!urls.find(u => u.loc === BASE_URL + staticPage.path)) {
        urls.push({
          loc: BASE_URL + staticPage.path,
          lastmod: formatDate(new Date()),
          changefreq: staticPage.changefreq,
          priority: staticPage.priority
        });
      }
    }
    
    // Генерируем XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urls.map(url => `  <url>
    <loc>${escapeXml(url.loc)}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('[sitemap] Error generating sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

// Функция для экранирования XML
function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

export default router;







