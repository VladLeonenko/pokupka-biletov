import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

export async function callOpenAIJSON(system, user) {
  // Убеждаемся, что оба параметра - строки
  let systemStr = '';
  let userStr = '';
  
  if (typeof system === 'string') {
    systemStr = system;
  } else if (system && typeof system === 'object') {
    console.error('[OpenAI] System parameter is object, converting to JSON string:', system);
    systemStr = JSON.stringify(system);
  } else {
    systemStr = String(system || '');
  }
  
  if (typeof user === 'string') {
    userStr = user;
  } else if (user && typeof user === 'object') {
    console.error('[OpenAI] User parameter is object, converting to JSON string:', user);
    userStr = JSON.stringify(user);
  } else {
    userStr = String(user || '');
  }
  
  // Финальная проверка - должны быть строки
  if (typeof systemStr !== 'string' || typeof userStr !== 'string') {
    console.error('[OpenAI] CRITICAL: Parameters are not strings after conversion!', {
      systemType: typeof systemStr,
      userType: typeof userStr,
      system: systemStr,
      user: userStr,
    });
    throw new Error('Invalid parameters: system and user must be strings');
  }
  
  console.log('[OpenAI] callOpenAIJSON called with:', {
    systemType: typeof system,
    systemIsString: typeof system === 'string',
    systemLength: systemStr?.length,
    userType: typeof user,
    userIsString: typeof user === 'string',
    userLength: userStr?.length,
  });
  
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.error('[OpenAI] OPENAI_API_KEY не найден в переменных окружения');
    return null;
  }
  
  // Проверяем, что ключ не пустой и правильно обрезан
  const cleanKey = String(key).trim();
  if (!cleanKey || cleanKey.length < 20) {
    console.error('[OpenAI] OPENAI_API_KEY имеет неправильный формат (слишком короткий)');
    return null;
  }
  
  // Используем прокси, если указан в переменных окружения
  // Если OPENAI_PROXY_URL не указан, используем стандартный OpenAI API
  let apiUrl = 'https://api.openai.com/v1/chat/completions';
  
  if (process.env.OPENAI_PROXY_URL) {
    apiUrl = process.env.OPENAI_PROXY_URL;
    // Убеждаемся, что URL заканчивается на /v1/chat/completions
    if (!apiUrl.includes('/v1/chat/completions')) {
      apiUrl = apiUrl.replace(/\/$/, '') + '/v1/chat/completions';
    }
  }
  
  try {
    const messages = [
      { role: 'system', content: systemStr },
      { role: 'user', content: userStr }
    ];
    
    // Финальная проверка перед отправкой
    if (typeof messages[0].content !== 'string' || typeof messages[1].content !== 'string') {
      console.error('[OpenAI] CRITICAL: Message content is not string!', {
        systemContent: messages[0].content,
        systemContentType: typeof messages[0].content,
        userContent: messages[1].content,
        userContentType: typeof messages[1].content,
      });
      throw new Error('OPENAI_TYPE_ERROR: Message content must be strings');
    }
    
    console.log('[OpenAI] Sending request with messages:', {
      systemContentType: typeof messages[0].content,
      systemContentIsString: typeof messages[0].content === 'string',
      systemContentLength: messages[0].content.length,
      userContentType: typeof messages[1].content,
      userContentIsString: typeof messages[1].content === 'string',
      userContentLength: messages[1].content.length,
    });
    
    const requestBody = { 
      model: 'gpt-4o-mini', 
      temperature: 0.8, // Увеличено для более креативных решений с интерактивными элементами
      messages: messages,
      response_format: { type: 'json_object' },
      max_tokens: 16000 // Увеличено для генерации развернутых статей с таблицами и чек-листами
    };
    
    console.log('[OpenAI] Request body messages check:', {
      messagesLength: requestBody.messages.length,
      firstMessageContentType: typeof requestBody.messages[0].content,
      secondMessageContentType: typeof requestBody.messages[1].content,
    });
    
    const fetchOptions = {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${cleanKey}` 
      },
      body: JSON.stringify(requestBody)
    };
    
    // Отправляем запрос через прокси или напрямую к OpenAI
    const res = await fetch(apiUrl, fetchOptions);
    
    if (!res.ok) {
      const errorData = await res.text();
      let errorObj;
      try {
        errorObj = JSON.parse(errorData);
      } catch {
        errorObj = { error: errorData };
      }
      
      // Обрабатываем специфичные ошибки
      if (errorObj.error?.code === 'unsupported_country_region_territory') {
        console.error('[OpenAI] Регион не поддерживается OpenAI API. Используйте прокси или VPN.');
        throw new Error('OPENAI_REGION_NOT_SUPPORTED');
      }
      
      if (errorObj.error?.code === 'invalid_api_key' || res.status === 401) {
        console.error('[OpenAI] Неверный API ключ:', errorObj.error?.message || 'Unauthorized');
        throw new Error('OPENAI_INVALID_API_KEY');
      }
      
      console.error('[OpenAI] API Error:', res.status, res.statusText);
      console.error('[OpenAI] Error details:', errorData.substring(0, 500));
      
      // Если это ошибка типа (400), пробрасываем дальше для обработки
      if (res.status === 400 && errorData.includes('invalid_type')) {
        console.error('[OpenAI] CRITICAL: Type error - parameters are not strings!');
        throw new Error('OPENAI_TYPE_ERROR: Parameters must be strings');
      }
      
      return null;
    }
    
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    
    if (!text) {
      console.error('[OpenAI] Пустой ответ от API');
      return null;
    }
    
    try {
      return JSON.parse(text);
    } catch (parseErr) {
      console.error('[OpenAI] Ошибка парсинга JSON:', parseErr.message, 'Текст:', text.substring(0, 200));
      return null;
    }
  } catch (err) {
    if (err.message === 'OPENAI_REGION_NOT_SUPPORTED' || err.message === 'OPENAI_INVALID_API_KEY') {
      throw err; // Пробрасываем дальше для специальной обработки
    }
    console.error('[OpenAI] Ошибка запроса:', err.message, err.stack);
    return null;
  }
}

// Функция для получения текстового ответа от OpenAI (не JSON)
export async function callOpenAIText(messages) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.error('[OpenAI] OPENAI_API_KEY не найден в переменных окружения');
    return null;
  }
  
  const cleanKey = String(key).trim();
  if (!cleanKey || cleanKey.length < 20) {
    console.error('[OpenAI] OPENAI_API_KEY имеет неправильный формат (слишком короткий)');
    return null;
  }
  
  let apiUrl = 'https://api.openai.com/v1/chat/completions';
  if (process.env.OPENAI_PROXY_URL) {
    apiUrl = process.env.OPENAI_PROXY_URL;
    if (!apiUrl.includes('/v1/chat/completions')) {
      apiUrl = apiUrl.replace(/\/$/, '') + '/v1/chat/completions';
    }
  }
  
  try {
    const requestBody = { 
      model: 'gpt-4o-mini', 
      temperature: 0.7, 
      messages: messages
    };
    
    const fetchOptions = {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${cleanKey}` 
      },
      body: JSON.stringify(requestBody)
    };
    
    const res = await fetch(apiUrl, fetchOptions);
    
    if (!res.ok) {
      const errorData = await res.text();
      let errorObj;
      try {
        errorObj = JSON.parse(errorData);
      } catch {
        errorObj = { error: errorData };
      }
      
      if (errorObj.error?.code === 'unsupported_country_region_territory') {
        throw new Error('OPENAI_REGION_NOT_SUPPORTED');
      }
      
      if (errorObj.error?.code === 'invalid_api_key' || res.status === 401) {
        throw new Error('OPENAI_INVALID_API_KEY');
      }
      
      console.error('[OpenAI] API Error:', res.status, res.statusText);
      return null;
    }
    
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    const usage = data.usage || null;
    
    if (!text) {
      console.error('[OpenAI] Пустой ответ от API');
      return null;
    }
    
    return { content: text, usage };
  } catch (err) {
    if (err.message === 'OPENAI_REGION_NOT_SUPPORTED' || err.message === 'OPENAI_INVALID_API_KEY') {
      throw err;
    }
    console.error('[OpenAI] Ошибка запроса:', err.message, err.stack);
    return null;
  }
}

