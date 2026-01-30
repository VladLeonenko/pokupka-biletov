import pool from '../db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.resolve(__dirname, '../../src');

// Pages to migrate
const pagesToMigrate = [
  'bitrix',
  'business-card-website',
  'cleancode-website',
  'corporate-website',
  'landing',
  'marketing',
  'online-shop',
  'opencart',
  'promo-website',
];

// Template from /ads
const ADS_TEMPLATE_SLUG = 'ads';

function extractTitle(html) {
  const m = html.match(/<title>(.*?)<\/title>/i);
  return (m?.[1] || '').trim();
}

function extractHeaderSection(html) {
  const headerMatch = html.match(/<div class="header-section[^"]*services-header[^"]*">\s*<h1>(.*?)<\/h1>\s*<p>(.*?)<\/p>([\s\S]*?)<\/div>\s*<\/section>/);
  if (!headerMatch) return null;
  
  const buttonsMatch = headerMatch[3].match(/<a[^>]*class="btn-small"[^>]*>(.*?)<\/a>\s*<a[^>]*class="btn-outline"[^>]*>(.*?)<\/a>/);
  
  return {
    title: headerMatch[1].trim(),
    description: headerMatch[2].trim(),
    primaryButtonText: buttonsMatch?.[1]?.trim() || 'Заказать',
    secondaryButtonText: buttonsMatch?.[2]?.trim() || 'Рассчитать стоимость',
  };
}

function extractDescriptionSection(html) {
  const descMatch = html.match(/<h3>Описание<\/h3>\s*<p[^>]*class="pt-20">(.*?)<\/p>/s);
  if (!descMatch) return null;
  return {
    title: 'Описание',
    text: descMatch[1].trim(),
  };
}

function extractTariffs(html) {
  const priceMatch = html.match(/<h3[^>]*>Прайс<\/h3>[\s\S]*?<div class="tabs">([\s\S]*?)<\/div>\s*<\/div>/);
  if (!priceMatch) return [];
  
  const tariffs = [];
  const tariffBlocks = priceMatch[1].matchAll(/<div class="accordion-tab">([\s\S]*?)<\/div>\s*<\/div>/g);
  
  for (const block of tariffBlocks) {
    const nameMatch = block[1].match(/<h2>(.*?)<\/h2>/);
    const subtitleMatch = block[1].match(/<p class="gray-txt">(.*?)<\/p>/);
    const priceMatch = block[1].match(/<p class="price-txt">(.*?)<\/p>/);
    const descMatch = block[1].match(/<h3>Что такое[^<]*<\/h3>\s*<p>(.*?)<\/p>/);
    const featuresMatch = block[1].match(/<div[^>]*class="d-flex jcsb w-70">\s*<ul>([\s\S]*?)<\/ul>\s*<ul>([\s\S]*?)<\/ul>/);
    
    const featuresLeft = featuresMatch?.[1]?.match(/<li>(.*?)<\/li>/g)?.map(l => l.replace(/<\/?li>/g, '').trim()) || [];
    const featuresRight = featuresMatch?.[2]?.match(/<li>(.*?)<\/li>/g)?.map(l => l.replace(/<\/?li>/g, '').trim()) || [];
    
    if (nameMatch) {
      tariffs.push({
        id: `tariff-${tariffs.length + 1}`,
        name: nameMatch[1].trim(),
        subtitle: subtitleMatch?.[1]?.trim() || '',
        price: priceMatch?.[1]?.trim() || '',
        description: descMatch?.[1]?.trim() || '',
        featuresLeft,
        featuresRight,
      });
    }
  }
  
  return tariffs;
}

function extractWorkSteps(html) {
  const stepsMatch = html.match(/<h3>Этапы[^<]*<\/h3>\s*<p[^>]*class="pt-20">(.*?)<\/p>[\s\S]*?<div class="stages pt-30">([\s\S]*?)<\/div>/);
  if (!stepsMatch) return null;
  
  const steps = [];
  const stepMatches = stepsMatch[2].matchAll(/<h3>(\d+) этап<\/h3>[\s\S]*?<p>(.*?)<\/p>/g);
  for (const match of stepMatches) {
    steps.push({
      number: match[1] || '',
      description: match[2]?.trim() || '',
    });
  }
  
  if (steps.length === 0) return null;
  
  return {
    title: 'Этапы работы',
    description: stepsMatch[1].trim(),
    steps,
  };
}

function extractStats(html) {
  const statsMatch = html.match(/<h3>О[^<]*в цифрах<\/h3>\s*<p[^>]*class="pt-20">(.*?)<\/p>[\s\S]*?<div class="about-us-body[^"]*">([\s\S]*?)<\/div>/);
  if (!statsMatch) return null;
  
  const items = [];
  const statMatches = statsMatch[2].matchAll(/<p>(.*?)<\/p>\s*<span>\/<\/span>\s*<h3>(.*?)<\/h3>/g);
  for (const match of statMatches) {
    items.push({
      value: match[1]?.trim() || '',
      label: match[2]?.replace(/<br\s*\/?>/g, ' ').trim() || '',
    });
  }
  
  if (items.length === 0) return null;
  
  return {
    title: 'О рекламе в цифрах',
    description: statsMatch[1].trim(),
    items,
  };
}

