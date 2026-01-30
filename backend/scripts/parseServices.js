import * as cheerio from 'cheerio';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Парсинг requestdesign.ru
async function parseRequestDesign() {
  try {
    console.log('Парсинг requestdesign.ru...');
    const html = await fetchUrl('https://requestdesign.ru/uslugi/');
    const $ = cheerio.load(html);
    
    const services = [];
    const selectors = [
      '.service-card', '.service-item', '.usluga-item', 
      'article', '.service', '[class*="service"]', '[class*="usluga"]'
    ];
    
    selectors.forEach(selector => {
      $(selector).each((i, elem) => {
        const $elem = $(elem);
        const title = $elem.find('h2, h3, .title, .service-title').first().text().trim() ||
                     $elem.text().split('\n')[0].trim();
        const description = $elem.find('.description, .text, p').first().text().trim();
        const link = $elem.find('a').first().attr('href') || $elem.attr('href');
        const price = $elem.find('.price, .cost').first().text().trim();
        const image = $elem.find('img').first().attr('src');
        
        if (title && title.length > 3 && title.length < 200) {
          services.push({
            title,
            description: description || null,
            link: link ? (link.startsWith('http') ? link : `https://requestdesign.ru${link}`) : null,
            price: price || null,
            image: image ? (image.startsWith('http') ? image : `https://requestdesign.ru${image}`) : null,
            source: 'requestdesign.ru'
          });
        }
      });
    });
    
    // Дедупликация по названию
    const unique = [];
    const seen = new Set();
    services.forEach(s => {
      const key = s.title.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(s);
      }
    });
    
    console.log(`Найдено услуг: ${unique.length}`);
    return unique;
  } catch (error) {
    console.error('Ошибка парсинга requestdesign.ru:', error.message);
    return [];
  }
}

// Парсинг prom8.ru
async function parseProm8() {
  try {
    console.log('Парсинг prom8.ru...');
    const html = await fetchUrl('https://prom8.ru');
    const $ = cheerio.load(html);
    
    const services = [];
    const selectors = [
      'a[href*="uslugi"]', 'a[href*="service"]', 
      '.service', '.usluga', '[class*="service"]', 
      'nav a', '.menu a', '.services a'
    ];
    
    selectors.forEach(selector => {
      $(selector).each((i, elem) => {
        const $elem = $(elem);
        const title = $elem.text().trim() || $elem.find('h2, h3').first().text().trim();
        const href = $elem.attr('href');
        
        if (title && title.length > 3 && title.length < 100 && 
            !title.match(/^(главная|о нас|контакты|home|about|contact)$/i)) {
          services.push({
            title,
            link: href ? (href.startsWith('http') ? href : `https://prom8.ru${href}`) : null,
            source: 'prom8.ru'
          });
        }
      });
    });
    
    // Дедупликация
    const unique = [];
    const seen = new Set();
    services.forEach(s => {
      const key = s.title.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(s);
      }
    });
    
    console.log(`Найдено услуг: ${unique.length}`);
    return unique;
  } catch (error) {
    console.error('Ошибка парсинга prom8.ru:', error.message);
    return [];
  }
}

// Парсинг veonix.ru
async function parseVeonix() {
  try {
    console.log('Парсинг veonix.ru...');
    const html = await fetchUrl('https://veonix.ru/services/');
    const $ = cheerio.load(html);
    
    const services = [];
    const selectors = [
      '.service-item', '.service', 'article', 
      '.services-list > *', '[class*="service"]'
    ];
    
    selectors.forEach(selector => {
      $(selector).each((i, elem) => {
        const $elem = $(elem);
        const title = $elem.find('h2, h3, .title, .service-title').first().text().trim() ||
                     $elem.text().split('\n')[0].trim();
        const description = $elem.find('.description, .text, p').first().text().trim();
        const link = $elem.find('a').first().attr('href') || $elem.attr('href');
        const price = $elem.find('.price, .cost').first().text().trim();
        
        if (title && title.length > 3 && title.length < 200) {
          services.push({
            title,
            description: description || null,
            link: link ? (link.startsWith('http') ? link : `https://veonix.ru${link}`) : null,
            price: price || null,
            source: 'veonix.ru'
          });
        }
      });
    });
    
    // Дедупликация
    const unique = [];
    const seen = new Set();
    services.forEach(s => {
      const key = s.title.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(s);
      }
    });
    
    console.log(`Найдено услуг: ${unique.length}`);
    return unique;
  } catch (error) {
    console.error('Ошибка парсинга veonix.ru:', error.message);
    return [];
  }
}

