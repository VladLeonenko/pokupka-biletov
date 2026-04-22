#!/usr/bin/env node
/**
 * Миграции только для БД билетов (GetBilet, наценка, внешние id билетов).
 * Отдельно от backend/migrations — не трогает схему CRM.
 *
 * Использование: node scripts/apply-ticket-migrations.js
 * Переменные: TICKET_PGUSER, TICKET_PGHOST, TICKET_PGDATABASE, TICKET_PGPASSWORD, TICKET_PGPORT
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

const useMain = process.env.GETBILET_USE_MAIN_DATABASE === '1' || process.env.TICKET_USE_MAIN_PG === '1';

let pool;
if (useMain) {
  const required = ['PGUSER', 'PGHOST', 'PGDATABASE', 'PGPASSWORD', 'PGPORT'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error('❌ Для GETBILET_USE_MAIN_DATABASE=1 задайте в .env:', missing.join(', '));
    process.exit(1);
  }
  pool = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: Number(process.env.PGPORT),
    ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined,
  });
  console.error(`🎫 Миграции ticket → основная БД: ${process.env.PGDATABASE}\n`);
} else {
  const required = ['TICKET_PGUSER', 'TICKET_PGHOST', 'TICKET_PGDATABASE', 'TICKET_PGPASSWORD', 'TICKET_PGPORT'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error('❌ Задайте в .env:', missing.join(', '));
    console.error('   Или GETBILET_USE_MAIN_DATABASE=1 и PG* для одной БД с CRM.');
    process.exit(1);
  }
  pool = new Pool({
    user: process.env.TICKET_PGUSER,
    host: process.env.TICKET_PGHOST,
    database: process.env.TICKET_PGDATABASE,
    password: process.env.TICKET_PGPASSWORD,
    port: Number(process.env.TICKET_PGPORT),
    ssl: process.env.TICKET_PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined,
  });
}

const dir = path.join(__dirname, '../migrations-tickets');
const files = fs.existsSync(dir)
  ? fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
  : [];

async function ensureMeta() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ticket_schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function main() {
  if (!useMain) {
    console.error(`🎫 Миграции ticket DB: ${process.env.TICKET_PGDATABASE}\n`);
  }
  await pool.query('SELECT NOW()');
  await ensureMeta();

  const applied = await pool.query('SELECT filename FROM ticket_schema_migrations');
  const done = new Set(applied.rows.map((r) => r.filename));

  for (const filename of files) {
    if (done.has(filename)) {
      console.error(`⏭️  Уже применена: ${filename}`);
      continue;
    }
    const sql = fs.readFileSync(path.join(dir, filename), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO ticket_schema_migrations (filename) VALUES ($1)', [filename]);
      await client.query('COMMIT');
      console.error(`✅ ${filename}`);
    } catch (e) {
      await client.query('ROLLBACK');
      console.error(`❌ ${filename}:`, e.message);
      process.exitCode = 1;
      break;
    } finally {
      client.release();
    }
  }

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
