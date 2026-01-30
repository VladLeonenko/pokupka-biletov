#!/usr/bin/env node
/**
 * Экспорт правильных статей блога для primecoder из старой БД
 * Использование: node scripts/export-correct-primecoder-blog.js
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

// Подключение к старой БД primecoder
const oldPool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: 'primecoder',
  password: process.env.PGPASSWORD,
  port: Number(process.env.PGPORT),
});

// Подключение к primecoder_db
const newPool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: 'primecoder_db',
  password: process.env.PGPASSWORD,
  port: Number(process.env.PGPORT),
});

// Строгий фильтр для статей primecoder (исключаем моду, дизайн интерьера и т.д.)
const STRICT_PRIMECODER_FILTER = `
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
    title ILIKE '%low waist%'
  )
`;

async function exportAndImport() {
  console.error('📦 Экспортирую правильные статьи из старой БД...\n');
  
  // Экспортируем статьи
  const blogResult = await oldPool.query(`
    SELECT * FROM blog_posts 
    WHERE ${STRICT_PRIMECODER_FILTER}
    ORDER BY created_at DESC
  `);
  
  console.error(`✅ Найдено статей для primecoder: ${blogResult.rows.length}`);
  
  if (blogResult.rows.length === 0) {
    console.error('⚠️  Статьи не найдены');
    await oldPool.end();
    await newPool.end();
    return;
  }
  
  // Показываем примеры
  console.error('\n📝 Примеры статей:');
  blogResult.rows.slice(0, 5).forEach(r => {
    console.error(`   - ${r.slug}: ${r.title.substring(0, 60)}...`);
  });
  
  // Импортируем в primecoder_db
  console.error('\n📥 Импортирую в primecoder_db...\n');
  
  let imported = 0;
  let skipped = 0;
  
  for (const post of blogResult.rows) {
    try {
      // Проверяем, существует ли уже
      const existing = await newPool.query(
        'SELECT id FROM blog_posts WHERE slug = $1',
        [post.slug]
      );
      
      if (existing.rows.length > 0) {
        skipped++;
        continue;
      }
      
      // Импортируем только основные поля (проверяем наличие колонок динамически)
      // Сначала проверяем, какие колонки есть в целевой таблице
      const columnsResult = await newPool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'blog_posts'
      `);
      const availableColumns = columnsResult.rows.map(r => r.column_name);
      
      // Формируем список колонок и значений для INSERT
      const columns = [];
      const values = [];
      const placeholders = [];
      let paramIndex = 1;
      
      // Базовые обязательные поля
      if (availableColumns.includes('slug')) {
        columns.push('slug');
        values.push(post.slug);
        placeholders.push(`$${paramIndex++}`);
      }
      if (availableColumns.includes('title')) {
        columns.push('title');
        values.push(post.title);
        placeholders.push(`$${paramIndex++}`);
      }
      if (availableColumns.includes('body')) {
        columns.push('body');
        values.push(post.body || '');
        placeholders.push(`$${paramIndex++}`);
      }
      if (availableColumns.includes('is_published')) {
        columns.push('is_published');
        values.push(post.is_published ?? false);
        placeholders.push(`$${paramIndex++}`);
      }
      if (availableColumns.includes('created_at')) {
        columns.push('created_at');
        values.push(post.created_at || new Date());
        placeholders.push(`$${paramIndex++}`);
      }
      if (availableColumns.includes('updated_at')) {
        columns.push('updated_at');
        values.push(post.updated_at || new Date());
        placeholders.push(`$${paramIndex++}`);
      }
      
      // Опциональные поля
      if (availableColumns.includes('seo_title') && post.meta_title) {
        columns.push('seo_title');
        values.push(post.meta_title);
        placeholders.push(`$${paramIndex++}`);
      }
      if (availableColumns.includes('seo_description') && post.meta_description) {
        columns.push('seo_description');
        values.push(post.meta_description);
        placeholders.push(`$${paramIndex++}`);
      }
      if (availableColumns.includes('seo_keywords') && post.meta_keywords) {
        columns.push('seo_keywords');
        values.push(Array.isArray(post.meta_keywords) ? post.meta_keywords : []);
        placeholders.push(`$${paramIndex++}`);
      }
      
      if (columns.length === 0) {
        throw new Error('No matching columns found');
      }
      
      await newPool.query(`
        INSERT INTO blog_posts (${columns.join(', ')})
        VALUES (${placeholders.join(', ')})
      `, values);
      
      imported++;
    } catch (error) {
      console.error(`❌ Ошибка при импорте ${post.slug}:`, error.message);
    }
  }
  
  console.error(`\n✅ Импортировано: ${imported}`);
  console.error(`⏭️  Пропущено (уже есть): ${skipped}`);
  
  // Проверяем итоговое количество
  const finalCount = await newPool.query('SELECT COUNT(*) as count FROM blog_posts');
  console.error(`\n📊 Всего статей в primecoder_db: ${finalCount.rows[0].count}`);
  
  await oldPool.end();
  await newPool.end();
}

async function main() {
  try {
    await exportAndImport();
    console.error('\n✅ Готово!');
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    await oldPool.end();
    await newPool.end();
    process.exit(1);
  }
}

main();
