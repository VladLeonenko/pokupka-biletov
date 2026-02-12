#!/usr/bin/env node
/**
 * Заполняет SEO-поля для страниц кейсов (houses, polygon, straumann).
 * Madeo и LETA — исключены, редактируются вручную.
 * Запуск: cd backend && node scripts/seed-case-pages-seo.js
 */

import pool from '../db.js';

const CASE_PAGES = [
  {
    slug: '/houses-case',
    title: 'Кейс: сайт Дома России | PrimeCoder',
    description: 'Корпоративный сайт для Дома России: современный дизайн, адаптивная вёрстка, интеграция с CRM. Смотрите реализацию и результат.',
    keywords: ['кейс Дома России', 'корпоративный сайт', 'разработка сайта компания'],
    og_image: 'https://prime-coder.ru/legacy/img/cases/houses-case/cover.png',
  },
  // madeo-case — исключён, пользователь уже отредактировал
  {
    slug: '/polygon',
    title: 'Кейс: сайт Полигон | PrimeCoder',
    description: 'Сайт для компании Полигон: дизайн, адаптивность, CRM. Реальный кейс — смотрите подход и результат.',
    keywords: ['кейс Полигон', 'корпоративный сайт', 'веб-разработка'],
    og_image: 'https://prime-coder.ru/legacy/img/cases/polygon-case/cover.png',
  },
  {
    slug: '/straumann-case',
    title: 'Кейс: сайт Straumann | PrimeCoder',
    description: 'Сайт для Straumann: premium-разработка, адаптив, CRM. Кейс международного бренда в медицине и стоматологии.',
    keywords: ['кейс Straumann', 'корпоративный сайт', 'веб-разработка медицина'],
    og_image: 'https://prime-coder.ru/legacy/img/cases/straumann-case/cover.png',
  },
];

async function main() {
  for (const p of CASE_PAGES) {
    const slugsToTry = [p.slug, p.slug.replace(/^\//, '')];
    let updated = false;
    for (const s of slugsToTry) {
      const r = await pool.query(
        `UPDATE pages SET 
          seo_title = COALESCE(NULLIF(TRIM(seo_title), ''), $2),
          seo_description = COALESCE(NULLIF(TRIM(seo_description), ''), $3),
          seo_keywords = COALESCE(seo_keywords, $4),
          og_image_url = COALESCE(NULLIF(TRIM(og_image_url), ''), $5),
          updated_at = NOW()
        WHERE slug = $1
        RETURNING slug`,
        [s, p.title, p.description, p.keywords, p.og_image]
      );
      if (r.rowCount > 0) {
        console.log(`✅ ${p.slug}: SEO обновлено`);
        updated = true;
        break;
      }
    }
    if (!updated) console.log(`⏭️ ${p.slug}: страница не найдена (создайте в админке)`);
  }
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
