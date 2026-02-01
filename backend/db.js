import pg from 'pg';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Отладочный вывод - начало загрузки
console.error('[db.js] Начало загрузки модуля db.js');

// Загружаем .env с override
const envPath = path.join(__dirname, '.env');
console.error(`[db.js] Путь к .env: ${envPath}`);
const envResult = dotenv.config({ path: envPath, override: true });
if (envResult.error) {
  console.error(`[db.js] Ошибка dotenv: ${envResult.error.message}`);
} else {
  console.error(`[db.js] dotenv загружен, найдено переменных: ${Object.keys(envResult.parsed || {}).length}`);
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

// Отладочный вывод параметров подключения (всегда в stderr)
console.error('='.repeat(60));
console.error('🔍 [db.js] Параметры подключения к БД:');
console.error(`   PGUSER: ${process.env.PGUSER || 'НЕ УСТАНОВЛЕН'}`);
console.error(`   PGHOST: ${process.env.PGHOST || 'localhost'}`);
console.error(`   PGDATABASE: ${process.env.PGDATABASE || 'НЕ УСТАНОВЛЕН'}`);
console.error(`   PGPASSWORD: ${process.env.PGPASSWORD ? '*** (' + process.env.PGPASSWORD.length + ' символов)' : 'НЕ УСТАНОВЛЕН'}`);
if (process.env.PGPASSWORD) {
  console.error(`   Первые 3 символа пароля: ${process.env.PGPASSWORD.substring(0, 3)}...`);
  console.error(`   Последние 3 символа пароля: ...${process.env.PGPASSWORD.slice(-3)}`);
}
console.error(`   PGPORT: ${process.env.PGPORT || 5432}`);
console.error('='.repeat(60));

// Проверка обязательных переменных окружения
const requiredEnvVars = ['PGUSER', 'PGHOST', 'PGDATABASE', 'PGPASSWORD', 'PGPORT'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ CRITICAL ERROR: Missing required database environment variables:');
  missingVars.forEach(varName => console.error(`  - ${varName}`));
  console.error('Please set these variables in your .env file before starting the application.');
  process.exit(1);
}

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: Number(process.env.PGPORT),
  // Настройки пула соединений для production
  max: 20, // Максимум 20 одновременных соединений
  idleTimeoutMillis: 30000, // Закрывать неактивные соединения через 30 секунд
  connectionTimeoutMillis: 2000, // Таймаут на установку соединения - 2 секунды
  // Дополнительные настройки для стабильности
  allowExitOnIdle: false, // Не закрывать процесс при отсутствии активности
  statement_timeout: 30000, // Таймаут на выполнение запроса - 30 секунд
});

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
    console.error('❌ Failed to connect to database:', err.message);
    console.error('Please check your database configuration and ensure PostgreSQL is running.');
    process.exit(1);
  });

export default pool;
