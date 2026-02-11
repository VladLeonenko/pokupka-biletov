#!/usr/bin/env node
/**
 * Применяет миграцию 032: добавляет content_json в blog_posts и pages.
 * Запуск на продакшене: DATABASE_URL="..." node scripts/apply-032-content-json.js
 * Или с .env.prod: cp .env.prod .env && node scripts/apply-032-content-json.js
 */
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Пробуем .env.prod для продакшена
dotenv.config({ path: path.join(__dirname, '../.env.prod') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const sql = fs.readFileSync(
  path.join(__dirname, '../migrations/032_add_content_json_to_blog_and_pages.sql'),
  'utf8'
);

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ...(process.env.DATABASE_URL ? {} : {
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE || 'primecoder_db',
    password: process.env.PGPASSWORD,
    port: Number(process.env.PGPORT) || 5432,
  }),
});

async function main() {
  try {
    await pool.query(sql);
    console.log('✅ Миграция 032_add_content_json_to_blog_and_pages применена успешно');
  } catch (err) {
    if (err.message?.includes('already exists')) {
      console.log('⏭️ Колонка content_json уже существует');
    } else {
      console.error('❌ Ошибка:', err.message);
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}
main();
