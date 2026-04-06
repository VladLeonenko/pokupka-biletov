#!/usr/bin/env node
/**
 * Импорт контента карточек услуг 2026 (applies user's commercial texts to DB).
 *
 *   node scripts/import-catalog-2026.mjs
 *   node scripts/import-catalog-2026.mjs --prod   # backend/.env.prod
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getCatalog2026Products } from './catalog-2026-data.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (process.argv.includes('--prod')) process.env.PROD = '1';
const envFile = process.env.NODE_ENV === 'production' || process.env.PROD ? '.env.prod' : '.env';
dotenv.config({ path: path.join(__dirname, '..', envFile) });

const pool = new pg.Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: Number(process.env.PGPORT),
});

async function upsertProduct(p) {
  const priceCents = p.price_rub != null ? Math.round(p.price_rub * 100) : p.price_cents || 0;
  const existing = await pool.query('SELECT id FROM products WHERE slug = $1', [p.slug]);

  const vals = [
    p.slug,
    p.title,
    p.description_html || '',
    p.summary || '',
    p.full_description_html || '',
    priceCents,
    p.currency || 'RUB',
    p.price_period || 'one_time',
    p.features || [],
    p.tags || [],
    p.meta_title || '',
    p.meta_description || '',
    p.meta_keywords || '',
    p.content_json ? JSON.stringify(p.content_json) : null,
    p.is_active !== false,
  ];

  if (existing.rows.length > 0) {
    await pool.query(
      `UPDATE products SET
        title = $2, description_html = $3, summary = $4, full_description_html = $5,
        price_cents = $6, currency = $7, price_period = $8, features = $9, tags = $10,
        meta_title = $11, meta_description = $12, meta_keywords = $13,
        content_json = $14, is_active = $15, updated_at = NOW()
      WHERE slug = $1`,
      vals
    );
    return 'updated';
  }

  await pool.query(
    `INSERT INTO products (
      slug, title, description_html, summary, full_description_html,
      price_cents, currency, price_period, features, tags,
      meta_title, meta_description, meta_keywords, content_json,
      is_active, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW(),NOW())`,
    vals
  );
  return 'created';
}

async function main() {
  const products = getCatalog2026Products();
  console.log(`Каталог 2026: ${products.length} позиций${process.env.PROD ? ' [PROD]' : ''}\n`);

  await pool.query('SELECT 1');
  let c = 0,
    u = 0,
    e = 0;
  for (const p of products) {
    try {
      const r = await upsertProduct(p);
      if (r === 'created') {
        c++;
        console.log(`  ✅ Создан: ${p.slug}`);
      } else {
        u++;
        console.log(`  🔄 Обновлён: ${p.slug}`);
      }
    } catch (err) {
      e++;
      console.error(`  ❌ ${p.slug}:`, err.message);
    }
  }
  console.log(`\nГотово: создано ${c}, обновлено ${u}, ошибок ${e}`);
  await pool.end();
  process.exit(e ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
