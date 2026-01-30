#!/usr/bin/env node
/**
 * Скрипт для импорта товаров из JSON файла
 * Использование: node scripts/import-products-from-json.js products-export.json
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

let poolConfig;
if (process.env.DATABASE_URL) {
  poolConfig = { connectionString: process.env.DATABASE_URL };
} else {
  poolConfig = {
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: Number(process.env.PGPORT),
  };
}

const pool = new Pool(poolConfig);

async function importProducts() {
  const filePath = process.argv[2];
  
  if (!filePath) {
    console.error('❌ Usage: node scripts/import-products-from-json.js <products-export.json>');
    process.exit(1);
  }
  
  console.error('🔄 Starting products import...');
  console.error(`📥 Reading from: ${filePath}`);
  
  try {
    await pool.query('SELECT NOW()');
    console.error('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Failed to connect:', error.message);
    await pool.end();
    process.exit(1);
  }
  
  // Читаем JSON
  let products;
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    const json = JSON.parse(data);
    
    // Если это массив товаров
    if (Array.isArray(json)) {
      products = json;
    } 
    // Если это объект с массивом товаров
    else if (json.products && Array.isArray(json.products)) {
      products = json.products;
    }
    // Если это один товар
    else if (json.slug) {
      products = [json];
    }
    else {
      throw new Error('Invalid JSON format');
    }
  } catch (error) {
    console.error('❌ Failed to read/parse JSON:', error.message);
    await pool.end();
    process.exit(1);
  }
  
  console.error(`📦 Found ${products.length} products to import\n`);
  
  let created = 0;
  let updated = 0;
  let errors = 0;
  
  for (const product of products) {
    try {
      // Проверяем, существует ли товар
      const existing = await pool.query(
        'SELECT id FROM products WHERE slug = $1',
        [product.slug]
      );
      
      if (existing.rows.length > 0) {
        // Обновляем существующий
        await pool.query(`
          UPDATE products SET
            title = COALESCE($1, title),
            description_html = COALESCE($2, description_html),
            summary = COALESCE($3, summary),
            full_description_html = COALESCE($4, full_description_html),
            price_cents = COALESCE($5, price_cents),
            currency = COALESCE($6, currency),
            price_period = COALESCE($7, price_period),
            features = COALESCE($8, features),
            is_active = COALESCE($9, is_active),
            sort_order = COALESCE($10, sort_order),
            content_json = COALESCE($11, content_json),
            category_id = COALESCE($12, category_id),
            image_url = COALESCE($13, image_url),
            gallery = COALESCE($14, gallery),
            stock_quantity = COALESCE($15, stock_quantity),
            sku = COALESCE($16, sku),
            tags = COALESCE($17, tags),
            meta_title = COALESCE($18, meta_title),
            meta_description = COALESCE($19, meta_description),
            meta_keywords = COALESCE($20, meta_keywords),
            case_slugs = COALESCE($21, case_slugs),
            updated_at = NOW()
          WHERE slug = $22
        `, [
          product.title,
          product.description_html,
          product.summary,
          product.full_description_html,
          product.price_cents,
          product.currency,
          product.price_period,
          product.features,
          product.is_active,
          product.sort_order,
          typeof product.content_json === 'object' ? JSON.stringify(product.content_json) : product.content_json,
          product.category_id,
          product.image_url,
          product.gallery,
          product.stock_quantity,
          product.sku,
          product.tags,
          product.meta_title,
          product.meta_description,
          product.meta_keywords,
          product.case_slugs,
          product.slug,
        ]);
        console.error(`   ✅ Updated: ${product.title}`);
        updated++;
      } else {
        // Создаем новый
        await pool.query(`
          INSERT INTO products (
            slug, title, description_html, summary, full_description_html,
            price_cents, currency, price_period, features, is_active, sort_order,
            content_json, category_id, image_url, gallery, stock_quantity, sku, tags,
            meta_title, meta_description, meta_keywords, case_slugs
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
        `, [
          product.slug,
          product.title,
          product.description_html,
          product.summary,
          product.full_description_html,
          product.price_cents || 0,
          product.currency || 'RUB',
          product.price_period || 'one_time',
          product.features || [],
          product.is_active !== false,
          product.sort_order || 0,
          typeof product.content_json === 'object' ? JSON.stringify(product.content_json) : product.content_json,
          product.category_id,
          product.image_url,
          product.gallery || [],
          product.stock_quantity || 0,
          product.sku,
          product.tags || [],
          product.meta_title,
          product.meta_description,
          product.meta_keywords,
          product.case_slugs || [],
        ]);
        console.error(`   ✅ Created: ${product.title}`);
        created++;
      }
    } catch (error) {
      console.error(`   ❌ Error with ${product.slug}: ${error.message}`);
      errors++;
    }
  }
  
  console.error(`\n📊 Summary:`);
  console.error(`   Created: ${created}`);
  console.error(`   Updated: ${updated}`);
  console.error(`   Errors: ${errors}`);
  
  await pool.end();
  console.error('\n✅ Done!');
}

importProducts().catch(error => {
  console.error('❌ Failed:', error.message);
  process.exit(1);
});
