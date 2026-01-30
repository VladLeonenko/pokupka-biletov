import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Создание новой миграции
 * Usage: npm run migration:create -- add_user_profiles
 */

function generateMigrationName(description) {
  // Получаем список существующих миграций
  const migrationsDir = path.join(__dirname, '../migrations');
  const existing = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  
  // Определяем следующий номер миграции
  let nextNumber = 1;
  if (existing.length > 0) {
    const lastMigration = existing[existing.length - 1];
    const match = lastMigration.match(/^(\d+)_/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }
  
  // Форматируем номер с leading zeros (001, 002, etc)
  const numberStr = String(nextNumber).padStart(3, '0');
  
  // Очищаем описание (только буквы, цифры, подчеркивания)
  const cleanDescription = description
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_');
  
  return `${numberStr}_${cleanDescription}.sql`;
}

function createMigrationFile(name) {
  const migrationsDir = path.join(__dirname, '../migrations');
  const filePath = path.join(migrationsDir, name);
  
  const template = `-- Migration: ${name}
-- Created at: ${new Date().toISOString()}
-- Description: TODO: Add migration description

-- Add your SQL migration here
-- Example:
-- CREATE TABLE IF NOT EXISTS example_table (
--   id SERIAL PRIMARY KEY,
--   name VARCHAR(255) NOT NULL,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- Remember:
-- - Use IF NOT EXISTS / IF EXISTS for idempotency
-- - Add indexes for frequently queried columns
-- - Consider adding default values
-- - Use transactions (handled automatically by migration runner)
`;
  
  fs.writeFileSync(filePath, template, 'utf8');
  return filePath;
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('❌ Error: Migration description is required');
    console.log('');
    console.log('Usage:');
    console.log('  npm run migration:create -- add_user_profiles');
    console.log('  npm run migration:create -- fix_product_prices');
    console.log('');
    process.exit(1);
  }
  
  const description = args.join('_');
  const migrationName = generateMigrationName(description);
  const filePath = createMigrationFile(migrationName);
  
  console.log('✅ Migration created successfully:');
  console.log(`   ${migrationName}`);
  console.log('');
  console.log('Next steps:');
  console.log(`  1. Edit the migration file: ${filePath}`);
  console.log('  2. Run migrations: npm run migrate');
  console.log('');
}

main();








