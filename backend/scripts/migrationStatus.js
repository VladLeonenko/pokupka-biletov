import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Показать статус миграций
 * - Какие миграции выполнены
 * - Какие ожидают выполнения
 */

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

async function getExecutedMigrations(client) {
  const result = await client.query('SELECT name, executed_at FROM migrations ORDER BY name');
  return new Map(result.rows.map(row => [row.name, row.executed_at]));
}

async function run() {
  const migrationsDir = path.join(__dirname, '../migrations');
  
  // Получаем список всех файлов миграций
  const allMigrations = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  
  const client = await pool.connect();
  
  try {
    await ensureMigrationsTable(client);
    const executedMigrations = await getExecutedMigrations(client);
    
    console.log('');
    console.log('=== Migration Status ===');
    console.log('');
    
    if (allMigrations.length === 0) {
      console.log('No migrations found');
    } else {
      const pending = [];
      const executed = [];
      
      allMigrations.forEach(name => {
        if (executedMigrations.has(name)) {
          const executedAt = executedMigrations.get(name);
          executed.push({ name, executedAt });
        } else {
          pending.push(name);
        }
      });
      
      console.log(`Total migrations: ${allMigrations.length}`);
      console.log(`Executed: ${executed.length}`);
      console.log(`Pending: ${pending.length}`);
      console.log('');
      
      if (executed.length > 0) {
        console.log('✅ Executed migrations:');
        executed.forEach(({ name, executedAt }) => {
          const date = new Date(executedAt).toLocaleString();
          console.log(`   ${name} (${date})`);
        });
        console.log('');
      }
      
      if (pending.length > 0) {
        console.log('⏳ Pending migrations:');
        pending.forEach(name => {
          console.log(`   ${name}`);
        });
        console.log('');
        console.log('Run "npm run migrate" to execute pending migrations');
      } else {
        console.log('✅ All migrations are up to date');
      }
    }
    
    console.log('');
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();