const SEED_MAP = {
  'бизнес запросы': ['как увеличить прибыль малому бизнесу', 'стратегии роста для SMB', 'автоматизация бизнес-процессов'],
  'маркетинг': ['контент-маркетинг 2025', 'воронки продаж', 'e-mail маркетинг лучшие практики'],
  'разработка': ['лучшие практики react 2025', 'оптимизация производительности фронтенда', 'миграция на vite'],
  'новости it': ['новости ИИ 2025', 'обновления веб-стандартов', 'безопасность приложений'],
  'инструменты для селлеров': ['аналитика маркетплейсов', 'оптимизация карточек товара', 'A/B тестирование цен'],
  'веб-дизайн': ['микроанимации в UI', 'тренды типографики 2025', 'дизайн-системы с MUI'],
  'новости и фишки современного веб дизайна': ['glassmorphism 2.0', 'neumorphism на практике', '3D в вебе'],
};

// Semantic analysis (public, no auth required)
router.get('/semantic', async (req, res) => {
  try {
    const seed = String(req.query.seed || '').toLowerCase();
    const system = 'Ты SEO-ассистент. Верни строго JSON вида {"high":string[],"medium":string[],"low":string[]}. Без пояснений.';
    const user = `Для темы: ${seed}. Дай 10 высокочастотных, 10 среднечастотных и 10 низкочастотных запросов на русском. Строго верни {high:[...10], medium:[...10], low:[...10]}.`;
    const ai = await callOpenAIJSON(system, user);
    const base = SEED_MAP[seed] || [].concat(...Object.values(SEED_MAP));

    const hash = (s) => {
      let h = 2166136261;
      for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24); }
      return (h >>> 0);
    };
    const makeFreq = (q, min, max) => {
      const h = hash(q);
      const range = max - min + 1;
      const ya = min + (h % range);
      const ga = min + ((h >>> 8) % range);
      return { ya, ga };
    };
    const pickUnique = (arr, n, seen) => {
      const out = [];
      let i = 0;
      const mods = [' 2025', ' гайд', ' примеры', ' чек-лист', ' стратегия', ' инструменты'];
      while (out.length < n) {
        const baseIdx = i % Math.max(arr.length, 1);
        const m = mods[Math.floor(i / Math.max(arr.length, 1)) % mods.length] || '';
        let q = String(arr[baseIdx] || '').trim();
        if (!q) q = `запрос ${i+1}`;
        let candidate = i < arr.length ? q : `${q}${m}`;
        if (!seen.has(candidate)) { seen.add(candidate); out.push(candidate); }
        i++;
        if (i > 500) break; // safety
      }
      return out;
    };

    const norm = (arr) => Array.from(new Set((arr || []).map((s) => String(s).trim()).filter(Boolean)));
    const seen = new Set();
    let high = [], medium = [], low = [];
    if (ai && Array.isArray(ai.high) && Array.isArray(ai.medium) && Array.isArray(ai.low)) {
      high = pickUnique(norm(ai.high), 10, seen);
      medium = pickUnique(norm(ai.medium), 10, seen);
      low = pickUnique(norm(ai.low), 10, seen);
    } else {
      high = pickUnique(base, 10, seen);
      medium = pickUnique(base.slice().reverse(), 10, seen);
      low = pickUnique(base.slice().sort(), 10, seen);
    }

    const wrap = (qs, bucket) => qs.map((q) => {
      const freq = bucket === 'high' ? makeFreq(q, 5000, 20000) : bucket === 'medium' ? makeFreq(q, 1000, 5000) : makeFreq(q, 100, 1000);
      return { q, ya: freq.ya, ga: freq.ga };
    });

    res.json({ high: wrap(high, 'high'), medium: wrap(medium, 'medium'), low: wrap(low, 'low') });
  } catch (e) {
    const base = [].concat(...Object.values(SEED_MAP));
    const seen = new Set();
    const pick = (arr) => { const out=[]; let i=0; while(out.length<10){ const q=String(arr[i%Math.max(arr.length,1)]||'запрос'); const c=i<arr.length?q:`${q} 2025`; if(!seen.has(c)){out.push(c); seen.add(c);} i++; if(i>200) break; } return out; };
    const hash = (s) => { let h=2166136261; for (let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h += (h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24);} return (h>>>0); };
    const makeFreq = (q,min,max) => { const h=hash(q); const range=max-min+1; return { ya: min+(h%range), ga: min+((h>>>8)%range) }; };
    const wrap=(qs,b)=>qs.map(q=>{const f=b==='high'?makeFreq(q,5000,20000):b==='medium'?makeFreq(q,1000,5000):makeFreq(q,100,1000); return { q, ya:f.ya, ga:f.ga };});
    const high = pick(base);
    const medium = pick(base.slice().reverse());
    const low = pick(base.slice().sort());
    res.json({ high: wrap(high,'high'), medium: wrap(medium,'medium'), low: wrap(low,'low') });
  }
});

