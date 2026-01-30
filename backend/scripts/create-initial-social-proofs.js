#!/usr/bin/env node
/**
 * Создание начальных социальных доказательств для PrimeCoder
 * Использование: node scripts/create-initial-social-proofs.js
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

const SOCIAL_PROOFS = [
  {
    type: 'metric',
    title: 'Проектов выполнено',
    value: '150+',
    label: 'Проектов выполнено',
    isActive: true,
    sortOrder: 1
  },
  {
    type: 'metric',
    title: 'Довольных клиентов',
    value: '98%',
    label: 'Довольных клиентов',
    isActive: true,
    sortOrder: 2
  },
  {
    type: 'metric',
    title: 'Средний рост конверсии',
    value: '45%',
    label: 'Средний рост конверсии',
    isActive: true,
    sortOrder: 3
  },
  {
    type: 'metric',
    title: 'Срок запуска',
    value: '2-3 недели',
    label: 'Средний срок запуска',
    isActive: true,
    sortOrder: 4
  }
];

async function createSocialProof(sp) {
  try {
    const result = await pool.query(`
      INSERT INTO social_proofs (
        type, title, value, label, is_active, sort_order
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT DO NOTHING
      RETURNING id
    `, [
      sp.type,
      sp.title,
      sp.value,
      sp.label,
      sp.isActive,
      sp.sortOrder
    ]);
    
    return result.rows.length > 0;
  } catch (error) {
    if (error.code === '23505') { // unique_violation
      return false; // Уже существует
    }
    throw error;
  }
}

async function applyMigration() {
  try {
    console.error('📦 Применение миграции для social_proofs...\n');
    const migrationSQL = await import('fs/promises').then(fs => 
      fs.readFile(new URL('../migrations/049_add_social_proofs_table.sql', import.meta.url), 'utf-8')
    );
    await pool.query(migrationSQL);
    console.error('✅ Миграция применена\n');
  } catch (error) {
    if (error.message.includes('already exists') || error.code === '42P07') {
      console.error('⚠️  Таблица уже существует, пропускаем миграцию\n');
    } else {
      throw error;
    }
  }
}

async function main() {
  console.error('🔄 Создание начальных социальных доказательств...\n');
  
  try {
    await pool.query('SELECT NOW()');
    console.error('✅ Подключение к БД успешно\n');
    
    // Применяем миграцию
    await applyMigration();
  } catch (error) {
    console.error('❌ Ошибка подключения:', error.message);
    await pool.end();
    process.exit(1);
  }
  
  let created = 0;
  let skipped = 0;
  
  for (const sp of SOCIAL_PROOFS) {
    try {
      const wasCreated = await createSocialProof(sp);
      if (wasCreated) {
        created++;
        console.error(`   ✅ Создано: ${sp.title} - ${sp.value}`);
      } else {
        skipped++;
        console.error(`   ⏭️  Пропущено (уже есть): ${sp.title}`);
      }
    } catch (error) {
      console.error(`   ❌ Ошибка: ${sp.title} - ${error.message}`);
    }
  }
  
  console.error(`\n📊 Итого:`);
  console.error(`   ✅ Создано: ${created}`);
  console.error(`   ⏭️  Пропущено: ${skipped}`);
  
  await pool.end();
  console.error('\n✅ Готово!');
}

main().catch(error => {
  console.error('❌ Критическая ошибка:', error.message);
  process.exit(1);
});
