#!/usr/bin/env node
/**
 * Создание акций PrimeCoder на основе старых данных
 * Использование: node scripts/create-promotions.js
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
    
    const migrationSQL = `
      ALTER TABLE promotions 
      ADD COLUMN slug TEXT,
      ADD COLUMN conditions TEXT;
      
      CREATE INDEX IF NOT EXISTS idx_promotions_slug ON promotions(slug) WHERE slug IS NOT NULL;
      
      ALTER TABLE promotions 
      ADD CONSTRAINT promotions_slug_unique UNIQUE (slug);
    `;
    
    await pool.query(migrationSQL);
    console.error('✅ Миграция применена\n');
  } catch (error) {
    if (error.message.includes('already exists') || error.code === '42710' || error.code === '42P07' || error.code === '23505') {
      console.error('⚠️  Колонки уже существуют или ограничение уже есть, пропускаем миграцию\n');
    } else {
      console.error('❌ Ошибка применения миграции:', error.message);
      throw error;
    }
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