function slugify(input) {
  return String(input || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\u0400-\u04FF]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

router.post('/analyze-products', requireAuth, async (req, res) => {
  try {
    const { products, promotions, competitorData } = req.body || {};
    
    const system = `Ты эксперт по продуктовому маркетингу и анализу ассортимента. 
Проанализируй продуктовую матрицу и конкурентов. 
Верни строго JSON с полями: matrix (массив объектов {name, price, demand, competition, recommendation}), 
insights (массив строк с выводами), suggestions (массив объектов {action, product, reason}),
competitiveAnalysis (объект с полями {strengths, weaknesses, opportunities, threats}).`;

    const productsText = Array.isArray(products) 
      ? products.map(p => `${p.title || p.slug}: цена ${p.priceCents/100} ${p.currency}, период ${p.pricePeriod || 'one_time'}`).join('\n')
      : 'Нет данных о продуктах';
    
    const promotionsText = Array.isArray(promotions)
      ? promotions.map(p => `${p.title}: ${p.description}, активна: ${p.isActive ? 'да' : 'нет'}`).join('\n')
      : 'Нет данных об акциях';

    const competitorText = competitorData 
      ? `Данные конкурентов: ${JSON.stringify(competitorData)}`
      : 'Данные конкурентов отсутствуют. Проанализируй типичные цены и предложения в нише веб-разработки и дизайна.';

    const user = `Проанализируй продуктовую матрицу компании:

ПРОДУКТЫ:
${productsText}

АКЦИИ:
${promotionsText}

КОНКУРЕНТЫ:
${competitorText}

Создай продуктовую матрицу (price vs demand), дай рекомендации по оптимизации ассортимента, выяви возможности и угрозы.
Верни JSON с полями matrix, insights, suggestions, competitiveAnalysis.`;

    const ai = await callOpenAIJSON(system, user);
    
    if (ai && (ai.matrix || ai.insights || ai.suggestions || ai.competitiveAnalysis)) {
      // Обработка матрицы - убеждаемся что есть данные
      let matrix = [];
      if (Array.isArray(ai.matrix) && ai.matrix.length > 0) {
        matrix = ai.matrix.map(item => ({
          name: String(item.name || item.title || 'Продукт'),
          price: typeof item.price === 'number' ? item.price : 0,
          demand: ['high', 'medium', 'low'].includes(item.demand) ? item.demand : 'medium',
          competition: ['high', 'medium', 'low'].includes(item.competition) ? item.competition : 'medium',
          recommendation: String(item.recommendation || item.recommendation || 'Требуется анализ'),
        }));
      } else if (Array.isArray(products) && products.length > 0) {
        // Создаем базовую матрицу из продуктов если AI не вернул матрицу
        matrix = products.map(p => ({
          name: p.title || p.slug || 'Продукт',
          price: p.priceCents ? p.priceCents / 100 : 0,
          demand: 'medium',
          competition: 'medium',
          recommendation: 'Требуется дополнительный анализ',
        }));
      }
      
      return res.json({
        matrix,
        insights: Array.isArray(ai.insights) && ai.insights.length > 0 
          ? ai.insights 
          : (matrix.length > 0 ? ['Проанализированы все доступные продукты.'] : ['Нет продуктов для анализа.']),
        suggestions: Array.isArray(ai.suggestions) ? ai.suggestions : [],
        competitiveAnalysis: ai.competitiveAnalysis || {},
        timestamp: new Date().toISOString(),
      });
    }

    // Fallback если AI не ответил - создаем базовую матрицу из продуктов
    if (Array.isArray(products) && products.length > 0) {
      const matrix = products.map(p => ({
        name: p.title || p.slug || 'Продукт',
        price: p.priceCents ? p.priceCents / 100 : 0,
        demand: 'medium',
        competition: 'medium',
        recommendation: 'Требуется дополнительный анализ. Добавьте данные о конкурентах для более точного анализа.',
      }));
      
      return res.json({
        matrix,
        insights: [
          'Анализ выполнен на основе текущих продуктов.',
          'Для получения AI-рекомендаций убедитесь, что OPENAI_API_KEY настроен в .env файле.',
          'Рекомендуется добавить данные о конкурентах для более точного анализа.',
        ],
        suggestions: [],
        competitiveAnalysis: {},
        timestamp: new Date().toISOString(),
      });
    }

    // Полный fallback
    return res.json({
      matrix: [],
      insights: ['Не удалось получить анализ от ИИ. Проверьте настройки API или добавьте продукты для анализа.'],
      suggestions: [],
      competitiveAnalysis: {},
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/generate-seo-content', requireAuth, async (req, res) => {
  try {
    const { topic, currentTitle, currentContent } = req.body || {};
    if (!topic && !currentTitle) return res.status(400).json({ error: 'topic or currentTitle required' });
    
    const articleTopic = topic || currentTitle || 'SEO-статья';
    
    const system = `Ты профессиональный SEO-копирайтер, который пишет качественные статьи для блога на русском языке.
Твоя задача - создать полноценную SEO-статью без ограничений по длине, которая:
1. Оптимизирована для поисковых систем (естественное вхождение ключевых слов, релевантные подзаголовки)
2. Полезна для читателя (практические советы, примеры, структурированная информация)
3. Имеет низкий процент "воды" (не более 15-20% вводных слов и общих фраз)
4. Структурирована с использованием заголовков H2 и H3
5. Содержит списки, примеры, практические рекомендации
6. ОБЯЗАТЕЛЬНО ВКЛЮЧАЕТ интерактивные элементы для улучшения UX и полезности:
   - ТАБЛИЦЫ сравнения (когда уместно - для сравнения продуктов, услуг, вариантов, характеристик)
   - ОПРОСНИКИ/чек-листы (для самопроверки, оценки, выбора)
   - Блоки с важной информацией (выделенные блоки, цитаты, советы)
   - Инфографика в текстовом виде (структурированные данные, показатели)

КРИТИЧЕСКИ ВАЖНО:
- Контент должен быть УНИКАЛЬНЫМ и максимально полезным
- НЕ включай очевидные и банальные фразы типа "мы гарантируем качество", "индивидуальный подход", "профессиональное выполнение"
- НЕ используй шаблонные фразы, которые понятны пользователю без объяснений
- Фокусируйся на конкретных фактах, цифрах, технологиях, особенностях, преимуществах
- Добавляй только ценную информацию, которая поможет пользователю принять решение
- ОБЯЗАТЕЛЬНО добавляй таблицы, чек-листы или опросники, где это логично и полезно

ФОРМАТ HTML для дополнительных элементов:
- Таблицы: используй <table>, <thead>, <tbody>, <tr>, <th>, <td> с атрибутом style для стилизации
- Чек-листы: используй <ul> или <ol> с <li>, добавляй атрибут style="list-style-type: none" и checkbox символы (☐ или ✓) в текст
- Блоки с важной информацией: используй <div style="background: #f5f5f5; padding: 15px; border-left: 4px solid #1976d2; margin: 20px 0;">
- Выделенные советы: используй <blockquote> или <div> с особым стилем

ВАЖНО: Верни ответ ТОЛЬКО в формате валидного JSON объекта (без markdown разметки, без тройных кавычек).

JSON должен содержать следующие поля:
- "title": строка - оптимизированный заголовок статьи
- "html": строка - полный HTML контент статьи БЕЗ ОГРАНИЧЕНИЙ ПО ДЛИНЕ (используй h2/h3, списки, параграфы, ОБЯЗАТЕЛЬНО ТАБЛИЦЫ, ЧЕК-ЛИСТЫ, ОПРОСНИКИ)
- "seoTitle": строка - SEO заголовок (с ключевым словом в начале)
- "seoDescription": строка - SEO описание (привлекательное, с ключевым словом)
- "keywords": массив строк - 5-7 релевантных ключевых слов/фраз
- "summary": строка - краткое резюме статьи

ВАЖНО: Генерируй полную статью без сокращений. Длина HTML может быть любой - сколько нужно для качественной статьи с таблицами и чек-листами.`;

    const user = `Создай SEO-оптимизированную статью на тему: "${articleTopic}".

${currentContent ? `Текущий контент статьи (можно использовать как основу или дополнение):\n${currentContent.substring(0, 500)}\n\n` : ''}
Требования:
- НЕТ ОГРАНИЧЕНИЙ ПО КОЛИЧЕСТВУ СИМВОЛОВ - генерируй полную статью
- Используй структуру: вступление, основной контент с подзаголовками, заключение
- Естественное вхождение ключевых слов (не чаще 1-2 раз на 100 слов)
- Практические советы, примеры, конкретные данные
- Минимум "воды" - только полезная информация
- Заголовки H2 для основных разделов, H3 для подразделов
- Маркированные или нумерованные списки где уместно

КРИТИЧЕСКИ ВАЖНО - ОБЯЗАТЕЛЬНО ДОБАВЬ ИНТЕРАКТИВНЫЕ ЭЛЕМЕНТЫ:

Для ТАБЛИЦ используй специальный формат:
<div class="article-table">
<h3>Сравнение вариантов</h3>
<table>
<thead><tr><th>Характеристика</th><th>Вариант А</th><th>Вариант Б</th></tr></thead>
<tbody>
<tr><td>Стоимость</td><td>1000₽</td><td>1500₽</td></tr>
<tr><td>Срок</td><td>1 день</td><td>2 дня</td></tr>
</tbody>
</table>
</div>

Для ЧЕК-ЛИСТОВ используй:
<div class="article-checklist">
<h3>Чек-лист для проверки</h3>
<ul>
<li class="checklist-item">☐ Пункт проверки 1</li>
<li class="checklist-item">☐ Пункт проверки 2</li>
<li class="checklist-item">☐ Пункт проверки 3</li>
</ul>
</div>

Для ОПРОСНИКОВ используй:
<div class="article-poll">
<h3>Опросник: Выбор оптимального варианта</h3>
<ul>
<li class="poll-item">Вопрос 1: Ваш приоритет? (варианты ответов)</li>
<li class="poll-item">Вопрос 2: Бюджет? (варианты ответов)</li>
</ul>
</div>

Для ВАЖНЫХ БЛОКОВ используй:
<div class="article-tip">
<h3>💡 Важный совет</h3>
<p>Текст важной информации или совета</p>
</div>

ОБЯЗАТЕЛЬНО добавь в статью:
1. Хотя бы ОДНУ таблицу, чек-лист или опросник (выбери то, что наиболее релевантно теме)
2. Хотя бы ОДИН блок с важным советом (article-tip)

Примеры для разных тем:
- Если тема про выбор инструмента/сервиса → ОБЯЗАТЕЛЬНО добавь таблицу сравнения (article-table)
- Если тема про самодиагностику/проверку → ОБЯЗАТЕЛЬНО добавь чек-лист (article-checklist) или опросник (article-poll)
- Если тема про процесс/инструкцию → добавь чек-лист по шагам
- Всегда добавляй блок article-tip с ключевым советом

НЕ используй шаблонные фразы - только уникальный и полезный контент.
ИСПОЛЬЗУЙ КОНКРЕТНЫЕ ФОРМАТЫ выше для таблиц, чек-листов и опросников.

🚨 КРИТИЧЕСКИ ВАЖНО - ФИНАЛЬНОЕ ТРЕБОВАНИЕ - БЕЗ ИСКЛЮЧЕНИЙ:

Статья ОБЯЗАТЕЛЬНО должна содержать в HTML следующие элементы в ТОЧНОМ формате:
1. Минимум ОДИН элемент: <div class="article-table">...</div> ИЛИ <div class="article-checklist">...</div> ИЛИ <div class="article-poll">...</div>
2. Минимум ОДИН элемент: <div class="article-tip">...</div>

БЕЗ ЭТИХ ЭЛЕМЕНТОВ В ТОЧНОМ ФОРМАТЕ СТАТЬЯ БУДЕТ ОТКЛОНЕНА И ЗАПРОСАНА ПЕРЕГЕНЕРАЦИЯ!

Минимум 2 обязательных элемента:
- ОДНА таблица (article-table) ИЛИ чек-лист (article-checklist) ИЛИ опросник (article-poll)
- ОДИН блок совета (article-tip)

Вставь элементы ЛОГИЧНО В СОДЕРЖАНИЕ статьи, а не просто в конец. Они должны быть частью повествования.

Верни JSON с полями: title, html, seoTitle, seoDescription, keywords, summary.`;

    // УБИРАЕМ поэтапную генерацию - она замедляет процесс (2 запроса вместо 1)
    // Вместо этого встраиваем все требования прямо в основной промпт

    let ai;
    try {
      console.log(`[generate-seo-content] Начинаю генерацию статьи для темы: "${articleTopic}"`);
      const startTime = Date.now();
      
      ai = await callOpenAIJSON(system, user);
      
      const duration = Date.now() - startTime;
      console.log(`[generate-seo-content] Статья сгенерирована за ${duration}ms, длина HTML:`, ai?.html?.length || 0, 'символов');
    } catch (err) {
      if (err.message === 'OPENAI_REGION_NOT_SUPPORTED') {
        return res.status(500).json({
          error: 'OpenAI API недоступен в вашем регионе',
          details: 'Для использования OpenAI API требуется прокси. Добавьте OPENAI_PROXY_URL в .env файл (например, через сервисы типа https://api-proxy.com или свой прокси-сервер).',
          requiresProxy: true,
          helpUrl: 'https://platform.openai.com/docs/guides/production-best-practices'
        });
      }
      
      if (err.message === 'OPENAI_INVALID_API_KEY') {
        return res.status(500).json({
          error: 'Неверный API ключ OpenAI',
          details: 'Проверьте API ключ в файле backend/.env. Убедитесь, что:\n' +
                  '1. Ключ скопирован полностью (должен начинаться с sk-)\n' +
                  '2. Ключ активен в панели OpenAI (https://platform.openai.com/account/api-keys)\n' +
                  '3. На счету достаточно средств\n' +
                  '4. Backend перезапущен после изменения .env',
          invalidKey: true,
          helpUrl: 'https://platform.openai.com/account/api-keys'
        });
      }
      
      throw err;
    }
    
    if (!ai || !ai.html) {
      const keyCheck = process.env.OPENAI_API_KEY ? 'API ключ найден' : 'API ключ НЕ найден';
      const errorDetails = {
        keyCheck,
        hasAI: !!ai,
        hasHtml: !!(ai && ai.html),
        keyLength: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0
      };
      console.error('[generate-seo-content] Не удалось получить ответ от OpenAI:', errorDetails);
      
      let errorMessage = 'Не удалось сгенерировать контент. Проверьте настройки OpenAI API.';
      let details = '';
      
      if (!process.env.OPENAI_API_KEY) {
        details = 'API ключ не найден в переменных окружения. Убедитесь, что OPENAI_API_KEY добавлен в .env файл и backend перезапущен.';
      } else if (process.env.OPENAI_API_KEY.length < 20) {
        details = 'API ключ имеет неправильный формат. Убедитесь, что ключ скопирован полностью.';
      } else {
        details = 'API ключ найден, но получен пустой ответ. Возможные причины:\n' +
                  '1. OpenAI API недоступен в вашем регионе - используйте прокси (добавьте OPENAI_PROXY_URL в .env)\n' +
                  '2. Неправильный API ключ - проверьте ключ в панели OpenAI\n' +
                  '3. Недостаточно средств на счету OpenAI\n' +
                  '4. Превышен лимит запросов';
      }
      
      return res.status(500).json({ 
        error: errorMessage,
        details,
        requiresProxy: !process.env.OPENAI_PROXY_URL
      });
    }

    // Проверяем наличие обязательных интерактивных элементов
    const hasTable = ai.html && ai.html.includes('class="article-table"');
    const hasChecklist = ai.html && ai.html.includes('class="article-checklist"');
    const hasPoll = ai.html && ai.html.includes('class="article-poll"');
    const hasTip = ai.html && ai.html.includes('class="article-tip"');
    
    console.log('[generate-seo-content] Проверка элементов:', {
      hasTable,
      hasChecklist,
      hasPoll,
      hasTip,
      htmlLength: ai.html?.length || 0
    });
    
    if (!hasTable && !hasChecklist && !hasPoll && !hasTip) {
      // Если нет интерактивных элементов, перегенерируем статью с усиленным промптом
      console.log('[generate-seo-content] Интерактивные элементы не найдены, перегенерирую с усиленным промптом...');
      
      const strictSystem = `Ты профессиональный SEO-копирайтер. СТРОГО СЛЕДУЙ ИНСТРУКЦИЯМ.

ТВОЯ ЗАДАЧА - создать статью, которая ОБЯЗАТЕЛЬНО содержит:
1. Минимум ОДИН элемент: <div class="article-table"> ИЛИ <div class="article-checklist"> ИЛИ <div class="article-poll">
2. Минимум ОДИН элемент: <div class="article-tip">

БЕЗ ЭТИХ ЭЛЕМЕНТОВ В ТОЧНОМ ФОРМАТЕ СТАТЬЯ НЕПРИЕМЛЕМА!

ФОРМАТЫ (ИСПОЛЬЗУЙ ТОЧНО ТАК):
- Таблица: <div class="article-table"><h3>Заголовок</h3><table><thead><tr><th>Колонка1</th><th>Колонка2</th></tr></thead><tbody><tr><td>Данные1</td><td>Данные2</td></tr></tbody></table></div>
- Чек-лист: <div class="article-checklist"><h3>Заголовок</h3><ul><li class="checklist-item">☐ Пункт 1</li><li class="checklist-item">☐ Пункт 2</li></ul></div>
- Опросник: <div class="article-poll"><h3>Заголовок</h3><ul><li class="poll-item">Вопрос 1</li><li class="poll-item">Вопрос 2</li></ul></div>
- Совет: <div class="article-tip"><h3>💡 Заголовок</h3><p>Текст совета</p></div>

Верни JSON с полями: title, html, seoTitle, seoDescription, keywords, summary.`;

      const strictUser = `Перепиши эту статью, ОБЯЗАТЕЛЬНО добавив интерактивные элементы в точном формате:

Тема: "${articleTopic}"

Текущий контент (добавь в него интерактивные элементы, не просто в конец):
${(ai.html || '').substring(0, 4000)}

ОБЯЗАТЕЛЬНО:
1. Вставь минимум ОДНУ таблицу (<div class="article-table">) ИЛИ чек-лист (<div class="article-checklist">) ИЛИ опросник (<div class="article-poll">) В СОДЕРЖАНИЕ статьи (не в конец, а логично в нужное место)
2. Вставь минимум ОДИН блок совета (<div class="article-tip">) В СОДЕРЖАНИЕ статьи

Используй ТОЧНЫЕ форматы выше. Статья должна быть полезной с практическими примерами.`;

      try {
        const regenerated = await callOpenAIJSON(strictSystem, strictUser);
        if (regenerated && regenerated.html) {
          // Проверяем еще раз
          const reHasTable = regenerated.html.includes('class="article-table"');
          const reHasChecklist = regenerated.html.includes('class="article-checklist"');
          const reHasPoll = regenerated.html.includes('class="article-poll"');
          const reHasTip = regenerated.html.includes('class="article-tip"');
          
          if (reHasTable || reHasChecklist || reHasPoll) {
            ai.html = regenerated.html;
            if (regenerated.title) ai.title = regenerated.title;
            if (regenerated.seoTitle) ai.seoTitle = regenerated.seoTitle;
            if (regenerated.seoDescription) ai.seoDescription = regenerated.seoDescription;
            console.log('[generate-seo-content] ✅ Статья успешно перегенерирована с интерактивными элементами');
            console.log('[generate-seo-content] Элементы после перегенерации:', { reHasTable, reHasChecklist, reHasPoll, reHasTip });
          } else {
            console.warn('[generate-seo-content] ⚠️ Перегенерация не добавила обязательные элементы, добавляю вручную...');
            // Если перегенерация не помогла, добавляем элементы принудительно
            const defaultTable = `<div class="article-table">
<h3>Сравнение вариантов</h3>
<table>
<thead><tr><th>Характеристика</th><th>Вариант 1</th><th>Вариант 2</th></tr></thead>
<tbody>
<tr><td>Стоимость</td><td>Средняя</td><td>Высокая</td></tr>
<tr><td>Эффективность</td><td>Высокая</td><td>Средняя</td></tr>
</tbody>
</table>
</div>`;
            
            const defaultTip = `<div class="article-tip">
<h3>💡 Важный совет</h3>
<p>Выбирайте решение на основе ваших конкретных потребностей и возможностей.</p>
</div>`;
            
            // Вставляем элементы после первого H2 или в середину статьи
            const htmlParts = ai.html.split('</h2>');
            if (htmlParts.length > 1) {
              ai.html = htmlParts[0] + '</h2>' + defaultTable + htmlParts[1] + defaultTip + (htmlParts.slice(2).join('</h2>') || '');
            } else {
              // Если нет H2, добавляем в конец
              ai.html = ai.html + '\n' + defaultTable + '\n' + defaultTip;
            }
            console.log('[generate-seo-content] ✅ Элементы добавлены вручную');
          }
        }
      } catch (regenerateError) {
        console.error('[generate-seo-content] Ошибка при перегенерации:', regenerateError.message);
      }
    }

    // Генерируем OG изображение
    const ogTitle = ai.title || articleTopic;
    let ogImageUrl = `https://og-image.vercel.app/${encodeURIComponent(ogTitle)}.png?theme=dark&md=0&fontSize=86px`;
    
    // Пытаемся сохранить изображение локально (используем внутренний вызов без авторизации)
    try {
      // Используем base URL из переменных окружения или localhost
      const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
      const ogRes = await fetch(`${baseUrl}/api/seo/og-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: ogTitle, theme: 'dark', fontSize: '86px' })
      });
      if (ogRes.ok) {
        const ogData = await ogRes.json();
        ogImageUrl = ogData.url || ogImageUrl;
      }
    } catch (e) {
      console.warn('Failed to generate OG image locally, using Vercel OG:', e.message);
    }

    return res.json({
      title: String(ai.title || articleTopic).slice(0, 160),
      html: String(ai.html || ''),
      seoTitle: String(ai.seoTitle || ai.title || articleTopic).slice(0, 160),
      seoDescription: String(ai.seoDescription || ai.summary || '').slice(0, 300),
      keywords: Array.isArray(ai.keywords) ? ai.keywords : [],
      summary: String(ai.summary || ''),
      ogImageUrl,
      textLength: (ai.html || '').replace(/<[^>]+>/g, '').length,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/generate-article', requireAuth, async (req, res) => {
  try {
    const { keyword, category_slug } = req.body || {};
    if (!keyword) return res.status(400).json({ error: 'keyword required' });
    const system = 'Ты пишешь статьи для блога на русском. Отвечай JSON с полями: title, html.';
    const user = `Напиши экспертную статью для сайта по ключевому запросу: "${keyword}". Добавь заголовки h2/h3, списки, краткое вступление и вывод. Верни JSON с полями title и html.`;
    const ai = await callOpenAIJSON(system, user);
    const title = String(ai?.title || keyword).slice(0, 160);
    const html = String(ai?.html || `<h1>${title}</h1><p>${keyword}</p>`);
    const slug = slugify(title) || slugify(keyword);
    const ogImageUrl = `https://og-image.vercel.app/${encodeURIComponent(title)}.png?theme=dark&md=0&fontSize=86px`;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      let categoryId = null;
      if (category_slug) {
        const r = await client.query('SELECT id FROM blog_categories WHERE slug=$1', [category_slug]);
        categoryId = r.rows[0]?.id || null;
      }
      await client.query(
        `INSERT INTO blog_posts (slug, title, body, seo_title, seo_description, is_published, category_id, is_featured)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title, body=EXCLUDED.body, seo_title=EXCLUDED.seo_title, seo_description=EXCLUDED.seo_description, category_id=EXCLUDED.category_id, is_published=EXCLUDED.is_published, updated_at=NOW()`,
        [slug, title, html, title, `Ключ: ${keyword}`, false, categoryId, false]
      );
      // get post id for tag mapping (support different schemas)
      const postRow = await client.query('SELECT id FROM blog_posts WHERE slug=$1', [slug]);
      const postId = postRow.rows[0]?.id;
      // Ensure tag exists (keyword + ai-draft)
      const tagSlug = slugify(keyword);
      const tagName = keyword;
      const tagCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='blog_tags'");
      const hasTagId = tagCols.rows.some(r => r.column_name === 'id');
      const tagRow = hasTagId
        ? (await client.query('INSERT INTO blog_tags (slug, name) VALUES ($1,$2) ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name RETURNING id', [tagSlug, tagName])).rows[0]
        : (await client.query('INSERT INTO blog_tags (slug, name) VALUES ($1,$2) ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name RETURNING slug', [tagSlug, tagName])).rows[0];
      const aiTagRow = hasTagId
        ? (await client.query('INSERT INTO blog_tags (slug, name) VALUES ($1,$2) ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name RETURNING id', ['ai-draft', 'AI Draft'])).rows[0]
        : (await client.query('INSERT INTO blog_tags (slug, name) VALUES ($1,$2) ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name RETURNING slug', ['ai-draft', 'AI Draft'])).rows[0];
      const tagMapCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='blog_post_tags'");
      const hasPostId = tagMapCols.rows.some(r => r.column_name === 'post_id');
      const hasPostSlug = tagMapCols.rows.some(r => r.column_name === 'post_slug');
      const hasTagIdCol = tagMapCols.rows.some(r => r.column_name === 'tag_id');
      const hasTagSlug = tagMapCols.rows.some(r => r.column_name === 'tag_slug');
      // Add tags: keyword + ai-draft
      // map first tag
      if (hasPostId && hasTagIdCol && postId && tagRow?.id != null) {
        await client.query('INSERT INTO blog_post_tags (post_id, tag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [postId, tagRow.id]);
      } else if (hasPostId && hasTagSlug && postId) {
        await client.query('INSERT INTO blog_post_tags (post_id, tag_slug) VALUES ($1,$2) ON CONFLICT DO NOTHING', [postId, tagSlug]);
      } else if (hasPostSlug && hasTagIdCol && tagRow?.id != null) {
        await client.query('INSERT INTO blog_post_tags (post_slug, tag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [slug, tagRow.id]);
      } else if (hasPostSlug && hasTagSlug) {
        await client.query('INSERT INTO blog_post_tags (post_slug, tag_slug) VALUES ($1,$2) ON CONFLICT DO NOTHING', [slug, tagSlug]);
      }
      // map ai-draft tag
      const aiTagId = aiTagRow?.id;
      if (hasPostId && hasTagIdCol && postId && aiTagId != null) {
        await client.query('INSERT INTO blog_post_tags (post_id, tag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [postId, aiTagId]);
      } else if (hasPostId && hasTagSlug && postId) {
        await client.query('INSERT INTO blog_post_tags (post_id, tag_slug) VALUES ($1,$2) ON CONFLICT DO NOTHING', [postId, 'ai-draft']);
      } else if (hasPostSlug && hasTagIdCol && aiTagId != null) {
        await client.query('INSERT INTO blog_post_tags (post_slug, tag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [slug, aiTagId]);
      } else if (hasPostSlug && hasTagSlug) {
        await client.query('INSERT INTO blog_post_tags (post_slug, tag_slug) VALUES ($1,$2) ON CONFLICT DO NOTHING', [slug, 'ai-draft']);
      }
      await client.query('COMMIT');
      client.release();
      return res.json({ slug, title });
    } catch (e) {
      await client.query('ROLLBACK');
      client.release();
      throw e;
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Генерация SEO контента для товаров
router.post('/generate-product-seo', requireAuth, async (req, res) => {
  try {
    const { productTitle, currentDescription, currentPrice, currentFeatures } = req.body || {};
    if (!productTitle) return res.status(400).json({ error: 'productTitle required' });
    
    const system = `Ты профессиональный SEO-копирайтер, специализирующийся на описании товаров и услуг для интернет-магазинов на русском языке.
Твоя задача - создать SEO-оптимизированное описание товара/услуги, которое:
1. Содержит минимум 800 символов текста
2. Оптимизировано для поисковых систем (естественное вхождение ключевых слов)
3. Максимально полезно для потенциального клиента (конкретные преимущества, особенности, применение)
4. Имеет низкий процент "воды" (не более 10-15% вводных слов и общих фраз)
5. Структурировано с использованием заголовков H2 и H3
6. Содержит конкретные факты, цифры, технические характеристики (если применимо)

КРИТИЧЕСКИ ВАЖНО:
- Контент должен быть УНИКАЛЬНЫМ и максимально полезным
- НЕ включай очевидные и банальные фразы типа "мы гарантируем качество", "индивидуальный подход", "профессиональное выполнение", "гарантия качества"
- НЕ используй шаблонные фразы, которые понятны пользователю без объяснений
- Фокусируйся на конкретных фактах, технологиях, особенностях, преимуществах, применении
- Добавляй только ценную информацию, которая поможет пользователю понять ценность товара/услуги и принять решение
- Если есть цена или особенности - используй их в описании

ВАЖНО: Верни ответ ТОЛЬКО в формате валидного JSON объекта (без markdown разметки, без тройных кавычек).

JSON должен содержать следующие поля:
- "descriptionHtml": строка - полное HTML описание товара (минимум 800 символов текста, используй h2/h3, списки, параграфы)
- "summary": строка - краткое описание для карточки товара (100-200 символов)
- "fullDescriptionHtml": строка - расширенное описание (минимум 1500 символов текста)
- "metaTitle": строка - SEO заголовок (50-60 символов, с ключевым словом в начале)
- "metaDescription": строка - SEO описание (150-160 символов, привлекательное, с ключевым словом)
- "metaKeywords": строка - ключевые слова через запятую (5-7 релевантных слов/фраз)
- "tags": массив строк - релевантные теги для фильтрации (3-5 тегов)`;

    const priceInfo = currentPrice ? `\nЦена: ${currentPrice / 100} руб.` : '';
    const featuresInfo = currentFeatures && currentFeatures.length > 0 
      ? `\nОсобенности: ${currentFeatures.join(', ')}` 
      : '';
    
    const user = `Создай SEO-оптимизированное описание для товара/услуги: "${productTitle}".
${priceInfo}${featuresInfo}

${currentDescription ? `Текущее описание (можно использовать как основу или дополнение):\n${currentDescription.substring(0, 500)}\n\n` : ''}
Требования:
- Минимум 800 символов текста для основного описания (без HTML тегов)
- Минимум 1500 символов для расширенного описания
- Используй структуру: краткое вступление, основные характеристики/преимущества с подзаголовками, применение/результат, заключение
- Естественное вхождение ключевых слов (не чаще 1-2 раз на 100 слов)
- Конкретные факты, цифры, особенности, технологии
- Минимум "воды" - только полезная информация
- Заголовки H2 для основных разделов, H3 для подразделов
- Маркированные или нумерованные списки где уместно
- НЕ используй шаблонные фразы - только уникальный и полезный контент

Верни JSON с полями: descriptionHtml, summary, fullDescriptionHtml, metaTitle, metaDescription, metaKeywords, tags.`;

    let ai;
    try {
      ai = await callOpenAIJSON(system, user);
    } catch (err) {
      if (err.message === 'OPENAI_REGION_NOT_SUPPORTED') {
        return res.status(500).json({
          error: 'OpenAI API недоступен в вашем регионе',
          details: 'Для использования OpenAI API требуется прокси. Добавьте OPENAI_PROXY_URL в .env файл.',
          requiresProxy: true,
        });
      }
      
      if (err.message === 'OPENAI_INVALID_API_KEY') {
        return res.status(500).json({
          error: 'Неверный API ключ OpenAI',
          details: 'Проверьте API ключ в файле backend/.env',
          invalidKey: true,
        });
      }
      
      throw err;
    }
    
    if (!ai || !ai.descriptionHtml) {
      return res.status(500).json({ 
        error: 'Не удалось сгенерировать контент',
        details: 'Проверьте настройки OpenAI API',
      });
    }

    // Валидация длины контента
    const textContent = ai.descriptionHtml.replace(/<[^>]*>/g, '').trim();
    const fullTextContent = (ai.fullDescriptionHtml || ai.descriptionHtml).replace(/<[^>]*>/g, '').trim();
    
    if (textContent.length < 800) {
      const additionalSystem = `Дополни описание товара до минимума 800 символов текста. Добавь конкретные детали, преимущества или особенности.`;
      const additionalUser = `Дополни следующее описание до минимума 800 символов:\n\n${ai.descriptionHtml}\n\nДобавь еще разделы с конкретными деталями.`;
      const additional = await callOpenAIJSON(additionalSystem, additionalUser);
      if (additional && additional.html) {
        ai.descriptionHtml = ai.descriptionHtml + '\n' + additional.html;
      }
    }

    if (fullTextContent.length < 1500 && !ai.fullDescriptionHtml) {
      const fullSystem = `Создай расширенное описание товара минимум 1500 символов текста. Добавь детали, применение, результаты, сравнение.`;
      const fullUser = `Создай расширенное описание для товара "${productTitle}" на основе:\n${ai.descriptionHtml}\n\nДобавь детальные разделы о применении, результатах, преимуществах.`;
      const full = await callOpenAIJSON(fullSystem, fullUser);
      if (full && full.html) {
        ai.fullDescriptionHtml = full.html;
      }
    }

    return res.json({
      descriptionHtml: String(ai.descriptionHtml || ''),
      summary: String(ai.summary || '').slice(0, 300),
      fullDescriptionHtml: String(ai.fullDescriptionHtml || ai.descriptionHtml || ''),
      metaTitle: String(ai.metaTitle || productTitle).slice(0, 160),
      metaDescription: String(ai.metaDescription || ai.summary || '').slice(0, 300),
      metaKeywords: String(ai.metaKeywords || '').slice(0, 500),
      tags: Array.isArray(ai.tags) ? ai.tags : [],
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Генерация полной карточки товара
router.post('/generate-product-card', requireAuth, async (req, res) => {
  try {
    const { productTopic, currentTitle, currentDescription, currentPrice, currentFeatures } = req.body || {};
    
    // Если нет темы и названия, возвращаем ошибку
    if (!productTopic && !currentTitle) {
      return res.status(400).json({ error: 'productTopic or currentTitle required' });
    }
    
    const productName = currentTitle || productTopic;
    
    const system = `Ты профессиональный копирайтер и маркетолог, специализирующийся на создании описаний товаров и услуг для интернет-магазинов на русском языке.
Твоя задача - создать полную карточку товара/услуги, которая включает:
1. Привлекательное и информативное название товара
2. Краткое описание для карточки (100-200 символов)
3. Полное HTML описание с характеристиками (минимум 800 символов текста)
4. Список ключевых особенностей/преимуществ (5-8 пунктов)
5. Предполагаемую цену (если возможно определить по описанию)

КРИТИЧЕСКИ ВАЖНО:
- Контент должен быть УНИКАЛЬНЫМ и максимально полезным
- НЕ включай очевидные и банальные фразы типа "мы гарантируем качество", "индивидуальный подход", "профессиональное выполнение"
- Фокусируйся на конкретных фактах, технологиях, особенностях, преимуществах, применении
- Название должно быть конкретным, информативным и привлекательным
- Особенности должны быть конкретными и полезными для клиента
- Если есть текущее описание или цена - используй их как основу или дополнение

ВАЖНО: Верни ответ ТОЛЬКО в формате валидного JSON объекта (без markdown разметки, без тройных кавычек).

JSON должен содержать следующие поля:
- "title": строка - название товара/услуги (50-80 символов, привлекательное и информативное)
- "summary": строка - краткое описание для карточки товара (100-200 символов)
- "descriptionHtml": строка - полное HTML описание товара (минимум 800 символов текста, используй h2/h3, списки, параграфы)
- "features": массив строк - ключевые особенности/преимущества товара (5-8 пунктов, каждый 10-30 слов)
- "suggestedPriceCents": число (опционально) - предполагаемая цена в копейках (если можно определить)
- "metaTitle": строка - SEO заголовок (50-60 символов)
- "metaDescription": строка - SEO описание (150-160 символов)
- "tags": массив строк - релевантные теги для фильтрации (3-5 тегов)`;

    const priceInfo = currentPrice ? `\nТекущая цена: ${currentPrice / 100} руб.` : '';
    const featuresInfo = currentFeatures && currentFeatures.length > 0 
      ? `\nТекущие особенности: ${currentFeatures.join(', ')}` 
      : '';
    
    const user = `Создай полную карточку товара/услуги на тему: "${productName}".
${priceInfo}${featuresInfo}

${currentDescription ? `Текущее описание (можно использовать как основу или дополнение):\n${currentDescription.substring(0, 500)}\n\n` : ''}
Требования:
- Название должно быть конкретным, информативным и привлекательным (50-80 символов)
- Краткое описание для карточки: 100-200 символов, ключевые преимущества
- Полное описание: минимум 800 символов текста (без HTML тегов), структурированное с заголовками H2/H3
- Особенности: 5-8 конкретных пунктов, каждый описывает конкретное преимущество или характеристику
- Используй структуру: краткое вступление, основные характеристики/преимущества с подзаголовками, применение/результат, заключение
- Конкретные факты, цифры, особенности, технологии
- Минимум "воды" - только полезная информация
- Если можно определить примерную цену по описанию - укажи suggestedPriceCents

Верни JSON с полями: title, summary, descriptionHtml, features (массив), suggestedPriceCents (опционально), metaTitle, metaDescription, tags.`;

    let ai;
    try {
      ai = await callOpenAIJSON(system, user);
    } catch (err) {
      if (err.message === 'OPENAI_REGION_NOT_SUPPORTED') {
        return res.status(500).json({
          error: 'OpenAI API недоступен в вашем регионе',
          details: 'Для использования OpenAI API требуется прокси. Добавьте OPENAI_PROXY_URL в .env файл.',
          requiresProxy: true,
        });
      }
      
      if (err.message === 'OPENAI_INVALID_API_KEY') {
        return res.status(500).json({
          error: 'Неверный API ключ OpenAI',
          details: 'Проверьте API ключ в файле backend/.env',
          invalidKey: true,
        });
      }
      
      throw err;
    }
    
    if (!ai || !ai.title) {
      return res.status(500).json({ 
        error: 'Не удалось сгенерировать карточку товара',
        details: 'Проверьте настройки OpenAI API',
      });
    }

    // Валидация и дополнение контента если нужно
    const textContent = (ai.descriptionHtml || '').replace(/<[^>]*>/g, '').trim();
    
    if (textContent.length < 800) {
      const additionalSystem = `Дополни описание товара до минимума 800 символов текста. Добавь конкретные детали, преимущества или особенности.`;
      const additionalUser = `Дополни следующее описание до минимума 800 символов:\n\n${ai.descriptionHtml}\n\nДобавь еще разделы с конкретными деталями.`;
      const additional = await callOpenAIJSON(additionalSystem, additionalUser);
      if (additional && additional.descriptionHtml) {
        ai.descriptionHtml = ai.descriptionHtml + '\n' + additional.descriptionHtml;
      }
    }

    // Убеждаемся, что features - это массив
    if (!Array.isArray(ai.features)) {
      ai.features = ai.features ? [ai.features] : [];
    }

    return res.json({
      title: String(ai.title || productName).slice(0, 200),
      summary: String(ai.summary || '').slice(0, 300),
      descriptionHtml: String(ai.descriptionHtml || ''),
      features: Array.isArray(ai.features) ? ai.features : [],
      suggestedPriceCents: ai.suggestedPriceCents ? Number(ai.suggestedPriceCents) : undefined,
      metaTitle: String(ai.metaTitle || ai.title || productName).slice(0, 160),
      metaDescription: String(ai.metaDescription || ai.summary || '').slice(0, 300),
      tags: Array.isArray(ai.tags) ? ai.tags : [],
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// API для управления темами семантического ядра
router.get('/semantic-topics', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT topic FROM semantic_topics ORDER BY topic ASC');
    const topics = rows.map(r => r.topic);
    res.json({ topics });
  } catch (e) {
    console.error('[semantic-topics] Ошибка при загрузке тем:', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/semantic-topics', requireAuth, async (req, res) => {
  try {
    const { topic } = req.body;
    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return res.status(400).json({ error: 'topic is required and must be non-empty string' });
    }
    
    const trimmedTopic = topic.trim();
    await pool.query(
      'INSERT INTO semantic_topics (topic) VALUES ($1) ON CONFLICT (topic) DO NOTHING',
      [trimmedTopic]
    );
    
    res.json({ success: true, topic: trimmedTopic });
  } catch (e) {
    console.error('[semantic-topics] Ошибка при добавлении темы:', e);
    res.status(500).json({ error: e.message });
  }
});

router.delete('/semantic-topics/:topic', requireAuth, async (req, res) => {
  try {
    const topic = decodeURIComponent(req.params.topic);
    const { rowCount } = await pool.query('DELETE FROM semantic_topics WHERE topic = $1', [topic]);
    
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Topic not found' });
    }
    
    res.json({ success: true });
  } catch (e) {
    console.error('[semantic-topics] Ошибка при удалении темы:', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;


