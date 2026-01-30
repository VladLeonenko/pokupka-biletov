#!/usr/bin/env node
/**
 * Скрипт для проверки, какую БД использует backend и какие данные в ней
 * Использование: node scripts/check-server-db.js
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

async function checkDatabase() {
  console.error(`📊 Проверка БД: ${process.env.PGDATABASE}`);
  console.error(`👤 User: ${process.env.PGUSER}`);
  console.error(`\n📦 Проверка данных...\n`);
  
  try {
    // Blog posts
    const blogResult = await pool.query('SELECT COUNT(*) as count FROM blog_posts');
    console.error(`📝 Всего статей: ${blogResult.rows[0].count}`);
    
    // Sample blog posts
    const sampleBlog = await pool.query(`
      SELECT slug, title 
      FROM blog_posts 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    console.error(`\n📝 Примеры статей:`);
    sampleBlog.rows.forEach(p => {
      console.error(`   - ${p.slug}: ${p.title.substring(0, 60)}...`);
    });
    
    // Products
    const productsResult = await pool.query('SELECT COUNT(*) as count FROM products');
    console.error(`\n🛍️  Всего товаров: ${productsResult.rows[0].count}`);
    
    // Sample products
    const sampleProducts = await pool.query(`
      SELECT slug, title 
      FROM products 
      LIMIT 5
    `);
    console.error(`\n📋 Примеры товаров:`);
    sampleProducts.rows.forEach(p => {
      console.error(`   - ${p.slug}: ${p.title}`);
    });
    
    // Blog categories
    const categoriesResult = await pool.query('SELECT COUNT(*) as count FROM blog_categories');
    console.error(`\n📂 Категорий блога: ${categoriesResult.rows[0].count}`);
    
    // Проверка на данные amani (товары искусства)
    const amaniProducts = await pool.query(`
      SELECT COUNT(*) as count 
      FROM products 
      WHERE title ILIKE '%маска%' 
         OR title ILIKE '%картина%' 
         OR title ILIKE '%скульптура%' 
         OR title ILIKE '%африканск%'
    `);
    console.error(`\n⚠️  Товаров amani (маски/картины): ${amaniProducts.rows[0].count}`);
    
    // Проверка на данные umagazine (статьи про моду)
    const umagazinePosts = await pool.query(`
      SELECT COUNT(*) as count 
      FROM blog_posts 
      WHERE title ILIKE '%мода%' 
         OR title ILIKE '%fashion%' 
         OR title ILIKE '%интерьер%' 
         OR title ILIKE '%interior%'
         OR title ILIKE '%stella%'
         OR title ILIKE '%kim kardashian%'
    `);
    console.error(`⚠️  Статей umagazine (мода/интерьер): ${umagazinePosts.rows[0].count}`);
    
    await pool.end();
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkDatabase();
