#!/usr/bin/env node
/**
 * Скрипт для очистки primecoder_prod от данных других проектов (amani, umagazine)
 * Оставляет только данные primecoder
 * Использование: node scripts/clean-primecoder-prod-db.js
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: Number(process.env.PGPORT),
});

// Строгий фильтр для статей primecoder (исключаем моду, дизайн интерьера, amani)
const PRIMECODER_BLOG_FILTER = `
  (
    title ILIKE '%ИИ%' OR 
    title ILIKE '%AI%' OR
    title ILIKE '%маркетинг%' OR 
    title ILIKE '%разработка%' OR 
    title ILIKE '%сайт%' OR 
    title ILIKE '%веб%' OR 
    title ILIKE '%программирование%' OR
    title ILIKE '%seo%' OR
    title ILIKE '%SEO%' OR
    title ILIKE '%digital%' OR
    title ILIKE '%DIGITAL%' OR
    title ILIKE '%блогер%' OR
    title ILIKE '%продаж%' OR
    title ILIKE '%tilda%' OR
    title ILIKE '%Tilda%' OR
    body ILIKE '%primecoder%' OR
    slug ILIKE '%primecoder%'
  )
  AND NOT (
    title ILIKE '%мода%' OR
    title ILIKE '%fashion%' OR
    title ILIKE '%интерьер%' OR
    title ILIKE '%interior%' OR
    title ILIKE '%дизайн интерьера%' OR
    title ILIKE '%картина%' OR
    title ILIKE '%скульптура%' OR
    title ILIKE '%маска%' OR
    title ILIKE '%африканск%' OR
    title ILIKE '%stella%' OR
    title ILIKE '%kim kardashian%' OR
    title ILIKE '%taylor swift%' OR
    title ILIKE '%hair volume%' OR
    title ILIKE '%low waist%' OR
    title ILIKE '%бренд%' OR
    title ILIKE '%коллекция%' OR
    title ILIKE '%показ%' OR
    title ILIKE '%yarmarka%' OR
    title ILIKE '%scan-fair%'
  )
`;

// Фильтр для товаров primecoder
const PRIMECODER_PRODUCT_FILTER = `
  slug IN (
    'razrabotka-sajta-na-tilda',
    'seo-prodvizhenie',
    'ai-prodvizhenie',
    'autsorsing-digital-agentstvo',
    'reklama-u-blogerov',
    'marketing-prodazhi'
  )
  OR (
    title ILIKE '%tilda%' OR
    title ILIKE '%seo%' OR
    title ILIKE '%ai%' OR
    title ILIKE '%аутсорсинг%' OR
    title ILIKE '%АУТСОРСИНГ%' OR
    title ILIKE '%digital%' OR
    title ILIKE '%DIGITAL%' OR
    title ILIKE '%блогер%' OR
    title ILIKE '%БЛОГЕР%' OR
    title ILIKE '%маркетинг%' OR
    title ILIKE '%Маркетинг%' OR
    title ILIKE '%разработка%' OR
    title ILIKE '%Разработка%' OR
    title ILIKE '%продвижение%' OR
    title ILIKE '%Продвижение%'
  )
  AND NOT (
    title ILIKE '%африканск%' OR
    title ILIKE '%маска%' OR
    title ILIKE '%картина%' OR
    title ILIKE '%скульптура%' OR
    title ILIKE '%постер%' OR
    title ILIKE '%фотография%' OR
    title ILIKE '%art%' OR
    title ILIKE '%искусство%'
  )
`;

async function cleanDatabase() {
  console.error(`🧹 Очистка БД: ${process.env.PGDATABASE}\n`);
  
  try {
    // 1. Очистка статей блога
    console.error('📝 Очистка статей блога...');
    const blogDeleteResult = await pool.query(`
      DELETE FROM blog_posts 
      WHERE NOT (${PRIMECODER_BLOG_FILTER})
      RETURNING slug, title
    `);
    console.error(`   🗑️  Удалено неправильных статей: ${blogDeleteResult.rows.length}`);
    
    // 2. Очистка товаров
    console.error('\n🛍️  Очистка товаров...');
    const productDeleteResult = await pool.query(`
      DELETE FROM products 
      WHERE NOT (${PRIMECODER_PRODUCT_FILTER})
      RETURNING slug, title
    `);
    console.error(`   🗑️  Удалено неправильных товаров: ${productDeleteResult.rows.length}`);
    
    // 3. Очистка категорий товаров (оставляем только нужные)
    console.error('\n📂 Очистка категорий товаров...');
    const categoryDeleteResult = await pool.query(`
      DELETE FROM product_categories 
      WHERE slug NOT IN (
        'marketing',
        'razrabotka',
        'seo',
        'reklama',
        'ai',
        'prodvizhenie',
        'digital',
        'autsorsing'
      )
      AND name NOT ILIKE '%маркетинг%'
      AND name NOT ILIKE '%разработка%'
      AND name NOT ILIKE '%seo%'
      AND name NOT ILIKE '%реклама%'
      AND name NOT ILIKE '%ai%'
      AND name NOT ILIKE '%продвижение%'
      AND name NOT ILIKE '%digital%'
      AND name NOT ILIKE '%аутсорсинг%'
      RETURNING slug, name
    `);
    console.error(`   🗑️  Удалено неправильных категорий: ${categoryDeleteResult.rows.length}`);
    
    // 4. Очистка категорий блога (оставляем только нужные)
    console.error('\n📂 Очистка категорий блога...');
    const blogCategoryDeleteResult = await pool.query(`
      DELETE FROM blog_categories 
      WHERE slug NOT IN (
        'ai',
        'marketing',
        'razrabotka',
        'seo',
        'digital',
        'blogery',
        'prodazhi'
      )
      AND name NOT ILIKE '%ИИ%'
      AND name NOT ILIKE '%маркетинг%'
      AND name NOT ILIKE '%разработка%'
      AND name NOT ILIKE '%seo%'
      AND name NOT ILIKE '%digital%'
      AND name NOT ILIKE '%блогер%'
      AND name NOT ILIKE '%продаж%'
      RETURNING slug, name
    `);
    console.error(`   🗑️  Удалено неправильных категорий блога: ${blogCategoryDeleteResult.rows.length}`);
    
    // 5. Статистика после очистки
    console.error('\n📊 Статистика после очистки:');
    
    const blogCount = await pool.query('SELECT COUNT(*) as count FROM blog_posts');
    console.error(`   📝 Статей: ${blogCount.rows[0].count}`);
    
    const productCount = await pool.query('SELECT COUNT(*) as count FROM products');
    console.error(`   🛍️  Товаров: ${productCount.rows[0].count}`);
    
    const categoryCount = await pool.query('SELECT COUNT(*) as count FROM product_categories');
    console.error(`   📂 Категорий товаров: ${categoryCount.rows[0].count}`);
    
    const blogCategoryCount = await pool.query('SELECT COUNT(*) as count FROM blog_categories');
    console.error(`   📂 Категорий блога: ${blogCategoryCount.rows[0].count}`);
    
    const pageCount = await pool.query('SELECT COUNT(*) as count FROM pages');
    console.error(`   📄 Страниц: ${pageCount.rows[0].count}`);
    
    const funnelCount = await pool.query('SELECT COUNT(*) as count FROM sales_funnels');
    console.error(`   🎯 Воронок продаж: ${funnelCount.rows[0].count}`);
    
    await pool.end();
    console.error('\n✅ Очистка завершена!');
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    await pool.end();
    process.exit(1);
  }
}

async function main() {
  console.error('⚠️  ВНИМАНИЕ: Этот скрипт удалит данные других проектов (amani, umagazine)');
  console.error(`   БД: ${process.env.PGDATABASE}`);
  console.error('   Продолжить? (Ctrl+C для отмены)\n');
  
  // Даем 3 секунды на отмену
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  await cleanDatabase();
}

main();
