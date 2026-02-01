#!/usr/bin/env node
/**
 * Тестирование подключения к БД
 * Использование: node scripts/test-db-connection.js
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загружаем .env
const envPath = path.join(__dirname, '../.env');
dotenv.config({ path: envPath });

const { Pool } = pg;

// Получаем параметры из .env
const dbUser = process.env.PGUSER;
const dbHost = process.env.PGHOST || 'localhost';
const dbName = process.env.PGDATABASE;
const dbPassword = process.env.PGPASSWORD;
const dbPort = Number(process.env.PGPORT || 5432);

console.error('='.repeat(60));
console.error('ТЕСТИРОВАНИЕ ПОДКЛЮЧЕНИЯ К БД');
console.error('='.repeat(60));
console.error(`\n📁 Путь к .env: ${envPath}`);

// Проверяем что файл существует
try {
  await fs.access(envPath);
  console.error('✅ .env файл существует');
} catch (e) {
  console.error('❌ .env файл НЕ найден!');
  process.exit(1);
}

// Читаем .env напрямую для проверки
try {
  const envContent = await fs.readFile(envPath, 'utf-8');
  const pguserLine = envContent.split('\n').find(line => line.startsWith('PGUSER='));
  const pgpasswordLine = envContent.split('\n').find(line => line.startsWith('PGPASSWORD='));
  const pgdatabaseLine = envContent.split('\n').find(line => line.startsWith('PGDATABASE='));
  
  console.error('\n📋 Содержимое .env (только PG* переменные):');
  if (pguserLine) {
    console.error(`   ${pguserLine.replace(/PASSWORD=.*/, 'PASSWORD=***')}`);
  } else {
    console.error('   ⚠️  PGUSER не найден в .env');
  }
  if (pgdatabaseLine) {
    console.error(`   ${pgdatabaseLine}`);
  } else {
    console.error('   ⚠️  PGDATABASE не найден в .env');
  }
  if (pgpasswordLine) {
    const passwordValue = pgpasswordLine.split('=')[1] || '';
    console.error(`   PGPASSWORD=${passwordValue ? '***' + passwordValue.slice(-3) : 'НЕТ'}`);
    console.error(`   Длина пароля: ${passwordValue.length} символов`);
  } else {
    console.error('   ⚠️  PGPASSWORD не найден в .env');
  }
} catch (e) {
  console.error('   ⚠️  Не удалось прочитать .env:', e.message);
}

console.error('\n🔍 Переменные окружения после dotenv.config():');
console.error(`   PGUSER: ${dbUser || 'НЕ УСТАНОВЛЕН'}`);
console.error(`   PGHOST: ${dbHost}`);
console.error(`   PGDATABASE: ${dbName || 'НЕ УСТАНОВЛЕН'}`);
console.error(`   PGPASSWORD: ${dbPassword ? '*** (' + dbPassword.length + ' символов)' : 'НЕ УСТАНОВЛЕН'}`);
console.error(`   PGPORT: ${dbPort}`);

if (!dbUser || !dbName || !dbPassword) {
  console.error('\n❌ Не все обязательные переменные установлены!');
  process.exit(1);
}

console.error('\n🔌 Попытка подключения к PostgreSQL...');

// Тест 1: Простое подключение
const pool = new Pool({
  user: dbUser,
  host: dbHost,
  database: dbName,
  password: dbPassword,
  port: dbPort,
  connectionTimeoutMillis: 5000,
});

try {
  const result = await pool.query('SELECT NOW(), current_user, current_database()');
  console.error('✅ Подключение успешно!');
  console.error(`   Время сервера: ${result.rows[0].now}`);
  console.error(`   Пользователь: ${result.rows[0].current_user}`);
  console.error(`   База данных: ${result.rows[0].current_database}`);
  
  // Тест 2: Проверка прав
  try {
    const rightsResult = await pool.query(`
      SELECT 
        has_database_privilege($1, $2, 'CONNECT') as can_connect,
        has_database_privilege($1, $2, 'CREATE') as can_create
    `, [dbUser, dbName]);
    console.error('\n✅ Права пользователя:');
    console.error(`   Может подключаться: ${rightsResult.rows[0].can_connect}`);
    console.error(`   Может создавать: ${rightsResult.rows[0].can_create}`);
  } catch (e) {
    console.error('   ⚠️  Не удалось проверить права:', e.message);
  }
  
  // Тест 3: Проверка таблиц
  try {
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name 
      LIMIT 10
    `);
    console.error(`\n✅ Найдено таблиц: ${tablesResult.rows.length} (показано первые 10)`);
    tablesResult.rows.forEach(row => {
      console.error(`   - ${row.table_name}`);
    });
  } catch (e) {
    console.error('   ⚠️  Не удалось получить список таблиц:', e.message);
  }
  
  await pool.end();
  console.error('\n✅ Все тесты пройдены успешно!');
  process.exit(0);
  
} catch (error) {
  console.error('\n❌ ОШИБКА ПОДКЛЮЧЕНИЯ:');
  console.error(`   Сообщение: ${error.message}`);
  console.error(`   Код: ${error.code || 'N/A'}`);
  
  if (error.code === '28P01') {
    console.error('\n💡 Проблема: Неверный пароль');
    console.error('   Решения:');
    console.error('   1. Проверьте пароль в .env файле');
    console.error('   2. Убедитесь что нет лишних пробелов или кавычек');
    console.error('   3. Попробуйте сбросить пароль пользователя:');
    console.error(`      sudo -u postgres psql -c "ALTER USER ${dbUser} WITH PASSWORD 'новый_пароль';"`);
  } else if (error.code === '3D000') {
    console.error('\n💡 Проблема: База данных не существует');
    console.error(`   Создайте базу: sudo -u postgres psql -c "CREATE DATABASE ${dbName};"`);
  } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
    console.error('\n💡 Проблема: PostgreSQL не запущен или недоступен');
    console.error('   Проверьте: sudo systemctl status postgresql');
  } else if (error.message.includes('password authentication failed')) {
    console.error('\n💡 Проблема: Аутентификация не прошла');
    console.error('   Возможные причины:');
    console.error('   1. Неправильный пароль в .env');
    console.error('   2. Пароль в PostgreSQL не совпадает');
    console.error('   3. Проблемы с pg_hba.conf (метод аутентификации)');
    console.error('\n   Проверьте pg_hba.conf:');
    console.error('   sudo cat /etc/postgresql/*/main/pg_hba.conf | grep -v "^#" | grep -v "^$"');
    console.error('\n   Попробуйте подключиться напрямую:');
    console.error(`   PGPASSWORD='${dbPassword}' psql -h ${dbHost} -U ${dbUser} -d ${dbName} -c "SELECT 1;"`);
  }
  
  await pool.end();
  process.exit(1);
}
