#!/usr/bin/env node
/**
 * Скрипт для применения всех миграций к указанной БД
 * Использование: node scripts/apply-migrations-to-db.js [database_name]
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

const targetDb = process.argv[2] || process.env.PGDATABASE || 'primecoder_db';

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: targetDb,
  password: process.env.PGPASSWORD,
  port: Number(process.env.PGPORT),
});

const migrationsDir = path.join(__dirname, '../migrations');

// Список миграций в порядке применения
const MIGRATION_FILES = [
  '001_init.sql',
  '002_carousels.sql',
  '003_seo.sql',
  '004_auth.sql',
  '005_cases_products.sql',
  '006_create_promotions.sql',
  '009_forms.sql',
  '010_funnels.sql',
  '016_ecommerce_v2.sql',
  '018_add_product_seo_and_cases.sql',
  '019_clients.sql',
  '020_chatbot.sql',
  '022_create_awards.sql',
  '024_add_reviews_table.sql',
  '028_create_team_members.sql',
  '029_email_campaigns.sql',
  '031_create_sites.sql',
  '033_exercise_images.sql',
  '034_extend_images_table.sql',
  '006_donors.sql',
  '006_move_logs.sql',
  '007_blog_post_tags_fix.sql',
  '007_expand_donors_add_marketing.sql',
  '008_cases_content_json.sql',
  '011_deal_payments_and_documents.sql',
  '011_products_content_json.sql',
  '012_add_case_template.sql',
  '015_create_carousels.sql',
  '016_ecommerce_fixed.sql',
  '017_add_category_is_active.sql',
  '021_add_case_category.sql',
  '023_add_case_donor_image_url.sql',
  '025_add_chat_session_id.sql',
  '025_extend_reviews_table.sql',
  '026_blog_cover_carousel.sql',
  '027_add_faq_to_products.sql',
  '030_add_task_categories.sql',
  '032_add_content_json_to_blog_and_pages.sql',
  '032_personal_planner.sql',
  '033_fix_personal_entries_types.sql',
  '034_fix_projects_duplicates.sql',
  '034_reading_books_tracking.sql',
  '035_user_profiles.sql',
  '036_create_user_consents.sql',
  '037_add_promo_code_to_promotions.sql',
  '038_seo_position_monitoring.sql',
  '039_ai_team.sql',
  '040_ai_team_paused_until.sql',
  '041_client_projects.sql',
  '042_client_projects_order.sql',
  '043_client_projects_primary_type.sql',
  '044_client_funnels.sql',
  '045_make_product_fk_deferrable.sql',
  '045_project_comments.sql',
  '046_commercial_proposals.sql',
  '047_semantic_topics.sql',
  '048_fix_cases_gallery_type.sql',
  '053_product_category_links.sql',
  'add_team_page.sql',
  '054_charity_preferences.sql',
  '055_home_cases_order.sql',
  '056_sales_manager_data_isolation.sql',
  '057_sales_academy_and_analytics.sql',
  '058_training_tests.sql',
  '059_training_courses.sql',
  '060_content_blocks.sql',
];

async function applyMigration(filename) {
  const filePath = path.join(migrationsDir, filename);
  
  if (!fs.existsSync(filePath)) {
    console.error(`⚠️  Файл миграции не найден: ${filename}`);
    return false;
  }
  
  const sql = fs.readFileSync(filePath, 'utf8');
  
  try {
    await pool.query(sql);
    console.error(`✅ Применена: ${filename}`);
    return true;
  } catch (error) {
    // Игнорируем ошибки "already exists" и подобные
    if (error.message.includes('already exists') || 
        error.message.includes('duplicate') ||
        error.code === '42P07' || // duplicate_table
        error.code === '42710') { // duplicate_object
      console.error(`⏭️  Пропущена (уже применена): ${filename}`);
      return true;
    }
    console.error(`❌ Ошибка в ${filename}:`, error.message);
    return false;
  }
}

async function main() {
  console.error(`🔄 Применение миграций к БД: ${targetDb}\n`);
  
  try {
    // Проверяем подключение
    await pool.query('SELECT NOW()');
    console.error('✅ Подключение к БД успешно\n');
  } catch (error) {
    console.error('❌ Ошибка подключения к БД:', error.message);
    await pool.end();
    process.exit(1);
  }
  
  let applied = 0;
  let skipped = 0;
  let failed = 0;
  
  for (const filename of MIGRATION_FILES) {
    const result = await applyMigration(filename);
    if (result) {
      if (filename.includes('already exists') || filename.includes('duplicate')) {
        skipped++;
      } else {
        applied++;
      }
    } else {
      failed++;
    }
  }
  
  console.error(`\n📊 Итого:`);
  console.error(`   ✅ Применено: ${applied}`);
  console.error(`   ⏭️  Пропущено: ${skipped}`);
  console.error(`   ❌ Ошибок: ${failed}`);
  
  await pool.end();
  console.error('\n✅ Готово!');
}

main().catch(error => {
  console.error('❌ Критическая ошибка:', error.message);
  process.exit(1);
});