// Парсинг skobeeff.com
async function parseSkobeeff() {
  try {
    console.log('Парсинг skobeeff.com...');
    const html = await fetchUrl('https://skobeeff.com');
    const $ = cheerio.load(html);
    
    const services = [];
    const selectors = [
      '.service', '.usluga', 'section', 'article',
      '[class*="service"]', '[class*="usluga"]'
    ];
    
    selectors.forEach(selector => {
      $(selector).each((i, elem) => {
        const $elem = $(elem);
        const title = $elem.find('h2, h3, .title').first().text().trim() ||
                     $elem.text().split('\n')[0].trim();
        const description = $elem.find('.description, .text, p').first().text().trim();
        
        if (title && title.length > 3 && title.length < 200 && 
            !title.match(/^(главная|о нас|контакты|home|about|contact)$/i)) {
          services.push({
            title,
            description: description || null,
            source: 'skobeeff.com'
          });
        }
      });
    });
    
    // Дедупликация
    const unique = [];
    const seen = new Set();
    services.forEach(s => {
      const key = s.title.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(s);
      }
    });
    
    console.log(`Найдено услуг: ${unique.length}`);
    return unique;
  } catch (error) {
    console.error('Ошибка парсинга skobeeff.com:', error.message);
    return [];
  }
}

// Парсинг kokocgroup.ru
async function parseKokocGroup() {
  try {
    console.log('Парсинг kokocgroup.ru...');
    const html = await fetchUrl('https://kokocgroup.ru');
    const $ = cheerio.load(html);
    
    const services = [];
    const selectors = [
      '.service', '.usluga', '.service-item', 'article',
      '[class*="service"]', '[class*="usluga"]'
    ];
    
    selectors.forEach(selector => {
      $(selector).each((i, elem) => {
        const $elem = $(elem);
        const title = $elem.find('h2, h3, .title, .service-title').first().text().trim() ||
                     $elem.text().split('\n')[0].trim();
        const description = $elem.find('.description, .text, p').first().text().trim();
        const link = $elem.find('a').first().attr('href') || $elem.attr('href');
        
        if (title && title.length > 3 && title.length < 200) {
          services.push({
            title,
            description: description || null,
            link: link ? (link.startsWith('http') ? link : `https://kokocgroup.ru${link}`) : null,
            source: 'kokocgroup.ru'
          });
        }
      });
    });
    
    // Дедупликация
    const unique = [];
    const seen = new Set();
    services.forEach(s => {
      const key = s.title.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(s);
      }
    });
    
    console.log(`Найдено услуг: ${unique.length}`);
    return unique;
  } catch (error) {
    console.error('Ошибка парсинга kokocgroup.ru:', error.message);
    return [];
  }
}

// Дедупликация услуг
function deduplicateServices(allServices) {
  const seen = new Map();
  const unique = [];
  
  for (const service of allServices) {
    const key = service.title.toLowerCase().trim();
    
    // Проверяем, не похожа ли услуга на уже существующую
    let isDuplicate = false;
    for (const [existingKey, existingService] of seen.entries()) {
      // Простая проверка на схожесть
      if (key.includes(existingKey) || existingKey.includes(key)) {
        // Если новая услуга имеет больше информации, заменяем
        if (service.description && !existingService.description) {
          existingService.description = service.description;
        }
        if (service.price && !existingService.price) {
          existingService.price = service.price;
        }
        if (service.link && !existingService.link) {
          existingService.link = service.link;
        }
        isDuplicate = true;
        break;
      }
    }
    
    if (!isDuplicate) {
      seen.set(key, service);
      unique.push(service);
    }
  }
  
  return unique;
}

