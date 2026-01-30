/**
 * Нагрузочное тестирование API
 * Тестирует производительность и стабильность при параллельных запросах
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

// Генерируем уникальный session_id для теста
const testSessionId = `load_test_${Date.now()}`;

async function makeRequest(method, path, body = null, sessionId = null) {
  const url = `${API_BASE}${path}`;
  const startTime = Date.now();
  
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': sessionId || testSessionId,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    const data = await response.json().catch(() => ({ error: response.statusText }));
    const duration = Date.now() - startTime;
    
    return {
      status: response.status,
      duration,
      data,
      success: response.ok,
    };
  } catch (error) {
    return {
      status: 0,
      duration: Date.now() - startTime,
      error: error.message,
      success: false,
    };
  }
}

// Нагрузочный тест: параллельные запросы
async function loadTestConcurrent(concurrent = 50, endpoint = '/api/consents') {
  console.log(`\n🔄 Нагрузочный тест: ${concurrent} параллельных запросов к ${endpoint}`);
  console.log('='.repeat(60));
  
  const startTime = Date.now();
  const requests = Array.from({ length: concurrent }, (_, i) =>
    makeRequest('POST', endpoint, {
      type: 'cookies',
      necessary: true,
      functional: true,
      analytical: false,
      marketing: false,
      accepted: true,
    }, `${testSessionId}_${i}`)
  );
  
  const results = await Promise.all(requests);
  const totalTime = Date.now() - startTime;
  
  // Статистика
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const durations = results.map(r => r.duration).filter(d => d > 0);
  const avgDuration = durations.length > 0 
    ? durations.reduce((a, b) => a + b, 0) / durations.length 
    : 0;
  const minDuration = durations.length > 0 ? Math.min(...durations) : 0;
  const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;
  const rps = (concurrent / (totalTime / 1000)).toFixed(2);
  
  // Статус коды
  const statusCodes = {};
  results.forEach(r => {
    const code = r.status || 'error';
    statusCodes[code] = (statusCodes[code] || 0) + 1;
  });
  
  console.log('\n📊 Результаты:');
  console.log(`   ✅ Успешно: ${successful}/${concurrent} (${((successful/concurrent)*100).toFixed(1)}%)`);
  console.log(`   ❌ Ошибки: ${failed}/${concurrent} (${((failed/concurrent)*100).toFixed(1)}%)`);
  console.log(`   ⏱️  Общее время: ${totalTime}ms`);
  console.log(`   📈 RPS: ${rps} запросов/сек`);
  console.log(`   ⚡ Среднее время ответа: ${avgDuration.toFixed(2)}ms`);
  console.log(`   🚀 Минимальное время: ${minDuration}ms`);
  console.log(`   🐌 Максимальное время: ${maxDuration}ms`);
  
  if (Object.keys(statusCodes).length > 0) {
    console.log('\n📋 Статус коды:');
    Object.entries(statusCodes).forEach(([code, count]) => {
      console.log(`   ${code}: ${count}`);
    });
  }
  
  // Оценка производительности
  console.log('\n💡 Оценка:');
  if (successful === concurrent && avgDuration < 500) {
    console.log('   ✅ Отлично: все запросы успешны, низкая задержка');
  } else if (successful >= concurrent * 0.95 && avgDuration < 1000) {
    console.log('   ✅ Хорошо: большинство запросов успешны, приемлемая задержка');
  } else if (successful >= concurrent * 0.8) {
    console.log('   ⚠️  Удовлетворительно: есть проблемы с производительностью');
  } else {
    console.log('   ❌ Плохо: много ошибок, требуется оптимизация');
  }
  
  return {
    total: concurrent,
    successful,
    failed,
    totalTime,
    avgDuration,
    minDuration,
    maxDuration,
    rps: parseFloat(rps),
    statusCodes,
  };
}

// Тест на постепенное увеличение нагрузки
async function loadTestRampUp(maxConcurrent = 100, step = 10) {
  console.log('\n📈 Тест постепенного увеличения нагрузки');
  console.log('='.repeat(60));
  
  const results = [];
  
  for (let concurrent = step; concurrent <= maxConcurrent; concurrent += step) {
    console.log(`\n🔄 Тестируем ${concurrent} параллельных запросов...`);
    const result = await loadTestConcurrent(concurrent);
    results.push({ concurrent, ...result });
    
    // Пауза между тестами
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 Сводка по всем тестам:');
  console.log('='.repeat(60));
  results.forEach(r => {
    console.log(`${r.concurrent} запросов: ${r.successful}/${r.total} успешно, ${r.avgDuration.toFixed(2)}ms среднее, ${r.rps} RPS`);
  });
  
  return results;
}

// Тест на стабильность (длительная нагрузка)
async function loadTestStability(durationSeconds = 30, rps = 10) {
  console.log(`\n⏱️  Тест стабильности: ${durationSeconds} секунд при ${rps} RPS`);
  console.log('='.repeat(60));
  
  const startTime = Date.now();
  const endTime = startTime + (durationSeconds * 1000);
  const results = [];
  let requestCount = 0;
  
  const interval = 1000 / rps; // Интервал между запросами в мс
  
  while (Date.now() < endTime) {
    const requestStart = Date.now();
    const result = await makeRequest('GET', '/api/consents', null, `${testSessionId}_stability_${requestCount}`);
    const requestDuration = Date.now() - requestStart;
    
    results.push({
      ...result,
      timestamp: Date.now(),
    });
    
    requestCount++;
    
    // Поддерживаем заданный RPS
    const elapsed = Date.now() - requestStart;
    if (elapsed < interval) {
      await new Promise(resolve => setTimeout(resolve, interval - elapsed));
    }
  }
  
  const totalTime = Date.now() - startTime;
  const successful = results.filter(r => r.success).length;
  const avgDuration = results
    .map(r => r.duration)
    .reduce((a, b) => a + b, 0) / results.length;
  
  console.log(`\n📊 Результаты:`);
  console.log(`   Всего запросов: ${requestCount}`);
  console.log(`   ✅ Успешно: ${successful}/${requestCount}`);
  console.log(`   ⏱️  Среднее время ответа: ${avgDuration.toFixed(2)}ms`);
  console.log(`   📈 Фактический RPS: ${(requestCount / (totalTime / 1000)).toFixed(2)}`);
  
  return { requestCount, successful, avgDuration, totalTime };
}

// Главная функция
async function main() {
  console.log('🚀 Нагрузочное тестирование API');
  console.log('='.repeat(60));
  console.log(`API Base: ${API_BASE}`);
  console.log(`Session ID: ${testSessionId}`);
  
  // Проверка доступности сервера
  console.log('\n0️⃣ Проверка доступности сервера...');
  const healthCheck = await makeRequest('GET', '/api/public/pages');
  if (!healthCheck.success) {
    console.log('❌ Сервер недоступен');
    console.log('   Запустите: cd backend && npm run dev');
    process.exit(1);
  }
  console.log('✅ Сервер доступен');
  
  try {
    // Базовый нагрузочный тест
    await loadTestConcurrent(50);
    
    // Опционально: рамп-ап тест (раскомментируйте при необходимости)
    // await loadTestRampUp(100, 10);
    
    // Опционально: тест стабильности (раскомментируйте при необходимости)
    // await loadTestStability(30, 10);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Нагрузочное тестирование завершено');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Ошибка при нагрузочном тестировании:');
    console.error(error.message);
    console.error(error.stack);
    process.exitCode = 1;
  }
}

// Проверка доступности fetch
if (typeof fetch === 'undefined') {
  console.error('❌ fetch не доступен. Требуется Node.js 18+ или установите node-fetch');
  process.exit(1);
}

// Запуск
const args = process.argv.slice(2);
if (args.includes('--ramp-up')) {
  loadTestRampUp(100, 10).catch(console.error);
} else if (args.includes('--stability')) {
  loadTestStability(30, 10).catch(console.error);
} else {
  main().catch(console.error);
}








