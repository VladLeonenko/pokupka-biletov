#!/usr/bin/env node
/**
 * Скрипт для импорта данных в боевую БД
 * Использование: node scripts/import-database.js < database-export.json
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загружаем переменные окружения
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

// Поддержка DATABASE_URL или отдельных переменных
let poolConfig;
if (process.env.DATABASE_URL) {
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
  };
} else {
  // Проверяем обязательные переменные
  const requiredVars = ['PGUSER', 'PGHOST', 'PGDATABASE', 'PGPASSWORD', 'PGPORT'];
  const missingVars = requiredVars.filter(v => !process.env[v]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(v => console.error(`   - ${v}`));
    console.error('\nPlease set these in backend/.env file or use DATABASE_URL');
    process.exit(1);
  }
  
  poolConfig = {
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: Number(process.env.PGPORT),
  };
}

const pool = new Pool(poolConfig);

// Читаем JSON из stdin
async function readStdin() {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });
    
    let data = '';
    rl.on('line', (line) => {
      data += line + '\n';
    });
    
    rl.on('close', () => {
      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(new Error('Failed to parse JSON: ' + error.message));
      }
    });
  });
}

async function importTable(pool, tableName, rows) {
  if (!rows || rows.length === 0) {
    console.error(`   ℹ️  Table ${tableName} is empty, skipping...`);
    return { imported: 0, errors: [] };
  }
  
  const errors = [];
  let imported = 0;
  
  // Получаем структуру таблицы для определения колонок
  const tableInfo = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = $1 
    ORDER BY ordinal_position
  `, [tableName]);
  
  if (tableInfo.rows.length === 0) {
    console.error(`   ⚠️  Table ${tableName} does not exist, skipping...`);
    return { imported: 0, errors: [`Table ${tableName} does not exist`] };
  }
  
  const columns = tableInfo.rows.map(row => row.column_name);
  
  // Импортируем каждую строку
  for (const row of rows) {
    try {
      // Фильтруем только существующие колонки
      const rowData = {};
      for (const col of columns) {
        if (row.hasOwnProperty(col)) {
          rowData[col] = row[col];
        }
      }
      
      // Строим INSERT запрос
      const colNames = Object.keys(rowData);
      const colValues = colNames.map((_, i) => `$${i + 1}`);
      const values = colNames.map(col => rowData[col]);
      
      // Используем ON CONFLICT для обновления существующих записей
      let conflictClause = '';
      if (colNames.includes('id')) {
        conflictClause = ` ON CONFLICT (id) DO UPDATE SET ${colNames.filter(c => c !== 'id').map(c => `${c} = EXCLUDED.${c}`).join(', ')}`;
      } else if (colNames.includes('slug')) {
        conflictClause = ` ON CONFLICT (slug) DO UPDATE SET ${colNames.filter(c => c !== 'slug').map(c => `${c} = EXCLUDED.${c}`).join(', ')}`;
      } else if (colNames.includes('name') && tableName === 'partials') {
        conflictClause = ` ON CONFLICT (name) DO UPDATE SET html = EXCLUDED.html`;
      }
      
      const query = `
        INSERT INTO ${tableName} (${colNames.join(', ')})
        VALUES (${colValues.join(', ')})
        ${conflictClause}
      `;
      
      await pool.query(query, values);
      imported++;
    } catch (error) {
      errors.push(`Row ${row.id || 'unknown'}: ${error.message}`);
    }
  }
  
  return { imported, errors };
}

async function importAll() {
  console.error('🔄 Starting database import...');
  console.error('📥 Reading data from stdin...');
  
  const exportData = await readStdin();
  
  if (!exportData.tables) {
    throw new Error('Invalid export data format');
  }
  
  console.error(`📅 Export date: ${exportData.exported_at || 'unknown'}`);
  console.error(`📊 Found ${Object.keys(exportData.tables).length} tables\n`);
  
  const stats = {
    total: 0,
    imported: 0,
    errors: 0,
  };
  
  // Импортируем таблицы в порядке зависимостей
  for (const [tableName, tableData] of Object.entries(exportData.tables)) {
    if (!tableData.rows || tableData.rows.length === 0) {
      continue;
    }
    
    console.error(`📦 Importing ${tableName}...`);
    stats.total += tableData.count || 0;
    
    const result = await importTable(pool, tableName, tableData.rows);
    stats.imported += result.imported;
    stats.errors += result.errors.length;
    
    if (result.imported > 0) {
      console.error(`   ✅ Imported ${result.imported} rows`);
    }
    
    if (result.errors.length > 0) {
      console.error(`   ⚠️  ${result.errors.length} errors:`);
      result.errors.slice(0, 5).forEach(err => {
        console.error(`      - ${err}`);
      });
      if (result.errors.length > 5) {
        console.error(`      ... and ${result.errors.length - 5} more`);
      }
    }
  }
  
  console.error('\n📊 Import statistics:');
  console.error(`   Total rows: ${stats.total}`);
  console.error(`   Imported: ${stats.imported}`);
  console.error(`   Errors: ${stats.errors}`);
  
  await pool.end();
  console.error('\n✅ Import completed!');
}

importAll().catch(error => {
  console.error('❌ Import failed:', error);
  process.exit(1);
});
