#!/usr/bin/env node
/**
 * Диагностика и исправление проблем с парсингом .env
 * Использование: node scripts/fix-env-parsing.js
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '../.env');

async function main() {
  console.error('='.repeat(60));
  console.error('ДИАГНОСТИКА ПАРСИНГА .env');
  console.error('='.repeat(60));
  
  // Читаем файл напрямую
  const envContent = await fs.readFile(envPath, 'utf-8');
  const lines = envContent.split('\n');
  
  console.error('\n📋 Все строки с PGPASSWORD:');
  lines.forEach((line, index) => {
    if (line.includes('PGPASSWORD')) {
      console.error(`   Строка ${index + 1}: ${JSON.stringify(line)}`);
      const match = line.match(/^PGPASSWORD=(.+)$/);
      if (match) {
        const value = match[1];
        console.error(`      Значение: ${JSON.stringify(value)}`);
        console.error(`      Длина: ${value.length} символов`);
        console.error(`      Hex: ${Buffer.from(value).toString('hex')}`);
      }
    }
  });
  
  // Пробуем разные способы парсинга
  console.error('\n🔍 Тестирование разных способов парсинга:');
  
  // Способ 1: dotenv стандартный
  process.env = {}; // Очищаем
  const result1 = dotenv.config({ path: envPath });
  console.error('\n1. dotenv.config() стандартный:');
  console.error(`   PGPASSWORD длина: ${process.env.PGPASSWORD?.length || 0}`);
  console.error(`   Значение: ${process.env.PGPASSWORD ? JSON.stringify(process.env.PGPASSWORD) : 'НЕТ'}`);
  
  // Способ 2: dotenv с override
  process.env = {}; // Очищаем
  const result2 = dotenv.config({ path: envPath, override: true });
  console.error('\n2. dotenv.config({ override: true }):');
  console.error(`   PGPASSWORD длина: ${process.env.PGPASSWORD?.length || 0}`);
  console.error(`   Значение: ${process.env.PGPASSWORD ? JSON.stringify(process.env.PGPASSWORD) : 'НЕТ'}`);
  
  // Способ 3: Ручной парсинг
  const passwordLine = lines.find(line => line.startsWith('PGPASSWORD='));
  if (passwordLine) {
    const manualValue = passwordLine.split('=').slice(1).join('='); // На случай если = в пароле
    console.error('\n3. Ручной парсинг (split по первому =):');
    console.error(`   PGPASSWORD длина: ${manualValue.length}`);
    console.error(`   Значение: ${JSON.stringify(manualValue)}`);
    
    // Проверка на кавычки
    let unquoted = manualValue;
    if ((manualValue.startsWith('"') && manualValue.endsWith('"')) ||
        (manualValue.startsWith("'") && manualValue.endsWith("'"))) {
      unquoted = manualValue.slice(1, -1);
      console.error(`   После удаления кавычек: ${JSON.stringify(unquoted)} (${unquoted.length} символов)`);
    }
    
    // Проверка на пробелы
    const trimmed = manualValue.trim();
    if (trimmed !== manualValue) {
      console.error(`   ⚠️  Есть пробелы! После trim: ${JSON.stringify(trimmed)} (${trimmed.length} символов)`);
    }
  }
  
  // Способ 4: Через shell (как работает psql)
  console.error('\n4. Через shell (grep + cut):');
  console.error('   Команда: grep "^PGPASSWORD=" .env | cut -d "=" -f2');
  console.error('   (Этот способ работает для psql)');
  
  console.error('\n💡 Рекомендации:');
  console.error('   1. Убедитесь что в .env пароль БЕЗ кавычек');
  console.error('   2. Убедитесь что нет пробелов в начале/конце');
  console.error('   3. Если пароль содержит специальные символы, возможно нужен другой формат');
  console.error('   4. Попробуйте использовать DATABASE_URL вместо отдельных переменных');
}

main().catch(console.error);
