import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function testOpenAIProxy() {
  const apiKey = process.env.OPENAI_API_KEY;
  const proxyUrl = process.env.OPENAI_PROXY_URL;
  
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY не найден в .env файле');
    process.exit(1);
  }
  
  console.log('🔑 API ключ найден:', apiKey.substring(0, 10) + '...');
  
  let apiUrl = 'https://api.openai.com/v1/chat/completions';
  if (proxyUrl) {
    apiUrl = proxyUrl;
    if (!apiUrl.includes('/v1/chat/completions')) {
      apiUrl = apiUrl.replace(/\/$/, '') + '/v1/chat/completions';
    }
    console.log('🌐 Используется прокси:', apiUrl);
  } else {
    console.log('🌐 Используется прямой доступ к OpenAI API');
  }
  
  console.log('\n🧪 Тестирование подключения...\n');
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Ты помощник. Отвечай только JSON.' },
          { role: 'user', content: 'Ответь JSON: {"test": "ok"}' 
          }
        ],
        response_format: { type: 'json_object' }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Ошибка API:', response.status, response.statusText);
      console.error('Ответ:', errorText);
      
      if (errorText.includes('unsupported_country_region_territory')) {
        console.error('\n⚠️  OpenAI API недоступен в вашем регионе.');
        console.error('💡 Решение: настройте прокси (см. OPENAI_PROXY_SETUP.md)');
      }
      
      process.exit(1);
    }
    
    const data = await response.json();
    console.log('✅ Подключение успешно!');
    console.log('📦 Ответ от API:', JSON.stringify(data, null, 2));
    console.log('\n✨ Прокси настроен правильно, можно использовать генерацию контента!');
    
  } catch (error) {
    console.error('❌ Ошибка подключения:', error.message);
    if (!proxyUrl) {
      console.error('\n💡 Совет: попробуйте настроить прокси (см. OPENAI_PROXY_SETUP.md)');
    }
    process.exit(1);
  }
}

testOpenAIProxy();



