import pool from '../db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const migrationPath = path.join(__dirname, '../migrations/044_client_funnels.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Применяю миграцию 044_client_funnels.sql...');
    await client.query(sql);
    
    await client.query('COMMIT');
    console.log('✅ Миграция 044_client_funnels.sql выполнена успешно');
    process.exit(0);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Ошибка миграции:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();


