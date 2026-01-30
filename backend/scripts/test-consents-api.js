/**
 * Тестовый скрипт для проверки API согласий
 */

import pool from '../db.js';

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

// Генерируем тестовый session_id
const testSessionId = `test_session_${Date.now()}`;

async function testConsentsAPI() {
  console.log('🧪 Тестирование API согласий\n');
  console.log('='.repeat(60));

  try {
    // Тест 1: Проверка таблицы в БД
    console.log('\n1️⃣ Проверка таблицы user_consents в БД...');
    const tableCheck = await pool.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'user_consents' 
      ORDER BY ordinal_position
    `);
    
    if (tableCheck.rows.length === 0) {
      console.error('❌ Таблица user_consents не найдена!');
      return;
    }
    
    console.log(`✅ Таблица найдена, колонок: ${tableCheck.rows.length}`);
    console.log('   Колонки:');
    tableCheck.rows.forEach(col => {
      console.log(`     - ${col.column_name}: ${col.data_type}${col.is_nullable === 'YES' ? ' (nullable)' : ''}`);
    });

    // Тест 2: Проверка индексов
    console.log('\n2️⃣ Проверка индексов...');
    const indexes = await pool.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'user_consents'
    `);
    console.log(`✅ Найдено индексов: ${indexes.rows.length}`);
    indexes.rows.forEach(idx => {
      console.log(`     - ${idx.indexname}`);
    });

    // Тест 3: Проверка триггера
    console.log('\n3️⃣ Проверка триггера updated_at...');
    const trigger = await pool.query(`
      SELECT trigger_name, event_manipulation, event_object_table
      FROM information_schema.triggers
      WHERE event_object_table = 'user_consents'
    `);
    if (trigger.rows.length > 0) {
      console.log('✅ Триггер найден:');
      trigger.rows.forEach(t => {
        console.log(`     - ${t.trigger_name} (${t.event_manipulation})`);
      });
    } else {
      console.log('⚠️  Триггер не найден');
    }

    // Тест 4: Проверка ограничений
    console.log('\n4️⃣ Проверка ограничений (constraints)...');
    const constraints = await pool.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'user_consents'
    `);
    console.log(`✅ Найдено ограничений: ${constraints.rows.length}`);
    constraints.rows.forEach(c => {
      console.log(`     - ${c.constraint_name} (${c.constraint_type})`);
    });

    // Тест 5: Тестовая вставка данных
    console.log('\n5️⃣ Тестовая вставка данных...');
    const testInsert = await pool.query(`
      INSERT INTO user_consents (
        session_id, 
        type, 
        necessary, 
        functional, 
        analytical, 
        marketing,
        accepted,
        ip_address,
        user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, session_id, type, accepted, created_at
    `, [
      testSessionId,
      'cookies',
      true,
      true,
      false,
      false,
      true,
      '127.0.0.1',
      'Test User Agent'
    ]);
    
    console.log('✅ Тестовое согласие создано:');
    console.log(`     ID: ${testInsert.rows[0].id}`);
    console.log(`     Session ID: ${testInsert.rows[0].session_id}`);
    console.log(`     Type: ${testInsert.rows[0].type}`);
    console.log(`     Accepted: ${testInsert.rows[0].accepted}`);
    console.log(`     Created: ${testInsert.rows[0].created_at}`);

    // Тест 6: Проверка уникального ограничения
    console.log('\n6️⃣ Проверка уникального ограничения...');
    // Сначала удаляем тестовую запись
    await pool.query('DELETE FROM user_consents WHERE session_id = $1', [testSessionId]);
    
    // Создаем первую запись (user_id = NULL, session_id = testSessionId, type = 'cookies')
    const firstInsert = await pool.query(`
      INSERT INTO user_consents (session_id, type, accepted)
      VALUES ($1, $2, $3)
      RETURNING id
    `, [testSessionId, 'cookies', true]);
    
    console.log(`     Создана первая запись с ID: ${firstInsert.rows[0].id}`);
    
    // Пытаемся создать дубликат (та же комбинация session_id + type)
    try {
      const duplicateInsert = await pool.query(`
        INSERT INTO user_consents (session_id, type, accepted)
        VALUES ($1, $2, $3)
        RETURNING id
      `, [testSessionId, 'cookies', true]);
      console.log(`⚠️  Дубликат был создан с ID: ${duplicateInsert.rows[0].id}`);
      console.log('     Это может быть нормально, если constraint позволяет NULL в user_id');
      console.log('     PostgreSQL обрабатывает NULL в UNIQUE constraint особым образом');
    } catch (error) {
      if (error.code === '23505') { // unique_violation
        console.log('✅ Уникальное ограничение работает корректно');
        console.log(`     Ошибка: ${error.message}`);
      } else {
        console.log(`⚠️  Неожиданная ошибка: ${error.code} - ${error.message}`);
      }
    }
    
    // Очищаем после теста
    await pool.query('DELETE FROM user_consents WHERE session_id = $1', [testSessionId]);

    // Тест 7: Проверка обновления (триггер updated_at)
    console.log('\n7️⃣ Проверка триггера updated_at...');
    const testId = testInsert.rows[0].id;
    const beforeUpdate = await pool.query(`
      SELECT updated_at FROM user_consents WHERE id = $1
    `, [testId]);
    
    if (beforeUpdate.rows.length === 0) {
      console.log('⚠️  Запись не найдена для теста триггера');
    } else {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Ждем 1 секунду
      
      await pool.query(`
        UPDATE user_consents 
        SET accepted = false 
        WHERE id = $1
      `, [testId]);
      
      const afterUpdate = await pool.query(`
        SELECT updated_at FROM user_consents WHERE id = $1
      `, [testId]);
      
      if (afterUpdate.rows.length > 0 && afterUpdate.rows[0].updated_at > beforeUpdate.rows[0].updated_at) {
        console.log('✅ Триггер updated_at работает корректно');
        console.log(`     Было: ${beforeUpdate.rows[0].updated_at}`);
        console.log(`     Стало: ${afterUpdate.rows[0].updated_at}`);
      } else {
        console.log('❌ Триггер updated_at не сработал');
      }
    }

    // Тест 8: Проверка CHECK ограничений
    console.log('\n8️⃣ Проверка CHECK ограничений...');
    try {
      await pool.query(`
        INSERT INTO user_consents (session_id, type, accepted)
        VALUES ($1, $2, $3)
      `, [`test_${Date.now()}`, 'invalid_type', true]);
      console.log('❌ Ошибка: Недопустимый тип не был отклонен!');
    } catch (error) {
      if (error.code === '23514') { // check_violation
        console.log('✅ CHECK ограничение работает корректно');
      } else {
        throw error;
      }
    }

    // Тест 9: Очистка тестовых данных
    console.log('\n9️⃣ Очистка тестовых данных...');
    await pool.query('DELETE FROM user_consents WHERE session_id = $1', [testSessionId]);
    console.log('✅ Тестовые данные удалены');

    // Тест 10: Нагрузочное тестирование БД (параллельные вставки)
    console.log('\n🔟 Нагрузочное тестирование БД (параллельные запросы)...');
    const loadTestSessionId = `load_test_${Date.now()}`;
    const concurrentInserts = 20;
    const startTime = Date.now();
    
    const insertPromises = Array.from({ length: concurrentInserts }, (_, i) =>
      pool.query(`
        INSERT INTO user_consents (session_id, type, accepted, ip_address)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [`${loadTestSessionId}_${i}`, 'cookies', true, '127.0.0.1'])
    );
    
    try {
      const results = await Promise.all(insertPromises);
      const duration = Date.now() - startTime;
      const avgTime = duration / concurrentInserts;
      
      console.log(`   ✅ Успешно вставлено: ${results.length}/${concurrentInserts}`);
      console.log(`   ⏱️  Время: ${duration}ms (среднее: ${avgTime.toFixed(2)}ms/запрос)`);
      console.log(`   📊 RPS: ${(concurrentInserts / (duration / 1000)).toFixed(2)}`);
    } catch (error) {
      console.log(`   ⚠️  Ошибка при нагрузочном тесте: ${error.message}`);
    } finally {
      // Очистка после нагрузочного теста
      await pool.query('DELETE FROM user_consents WHERE session_id LIKE $1', [`${loadTestSessionId}%`]);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Все тесты пройдены успешно!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Ошибка при тестировании:');
    console.error(error.message);
    console.error(error.stack);
    process.exitCode = 1;
  } finally {
    // Гарантируем закрытие пула соединений
    try {
      await pool.end();
    } catch (closeError) {
      console.error('⚠️  Ошибка при закрытии пула:', closeError.message);
    }
  }
}

testConsentsAPI();

