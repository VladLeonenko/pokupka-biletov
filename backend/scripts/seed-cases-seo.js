#!/usr/bin/env node
/**
 * Заполняет SEO-поля для кейсов в таблице cases.
 * Использует title, summary, hero_image_url как fallback для пустых полей.
 *
 * ПРЕДВАРИТЕЛЬНО: убедитесь, что колонки существуют:
 *   sudo -u postgres psql -d primecoder_prod -f backend/migrations/052_add_cases_seo_fields.sql
 *
 * Запуск: npm run seed:cases-seo
 *    или: cd backend && node scripts/seed-cases-seo.js
 */

import pool from '../db.js';

async function main() {
  // Проверяем наличие колонок
  const cols = await pool.query(
    `SELECT column_name FROM information_schema.columns 
     WHERE table_schema = 'public' AND table_name = 'cases' 
     AND column_name IN ('seo_title', 'seo_description', 'seo_keywords', 'og_image_url')`
  );
  if (cols.rows.length < 4) {
    console.error('❌ Колонки SEO не найдены в таблице cases.');
    console.error('   Выполните: sudo -u postgres psql -d primecoder_prod -f backend/migrations/052_add_cases_seo_fields.sql');
    process.exit(1);
  }

  const r = await pool.query(
    `SELECT slug, title, summary, hero_image_url, 
            COALESCE(NULLIF(TRIM(seo_title), ''), title) as need_seo_title,
            COALESCE(NULLIF(TRIM(seo_description), ''), summary) as need_seo_desc,
            COALESCE(NULLIF(TRIM(og_image_url), ''), hero_image_url) as need_og
     FROM cases 
     WHERE is_template = FALSE`
  );

  let updated = 0;
  for (const row of r.rows) {
    const baseTitle = row.need_seo_title || row.title || 'Кейс';
    const seoTitle = (baseTitle.includes('PrimeCoder') || baseTitle.includes('|')) ? baseTitle : `${baseTitle} — кейс | PrimeCoder`;
    const seoDesc = row.need_seo_desc || row.summary || 'Реальный кейс разработки сайта. Дизайн, вёрстка, интеграции. PrimeCoder.';
    const seoKeywords = row.title ? `кейс ${row.title}, разработка сайта, портфолио` : 'кейсы веб-разработки, PrimeCoder';
    const ogImage = row.need_og || row.hero_image_url || null;

    await pool.query(
      `UPDATE cases SET 
        seo_title = COALESCE(NULLIF(TRIM(seo_title), ''), $2),
        seo_description = COALESCE(NULLIF(TRIM(seo_description), ''), $3),
        seo_keywords = COALESCE(NULLIF(TRIM(seo_keywords), ''), $4),
        og_image_url = COALESCE(NULLIF(TRIM(og_image_url), ''), $5),
        updated_at = NOW()
       WHERE slug = $1`,
      [row.slug, seoTitle.slice(0, 70), seoDesc.slice(0, 160), seoKeywords, ogImage]
    );
    updated++;
    console.log(`✅ ${row.slug}`);
  }

  console.log(`\n📊 Обновлено кейсов: ${updated}`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
