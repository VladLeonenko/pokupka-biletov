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
    conditions: 'При заказе разработки сайта + рекламы в Яндекс Директ'
  },
  {
    slug: 'tri-srazu',
    title: 'Акция "Три сразу"',
    description: 'При заказе от 3-х услуг из нашего прайса, скидка 3% на каждую из них.',
    discount_percent: 3,
    valid_until: '2025-12-31',
    is_active: true,
    button_text: 'Получить скидку',
    conditions: 'При заказе от 3-х услуг из нашего прайса'
  },
  {
    slug: 'sarafannoe-radio',
    title: 'Акция "Сарафанное радио"',
    description: 'При рекомендации нас друзьям и коллегам, и вы и ваш друг получаете скидку 5% на все услуги.',
    discount_percent: 5,
    valid_until: null, // Всегда
    is_active: true,
    button_text: 'Получить скидку',
    conditions: 'При рекомендации нас друзьям и коллегам'
  },
  {
    slug: 'prime-direct',
    title: 'Акция "Prime Direct"',
    description: 'Ведение рекламы в Яндекс.Директ от 2-х месяцев (или больше) - семантика или первая настройка рекламных кампаний бесплатно.',
    discount_percent: 100, // Бесплатно
    valid_until: '2025-12-31',
    is_active: true,
    button_text: 'Получить скидку',
    conditions: 'Ведение рекламы в Яндекс.Директ от 2-х месяцев'
  },
  {
    slug: 'chem-bolshe-tem-luchshe',
    title: 'Акция "Чем больше - тем лучше"',
    description: 'При заказе сайта на сумму от 350 000 руб. - 2 месяца бесплатной тех.поддержки, либо хостинг и домен на год + корпоративная почта в подарок',
    discount_percent: null, // Подарок
    valid_until: '2025-12-31',
    is_active: true,
    button_text: 'Получить скидку',
    conditions: 'При заказе сайта на сумму от 350 000 руб.'
  }
];

async function createOrUpdatePromotion(promo) {
  try {
    const existing = await pool.query(
      'SELECT id FROM promotions WHERE slug = $1',
      [promo.slug]
    );
    
    if (existing.rows.length > 0) {
      await pool.query(`
        UPDATE promotions SET
          title = $1,
          description = $2,
          discount_percent = $3,
          valid_until = $4,
          is_active = $5,
          button_text = $6,
          conditions = $7,
          updated_at = NOW()
        WHERE slug = $8
      `, [
        promo.title,
        promo.description,
        promo.discount_percent,
        promo.valid_until,
        promo.is_active,
        promo.button_text,
        promo.conditions,
        promo.slug
      ]);
      return 'updated';
    } else {
      await pool.query(`
        INSERT INTO promotions (
          slug, title, description, discount_percent, valid_until,
          is_active, button_text, conditions, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      `, [
        promo.slug,
        promo.title,
        promo.description,
        promo.discount_percent,
        promo.valid_until,
        promo.is_active,
        promo.button_text,
        promo.conditions
      ]);
      return 'created';
    }
  } catch (error) {
    throw error;
  }
}

async function main() {
  console.error('🔄 Создание/обновление акций...\n');
  
  try {
    await pool.query('SELECT NOW()');
    console.error('✅ Подключение к БД успешно\n');
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
