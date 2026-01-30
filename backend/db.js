import pg from 'pg';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const { Pool } = pg;

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
