#!/usr/bin/env node
/**
 * Применение миграции 051_add_slug_to_promotions.sql
 * Использование: node scripts/apply-migration-051.js
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';

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

async function main() {
  console.error('📦 Применение миграции 051_add_slug_to_promotions.sql...\n');
  
  try {
    await pool.query('SELECT NOW()');
    console.error('✅ Подключение к БД успешно\n');
  } catch (error) {
    console.error('❌ Ошибка подключения:', error.message);
    await pool.end();
    process.exit(1);
  }

  const migrationSQL = `
    ALTER TABLE promotions 
    ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS conditions TEXT;
    
    CREATE INDEX IF NOT EXISTS idx_promotions_slug ON promotions(slug) WHERE slug IS NOT NULL;
  `;

  try {
    await pool.query(migrationSQL);
    console.error('✅ Миграция применена успешно\n');
  } catch (error) {
    if (error.message.includes('already exists') || error.code === '42710' || error.code === '42P07') {
      console.error('⚠️  Колонки уже существуют, пропускаем миграцию\n');
    } else {
      console.error('❌ Ошибка применения миграции:', error.message);
      await pool.end();
      process.exit(1);
    }
  }
  
  await pool.end();
  console.error('✅ Готово!');
}

main().catch(error => {
  console.error('❌ Критическая ошибка:', error.message);
  process.exit(1);
});
