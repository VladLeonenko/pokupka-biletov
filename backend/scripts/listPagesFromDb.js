/**
 * Скрипт для получения списка всех страниц из БД
 * Помогает определить, какие страницы используют HTML
 */

import pool from '../db.js';

async function listAllPages() {
  try {
    const result = await pool.query(`
      SELECT 
        slug,
        title,
        CASE 
          WHEN body IS NOT NULL AND body != '' THEN 'body'
          ELSE 'empty'
        END as content_type,
        LENGTH(COALESCE(body, '')) as content_length,
        is_published,
        created_at,
        updated_at
      FROM pages
      ORDER BY slug
    `);

    console.log('\n📋 Список всех страниц из БД:\n');
    console.log('─'.repeat(100));
    console.log(
      'Slug'.padEnd(30) +
      'Title'.padEnd(30) +
      'Type'.padEnd(10) +
      'Size'.padEnd(10) +
      'Published'.padEnd(10)
    );
    console.log('─'.repeat(100));

    const pagesWithHtml = [];
    const pagesWithBody = [];
    const emptyPages = [];

    result.rows.forEach((row) => {
      const size = row.content_length > 0 
        ? `${Math.round(row.content_length / 1024)}KB` 
        : '0KB';
      
      const published = row.is_published ? '✅' : '❌';
      
      console.log(
        (row.slug || '/').padEnd(30) +
        (row.title || 'Без названия').substring(0, 28).padEnd(30) +
        row.content_type.padEnd(10) +
        size.padEnd(10) +
        published.padEnd(10)
      );

      if (row.content_type === 'body' && row.content_length > 0) {
        pagesWithBody.push(row);
      } else {
        emptyPages.push(row);
      }
    });

    console.log('─'.repeat(100));
    console.log(`\n📊 Статистика:\n`);
    console.log(`Страниц с body (HTML контент): ${pagesWithBody.length}`);
    console.log(`Пустых страниц: ${emptyPages.length}`);
    console.log(`Всего страниц: ${result.rows.length}`);

    if (pagesWithBody.length > 0) {
      console.log(`\n⚠️  Страницы с HTML контентом в body (требуют миграции):\n`);
      pagesWithBody.forEach((page) => {
        console.log(`  - ${page.slug} (${page.title || 'Без названия'}) - ${Math.round(page.content_length / 1024)}KB`);
      });
    }

    // Проверяем, какие страницы имеют React компоненты
    console.log(`\n🔍 Проверка соответствия с React роутами:\n`);
    const reactRoutes = [
      '/', '/about', '/contacts', '/new-client', '/catalog',
      '/blog', '/portfolio', '/promotion', '/ai-chat', '/ai-team'
    ];

    result.rows.forEach((row) => {
      const slug = row.slug || '/';
      const hasReact = reactRoutes.includes(slug);
      const hasContent = row.content_length > 0;
      
      if (hasContent && !hasReact) {
        console.log(`  ⚠️  ${slug} - есть HTML в БД, но нет React компонента`);
      } else if (hasReact && hasContent) {
        console.log(`  ✅ ${slug} - есть и React компонент, и HTML в БД (возможен дубликат)`);
      }
    });

    process.exit(0);
  } catch (error) {
    console.error('Ошибка:', error);
    process.exit(1);
  }
}

listAllPages();

