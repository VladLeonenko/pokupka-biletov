import pool from '../db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration(filename) {
  const sqlPath = path.join(__dirname, '../migrations', filename);
  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  try {
    await pool.query(sql);
    console.log(`✅ Миграция ${filename} выполнена успешно`);
  } catch (e) {
    console.error(`❌ Ошибка при выполнении миграции ${filename}:`, e.message);
    throw e;
  } finally {
    await pool.end();
  }
}

const migrationFile = process.argv[2] || '047_semantic_topics.sql';
runMigration(migrationFile);
