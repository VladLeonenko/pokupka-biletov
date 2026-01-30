import express from 'express';
import * as cheerio from 'cheerio';
import https from 'https';
import http from 'http';
import pool from '../db.js';

const router = express.Router();

// Функция для получения HTML страницы
function fetchUrl(url, retries = 3) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const request = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });
    
    request.on('error', (err) => {
      reject(err);
    });
    
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  }).catch(async (error) => {
    if (retries > 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchUrl(url, retries - 1);
    }
    throw error;
  });
}

// Функция парсинга услуг со страницы
async function parseServicesFromUrl(url) {
  try {
    const html = await fetchUrl(url);
    const $ = cheerio.load(html);
    
    const services = [];
    const selectors = [
      '.service-card', '.service-item', '.usluga-item', 
      'article', '.service', '[class*="service"]', '[class*="usluga"]',
      '.product-card', '.product-item', '[class*="product"]'
    ];
    
    const seen = new Set();
    
    selectors.forEach(selector => {
      $(selector).each((i, elem) => {
        const $elem = $(elem);
        const title = $elem.find('h2, h3, .title, .service-title, .product-title').first().text().trim() ||
                     $elem.text().split('\n')[0].trim();
        const description = $elem.find('.description, .text, p').first().text().trim();
        const link = $elem.find('a').first().attr('href') || $elem.attr('href');
        const price = $elem.find('.price, .cost, .price-value').first().text().trim();
        const image = $elem.find('img').first().attr('src');
        
        if (title && title.length > 3 && title.length < 200) {
          const key = title.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            services.push({
              title,
              description: description || null,
              link: link ? (link.startsWith('http') ? link : new URL(link, url).href) : null,
              price: price || null,
              image: image ? (image.startsWith('http') ? image : new URL(image, url).href) : null,
            });
          }
        }
      });
    });
    
    return services;
  } catch (error) {
    throw new Error(`Ошибка парсинга: ${error.message}`);
  }
}

// Роут для парсинга URL
router.post('/parse', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL required' });
    }
    
    const services = await parseServicesFromUrl(url);
    res.json({ services, count: services.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Роут для импорта услуг в базу данных
router.post('/import', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { services } = req.body;
    if (!Array.isArray(services)) {
      return res.status(400).json({ error: 'services array required' });
    }
    
    let saved = 0;
    let skipped = 0;
    
    for (const service of services) {
      if (!service.title) continue;
      
      // Создаем slug
      const slug = service.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      
      if (!slug) continue;
      
      // Проверяем существование по slug (точное совпадение)
      const existingBySlug = await client.query(
        'SELECT id, title FROM products WHERE slug = $1',
        [slug]
      );
      
      if (existingBySlug.rows.length > 0) {
        skipped++;
        continue;
      }
      
      // Проверяем существование по похожему названию (нечеткое совпадение)
      // Ищем товары с похожим названием (без учета регистра и пробелов)
      const existingByTitle = await client.query(
        `SELECT id, title FROM products 
         WHERE LOWER(REPLACE(title, ' ', '')) = LOWER(REPLACE($1, ' ', ''))
         OR LOWER(title) = LOWER($1)
         LIMIT 1`,
        [service.title]
      );
      
      if (existingByTitle.rows.length > 0) {
        skipped++;
        continue;
      }
      
      // Генерируем описание и SEO
      const description = service.description || `Услуга ${service.title}. Профессиональное выполнение, индивидуальный подход, гарантия качества.`;
      const seoText = `${service.title} - профессиональная услуга от нашей команды. ${description} Заказать ${service.title.toLowerCase()} можно прямо сейчас. Свяжитесь с нами для консультации и расчета стоимости.`;
      
      // Генерируем теги
      const tags = [];
      const titleLower = service.title.toLowerCase();
      const keywords = {
        'дизайн': ['дизайн', 'design'],
        'разработка': ['разработка', 'development', 'программирование'],
        'маркетинг': ['маркетинг', 'marketing', 'продвижение', 'реклама'],
        'seo': ['seo', 'продвижение', 'оптимизация'],
        'smm': ['smm', 'социальные сети', 'соцсети'],
        'контент': ['контент', 'content', 'копирайтинг'],
        'веб': ['веб', 'web', 'сайт', 'интернет'],
        'мобильное': ['мобильное', 'mobile', 'приложение'],
        'брендинг': ['брендинг', 'бренд', 'branding'],
        'аналитика': ['аналитика', 'analytics', 'метрики']
      };
      
      for (const [tag, keywordsList] of Object.entries(keywords)) {
        if (keywordsList.some(keyword => titleLower.includes(keyword) || (description && description.toLowerCase().includes(keyword)))) {
          tags.push(tag);
        }
      }
      
      if (tags.length === 0) {
        tags.push('услуга');
      }
      
      // Получаем максимальный sort_order
      const maxOrderResult = await client.query('SELECT COALESCE(MAX(sort_order), 0) as max_order FROM products');
      const maxOrder = maxOrderResult.rows[0].max_order || 0;
      
      // Вставляем товар (неактивный по умолчанию)
      await client.query(
        `INSERT INTO products (
          slug, title, description_html, price_cents, currency,
          is_active, sort_order, tags, image_url, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
        [
          slug,
          service.title,
          `<p>${description}</p><p>${seoText}</p>`,
          0,
          'RUB',
          false, // Неактивный по умолчанию
          maxOrder + 1,
          tags,
          service.image || null
        ]
      );
      
      saved++;
    }
    
    await client.query('COMMIT');
    res.json({ saved, skipped, total: services.length });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

export default router;