function extractTeam(html) {
  const teamMatch = html.match(/<h3>Команда[^<]*<\/h3>\s*<p[^>]*class="pt-20">(.*?)<\/p>[\s\S]*?<div class="owl-carousel[^"]*">([\s\S]*?)<\/div>/);
  if (!teamMatch) return null;
  
  const members = [];
  const memberMatches = teamMatch[2].matchAll(/<img[^>]*src="([^"]*)"[^>]*>[\s\S]*?<span>\s*(.*?)\s*<\/span>[\s\S]*?<p>(.*?)<\/p>/g);
  for (const match of memberMatches) {
    members.push({
      name: match[2]?.trim() || '',
      role: match[3]?.trim() || '',
      imageUrl: match[1]?.replace(/@img\//, '/legacy/img/') || '',
    });
  }
  
  if (members.length === 0) return null;
  
  return {
    title: 'Команда',
    description: teamMatch[1].trim(),
    members,
  };
}

function extractRelatedServices(html) {
  const relatedMatch = html.match(/<h3>Другие услуги[^<]*<\/h3>[\s\S]*?<div class="d-flex[^"]*all-web-site-services[^"]*">([\s\S]*?)<\/div>/);
  if (!relatedMatch) return null;
  
  const services = [];
  const serviceMatches = relatedMatch[1].matchAll(/<img[^>]*src="([^"]*)"[^>]*>[\s\S]*?<h3>(.*?)<\/h3>/g);
  for (const match of serviceMatches) {
    services.push({
      title: match[2]?.trim() || '',
      imageUrl: match[1]?.replace(/@img\//, '/legacy/img/') || '',
    });
  }
  
  if (services.length === 0) return null;
  
  return {
    title: 'Другие услуги по продвижению',
    services,
  };
}

function extractSubscribe(html) {
  const subscribeMatch = html.match(/<div class="services-description mt-50">\s*<div[^>]*>([\s\S]*?)<\/div>\s*<\/div>/);
  if (!subscribeMatch) return null;
  
  const items = [];
  const itemMatches = subscribeMatch[1].matchAll(/<img[^>]*src="([^"]*)"[^>]*class="big-icon"[^>]*>[\s\S]*?<h5>(.*?)<\/h5>\s*<p>(.*?)<\/p>\s*<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g);
  for (const match of itemMatches) {
    items.push({
      iconUrl: match[1]?.replace(/@img\//, '/legacy/img/') || '',
      title: match[2]?.trim() || '',
      description: match[3]?.trim() || '',
      linkText: match[5]?.trim() || 'Подробнее',
      linkUrl: match[4]?.trim() || '/',
    });
  }
  
  if (items.length === 0) return null;
  return { items };
}

async function migratePageToProduct(client, pageSlug) {
  // Get page from DB
  const pageResult = await client.query('SELECT * FROM pages WHERE slug = $1', [`/${pageSlug}`]);
  if (pageResult.rows.length === 0) {
    console.log(`Page /${pageSlug} not found in DB, skipping...`);
    return;
  }
  
  const page = pageResult.rows[0];
  
  // Try to read source HTML file
  const htmlFile = path.join(SRC_DIR, `${pageSlug}.html`);
  let html = '';
  if (fs.existsSync(htmlFile)) {
    html = fs.readFileSync(htmlFile, 'utf8');
  } else {
    // Use body from DB
    html = page.body || '';
  }
  
  // Parse structured content
  const header = extractHeaderSection(html);
  const description = extractDescriptionSection(html);
  const tariffs = extractTariffs(html);
  const workSteps = extractWorkSteps(html);
  const stats = extractStats(html);
  const team = extractTeam(html);
  const relatedServices = extractRelatedServices(html);
  const subscribe = extractSubscribe(html);
  
  const contentJson = {
    ...(header && { header }),
    ...(description && { description }),
    ...(tariffs.length > 0 && { priceSection: { title: 'Прайс', tariffs } }),
    ...(workSteps && { workSteps }),
    ...(stats && { stats }),
    ...(team && { team }),
    ...(relatedServices && { relatedServices }),
    ...(subscribe && { subscribe }),
  };
  
  // Extract price from first tariff if exists
  let priceCents = 0;
  if (tariffs.length > 0 && tariffs[0].price) {
    const priceStr = tariffs[0].price.replace(/[^\d]/g, '');
    priceCents = parseInt(priceStr) || 0;
  }
  
  // Create or update product
  await client.query(
    `INSERT INTO products (slug, title, description_html, price_cents, currency, price_period, content_json, sort_order, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
     ON CONFLICT (slug) DO UPDATE SET 
       title = EXCLUDED.title,
       description_html = EXCLUDED.description_html,
       price_cents = EXCLUDED.price_cents,
       content_json = EXCLUDED.content_json,
       updated_at = NOW()`,
    [
      pageSlug,
      page.title || header?.title || pageSlug,
      description?.text || '',
      priceCents,
      'RUB',
      'one_time',
      Object.keys(contentJson).length > 0 ? JSON.stringify(contentJson) : null,
      page.id || 0,
      true,
    ]
  );
  
  console.log(`Migrated page /${pageSlug} to product`);
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    for (const pageSlug of pagesToMigrate) {
      await migratePageToProduct(client, pageSlug);
    }
    
    await client.query('COMMIT');
    console.log('Migration completed');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();



