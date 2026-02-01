#!/usr/bin/env node
/**
 * Создание начальных каруселей для главной страницы и команды
 * Использование: node scripts/create-initial-carousels.js
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

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

// Вертикальная карусель для главной страницы
const verticalCarouselItems = [
  { caption_html: 'Веб-дизайн', text: 'Веб-дизайн', sort_order: 0 },
  { caption_html: 'Маркетинг', text: 'Маркетинг', sort_order: 1 },
  { caption_html: 'Реклама', text: 'Реклама', sort_order: 2 },
  { caption_html: 'Сайт под ключ', text: 'Сайт под ключ', sort_order: 3 },
  { caption_html: 'Тестирование', text: 'Тестирование', sort_order: 4 },
  { caption_html: 'Продвижение', text: 'Продвижение', sort_order: 5 },
];

// Карусель команды
const teamMembers = [
  {
    name: 'Владислав Леоненко',
    position: 'Руководитель',
    image: '/legacy/img/leonenko-vladislav.jpg',
    sort_order: 0,
  },
  {
    name: 'Павел Гришко',
    position: 'Front-end разработчик',
    image: '/legacy/img/pavel.jpeg',
    sort_order: 1,
  },
  {
    name: 'Светлана Пчелинцева',
    position: 'Маркетолог',
    image: '/legacy/img/svetlana.jpg',
    sort_order: 2,
  },
  {
    name: 'Сергей Королёв',
    position: 'Главный дизайнер',
    image: '/legacy/img/sergey.jpeg',
    sort_order: 3,
  },
  {
    name: 'Анна Сёмушкина',
    position: 'Дизайнер',
    image: '/legacy/img/anna.jpeg',
    sort_order: 4,
  },
  {
    name: 'Миннуллин Ильшат',
    position: 'Backend-разработчик',
    image: '/legacy/img/ilshat.jpeg',
    sort_order: 5,
  },
];

async function createOrUpdateCarousel(slug, title, items) {
  try {
    // Проверяем существование карусели
    const existing = await pool.query('SELECT id FROM carousels WHERE slug = $1', [slug]);
    
    let carouselId;
    if (existing.rows.length === 0) {
      // Создаем карусель
      const result = await pool.query(
        'INSERT INTO carousels (slug, title) VALUES ($1, $2) RETURNING id',
        [slug, title]
      );
      carouselId = result.rows[0].id;
      console.error(`   ✅ Создана карусель "${slug}" с ID: ${carouselId}`);
    } else {
      carouselId = existing.rows[0].id;
      // Обновляем название
      await pool.query('UPDATE carousels SET title = $1 WHERE id = $2', [title, carouselId]);
      // Удаляем старые слайды
      await pool.query('DELETE FROM carousel_slides WHERE carousel_id = $1', [carouselId]);
      console.error(`   ✅ Обновлена карусель "${slug}" с ID: ${carouselId}`);
    }

    // Добавляем слайды
    for (const item of items) {
      const captionHtml = item.caption_html || 
        (item.name ? `<div style="text-align: center;"><strong style="display: block; font-weight: 600; margin-bottom: 5px; font-size: 18px;">${item.name}</strong><p style="margin: 0; color: rgba(255, 255, 255, 0.7); font-size: 14px;">${item.position || ''}</p></div>` : null);
      
      // Проверяем какие колонки есть в таблице
      const columnsCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'carousel_slides' AND column_name IN ('text', 'title')
      `);
      const hasTextColumn = columnsCheck.rows.some(row => row.column_name === 'text');
      const hasTitleColumn = columnsCheck.rows.some(row => row.column_name === 'title');
      
      // Формируем список колонок и значений в зависимости от структуры таблицы
      const columns = ['carousel_id', 'kind', 'image_url', 'caption_html', 'sort_order', 'is_active'];
      const values = [
        carouselId,
        item.image ? 'image' : 'text',
        item.image || null,
        captionHtml || null,
        item.sort_order || 0,
        true,
      ];
      
      // Добавляем text или title если колонка существует
      if (hasTextColumn) {
        columns.push('text');
        values.push(item.text || item.name || null);
      } else if (hasTitleColumn) {
        columns.push('title');
        values.push(item.text || item.name || null);
      }
      
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      
      await pool.query(
        `INSERT INTO carousel_slides (${columns.join(', ')})
         VALUES (${placeholders})`,
        values
      );
    }

    console.error(`   ✅ Добавлено ${items.length} слайдов в карусель "${slug}"`);
    return carouselId;
  } catch (error) {
    console.error(`   ❌ Ошибка при создании карусели "${slug}":`, error.message);
    throw error;
  }
}

async function main() {
  console.error('🔄 Создание начальных каруселей...\n');
  
  try {
    await pool.query('SELECT NOW()');
    console.error('✅ Подключение к БД успешно\n');
  } catch (error) {
    console.error('❌ Ошибка подключения:', error.message);
    await pool.end();
    process.exit(1);
  }

  try {
    // Создаем вертикальную карусель для главной
    console.error('📦 Создание вертикальной карусели для главной страницы...');
    await createOrUpdateCarousel(
      'vertical-carousel-home',
      'Вертикальная карусель на главной',
      verticalCarouselItems
    );

    // Создаем карусель команды
    console.error('\n📦 Создание карусели команды...');
    await createOrUpdateCarousel(
      'team',
      'Команда',
      teamMembers
    );

    console.error('\n✅ Все карусели успешно созданы/обновлены!');
  } catch (error) {
    console.error('\n❌ Критическая ошибка:', error.message);
    process.exit(1);
  }

  await pool.end();
  console.error('\n✅ Готово!');
}

main().catch(error => {
  console.error('❌ Критическая ошибка:', error.message);
  process.exit(1);
});
