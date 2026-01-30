#!/usr/bin/env node
/**
 * Скрипт для очистки primecoder_db от неправильных данных (amani/umagazine)
 * и проверки наличия правильных данных в старой БД primecoder
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

// Подключение к primecoder_db
const primecoderPool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: 'primecoder_db',
  password: process.env.PGPASSWORD,
  port: Number(process.env.PGPORT),
});

// Подключение к старой БД primecoder (если она еще существует)
const oldPrimecoderPool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: 'primecoder',
  password: process.env.PGPASSWORD,
  port: Number(process.env.PGPORT),
});

// Фильтр для правильных статей primecoder
const PRIMECODER_BLOG_FILTER = `
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
`;

async function checkOldDatabase() {
  console.error('🔍 Проверяю старую БД primecoder...\n');
  
  try {
    const result = await oldPrimecoderPool.query(`
      SELECT COUNT(*) as total,
             COUNT(CASE WHEN (${PRIMECODER_BLOG_FILTER}) THEN 1 END) as primecoder_count
      FROM blog_posts
    `);
    
    console.error(`📊 Всего статей в старой БД: ${result.rows[0].total}`);
    console.error(`✅ Статей для primecoder: ${result.rows[0].primecoder_count}`);
    
    if (result.rows[0].primecoder_count > 0) {
      const sampleResult = await oldPrimecoderPool.query(`
        SELECT slug, title FROM blog_posts 
        WHERE (${PRIMECODER_BLOG_FILTER})
        LIMIT 5
      `);
      
      console.error('\n📝 Примеры правильных статей:');
      sampleResult.rows.forEach(r => {
        console.error(`   - ${r.slug}: ${r.title.substring(0, 60)}...`);
      });
      
      return true;
    }
    
    return false;
  } catch (error) {
    if (error.code === '3D000') { // database does not exist
      console.error('⚠️  Старая БД primecoder не существует');
      return false;
    }
    throw error;
  }
}

async function cleanPrimecoderDb() {
  console.error('\n🧹 Очищаю primecoder_db от неправильных статей...\n');
  
  // Удаляем статьи, которые НЕ соответствуют фильтру primecoder
  const deleteResult = await primecoderPool.query(`
    DELETE FROM blog_posts 
    WHERE NOT (${PRIMECODER_BLOG_FILTER})
    RETURNING slug, title
  `);
  
  console.error(`🗑️  Удалено неправильных статей: ${deleteResult.rows.length}`);
  
  if (deleteResult.rows.length > 0 && deleteResult.rows.length <= 10) {
    console.error('\n   Удалённые статьи:');
    deleteResult.rows.forEach(r => {
      console.error(`   - ${r.slug}: ${r.title.substring(0, 50)}...`);
    });
  }
  
  // Проверяем, что осталось
  const remainingResult = await primecoderPool.query(`
    SELECT COUNT(*) as count FROM blog_posts
  `);
  
  console.error(`\n✅ Осталось статей в primecoder_db: ${remainingResult.rows[0].count}`);
}

async function main() {
  console.error('🔄 Начинаю очистку primecoder_db...\n');
  
  try {
    // Проверяем старую БД
    const hasOldData = await checkOldDatabase();
    
    // Очищаем primecoder_db
    await cleanPrimecoderDb();
    
    if (hasOldData) {
      console.error('\n💡 Совет: Можно импортировать правильные статьи из старой БД primecoder');
      console.error('   Используйте скрипт export-primecoder-only.js для экспорта');
    } else {
      console.error('\n⚠️  Правильные статьи не найдены в старой БД');
      console.error('   Нужно будет создать статьи заново через админ-панель');
    }
    
    await primecoderPool.end();
    if (oldPrimecoderPool) {
      await oldPrimecoderPool.end();
    }
    
    console.error('\n✅ Готово!');
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    await primecoderPool.end();
    if (oldPrimecoderPool) {
      await oldPrimecoderPool.end();
    }
    process.exit(1);
  }
}

main();
