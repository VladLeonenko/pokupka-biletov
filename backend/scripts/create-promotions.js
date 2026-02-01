#!/usr/bin/env node
/**
 * Создание акций PrimeCoder на основе старых данных
 * Использование: node scripts/create-promotions.js
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загружаем .env с явным указанием пути
const envPath = path.join(__dirname, '../.env');
dotenv.config({ path: envPath });

// Проверяем что файл существует и выводим отладочную информацию
try {
  await fs.access(envPath);
  console.error(`✅ .env файл найден: ${envPath}`);
} catch (e) {
  console.error(`⚠️  .env файл не найден: ${envPath}`);
  console.error('   Продолжаем с переменными окружения системы...');
}

const { Pool } = pg;

// Проверяем переменные окружения (используем ТОЛЬКО из .env, без fallback)
const dbUser = process.env.PGUSER;
const dbHost = process.env.PGHOST || 'localhost';
const dbName = process.env.PGDATABASE;
const dbPassword = process.env.PGPASSWORD;
const dbPort = Number(process.env.PGPORT || 5432);

// Отладочный вывод (только в stderr, чтобы не мешать JSON выводу)
console.error('🔍 Параметры подключения:');
console.error(`   PGUSER: ${dbUser || 'НЕ УСТАНОВЛЕН'}`);
console.error(`   PGHOST: ${dbHost}`);
console.error(`   PGDATABASE: ${dbName || 'НЕ УСТАНОВЛЕН'}`);
console.error(`   PGPASSWORD: ${dbPassword ? '***' : 'НЕ УСТАНОВЛЕН'}`);
console.error(`   PGPORT: ${dbPort}\n`);

if (!dbUser) {
  console.error('❌ Ошибка: PGUSER не установлен в .env файле');
  process.exit(1);
}
if (!dbName) {
  console.error('❌ Ошибка: PGDATABASE не установлен в .env файле');
  process.exit(1);
}
if (!dbPassword) {
  console.error('❌ Ошибка: PGPASSWORD не установлен в .env файле');
  process.exit(1);
}

const pool = new Pool({
  user: dbUser,
  host: dbHost,
  database: dbName,
  password: dbPassword,
  port: dbPort,
});

const PROMOTIONS = [
  {
    slug: 'primecombo',
    title: 'Акция "PrimeCombo"',
    description: 'При заказе разработки сайта + рекламы в Яндекс Директ, скидка 10% на запуск рекламы.',
    discount_percent: 10,
    valid_until: '2025-12-31',
    is_active: true,
    button_text: 'Получить скидку',
    conditions: 'При заказе разработки сайта + рекламы в Яндекс Директ',
    form_id: 'primecombo-input'
  },
  {
    slug: 'tri-srazu',
    title: 'Акция "Три сразу"',
    description: 'При заказе от 3-х услуг из нашего прайса, скидка 3% на каждую из них.',
    discount_percent: 3,
    valid_until: '2025-12-31',
    is_active: true,
    button_text: 'Получить скидку',
    conditions: 'При заказе от 3-х услуг из нашего прайса',
    form_id: 'threepromo-input'
  },
  {
    slug: 'sarafannoe-radio',
    title: 'Акция "Сарафанное радио"',
    description: 'При рекомендации нас друзьям и коллегам, и вы и ваш друг получаете скидку 5% на все услуги.',
    discount_percent: 5,
    valid_until: null, // Всегда
    is_active: true,
    button_text: 'Получить скидку',
    conditions: 'При рекомендации нас друзьям и коллегам',
    form_id: 'radio-input'
  },
  {
    slug: 'prime-direct',
    title: 'Акция "Prime Direct"',
    description: 'Ведение рекламы в Яндекс.Директ от 2-х месяцев (или больше) - семантика или первая настройка рекламных кампаний бесплатно.',
    discount_percent: 100, // Бесплатно
    valid_until: '2025-12-31',
    is_active: true,
    button_text: 'Получить скидку',
    conditions: 'Ведение рекламы в Яндекс.Директ от 2-х месяцев',
    form_id: 'primedirect-input'
  },
  {
    slug: 'chem-bolshe-tem-luchshe',
    title: 'Акция "Чем больше - тем лучше"',
    description: 'При заказе сайта на сумму от 350 000 руб. - 2 месяца бесплатной тех.поддержки, либо хостинг и домен на год + корпоративная почта в подарок',
    discount_percent: null, // Подарок
    valid_until: '2025-12-31',
    is_active: true,
    button_text: 'Получить скидку',
    conditions: 'При заказе сайта на сумму от 350 000 руб.',
    form_id: 'bigestpromo-input'
  }
];

async function createOrUpdatePromotion(promo) {
  try {
    // Проверяем, есть ли колонки slug и conditions
    const hasSlugColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'promotions' AND column_name = 'slug'
    `);
    
    const hasConditionsColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'promotions' AND column_name = 'conditions'
    `);
    
    const hasSlug = hasSlugColumn.rows.length > 0;
    const hasConditions = hasConditionsColumn.rows.length > 0;
    
    // Сначала проверяем по slug (если колонка есть), если нет - по title
    let existing;
    if (hasSlug && promo.slug) {
      existing = await pool.query(
        'SELECT id FROM promotions WHERE slug = $1',
        [promo.slug]
      );
    }
    
    if (!existing || existing.rows.length === 0) {
      existing = await pool.query(
        'SELECT id FROM promotions WHERE title = $1',
        [promo.title]
      );
    }
    
    const expiryText = promo.valid_until ? null : 'Всегда';
    const expiryDate = promo.valid_until || null;
    
    if (existing && existing.rows.length > 0) {
      // Обновляем существующую запись
      if (hasSlug && hasConditions) {
        // Колонки есть - используем полный UPDATE
        await pool.query(`
          UPDATE promotions SET
            slug = $1,
            title = $2,
            description = $3,
            discount_percent = $4,
            expiry_date = $5,
            expiry_text = $6,
            is_active = $7,
            button_text = $8,
            conditions = $9,
            form_id = $10,
            updated_at = NOW()
          WHERE id = $11
        `, [
          promo.slug,
          promo.title,
          promo.description,
          promo.discount_percent,
          expiryDate,
          expiryText,
          promo.is_active,
          promo.button_text,
          promo.conditions,
          promo.form_id || null,
          existing.rows[0].id
        ]);
      } else {
        // Колонок нет - UPDATE без slug и conditions
        await pool.query(`
          UPDATE promotions SET
            title = $1,
            description = $2,
            discount_percent = $3,
            expiry_date = $4,
            expiry_text = $5,
            is_active = $6,
            button_text = $7,
            form_id = $8,
            updated_at = NOW()
          WHERE id = $9
        `, [
          promo.title,
          promo.description,
          promo.discount_percent,
          expiryDate,
          expiryText,
          promo.is_active,
          promo.button_text,
          promo.form_id || null,
          existing.rows[0].id
        ]);
      }
      return 'updated';
    } else {
      // Создаем новую запись
      if (hasSlug && hasConditions) {
        // Колонки есть - используем полный INSERT
        await pool.query(`
          INSERT INTO promotions (
            slug, title, description, discount_percent, expiry_date, expiry_text,
            is_active, button_text, conditions, form_id, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        `, [
          promo.slug,
          promo.title,
          promo.description,
          promo.discount_percent,
          expiryDate,
          expiryText,
          promo.is_active,
          promo.button_text,
          promo.conditions,
          promo.form_id || null
        ]);
      } else {
        // Колонок нет - INSERT без slug и conditions
        await pool.query(`
          INSERT INTO promotions (
            title, description, discount_percent, expiry_date, expiry_text,
            is_active, button_text, form_id, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        `, [
          promo.title,
          promo.description,
          promo.discount_percent,
          expiryDate,
          expiryText,
          promo.is_active,
          promo.button_text,
          promo.form_id || null
        ]);
      }
      return 'created';
    }
  } catch (error) {
    throw error;
  }
}

async function applyMigration() {
  try {
    console.error('📦 Применение миграции для добавления slug...\n');
    
    // Проверяем, существует ли колонка slug
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'promotions' AND column_name = 'slug'
    `);
    
    if (checkResult.rows.length > 0) {
      console.error('⚠️  Колонка slug уже существует, пропускаем миграцию\n');
      return;
    }
    
    // Пытаемся добавить колонки по одной, чтобы обойти проблему с правами
    try {
      await pool.query(`ALTER TABLE promotions ADD COLUMN IF NOT EXISTS slug TEXT`);
      console.error('   ✅ Колонка slug добавлена');
    } catch (e) {
      if (e.message.includes('already exists') || e.code === '42710' || e.code === '42P07') {
        console.error('   ⚠️  Колонка slug уже существует');
      } else {
        console.error('   ⚠️  Не удалось добавить slug (возможно, нет прав):', e.message);
        console.error('   💡 Запустите миграцию вручную от имени postgres:');
        console.error('      sudo -u postgres psql -d primecoder_prod -c "ALTER TABLE promotions ADD COLUMN IF NOT EXISTS slug TEXT, ADD COLUMN IF NOT EXISTS conditions TEXT;"');
      }
    }
    
    try {
      await pool.query(`ALTER TABLE promotions ADD COLUMN IF NOT EXISTS conditions TEXT`);
      console.error('   ✅ Колонка conditions добавлена');
    } catch (e) {
      if (e.message.includes('already exists') || e.code === '42710' || e.code === '42P07') {
        console.error('   ⚠️  Колонка conditions уже существует');
      } else {
        console.error('   ⚠️  Не удалось добавить conditions (возможно, нет прав):', e.message);
      }
    }
    
    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_promotions_slug ON promotions(slug) WHERE slug IS NOT NULL`);
      console.error('   ✅ Индекс создан');
    } catch (e) {
      if (e.code === '42P07') {
        console.error('   ⚠️  Индекс уже существует');
      } else {
        console.error('   ⚠️  Не удалось создать индекс:', e.message);
      }
    }
    
    // Проверяем существование constraint перед добавлением
    try {
      const constraintCheck = await pool.query(`
        SELECT 1 FROM pg_constraint WHERE conname = 'promotions_slug_unique'
      `);
      if (constraintCheck.rows.length === 0) {
        await pool.query(`ALTER TABLE promotions ADD CONSTRAINT promotions_slug_unique UNIQUE (slug)`);
        console.error('   ✅ Constraint добавлен');
      } else {
        console.error('   ⚠️  Constraint уже существует');
      }
    } catch (e) {
      if (e.code === '23505' || e.message.includes('already exists')) {
        console.error('   ⚠️  Constraint уже существует');
      } else {
        console.error('   ⚠️  Не удалось добавить constraint:', e.message);
      }
    }
    
    console.error('✅ Миграция применена (с предупреждениями, если нет прав)\n');
  } catch (error) {
    console.error('❌ Ошибка применения миграции:', error.message);
    console.error('💡 Если ошибка связана с правами, запустите миграцию вручную:');
    console.error('   sudo -u postgres psql -d primecoder_prod -c "ALTER TABLE promotions ADD COLUMN IF NOT EXISTS slug TEXT, ADD COLUMN IF NOT EXISTS conditions TEXT;"');
    // Не бросаем ошибку, продолжаем работу (скрипт может работать и без этих колонок)
  }
}

async function main() {
  console.error('🔄 Создание/обновление акций...\n');
  
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
  let updated = 0;
  let errors = 0;
  
  for (const promo of PROMOTIONS) {
    try {
      console.error(`📦 Обработка: ${promo.title}...`);
      const result = await createOrUpdatePromotion(promo);
      if (result === 'created') {
        created++;
        console.error(`   ✅ Создана: ${promo.slug}`);
      } else {
        updated++;
        console.error(`   ✅ Обновлена: ${promo.slug}`);
      }
    } catch (error) {
      errors++;
      console.error(`   ❌ Ошибка: ${promo.slug} - ${error.message}`);
    }
  }
  
  console.error(`\n📊 Итого:`);
  console.error(`   ✅ Создано: ${created}`);
  console.error(`   🔄 Обновлено: ${updated}`);
  console.error(`   ❌ Ошибок: ${errors}`);
  
  await pool.end();
  console.error('\n✅ Готово!');
}

main().catch(error => {
  console.error('❌ Критическая ошибка:', error.message);
  process.exit(1);
});
