#!/usr/bin/env node
/**
 * Строгая очистка БД - оставляет ТОЛЬКО данные primecoder
 * Использование: node scripts/strict-clean-primecoder-db.js
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

// ОЧЕНЬ строгий фильтр - только статьи про ИИ, маркетинг, разработку, SEO
const STRICT_PRIMECODER_BLOG_FILTER = `
  (
    (title ILIKE '%ИИ%' AND title NOT ILIKE '%мода%' AND title NOT ILIKE '%fashion%')
    OR
    (title ILIKE '%AI%' AND title NOT ILIKE '%мода%' AND title NOT ILIKE '%fashion%')
    OR
    (title ILIKE '%маркетинг%' AND title NOT ILIKE '%мода%' AND title NOT ILIKE '%интерьер%')
    OR
    (title ILIKE '%разработка%' AND title NOT ILIKE '%мода%' AND title NOT ILIKE '%интерьер%')
    OR
    (title ILIKE '%сайт%' AND title NOT ILIKE '%мода%' AND title NOT ILIKE '%интерьер%')
    OR
    (title ILIKE '%веб%' AND title NOT ILIKE '%мода%')
    OR
    (title ILIKE '%seo%' AND title NOT ILIKE '%мода%' AND title NOT ILIKE '%интерьер%')
    OR
    (title ILIKE '%SEO%' AND title NOT ILIKE '%мода%' AND title NOT ILIKE '%интерьер%')
    OR
    (title ILIKE '%digital%' AND title NOT ILIKE '%мода%' AND title NOT ILIKE '%интерьер%')
    OR
    (title ILIKE '%tilda%' AND title NOT ILIKE '%мода%')
    OR
    (body ILIKE '%primecoder%' AND body NOT ILIKE '%мода%')
    OR
    (slug ILIKE '%primecoder%')
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
    title ILIKE '%hair%' OR
    title ILIKE '%nails%' OR
    title ILIKE '%маникюр%' OR
    title ILIKE '%коллекция%' OR
    title ILIKE '%показ%' OR
    title ILIKE '%yarmarka%' OR
    title ILIKE '%scan-fair%' OR
    title ILIKE '%бренд%' OR
    title ILIKE '%бьюти%' OR
    title ILIKE '%beauty%' OR
    title ILIKE '%косметика%' OR
    title ILIKE '%парфюм%' OR
    title ILIKE '%часы%' OR
    title ILIKE '%watch%' OR
    title ILIKE '%ювелир%' OR
    title ILIKE '%jewelry%'
  )
`;

async function showCurrentData() {
  console.error('\n📊 Текущие данные в БД:\n');
  
  const blogCount = await pool.query('SELECT COUNT(*) as count FROM blog_posts');
  console.error(`   📝 Статей: ${blogCount.rows[0].count}`);
  
  const sampleBlog = await pool.query(`
    SELECT slug, title 
    FROM blog_posts 
    ORDER BY created_at DESC 
    LIMIT 10
  `);
  console.error(`\n   Примеры статей:`);
  sampleBlog.rows.forEach(p => {
    console.error(`   - ${p.slug}: ${p.title.substring(0, 60)}...`);
  });
  
  const productCount = await pool.query('SELECT COUNT(*) as count FROM products');
  console.error(`\n   🛍️  Товаров: ${productCount.rows[0].count}`);
  
  const categoryCount = await pool.query('SELECT COUNT(*) as count FROM product_categories');
  console.error(`   📂 Категорий товаров: ${categoryCount.rows[0].count}`);
  
  const categories = await pool.query('SELECT slug, name FROM product_categories LIMIT 20');
  if (categories.rows.length > 0) {
    console.error(`\n   Категории товаров:`);
    categories.rows.forEach(c => {
      console.error(`   - ${c.slug}: ${c.name}`);
    });
  }
  
  const blogCategoryCount = await pool.query('SELECT COUNT(*) as count FROM blog_categories');
  console.error(`\n   📂 Категорий блога: ${blogCategoryCount.rows[0].count}`);
  
  const blogCategories = await pool.query('SELECT slug, name FROM blog_categories LIMIT 20');
  if (blogCategories.rows.length > 0) {
    console.error(`\n   Категории блога:`);
    blogCategories.rows.forEach(c => {
      console.error(`   - ${c.slug}: ${c.name}`);
    });
  }
  
  const pageCount = await pool.query('SELECT COUNT(*) as count FROM pages');
  console.error(`\n   📄 Страниц: ${pageCount.rows[0].count}`);
  
  const pages = await pool.query('SELECT slug, title FROM pages LIMIT 20');
  if (pages.rows.length > 0) {
    console.error(`\n   Страницы:`);
    pages.rows.forEach(p => {
      console.error(`   - ${p.slug}: ${p.title || 'без названия'}`);
    });
  }
}

async function cleanDatabase() {
  console.error(`🧹 Строгая очистка БД: ${process.env.PGDATABASE}\n`);
  
  try {
    // 1. Очистка статей блога - ОЧЕНЬ строго
    console.error('📝 Очистка статей блога (строгий фильтр)...');
    const blogDeleteResult = await pool.query(`
      DELETE FROM blog_posts 
      WHERE NOT (${STRICT_PRIMECODER_BLOG_FILTER})
      RETURNING slug, title
    `);
    console.error(`   🗑️  Удалено статей: ${blogDeleteResult.rows.length}`);
    
    // 2. Проверяем, сколько осталось
    const remainingBlog = await pool.query('SELECT COUNT(*) as count FROM blog_posts');
    console.error(`   ✅ Осталось статей: ${remainingBlog.rows[0].count}`);
    
    // 3. Показываем примеры оставшихся статей
    const sampleRemaining = await pool.query(`
      SELECT slug, title 
      FROM blog_posts 
      LIMIT 10
    `);
    if (sampleRemaining.rows.length > 0) {
      console.error(`\n   Примеры оставшихся статей:`);
      sampleRemaining.rows.forEach(p => {
        console.error(`   - ${p.slug}: ${p.title.substring(0, 60)}...`);
      });
    }
    
    // 4. Категории товаров - НЕ удаляем, только проверяем
    console.error('\n📂 Проверка категорий товаров...');
    const categoryCount = await pool.query('SELECT COUNT(*) as count FROM product_categories');
    console.error(`   📂 Категорий товаров: ${categoryCount.rows[0].count}`);
    
    // Если категорий нет, создаем базовые
    if (categoryCount.rows[0].count === 0) {
      console.error('   ⚠️  Категорий нет, создаю базовые...');
      const categories = [
        { slug: 'marketing', name: 'Маркетинг' },
        { slug: 'razrabotka', name: 'Разработка' },
        { slug: 'seo', name: 'SEO' },
        { slug: 'reklama', name: 'Реклама' },
        { slug: 'ai', name: 'AI' },
        { slug: 'prodvizhenie', name: 'Продвижение' },
        { slug: 'digital', name: 'Digital' },
        { slug: 'autsorsing', name: 'Аутсорсинг' }
      ];
      
      for (const cat of categories) {
        try {
          await pool.query(`
            INSERT INTO product_categories (slug, name, is_active)
            VALUES ($1, $2, true)
            ON CONFLICT (slug) DO UPDATE SET name = $2, is_active = true
          `, [cat.slug, cat.name]);
        } catch (error) {
          console.error(`   ⚠️  Ошибка при создании категории ${cat.slug}:`, error.message);
        }
      }
      console.error('   ✅ Базовые категории созданы');
    }
    
    // 5. Страницы - НЕ удаляем, только проверяем
    console.error('\n📄 Проверка страниц...');
    const pageCount = await pool.query('SELECT COUNT(*) as count FROM pages');
    console.error(`   📄 Страниц: ${pageCount.rows[0].count}`);
    
    // 6. Итоговая статистика
    console.error('\n📊 Итоговая статистика:');
    await showCurrentData();
    
    await pool.end();
    console.error('\n✅ Очистка завершена!');
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error(error.stack);
    await pool.end();
    process.exit(1);
  }
}

async function main() {
  console.error('⚠️  СТРОГАЯ ОЧИСТКА БД');
  console.error(`   БД: ${process.env.PGDATABASE}`);
  console.error('   Удалятся все статьи, НЕ относящиеся к primecoder');
  console.error('   Продолжить? (Ctrl+C для отмены)\n');
  
  // Показываем текущие данные
  await showCurrentData();
  
  // Даем 5 секунд на отмену
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  await cleanDatabase();
}

main();
