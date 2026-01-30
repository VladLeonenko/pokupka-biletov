#!/usr/bin/env node
/**
 * Скрипт для разделения данных по проектам и создания отдельных БД
 * 
 * Проекты:
 * - primecoder: услуги разработки, ИИ, маркетинг, SEO
 * - amani: товары искусства (африканские маски, картины, скульптуры)
 * - umagazine: статьи про моду, искусство (38,000+ статей, созданные 29 января)
 * 
 * Использование: node scripts/split-databases-by-project.js
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'child_process';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

// Конфигурация для исходной БД
const sourceConfig = {
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: Number(process.env.PGPORT),
};

const sourcePool = new Pool(sourceConfig);

// Конфигурации для новых БД
const databases = {
  primecoder: {
    name: 'primecoder_db',
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
  },
  amani: {
    name: 'amani_db',
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
  },
  umagazine: {
    name: 'umagazine_db',
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
  },
};

// Фильтры для каждого проекта
const PROJECT_FILTERS = {
  primecoder: {
    blog_posts: `
      WHERE (
        title ILIKE '%ИИ%' OR 
        title ILIKE '%маркетинг%' OR 
        title ILIKE '%разработка%' OR 
        title ILIKE '%сайт%' OR 
        title ILIKE '%веб%' OR 
        title ILIKE '%программирование%' OR
        title ILIKE '%seo%' OR
        title ILIKE '%дизайн%' OR
        body ILIKE '%primecoder%' OR
        slug ILIKE '%primecoder%'
      )
      AND created_at < '2026-01-29'
    `,
    products: `
      WHERE (
        title ILIKE '%tilda%' OR
        title ILIKE '%seo%' OR
        title ILIKE '%ai%' OR
        title ILIKE '%аутсорсинг%' OR
        title ILIKE '%АУТСОРСИНГ%' OR
        title ILIKE '%digital%' OR
        title ILIKE '%DIGITAL%' OR
        title ILIKE '%блогер%' OR
        title ILIKE '%БЛОГЕР%' OR
        slug = 'reklama-u-blogerov' OR
        title ILIKE '%маркетинг%' OR
        title ILIKE '%Маркетинг%' OR
        title ILIKE '%продаж%' OR
        title ILIKE '%разработка%' OR
        title ILIKE '%Разработка%' OR
        title ILIKE '%сайт%'
      )
      AND NOT (
        title ILIKE '%африканск%' OR
        title ILIKE '%маска%' OR
        title ILIKE '%картина%' OR
        title ILIKE '%скульптура%' OR
        title ILIKE '%постер%' OR
        title ILIKE '%фотография%' OR
        title ILIKE '%саванна%' OR
        title ILIKE '%amani%'
      )
    `,
  },
  amani: {
    products: `
      WHERE (
        title ILIKE '%африканск%' OR
        title ILIKE '%маска%' OR
        title ILIKE '%картина%' OR
        title ILIKE '%скульптура%' OR
        title ILIKE '%постер%' OR
        title ILIKE '%фотография%' OR
        title ILIKE '%саванна%' OR
        title ILIKE '%amani%'
      )
    `,
  },
  umagazine: {
    blog_posts: `
      WHERE (
        created_at >= '2026-01-29' OR
        title ILIKE '%мода%' OR
        title ILIKE '%fashion%' OR
        title ILIKE '%стиль%' OR
        title ILIKE '%коллекция%' OR
        title ILIKE '%показ%' OR
        title ILIKE '%дизайнер%' OR
        title ILIKE '%бренд%' OR
        slug LIKE '/moda-%' OR
        slug LIKE '/lifestyle-%' OR
        slug LIKE '/brands/%'
      )
      AND NOT (
        title ILIKE '%ИИ%' AND title ILIKE '%маркетинг%' AND title ILIKE '%разработка%'
      )
    `,
  },
};

async function createDatabase(dbName, user) {
  try {
    // Пробуем подключиться к postgres БД для создания новой БД
    let adminPool;
    try {
      adminPool = new Pool({
        ...sourceConfig,
        database: 'postgres',
      });
      await adminPool.query('SELECT 1');
    } catch (e) {
      // Если не получается подключиться к postgres, пробуем template1
      try {
        adminPool = new Pool({
          ...sourceConfig,
          database: 'template1',
        });
        await adminPool.query('SELECT 1');
      } catch (e2) {
        console.error(`   ⚠️  Cannot connect to postgres/template1. Trying to grant CREATEDB privilege...`);
        // Пробуем дать права пользователю
        try {
          const tempPool = new Pool(sourceConfig);
          await tempPool.query(`ALTER USER ${user} CREATEDB;`);
          await tempPool.end();
        } catch (e3) {
          console.error(`   ❌ Cannot grant CREATEDB privilege. Please create databases manually:`);
          console.error(`      CREATE DATABASE ${dbName} OWNER ${user};`);
          return false;
        }
      }
    }
    
    if (!adminPool) {
      return false;
    }
    
    // Проверяем, существует ли БД
    const check = await adminPool.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );
    
    if (check.rows.length === 0) {
      await adminPool.query(`CREATE DATABASE ${dbName} OWNER ${user}`);
      console.error(`   ✅ Created database: ${dbName}`);
    } else {
      console.error(`   ℹ️  Database ${dbName} already exists`);
    }
    
    await adminPool.end();
    return true;
  } catch (error) {
    console.error(`   ❌ Failed to create database ${dbName}:`, error.message);
    console.error(`   💡 Try creating manually: CREATE DATABASE ${dbName} OWNER ${user};`);
    return false;
  }
}

async function runMigrations(targetPool) {
  // Запускаем миграции для создания структуры таблиц
  const migrationsDir = path.join(__dirname, '../migrations');
  // Все миграции в правильном порядке
  const migrations = [
    '001_init.sql',
    '002_carousels.sql',
    '003_seo.sql',
    '004_auth.sql',
    '005_cases_products.sql',
    '006_create_promotions.sql',
    '006_donors.sql',
    '006_move_logs.sql',
    '007_blog_post_tags_fix.sql',
    '007_expand_donors_add_marketing.sql',
    '008_cases_content_json.sql',
    '009_forms.sql',
    '010_funnels.sql',
    '011_deal_payments_and_documents.sql',
    '011_products_content_json.sql',
    '012_add_case_template.sql',
    '015_create_carousels.sql',
    '016_ecommerce_fixed.sql',
    '016_ecommerce_v2.sql',
    '017_add_category_is_active.sql',
    '018_add_product_seo_and_cases.sql',
    '019_clients.sql',
    '020_chatbot.sql',
    '021_add_case_category.sql',
    '022_add_case_donor_url.sql',
    '022_create_awards.sql',
    '023_add_case_donor_image_url.sql',
    '024_add_reviews_table.sql',
    '025_add_chat_session_id.sql',
    '025_extend_reviews_table.sql',
    '026_blog_cover_carousel.sql', // Добавляет cover_image_url в blog_posts
    '027_add_faq_to_products.sql',
    '028_create_team_members.sql',
    '029_email_campaigns.sql',
    '030_add_task_categories.sql',
    '031_create_sites.sql',
    '032_personal_planner.sql',
    '033_exercise_images.sql',
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
    'add_team_page.sql',
  ];
  
  console.error('   📦 Running migrations...');
  for (const migration of migrations) {
    try {
      const migrationPath = path.join(migrationsDir, migration);
      if (!fs.existsSync(migrationPath)) {
        console.error(`      ⚠️  ${migration} not found, skipping`);
        continue;
      }
      const sql = fs.readFileSync(migrationPath, 'utf8');
      await targetPool.query(sql);
      console.error(`      ✅ ${migration}`);
    } catch (error) {
      if (error.code !== '42P07') { // Игнорируем "already exists" ошибки
        console.error(`      ⚠️  ${migration}: ${error.message}`);
      }
    }
  }
}

async function exportAndImportTable(sourcePool, targetPool, tableName, project, filters = {}) {
  try {
    const filter = filters[tableName] || '';
    
    // Определяем колонку для сортировки
    let orderBy = '';
    try {
      const columns = await sourcePool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [tableName]);
      
      const colNames = columns.rows.map(r => r.column_name);
      if (colNames.includes('id')) {
        orderBy = 'ORDER BY id';
      } else if (colNames.includes('name')) {
        orderBy = 'ORDER BY name';
      } else if (colNames.includes('slug')) {
        orderBy = 'ORDER BY slug';
      }
    } catch (e) {
      // Игнорируем ошибки определения колонок
    }
    
    // Экспортируем из исходной БД
    const result = await sourcePool.query(`SELECT * FROM ${tableName} ${filter} ${orderBy}`);
    
    if (result.rows.length === 0) {
      return { exported: 0, imported: 0 };
    }
    
    // Получаем структуру целевой таблицы
    const targetColumns = await targetPool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);
    
    const targetColNames = targetColumns.rows.map(r => r.column_name);
    
    // Определяем primary key для ON CONFLICT
    const pkResult = await targetPool.query(`
      SELECT a.attname
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = $1::regclass AND i.indisprimary
    `, [tableName]);
    
    const pkColumn = pkResult.rows.length > 0 ? pkResult.rows[0].attname : null;
    
    // Импортируем в целевую БД
    let imported = 0;
    for (const row of result.rows) {
      try {
        // Фильтруем только существующие колонки
        const rowData = {};
        for (const col of targetColNames) {
          if (row.hasOwnProperty(col)) {
            rowData[col] = row[col];
          }
        }
        
        const columns = Object.keys(rowData);
        const values = columns.map((_, i) => `$${i + 1}`);
        // Обрабатываем JSON/JSONB поля
        const params = columns.map(col => {
          const value = rowData[col];
          // Если значение уже объект/массив, преобразуем в JSON строку для JSONB полей
          if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
            try {
              return JSON.stringify(value);
            } catch (e) {
              return value;
            }
          }
          return value;
        });
        
        let conflictClause = '';
        if (pkColumn && columns.includes(pkColumn)) {
          conflictClause = `ON CONFLICT (${pkColumn}) DO NOTHING`;
        } else if (tableName === 'partials' && columns.includes('name')) {
          conflictClause = `ON CONFLICT (name) DO UPDATE SET html = EXCLUDED.html`;
        }
        
        // Для JSONB полей используем ::jsonb
        const columnDefs = columns.map(col => {
          // Проверяем, является ли колонка JSONB
          const isJsonb = ['gallery', 'metrics', 'settings', 'items', 'content_json', 'carousel_items'].includes(col);
          return isJsonb ? `${col}::jsonb` : col;
        });
        
        await targetPool.query(
          `INSERT INTO ${tableName} (${columns.join(', ')}) 
           VALUES (${values.join(', ')}) 
           ${conflictClause}`,
          params
        );
        imported++;
      } catch (error) {
        // Игнорируем ошибки дубликатов и отсутствующих колонок
        if (!error.message.includes('duplicate') && 
            !error.message.includes('unique') && 
            !error.message.includes('does not exist')) {
          console.error(`      ⚠️  Error importing row: ${error.message}`);
        }
      }
    }
    
    return { exported: result.rows.length, imported };
  } catch (error) {
    if (error.code === '42P01') {
      return { exported: 0, imported: 0, error: 'Table does not exist' };
    }
    throw error;
  }
}

async function splitDatabase(projectName) {
  console.error(`\n🔄 Processing project: ${projectName.toUpperCase()}`);
  console.error('=' .repeat(50));
  
  const dbConfig = databases[projectName];
  const filters = PROJECT_FILTERS[projectName] || {};
  
  // Создаем БД
  console.error(`\n📦 Creating database: ${dbConfig.name}`);
  const created = await createDatabase(dbConfig.name, dbConfig.user);
  if (!created) {
    console.error(`   ⚠️  Database ${dbConfig.name} was not created. Checking if it exists...`);
    // Проверяем, может БД уже существует
    try {
      const testPool = new Pool({
        ...sourceConfig,
        database: dbConfig.name,
      });
      await testPool.query('SELECT 1');
      await testPool.end();
      console.error(`   ✅ Database ${dbConfig.name} already exists, continuing...`);
    } catch (e) {
      console.error(`   ❌ Database ${dbConfig.name} does not exist and cannot be created.`);
      console.error(`   💡 Please create it manually using one of these methods:`);
      console.error(`      1. sudo -u postgres psql -c "CREATE DATABASE ${dbConfig.name} OWNER ${dbConfig.user};"`);
      console.error(`      2. psql -h localhost -U postgres -c "CREATE DATABASE ${dbConfig.name} OWNER ${dbConfig.user};"`);
      return;
    }
  }
  
  // Подключаемся к новой БД
  const targetPool = new Pool({
    ...sourceConfig,
    database: dbConfig.name,
  });
  
  // Запускаем миграции
  await runMigrations(targetPool);
  
  // Экспортируем и импортируем данные
  console.error(`\n📤 Exporting data for ${projectName}...`);
  
  // Все таблицы для экспорта (включая воронки, задачи, проекты)
  const tables = [
    'blog_categories',
    'blog_tags',
    'partials',
    'pages',
    'cases',
    'products',
    'product_categories',
    'promotions',
    'carousels',
    'carousel_slides',
    'homepage_navigation_carousel',
    'clients',
    'client_orders',
    'forms',
    'form_submissions',
    'team_members',
    'exercise_images',
    'sites',
    'site_pages',
    // Воронки продаж
    'sales_funnels',
    'funnel_stages',
    'deals',
    'deal_payments',
    'deal_documents',
    // Задачи
    'tasks',
    'task_categories',
    'task_comments',
    // Проекты клиентов
    'client_projects',
    'project_comments',
    // Коммерческие предложения
    'commercial_proposals',
    'proposal_slides',
    // Другие
    'awards',
    'reviews',
    'reading_books',
    'email_campaigns',
    'email_subscribers',
    'email_templates',
    'chats',
    'chat_messages',
    'notifications',
    'user_profiles',
    'user_consents',
    'ai_team_subscriptions',
    'ai_team_tasks',
    'ai_team_incidents',
    'personal_planner_entries',
    'semantic_topics',
  ];
  
  // Для blog_posts используем специальный фильтр
  if (filters.blog_posts) {
    const result = await exportAndImportTable(sourcePool, targetPool, 'blog_posts', projectName, filters);
    console.error(`   ✅ blog_posts: ${result.exported} exported, ${result.imported} imported`);
  }
  
  // Для остальных таблиц
  for (const tableName of tables) {
    if (tableName === 'blog_posts') continue; // Уже обработали
    
    const result = await exportAndImportTable(sourcePool, targetPool, tableName, projectName, filters);
    if (result.exported > 0) {
      console.error(`   ✅ ${tableName}: ${result.exported} exported, ${result.imported} imported`);
    }
  }
  
  await targetPool.end();
  console.error(`\n✅ Project ${projectName.toUpperCase()} completed!`);
}

async function main() {
  console.error('🚀 Starting database split by projects...');
  console.error('📋 Projects: primecoder, amani, umagazine\n');
  
  try {
    await sourcePool.query('SELECT NOW()');
    console.error('✅ Source database connection successful');
  } catch (error) {
    console.error('❌ Failed to connect to source database:', error.message);
    await sourcePool.end();
    process.exit(1);
  }
  
  // Разделяем данные для каждого проекта
  for (const project of ['primecoder', 'amani', 'umagazine']) {
    await splitDatabase(project);
  }
  
  await sourcePool.end();
  
  console.error('\n' + '='.repeat(50));
  console.error('✅ All projects processed!');
  console.error('\n📋 Next steps:');
  console.error('1. Update .env files for each project:');
  console.error('   - primecoder: PGDATABASE=primecoder_db');
  console.error('   - amani: PGDATABASE=amani_db');
  console.error('   - umagazine: PGDATABASE=umagazine_db');
  console.error('\n2. Test each project with its own database');
}

main().catch(error => {
  console.error('❌ Failed:', error);
  process.exit(1);
});
