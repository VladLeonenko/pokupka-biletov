#!/usr/bin/env node
/**
 * Скрипт для создания товаров primecoder
 * Использование: node scripts/create-primecoder-products.js
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

let poolConfig;
if (process.env.DATABASE_URL) {
  poolConfig = { connectionString: process.env.DATABASE_URL };
} else {
  poolConfig = {
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: Number(process.env.PGPORT),
  };
}

const pool = new Pool(poolConfig);

// Товары primecoder
const PRIMECODER_PRODUCTS = [
  {
    slug: 'razrabotka-sajta-na-tilda',
    title: 'Разработка сайта на Tilda',
    description_html: '<p>Создание современного сайта на платформе Tilda с уникальным дизайном и функциональностью.</p>',
    price_cents: 0,
    currency: 'RUB',
    price_period: 'one_time',
    features: [
      'Адаптивный дизайн',
      'Интеграция с CRM',
      'SEO-оптимизация',
      'Обучение работе с сайтом'
    ],
    is_active: true,
    sort_order: 1,
  },
  {
    slug: 'seo-prodvizhenie',
    title: 'SEO продвижение',
    description_html: '<p>Комплексное продвижение сайта в поисковых системах для увеличения органического трафика.</p>',
    price_cents: 0,
    currency: 'RUB',
    price_period: 'monthly',
    features: [
      'Аудит сайта',
      'Техническая оптимизация',
      'Контент-маркетинг',
      'Ежемесячные отчеты'
    ],
    is_active: true,
    sort_order: 2,
  },
  {
    slug: 'ai-prodvizhenie',
    title: 'AI продвижение',
    description_html: '<p>Использование искусственного интеллекта для автоматизации маркетинга и увеличения конверсий.</p>',
    price_cents: 0,
    currency: 'RUB',
    price_period: 'monthly',
    features: [
      'AI-аналитика',
      'Автоматизация рекламы',
      'Персонализация контента',
      'Прогнозирование трендов'
    ],
    is_active: true,
    sort_order: 3,
  },
  {
    slug: 'autsorsing-digital-agentstvo',
    title: 'АУТСОРСИНГ DIGITAL-АГЕНСТВО',
    description_html: '<p>Полный аутсорсинг digital-маркетинга: от стратегии до реализации всех каналов продвижения.</p>',
    price_cents: 0,
    currency: 'RUB',
    price_period: 'monthly',
    features: [
      'Комплексная стратегия',
      'Управление всеми каналами',
      'Еженедельные отчеты',
      'Выделенная команда'
    ],
    is_active: true,
    sort_order: 4,
  },
  {
    slug: 'reklama-u-blogerov',
    title: 'РЕКЛАМА У БЛОГЕРОВ',
    description_html: '<p>Продвижение бренда через сотрудничество с блогерами и инфлюенсерами в вашей нише.</p>',
    price_cents: 0,
    currency: 'RUB',
    price_period: 'one_time',
    features: [
      'Подбор блогеров',
      'Разработка креативов',
      'Организация съемок',
      'Аналитика результатов'
    ],
    is_active: true,
    sort_order: 5,
  },
  {
    slug: 'marketing-prodazhi',
    title: 'Маркетинг + продажи',
    description_html: '<p>Комплексный подход к маркетингу с фокусом на увеличение продаж и конверсий.</p>',
    price_cents: 0,
    currency: 'RUB',
    price_period: 'monthly',
    features: [
      'Воронка продаж',
      'Автоматизация процессов',
      'CRM-интеграция',
      'Оптимизация конверсий'
    ],
    is_active: true,
    sort_order: 6,
  },
];

async function createProducts() {
  console.error('🔄 Creating PRIMECODER products...');
  
  try {
    await pool.query('SELECT NOW()');
    console.error('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Failed to connect:', error.message);
    await pool.end();
    process.exit(1);
  }
  
  let created = 0;
  let updated = 0;
  let errors = 0;
  
  for (const product of PRIMECODER_PRODUCTS) {
    try {
      // Проверяем, существует ли товар
      const existing = await pool.query(
        'SELECT id FROM products WHERE slug = $1',
        [product.slug]
      );
      
      if (existing.rows.length > 0) {
        // Обновляем существующий
        await pool.query(`
          UPDATE products 
          SET 
            title = $1,
            description_html = $2,
            price_cents = $3,
            currency = $4,
            price_period = $5,
            features = $6,
            is_active = $7,
            sort_order = $8,
            updated_at = NOW()
          WHERE slug = $9
        `, [
          product.title,
          product.description_html,
          product.price_cents,
          product.currency,
          product.price_period,
          product.features,
          product.is_active,
          product.sort_order,
          product.slug,
        ]);
        console.error(`   ✅ Updated: ${product.title}`);
        updated++;
      } else {
        // Создаем новый
        await pool.query(`
          INSERT INTO products (
            slug, title, description_html, price_cents, currency, 
            price_period, features, is_active, sort_order
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          product.slug,
          product.title,
          product.description_html,
          product.price_cents,
          product.currency,
          product.price_period,
          product.features,
          product.is_active,
          product.sort_order,
        ]);
        console.error(`   ✅ Created: ${product.title}`);
        created++;
      }
    } catch (error) {
      console.error(`   ❌ Error with ${product.slug}: ${error.message}`);
      errors++;
    }
  }
  
  console.error(`\n📊 Summary:`);
  console.error(`   Created: ${created}`);
  console.error(`   Updated: ${updated}`);
  console.error(`   Errors: ${errors}`);
  
  await pool.end();
  console.error('\n✅ Done!');
}

createProducts().catch(error => {
  console.error('❌ Failed:', error.message);
  process.exit(1);
});
