import pg from 'pg';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загружаем .env с override
const envPath = path.join(__dirname, '.env');
const envResult = dotenv.config({ path: envPath, override: true });
if (envResult.error && process.env.NODE_ENV !== 'production') {
  console.error(`[db.js] Ошибка dotenv: ${envResult.error.message}`);
}

// Если dotenv не сработал, читаем .env напрямую (как в скриптах)
if (!process.env.PGPASSWORD || process.env.PGPASSWORD.length < 10) {
  try {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    for (const line of lines) {
      if (line.startsWith('PGPASSWORD=')) {
        const passwordValue = line.split('=').slice(1).join('=').trim();
        process.env.PGPASSWORD = passwordValue;
        break;
      }
    }
  } catch (e) {
    console.error('⚠️  Не удалось прочитать .env напрямую:', e.message);
  }
}

const { Pool } = pg;

// Отладочный вывод только в dev режиме
if (process.env.NODE_ENV !== 'production') {
  console.error('🔍 [db.js] Параметры подключения к БД:');
  console.error(`   PGUSER: ${process.env.PGUSER || 'НЕ УСТАНОВЛЕН'}`);
  console.error(`   PGHOST: ${process.env.PGHOST || 'localhost'}`);
  console.error(`   PGDATABASE: ${process.env.PGDATABASE || 'НЕ УСТАНОВЛЕН'}`);
  console.error(`   PGPASSWORD: ${process.env.PGPASSWORD ? '*** (' + process.env.PGPASSWORD.length + ' символов)' : 'НЕ УСТАНОВЛЕН'}`);
  console.error(`   PGPORT: ${process.env.PGPORT || 5432}`);
}

// Проверка обязательных переменных окружения
const requiredEnvVars = ['PGUSER', 'PGHOST', 'PGDATABASE', 'PGPASSWORD', 'PGPORT'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ CRITICAL ERROR: Missing required database environment variables:');
  missingVars.forEach(varName => console.error(`  - ${varName}`));
  console.error('Please set these variables in your .env file before starting the application.');
  process.exit(1);
}

const dbPassword = process.env.PGPASSWORD;
const poolConfig = {
  user: process.env.PGUSER,
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE,
  password: dbPassword,
  port: Number(process.env.PGPORT || 5432),
  max: 20,
  idleTimeoutMillis: 30000, // Закрывать неактивные соединения через 30 секунд
  connectionTimeoutMillis: 5000,
  // Дополнительные настройки для стабильности
  allowExitOnIdle: false, // Не закрывать процесс при отсутствии активности
  statement_timeout: 30000,
};
if (process.env.PGSSLMODE === 'require') poolConfig.ssl = { rejectUnauthorized: false };
const pool = new Pool(poolConfig);

// Обработка ошибок пула (например, при потере соединения с БД)
pool.on('error', (err, client) => {
  console.error('❌ Unexpected error on idle database client:', err);
  // Не завершаем процесс, позволяем пулу переподключиться
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing database pool...');
  await pool.end();
  console.log('Database pool closed');
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing database pool...');
  await pool.end();
  console.log('Database pool closed');
  process.exit(0);
});

// Проверка подключения при старте
pool.query('SELECT NOW()')
  .then(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ Database connection established successfully');
    }
  })
  .catch(err => {
    console.error('❌ Failed to connect to database:', err.message || err);
    console.error('Check PGHOST, PGUSER, PGDATABASE, PGPASSWORD in .env. On shared hosting PGHOST may not be localhost.');
    process.exit(1);
  });

export default pool;