// Создание slug из названия
function createSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// Генерация SEO текста
function generateSEOText(title, description) {
  const seoText = `
${title} - профессиональная услуга от нашей команды. 

${description || 'Мы предлагаем высококачественное решение для ваших задач. Опытные специалисты, современные технологии и индивидуальный подход к каждому клиенту.'}

Заказать ${title.toLowerCase()} можно прямо сейчас. Свяжитесь с нами для консультации и расчета стоимости.
  `.trim();
  
  return seoText;
}

// Генерация тегов на основе названия услуги
function generateTags(title, description) {
  const tags = [];
  const titleLower = title.toLowerCase();
  
  // Ключевые слова для категоризации
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
  
  // Проверяем ключевые слова
  for (const [tag, keywordsList] of Object.entries(keywords)) {
    if (keywordsList.some(keyword => titleLower.includes(keyword) || (description && description.toLowerCase().includes(keyword)))) {
      tags.push(tag);
    }
  }
  
  // Добавляем общие теги
  if (tags.length === 0) {
    tags.push('услуга');
  }
  
  return tags;
}

// Сохранение услуг в базу данных
async function saveServicesToDB(services) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    let saved = 0;
    let skipped = 0;
    
    for (const service of services) {
      const slug = createSlug(service.title);
      
      // Проверяем, существует ли уже товар с таким slug
      const existing = await client.query(
        'SELECT id FROM products WHERE slug = $1',
        [slug]
      );
      
      if (existing.rows.length > 0) {
        console.log(`Пропуск: ${service.title} (уже существует)`);
        skipped++;
        continue;
      }
      
      // Создаем описание
      const description = service.description || `Услуга ${service.title}. Профессиональное выполнение, индивидуальный подход, гарантия качества.`;
      
      // Генерируем SEO текст
      const seoText = generateSEOText(service.title, description);
      
      // Генерируем теги
      const tags = generateTags(service.title, description);
      
      // Вставляем товар
      await client.query(
        `INSERT INTO products (
          slug, title, description_html, price_cents, currency,
          is_active, sort_order, tags, image_url, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
        [
          slug,
          service.title,
          `<p>${description}</p><p>${seoText}</p>`,
          0, // Цена будет установлена позже
          'RUB',
          true,
          saved,
          tags,
          service.image || null
        ]
      );
      
      console.log(`Сохранено: ${service.title}`);
      saved++;
    }
    
    await client.query('COMMIT');
    console.log(`\n✅ Сохранено товаров: ${saved}, пропущено: ${skipped}`);
    
    return { saved, skipped };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Ошибка сохранения в БД:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Основная функция
async function main() {
  console.log('🚀 Начало парсинга услуг...\n');
  
  const allServices = [];
  
  // Парсим все сайты
  const [requestDesign, prom8, veonix, skobeeff, kokocGroup] = await Promise.all([
    parseRequestDesign(),
    parseProm8(),
    parseVeonix(),
    parseSkobeeff(),
    parseKokocGroup()
  ]);
  
  allServices.push(...requestDesign, ...prom8, ...veonix, ...skobeeff, ...kokocGroup);
  
  console.log(`\n📊 Всего найдено услуг: ${allServices.length}`);
  
  // Дедупликация
  const uniqueServices = deduplicateServices(allServices);
  console.log(`📊 Уникальных услуг: ${uniqueServices.length}`);
  
  // Сохраняем в базу данных
  await saveServicesToDB(uniqueServices);
  
  // Сохраняем в JSON для просмотра
  const jsonPath = path.join(__dirname, '../data/parsed_services.json');
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(uniqueServices, null, 2));
  console.log(`\n💾 Данные сохранены в: ${jsonPath}`);
  
  await pool.end();
  console.log('\n✅ Парсинг завершен!');
}

main().catch(console.error);
