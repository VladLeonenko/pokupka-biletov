#!/usr/bin/env node
/**
 * Настройка страниц для primecoder и удаление всех статей блога
 * Использование: node scripts/setup-primecoder-pages.js
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

// Страницы для создания
const PAGES = [
  {
    slug: '/',
    title: 'Главная',
    body: '<h1>PrimeCoder</h1><p>Digital-агентство</p>',
    is_published: true
  },
  {
    slug: '/komanda-primecoder',
    title: 'Команда PrimeCoder',
    body: '<h1>Наша команда</h1><p>Профессионалы в области digital-маркетинга и разработки</p>',
    is_published: true
  },
  {
    slug: '/catalog',
    title: 'Каталог услуг',
    body: '<h1>Каталог услуг</h1><p>Наши услуги по разработке, маркетингу и продвижению</p>',
    is_published: true
  },
  {
    slug: '/blog',
    title: 'Блог',
    body: '<h1>Блог</h1><p>Статьи о маркетинге, разработке, SEO и AI</p>',
    is_published: true
  },
  {
    slug: '/contacts',
    title: 'Контакты',
    body: '<h1>Контакты</h1><p>Свяжитесь с нами</p>',
    is_published: true
  },
  {
    slug: '/about',
    title: 'О нас',
    body: '<h1>О нас</h1><p>О компании PrimeCoder</p>',
    is_published: true
  }
];

async function deleteAllBlogPosts() {
  console.error('🗑️  Удаление всех статей блога...\n');
  
  try {
    const result = await pool.query('DELETE FROM blog_posts RETURNING slug, title');
    console.error(`   ✅ Удалено статей: ${result.rows.length}`);
    
    if (result.rows.length > 0 && result.rows.length <= 10) {
      console.error('\n   Удалённые статьи:');
      result.rows.forEach(r => {
        console.error(`   - ${r.slug}: ${r.title.substring(0, 50)}...`);
      });
    }
    
    const remaining = await pool.query('SELECT COUNT(*) as count FROM blog_posts');
    console.error(`\n   📊 Осталось статей: ${remaining.rows[0].count}`);
  } catch (error) {
    console.error('❌ Ошибка при удалении статей:', error.message);
    throw error;
  }
}

async function setupPages() {
  console.error('\n📄 Настройка страниц...\n');
  
  let created = 0;
  let updated = 0;
  
  for (const page of PAGES) {
    try {
      // Проверяем, существует ли страница
      const existing = await pool.query(
        'SELECT id FROM pages WHERE slug = $1',
        [page.slug]
      );
      
      if (existing.rows.length > 0) {
        // Обновляем существующую
        await pool.query(`
          UPDATE pages 
          SET title = $1, body = $2, is_published = $3, updated_at = NOW()
          WHERE slug = $4
        `, [page.title, page.body, page.is_published, page.slug]);
        updated++;
        console.error(`   ✅ Обновлена: ${page.slug} - ${page.title}`);
      } else {
        // Создаем новую
        await pool.query(`
          INSERT INTO pages (slug, title, body, is_published, created_at, updated_at)
          VALUES ($1, $2, $3, $4, NOW(), NOW())
        `, [page.slug, page.title, page.body, page.is_published]);
        created++;
        console.error(`   ✅ Создана: ${page.slug} - ${page.title}`);
      }
    } catch (error) {
      console.error(`   ❌ Ошибка при обработке ${page.slug}:`, error.message);
    }
  }
  
  console.error(`\n   📊 Создано: ${created}, Обновлено: ${updated}`);
  
  // Показываем все страницы
  const allPages = await pool.query('SELECT slug, title, is_published FROM pages ORDER BY slug');
  console.error(`\n   📄 Всего страниц в БД: ${allPages.rows.length}`);
  if (allPages.rows.length > 0) {
    console.error('\n   Список страниц:');
    allPages.rows.forEach(p => {
      const status = p.is_published ? '✅' : '❌';
      console.error(`   ${status} ${p.slug} - ${p.title || 'без названия'}`);
    });
  }
}

async function createCategories() {
  console.error('\n📂 Создание категорий товаров...\n');
  
  const categories = [
    { slug: 'marketing', name: 'Маркетинг' },
    { slug: 'razrabotka', name: 'Разработка' },
    { slug: 'seo', name: 'SEO' },
    { slug: 'reklama', name: 'Реклама' },
    { slug: 'ai', name: 'AI' },
    { slug: 'prodvizhenie', name: 'Продвижение' },
    { slug: 'digital', name: 'Digital' },
    { slug: 'autsorsing', name: 'Аутсорсинг' }
  ];
  
  let created = 0;
  let updated = 0;
  
  for (const cat of categories) {
    try {
      const existing = await pool.query(
        'SELECT id FROM product_categories WHERE slug = $1',
        [cat.slug]
      );
      
      if (existing.rows.length > 0) {
        await pool.query(`
          UPDATE product_categories 
          SET name = $1, is_active = true, updated_at = NOW()
          WHERE slug = $2
        `, [cat.name, cat.slug]);
        updated++;
        console.error(`   ✅ Обновлена: ${cat.slug} - ${cat.name}`);
      } else {
        await pool.query(`
          INSERT INTO product_categories (slug, name, is_active, created_at, updated_at)
          VALUES ($1, $2, true, NOW(), NOW())
        `, [cat.slug, cat.name]);
        created++;
        console.error(`   ✅ Создана: ${cat.slug} - ${cat.name}`);
      }
    } catch (error) {
      console.error(`   ❌ Ошибка при обработке ${cat.slug}:`, error.message);
    }
  }
  
  console.error(`\n   📊 Создано: ${created}, Обновлено: ${updated}`);
}

async function showStatistics() {
  console.error('\n📊 Итоговая статистика:\n');
  
  const blogCount = await pool.query('SELECT COUNT(*) as count FROM blog_posts');
  console.error(`   📝 Статей: ${blogCount.rows[0].count}`);
  
  const productCount = await pool.query('SELECT COUNT(*) as count FROM products');
  console.error(`   🛍️  Товаров: ${productCount.rows[0].count}`);
  
  const categoryCount = await pool.query('SELECT COUNT(*) as count FROM product_categories');
  console.error(`   📂 Категорий товаров: ${categoryCount.rows[0].count}`);
  
  const pageCount = await pool.query('SELECT COUNT(*) as count FROM pages');
  console.error(`   📄 Страниц: ${pageCount.rows[0].count}`);
  
  const funnelCount = await pool.query('SELECT COUNT(*) as count FROM sales_funnels');
  console.error(`   🎯 Воронок продаж: ${funnelCount.rows[0].count}`);
}

async function main() {
  console.error('🔄 Настройка страниц PrimeCoder\n');
  console.error(`   БД: ${process.env.PGDATABASE}`);
  console.error('   Действия:');
  console.error('   1. Удаление всех статей блога');
  console.error('   2. Создание/обновление страниц');
  console.error('   3. Создание категорий товаров');
  console.error('\n   Продолжить? (Ctrl+C для отмены)\n');
  
  // Даем 3 секунды на отмену
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  try {
    await deleteAllBlogPosts();
    await setupPages();
    await createCategories();
    await showStatistics();
    
    await pool.end();
    console.error('\n✅ Готово!');
  } catch (error) {
    console.error('\n❌ Ошибка:', error.message);
    await pool.end();
    process.exit(1);
  }
}

main();
