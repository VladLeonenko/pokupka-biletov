import pg from 'pg';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import mainPool from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath, override: true });

if (!process.env.TICKET_PGPASSWORD || String(process.env.TICKET_PGPASSWORD).length < 10) {
  try {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      if (line.startsWith('TICKET_PGPASSWORD=')) {
        process.env.TICKET_PGPASSWORD = line.split('=').slice(1).join('=').trim();
        break;
      }
    }
  } catch {
    // ignore
  }
}

const { Pool } = pg;

const useMainPg =
  process.env.GETBILET_USE_MAIN_DATABASE === '1' || process.env.TICKET_USE_MAIN_PG === '1';

/** @type {import('pg').Pool} */
let ticketPool;

if (useMainPg) {
  ticketPool = mainPool;
  if (process.env.NODE_ENV !== 'production') {
    console.log(
      '[ticketDb] GETBILET_USE_MAIN_DATABASE=1 — GetBilet/билеты используют тот же pool, что и CRM (одна миграция).',
    );
  }
} else {
  const required = ['TICKET_PGUSER', 'TICKET_PGHOST', 'TICKET_PGDATABASE', 'TICKET_PGPASSWORD', 'TICKET_PGPORT'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error('[ticketDb.js] Не заданы переменные отдельной БД билетов:', missing.join(', '));
    console.error(
      'Задайте TICKET_PG* в backend/.env или поставьте GETBILET_USE_MAIN_DATABASE=1 чтобы использовать одну БД с CRM.',
    );
    process.exit(1);
  }

  const ticketPoolConfig = {
    user: process.env.TICKET_PGUSER,
    host: process.env.TICKET_PGHOST || 'localhost',
    database: process.env.TICKET_PGDATABASE,
    password: process.env.TICKET_PGPASSWORD,
    port: Number(process.env.TICKET_PGPORT || 5432),
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    allowExitOnIdle: false,
    statement_timeout: 30000,
  };
  if (process.env.TICKET_PGSSLMODE === 'require') {
    ticketPoolConfig.ssl = { rejectUnauthorized: false };
  }

  ticketPool = new Pool(ticketPoolConfig);

  ticketPool.on('error', (err) => {
    console.error('[ticketDb] Unexpected error on idle client:', err);
  });

  let shutdown = false;
  async function endTicketPool() {
    if (shutdown) return;
    shutdown = true;
    await ticketPool.end();
  }

  process.on('SIGTERM', endTicketPool);
  process.on('SIGINT', async () => {
    await endTicketPool();
  });

  ticketPool
    .query('SELECT NOW()')
    .then(() => {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`✅ Ticket DB connected: ${process.env.TICKET_PGDATABASE}`);
      }
    })
    .catch((err) => {
      console.error('[ticketDb] Failed to connect:', err.message);
      process.exit(1);
    });
}

export default ticketPool;
