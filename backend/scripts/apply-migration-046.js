import dotenv from 'dotenv';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загружаем переменные окружения
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = pg;

// Проверка обязательных переменных окружения
const requiredEnvVars = ['PGUSER', 'PGHOST', 'PGDATABASE', 'PGPASSWORD', 'PGPORT'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ ОШИБКА: Отсутствуют обязательные переменные окружения:');
  missingVars.forEach(varName => console.error(`  - ${varName}`));
  console.error('Пожалуйста, убедитесь, что файл .env содержит все необходимые переменные.');
  process.exit(1);
}

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: String(process.env.PGPASSWORD), // Явно преобразуем в строку
  port: Number(process.env.PGPORT),
});

async function applyMigration() {
  try {
    console.log('📦 Применение миграции 046_commercial_proposals.sql...');
    
    const migrationPath = path.join(__dirname, '..', 'migrations', '046_commercial_proposals.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    await pool.query(sql);
    console.log('✅ Миграция успешно применена!');
    
    // Проверяем, что таблицы созданы
    const checkResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('commercial_proposals', 'proposal_slides')
      ORDER BY table_name
    `);
    
    if (checkResult.rows.length === 2) {
      console.log('✅ Таблицы созданы:');
      checkResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    } else {
      console.warn('⚠️  Предупреждение: не все таблицы найдены');
    }
    
  } catch (err) {
    console.error('❌ Ошибка при применении миграции:', err.message);
    if (err.code === '42P07') {
      console.log('ℹ️  Таблицы уже существуют. Это нормально, если миграция уже была применена ранее.');
    } else {
      console.error(err);
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

applyMigration();

