/**
 * Тестовый скрипт для проверки API endpoints согласий
 * Требует запущенный backend сервер
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

// Генерируем тестовый session_id
const testSessionId = `test_session_${Date.now()}`;

async function testAPIEndpoint(method, path, body = null, headers = {}) {
  const url = `${API_BASE}${path}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-session-id': testSessionId,
      ...headers,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({ error: response.statusText }));
    return { status: response.status, data };
  } catch (error) {
    return { status: 0, error: error.message };
  }
}

// Функция для параллельного выполнения запросов (нагрузочное тестирование)
async function testConcurrentRequests(count = 10) {
  console.log(`\n🔄 Тест параллельных запросов (${count} одновременных)...`);
  const startTime = Date.now();
  
  const requests = Array.from({ length: count }, (_, i) => 
    testAPIEndpoint('POST', '/api/consents', {
      type: 'cookies',
      necessary: true,
      functional: true,
      analytical: false,
      marketing: false,
      accepted: true,
    }, { 'x-session-id': `load_test_${Date.now()}_${i}` })
  );
  
  const results = await Promise.all(requests);
  const duration = Date.now() - startTime;
  
  const successCount = results.filter(r => r.status === 200 || r.status === 201).length;
  const avgTime = duration / count;
  
  console.log(`   ✅ Успешно: ${successCount}/${count}`);
  console.log(`   ⏱️  Время: ${duration}ms (среднее: ${avgTime.toFixed(2)}ms/запрос)`);
  console.log(`   📊 RPS: ${(count / (duration / 1000)).toFixed(2)}`);
  
  return { successCount, totalCount: count, duration, avgTime };
}

async function testConsentsEndpoints() {
  console.log('🧪 Тестирование API endpoints согласий\n');
  console.log('⚠️  Убедитесь, что backend сервер запущен на порту 3000\n');
  console.log('='.repeat(60));
  
  // Проверка доступности сервера
  console.log('\n0️⃣ Проверка доступности backend сервера...');
  const healthCheck = await testAPIEndpoint('GET', '/api/public/pages');
  if (healthCheck.status === 0 || healthCheck.status >= 500) {
    console.log('❌ Backend сервер недоступен');
    console.log('   Запустите: cd backend && npm run dev');
    return;
  }
  console.log('✅ Backend сервер доступен');

  try {
    // Тест 1: POST /api/consents - Создание согласия
    console.log('\n1️⃣ POST /api/consents - Создание согласия на cookies...');
    const createResult = await testAPIEndpoint('POST', '/api/consents', {
      type: 'cookies',
      necessary: true,
      functional: true,
      analytical: false,
      marketing: false,
      accepted: true,
    });
    
    if (createResult.status === 200 || createResult.status === 201) {
      console.log('✅ Согласие создано успешно');
      console.log(`     ID: ${createResult.data.id}`);
      console.log(`     Type: ${createResult.data.type}`);
      console.log(`     Session ID: ${createResult.data.session_id}`);
      const consentId = createResult.data.id;
      
      // Тест 2: GET /api/consents - Получение согласий
      console.log('\n2️⃣ GET /api/consents - Получение всех согласий...');
      const getResult = await testAPIEndpoint('GET', '/api/consents');
      
      if (getResult.status === 200) {
        console.log('✅ Согласия получены успешно');
        console.log(`     Найдено согласий: ${getResult.data.length}`);
        if (getResult.data.length > 0) {
          console.log(`     Первое согласие: ${getResult.data[0].type} (ID: ${getResult.data[0].id})`);
        }
      } else {
        console.log(`❌ Ошибка получения согласий: ${getResult.status}`);
        console.log(`     ${JSON.stringify(getResult.data)}`);
      }

      // Тест 3: POST /api/consents - Попытка создать дубликат (должно обновиться)
      console.log('\n3️⃣ POST /api/consents - Обновление существующего согласия...');
      const updateResult = await testAPIEndpoint('POST', '/api/consents', {
        type: 'cookies',
        necessary: true,
        functional: true,
        analytical: true, // Изменили на true
        marketing: true,   // Изменили на true
        accepted: true,
      });
      
      if (updateResult.status === 200) {
        console.log('✅ Согласие обновлено успешно');
        console.log(`     Analytical: ${updateResult.data.analytical}`);
        console.log(`     Marketing: ${updateResult.data.marketing}`);
        if (updateResult.data.id === consentId) {
          console.log('     ✅ ID совпадает - это обновление, а не новое создание');
        }
      } else {
        console.log(`❌ Ошибка обновления: ${updateResult.status}`);
        console.log(`     ${JSON.stringify(updateResult.data)}`);
      }

      // Тест 4: POST /api/consents - Создание другого типа согласия
      console.log('\n4️⃣ POST /api/consents - Создание согласия на privacy...');
      const privacyResult = await testAPIEndpoint('POST', '/api/consents', {
        type: 'privacy',
        accepted: true,
      });
      
      if (privacyResult.status === 200 || privacyResult.status === 201) {
        console.log('✅ Согласие на privacy создано успешно');
        console.log(`     ID: ${privacyResult.data.id}`);
        console.log(`     Type: ${privacyResult.data.type}`);
      } else {
        console.log(`❌ Ошибка создания privacy согласия: ${privacyResult.status}`);
        console.log(`     ${JSON.stringify(privacyResult.data)}`);
      }

      // Тест 5: Валидация - недопустимый тип
      console.log('\n5️⃣ POST /api/consents - Валидация (недопустимый тип)...');
      const invalidResult = await testAPIEndpoint('POST', '/api/consents', {
        type: 'invalid_type',
        accepted: true,
      });
      
      if (invalidResult.status === 400) {
        console.log('✅ Валидация работает корректно');
        console.log(`     Ошибка: ${invalidResult.data.error}`);
      } else {
        console.log(`❌ Валидация не сработала: ${invalidResult.status}`);
      }

      // Тест 6: Валидация - отсутствует type
      console.log('\n6️⃣ POST /api/consents - Валидация (отсутствует type)...');
      const noTypeResult = await testAPIEndpoint('POST', '/api/consents', {
        accepted: true,
      });
      
      if (noTypeResult.status === 400) {
        console.log('✅ Валидация работает корректно');
        console.log(`     Ошибка: ${noTypeResult.data.error}`);
      } else {
        console.log(`❌ Валидация не сработала: ${noTypeResult.status}`);
      }

      // Тест 7: Нагрузочное тестирование (параллельные запросы)
      console.log('\n7️⃣ Нагрузочное тестирование...');
      await testConcurrentRequests(10);

      console.log('\n' + '='.repeat(60));
      console.log('✅ Тесты API endpoints завершены');
      console.log('='.repeat(60));
      console.log('\n💡 Примечание: Для тестирования PUT и DELETE нужна авторизация');
      console.log('   Эти endpoints требуют токен в заголовке Authorization');

    } else {
      console.log(`❌ Ошибка создания согласия: ${createResult.status}`);
      console.log(`     ${JSON.stringify(createResult.data)}`);
      if (createResult.status === 0) {
        console.log('\n⚠️  Backend сервер не запущен или недоступен');
        console.log('   Запустите: cd backend && npm run dev');
      }
    }

  } catch (error) {
    console.error('\n❌ Ошибка при тестировании:');
    console.error(error.message);
    console.error(error.stack);
    process.exitCode = 1;
  }
}

// Проверяем доступность fetch (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.error('❌ fetch не доступен. Требуется Node.js 18+ или установите node-fetch');
  process.exit(1);
}

testConsentsEndpoints();

