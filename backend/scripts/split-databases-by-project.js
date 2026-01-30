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
  const migrations = [
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
    const orderBy = 'ORDER BY id';
    
    // Экспортируем из исходной БД
    const result = await sourcePool.query(`SELECT * FROM ${tableName} ${filter} ${orderBy}`);
    
    if (result.rows.length === 0) {
      return { exported: 0, imported: 0 };
    }
    
    // Импортируем в целевую БД
    let imported = 0;
    for (const row of result.rows) {
      try {
        const columns = Object.keys(row);
        const values = columns.map((_, i) => `$${i + 1}`);
        const params = columns.map(col => row[col]);
        
        await targetPool.query(
          `INSERT INTO ${tableName} (${columns.join(', ')}) 
           VALUES (${values.join(', ')}) 
           ON CONFLICT (id) DO NOTHING`,
          params
        );
        imported++;
      } catch (error) {
        // Игнорируем ошибки дубликатов
        if (!error.message.includes('duplicate') && !error.message.includes('unique')) {
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
    'clients',
    'forms',
    'form_submissions',
    'team_members',
    'exercise_images',
    'sites',
    'site_pages',
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
