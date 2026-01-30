#!/usr/bin/env node
/**
 * Скрипт для экспорта ТОЛЬКО данных primecoder (исключая umagazine)
 * Использование: node scripts/export-primecoder-only.js > primecoder-export.json
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

// Фильтры для данных primecoder (исключаем umagazine и amani)
const PRIMECODER_FILTERS = {
  blog_posts: `
    WHERE (
      title ILIKE '%ИИ%' OR 
      title ILIKE '%маркетинг%' OR 
      title ILIKE '%разработка%' OR 
      title ILIKE '%сайт%' OR 
      title ILIKE '%веб%' OR 
      title ILIKE '%программирование%' OR
      title ILIKE '%seo%' OR
      title ILIKE '%дизайн%' OR
      body ILIKE '%primecoder%' OR
      slug ILIKE '%primecoder%'
    )
    AND created_at < '2026-01-29'  -- Исключаем массовый импорт umagazine
  `,
  products: `
    WHERE (
      title ILIKE '%tilda%' OR
      title ILIKE '%seo%' OR
      title ILIKE '%ai%' OR
      title ILIKE '%аутсорсинг%' OR
      title ILIKE '%АУТСОРСИНГ%' OR
      title ILIKE '%digital%' OR
      title ILIKE '%DIGITAL%' OR
      title ILIKE '%блогер%' OR
      title ILIKE '%БЛОГЕР%' OR
      slug = 'reklama-u-blogerov' OR
      title ILIKE '%маркетинг%' OR
      title ILIKE '%Маркетинг%' OR
      title ILIKE '%продаж%' OR
      title ILIKE '%разработка%' OR
      title ILIKE '%Разработка%' OR
      title ILIKE '%сайт%' OR
      description_html ILIKE '%primecoder%' OR
      description_html ILIKE '%prime-coder%'
    )
    AND NOT (
      title ILIKE '%африканск%' OR
      title ILIKE '%маска%' OR
      title ILIKE '%картина%' OR
      title ILIKE '%скульптура%' OR
      title ILIKE '%постер%' OR
      title ILIKE '%фотография%' OR
      title ILIKE '%саванна%' OR
      title ILIKE '%amani%'
    )
  `,
};

const TABLES_TO_EXPORT = [
  'blog_categories',
  'blog_tags',
  'partials',
  'pages',
  'cases',
  'products',
  'product_categories',
  'promotions',
  'carousels',
  'carousel_slides',
  'homepage_navigation_carousel',
  'clients',
  'forms',
  'form_submissions',
  'team_members',
  'exercise_images',
  'sites',
  'site_pages',
];

async function exportTable(pool, tableName) {
  try {
    let orderBy = '';
    let whereClause = PRIMECODER_FILTERS[tableName] || '';
    
    const columns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = $1
    `, [tableName]);
    
    if (columns.rows.length === 0) {
      console.error(`⚠️  Table ${tableName} does not exist, skipping...`);
      return { table: tableName, rows: [], count: 0, error: 'Table does not exist' };
    }
    
    const colNames = columns.rows.map(r => r.column_name);
    if (colNames.includes('id')) {
      orderBy = 'ORDER BY id';
    } else if (colNames.includes('name')) {
      orderBy = 'ORDER BY name';
    } else if (colNames.includes('slug')) {
      orderBy = 'ORDER BY slug';
    }
    
    // Для blog_posts и products используем специальные фильтры
    if (tableName === 'blog_posts' || tableName === 'products') {
      const result = await pool.query(`SELECT * FROM ${tableName} ${whereClause} ${orderBy}`);
      return {
        table: tableName,
        rows: result.rows,
        count: result.rows.length,
      };
    }
    
    const result = await pool.query(`SELECT * FROM ${tableName} ${whereClause} ${orderBy}`);
    
    return {
      table: tableName,
      rows: result.rows,
      count: result.rows.length,
    };
  } catch (error) {
    if (error.code === '42P01') {
      console.error(`⚠️  Table ${tableName} does not exist, skipping...`);
      return { table: tableName, rows: [], count: 0, error: 'Table does not exist' };
    }
    throw error;
  }
}

async function exportAll() {
  console.error('🔄 Starting PRIMECODER-only database export...');
  console.error('📋 Connection settings:');
  console.error(`   Host: ${process.env.PGHOST || 'from DATABASE_URL'}`);
  console.error(`   Database: ${process.env.PGDATABASE || 'from DATABASE_URL'}`);
  console.error(`   User: ${process.env.PGUSER || 'from DATABASE_URL'}`);
  console.error('');
  
  try {
    await pool.query('SELECT NOW()');
    console.error('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Failed to connect:', error.message);
    await pool.end();
    process.exit(1);
  }
  
  const exportData = {
    exported_at: new Date().toISOString(),
    note: 'PRIMECODER data only (umagazine filtered out)',
    tables: {},
  };
  
  // Сначала экспортируем blog_posts с фильтром
  console.error('📦 Exporting blog_posts (PRIMECODER only)...');
  const blogPosts = await exportTable(pool, 'blog_posts');
  exportData.tables.blog_posts = blogPosts;
  console.error(`   ✅ Exported ${blogPosts.count} PRIMECODER blog posts`);
  
  // Затем остальные таблицы
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
  
  console.log(JSON.stringify(exportData, null, 2));
  
  await pool.end();
  console.error('✅ Export completed!');
}

exportAll().catch(error => {
  console.error('❌ Export failed:', error.message);
  process.exit(1);
});
