#!/usr/bin/env node
/**
 * Скрипт для экспорта данных из локальной БД
 * Использование: node scripts/export-database.js > database-export.json
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загружаем переменные окружения
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: Number(process.env.PGPORT),
});

// Список таблиц для экспорта (в порядке зависимостей)
const TABLES_TO_EXPORT = [
  // Базовые таблицы
  'blog_categories',
  'blog_tags',
  'partials',
  
  // Контент
  'pages',
  'blog_posts',
  'blog_post_tags',
  'blog_post_categories',
  'cases',
  'products',
  'product_categories',
  'promotions',
  'carousels',
  'carousel_items',
  'awards',
  'reviews',
  
  // Пользователи и клиенты
  'clients',
  'client_orders',
  
  // Другие таблицы
  'forms',
  'form_submissions',
  'team_members',
  'reading_books',
  'exercise_images',
  'sites',
  'site_pages',
];

async function exportTable(pool, tableName) {
  try {
    // Получаем все данные из таблицы
    const result = await pool.query(`SELECT * FROM ${tableName} ORDER BY id`);
    
    if (result.rows.length === 0) {
      return { table: tableName, rows: [], count: 0 };
    }
    
    return {
      table: tableName,
      rows: result.rows,
      count: result.rows.length,
    };
  } catch (error) {
    // Если таблица не существует, пропускаем
    if (error.code === '42P01') {
      console.error(`⚠️  Table ${tableName} does not exist, skipping...`);
      return { table: tableName, rows: [], count: 0, error: 'Table does not exist' };
    }
    throw error;
  }
}

async function exportAll() {
  console.error('🔄 Starting database export...');
  
  const exportData = {
    exported_at: new Date().toISOString(),
    tables: {},
  };
  
  for (const tableName of TABLES_TO_EXPORT) {
    console.error(`📦 Exporting ${tableName}...`);
    const tableData = await exportTable(pool, tableName);
    exportData.tables[tableName] = tableData;
    
    if (tableData.count > 0) {
      console.error(`   ✅ Exported ${tableData.count} rows`);
    } else if (tableData.error) {
      console.error(`   ⚠️  ${tableData.error}`);
    } else {
      console.error(`   ℹ️  Table is empty`);
    }
  }
  
  // Выводим JSON в stdout
  console.log(JSON.stringify(exportData, null, 2));
  
  await pool.end();
  console.error('✅ Export completed!');
}

exportAll().catch(error => {
  console.error('❌ Export failed:', error);
  process.exit(1);
});
