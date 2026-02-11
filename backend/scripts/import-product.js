#!/usr/bin/env node
/**
 * Универсальный импорт товаров из JSON-файла
 * Использование: node scripts/import-product.js <path-to-json>
 * 
 * JSON: массив объектов или один объект.
 * Цена — в рублях (price_rub), скрипт сам конвертирует в копейки.
 * Идемпотентный: ищет по slug, обновляет если есть, создаёт если нет.
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.argv.includes('--prod')) process.env.PROD = '1';
const envFile = process.env.NODE_ENV === 'production' || process.env.PROD ? '.env.prod' : '.env';
dotenv.config({ path: path.join(__dirname, '..', envFile) });

const { Pool } = pg;
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: Number(process.env.PGPORT),
});

async function upsertProduct(p) {
  const priceCents = p.price_rub ? Math.round(p.price_rub * 100) : (p.price_cents || 0);

  const existing = await pool.query('SELECT id FROM products WHERE slug = $1', [p.slug]);

  if (existing.rows.length > 0) {
    await pool.query(`
      UPDATE products SET
        title = $1, description_html = $2, summary = $3, full_description_html = $4,
        price_cents = $5, currency = $6, price_period = $7, features = $8, tags = $9,
        meta_title = $10, meta_description = $11, meta_keywords = $12,
        content_json = $13, is_active = $14,
        image_url = COALESCE($15::text, products.image_url),
        updated_at = NOW()
      WHERE slug = $16
    `, [
      p.title, p.description_html || '', p.summary || '', p.full_description_html || '',
      priceCents, p.currency || 'RUB', p.price_period || 'one_time',
      p.features || [], p.tags || [],
      p.meta_title || '', p.meta_description || '', p.meta_keywords || '',
      p.content_json ? JSON.stringify(p.content_json) : null,
      p.is_active !== false, p.image_url || null, p.slug
    ]);
    return 'updated';
  }

  await pool.query(`
    INSERT INTO products (
      slug, title, description_html, summary, full_description_html,
      price_cents, currency, price_period, features, tags,
      meta_title, meta_description, meta_keywords, content_json,
      is_active, image_url, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW(),NOW())
  `, [
    p.slug, p.title, p.description_html || '', p.summary || '', p.full_description_html || '',
    priceCents, p.currency || 'RUB', p.price_period || 'one_time',
    p.features || [], p.tags || [],
    p.meta_title || '', p.meta_description || '', p.meta_keywords || '',
    p.content_json ? JSON.stringify(p.content_json) : null,
    p.is_active !== false, p.image_url || null
  ]);
  return 'created';
}

async function main() {
  const jsonPath = process.argv.slice(2).find((a) => a !== '--prod');
  if (!jsonPath) {
    console.error('Использование: node scripts/import-product.js <path-to-json> [--prod]');
    process.exit(1);
  }

  const raw = fs.readFileSync(path.resolve(jsonPath), 'utf-8');
  const data = JSON.parse(raw);
  const products = Array.isArray(data) ? data : [data];

  console.log(`📦 Импорт ${products.length} товаров...${process.env.PROD ? ' [PRODUCTION]' : ''}\n`);

  await pool.query('SELECT NOW()');
  console.log(`✅ БД подключена (${process.env.PGHOST || 'localhost'})\n`);

  let created = 0, updated = 0, errors = 0;
  for (const p of products) {
    try {
      const result = await upsertProduct(p);
      if (result === 'created') { created++; console.log(`  ✅ Создан: ${p.slug}`); }
      else { updated++; console.log(`  🔄 Обновлён: ${p.slug}`); }
    } catch (e) {
      errors++;
      console.error(`  ❌ ${p.slug}: ${e.message}`);
    }
  }

  console.log(`\n📊 Создано: ${created}, обновлено: ${updated}, ошибок: ${errors}`);
  await pool.end();
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
