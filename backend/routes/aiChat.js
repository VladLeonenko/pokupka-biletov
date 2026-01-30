import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { callOpenAIText } from './ai.js';
import { callLocalAI, checkLocalAIAvailability } from './localAI.js';
import pool from '../db.js';

const router = express.Router();

// Системные промпты для AI-ассистента
// Публичный ассистент на сайте: помогает с навигацией по услугам и продуктам, делает доп. продажи
const PUBLIC_AI_SYSTEM_PROMPT = `Ты — AI‑помощник на сайте цифрового агентства Primecoder.

Твоя роль:
- Помогать посетителям разбираться в продуктах и услугах Primecoder
- Подбирать подходящие услуги под задачу клиента
- Делать мягкие допродажи (up-sell / cross-sell), если это логично
- Помогать ориентироваться по страницам сайта (какую страницу открыть, где почитать подробнее)

Важно:
- Отвечай КРАТКО, по делу, без воды.
- Всегда думай с позиции выгоды клиента и результата для его бизнеса.
- Отвечай ТОЛЬКО по темам: создание/поддержка сайтов, дизайн, маркетинг, SEO, аналитика, сопровождение, продукты и сервисы Primecoder.
- Если вопрос не по теме — вежливо откажи и предложи обсудить задачи по сайту/маркетингу.

Структура ответа:
1) Короткий ответ / рекомендация (1–3 предложения).
2) Конкретные следующие шаги для клиента (список 2–5 пунктов).
3) Если есть релевантная страница на сайте — добавь строку "Подробнее: /путь-страницы".

Карта соответствий задач и страниц (используй как внутреннюю шпаргалку):
- Если речь про создание сайта, лендинга, интернет‑магазина, редизайн — предлагай услуги разработки/дизайна, отправляй на:
  - /catalog (категория "Разработка" / "Дизайн", но в ответе просто упомяни "каталог услуг")
  - /portfolio (примеры работ)
- Если речь про SEO, рост органического трафика, видимость в поиске — предлагай:
  - /tools/technical-audit (техаудит)
  - /tools/position-checker (проверка позиций)
  - /catalog (услуги маркетинга/SEO)
- Если речь про рекламу (Google Ads, Яндекс, соцсети, перфоманс‑маркетинг) — предлагай:
  - /catalog (маркетинговые услуги, настройка рекламы)
  - /tools/roi-calculator (оценить эффективность)
- Если клиент хочет «разобраться, что ему нужно» — предлагай:
  - /catalog как обзор всех услуг
  - /ai-chat для углублённого общения с ассистентом (можешь мягко упомянуть, что он уже здесь).

Примеры страниц, которые ты можешь предлагать (используй подходящие по контексту):
- Главная: /
- Каталог услуг и продуктов: /catalog
- Команда AI и автоматизации: /ai-team
- Отзывы: /reviews
- Портфолио: /portfolio
- Кейсы: /cases/slug (если речь про конкретный кейс, иначе отправь на /portfolio)
- Инструменты:
  - Проверка позиций: /tools/position-checker
  - Технический аудит: /tools/technical-audit
  - Мониторинг репутации: /tools/reputation-monitor
  - ROI‑калькулятор: /tools/roi-calculator
- AI‑чат с ассистентом: /ai-chat
- Личный кабинет клиента: /account

Поведение:
- Если пользователь описывает задачу (\"нужен сайт\", \"надо поднять заявки\", \"нужен аудит\"), 
  1) Уточни 1–2 ключевых момента (бюджет/сроки/тип бизнеса), НО не устраивай длинное интервью.
  2) Предложи 1–3 конкретных решения/услуги.
  3) Обязательно предложи страницу(ы) сайта, где можно подробнее почитать или оставить заявку.
- Если пользователь спрашивает \"что вы делаете / чем можете помочь\" — дай короткий обзор услуг и отправь на /catalog.
- Не выдумывай цены и конкретные коммерческие условия, если они явно не описаны в вопросе — вместо этого предложи оставить заявку или перейти на подходящую страницу.
- При каждой задаче по возможности предлагай уместные доп. услуги (поддержка, SEO, реклама, аналитика), но аккуратно, без агрессивных продаж: оформляй это как \"дополнительно можем помочь с ...\".

Формат:
- Отвечай на русском языке.
- Используй списки и подзаголовки для читабельности.
- НЕ используй эмодзи, если явно не просили.`;

// Админский ассистент: помогает владельцу/команде с вопросами по разработке, маркетингу и бизнесу
const ADMIN_AI_SYSTEM_PROMPT = `Ты - умный AI-ассистент для команды Primecoder, который помогает с вопросами о веб-разработке, дизайне, SEO, маркетинге и бизнесе.

Твоя задача:
- Отвечать на вопросы профессионально и дружелюбно
- Предлагать практические решения
- Использовать примеры и конкретные рекомендации
- Быть кратким, но информативным
- Если не знаешь ответа - честно признайся и предложи альтернативу

Отвечай на русском языке.
Форматируй ответы с использованием списков и абзацев для лучшей читаемости.`;

// POST /api/ai-chat/public - Публичный эндпоинт для AI-чата (без авторизации)
router.post('/public', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Сообщение обязательно и должно быть непустой строкой' });
    }

    // Формируем историю диалога для контекста
    const messages = [
      { role: 'system', content: PUBLIC_AI_SYSTEM_PROMPT }
    ];

    // Добавляем историю (последние 10 сообщений для контекста)
    const recentHistory = conversationHistory.slice(-10);
    recentHistory.forEach((msg) => {
      if (msg.role && msg.content) {
        messages.push({ role: msg.role, content: msg.content });
      }
    });

    // Добавляем текущее сообщение пользователя
    messages.push({ role: 'user', content: message.trim() });

    // Определяем, какой AI использовать
    const useLocalAI = process.env.USE_LOCAL_AI === 'true' || process.env.USE_LOCAL_AI === '1';
    let aiResponse = null;
    let usedProvider = useLocalAI ? 'local' : 'openai';

    if (useLocalAI) {
      console.log('[ai-chat/public] Using local AI...');
      try {
        aiResponse = await callLocalAI(messages, {
          model: process.env.LOCAL_AI_MODEL,
          temperature: parseFloat(process.env.LOCAL_AI_TEMPERATURE || '0.7'),
          maxTokens: parseInt(process.env.LOCAL_AI_MAX_TOKENS || '2000'),
        });
      } catch (error) {
        console.error('[ai-chat/public] Local AI error, falling back to OpenAI:', error.message);
        // Fallback на OpenAI, если локальный AI недоступен
        if (process.env.OPENAI_API_KEY) {
          console.log('[ai-chat/public] Falling back to OpenAI...');
          aiResponse = await callOpenAIText(messages);
        } else {
          throw new Error('Local AI недоступен, а OpenAI API ключ не настроен');
        }
      }
    } else {
      console.log('[ai-chat/public] Using OpenAI...');
      aiResponse = await callOpenAIText(messages);
    }

    if (!aiResponse || !aiResponse.content) {
      console.error('[ai-chat/public] Empty response from AI');
      const providerName = useLocalAI ? 'локального AI' : 'OpenAI';
      return res.status(500).json({ 
        error: `Не удалось получить ответ от ${providerName}. Проверьте настройки.` 
      });
    }

    res.json({
      success: true,
      message: aiResponse.content,
      usage: aiResponse.usage || null,
      provider: useLocalAI ? 'local' : 'openai',
    });

  } catch (error) {
    console.error('[ai-chat/public] Error:', error);
    const useLocalAI = process.env.USE_LOCAL_AI === 'true' || process.env.USE_LOCAL_AI === '1';
    
    if (error.message?.includes('LOCAL_AI_CONNECTION_ERROR')) {
      return res.status(503).json({
        error: 'Локальный AI недоступен',
        details: error.message.includes('LM Studio') 
          ? 'Убедитесь, что LM Studio запущен и сервер активен (Local Server > Start Server)'
          : 'Убедитесь, что Ollama запущен (ollama serve)',
        suggestion: 'Проверьте настройки LOCAL_AI_URL и убедитесь, что локальный сервер запущен.'
      });
    }
    
    if (error.message === 'OPENAI_REGION_NOT_SUPPORTED') {
      return res.status(503).json({
        error: 'OpenAI API недоступен в вашем регионе',
        details: 'Для использования OpenAI API требуется прокси. Добавьте OPENAI_PROXY_URL в .env файл.'
      });
    }

    if (error.message === 'OPENAI_INVALID_API_KEY') {
      return res.status(401).json({
        error: 'Неверный API ключ OpenAI',
        details: 'Проверьте переменную окружения OPENAI_API_KEY в .env файле.'
      });
    }

    res.status(500).json({ 
      error: error.message || 'Произошла ошибка при обработке запроса',
      details: useLocalAI 
        ? 'Проверьте настройки локального AI в .env файле'
        : 'Проверьте настройки OpenAI API'
    });
  }
});

// POST /api/ai-chat - Отправить сообщение в AI-чат (требует авторизации)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;
    const userId = req.user.id;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Сообщение обязательно и должно быть непустой строкой' });
    }

    // Формируем историю диалога для контекста
    const messages = [
      { role: 'system', content: ADMIN_AI_SYSTEM_PROMPT }
    ];

    // Добавляем историю (последние 10 сообщений для контекста)
    const recentHistory = conversationHistory.slice(-10);
    recentHistory.forEach((msg) => {
      if (msg.role && msg.content) {
        messages.push({ role: msg.role, content: msg.content });
      }
    });

    // Добавляем текущее сообщение пользователя
    messages.push({ role: 'user', content: message.trim() });

    // Определяем, какой AI использовать
    const useLocalAI = process.env.USE_LOCAL_AI === 'true' || process.env.USE_LOCAL_AI === '1';
    let aiResponse = null;
    let usedProvider = useLocalAI ? 'local' : 'openai';

    if (useLocalAI) {
      console.log('[ai-chat] Using local AI...');
      try {
        aiResponse = await callLocalAI(messages, {
          model: process.env.LOCAL_AI_MODEL,
          temperature: parseFloat(process.env.LOCAL_AI_TEMPERATURE || '0.7'),
          maxTokens: parseInt(process.env.LOCAL_AI_MAX_TOKENS || '2000'),
        });
      } catch (error) {
        console.error('[ai-chat] Local AI error, falling back to OpenAI:', error.message);
        // Fallback на OpenAI, если локальный AI недоступен
        if (process.env.OPENAI_API_KEY) {
          console.log('[ai-chat] Falling back to OpenAI...');
          aiResponse = await callOpenAIText(messages);
        } else {
          throw new Error('Local AI недоступен, а OpenAI API ключ не настроен');
        }
      }
    } else {
      console.log('[ai-chat] Using OpenAI...');
      aiResponse = await callOpenAIText(messages);
    }

    if (!aiResponse || !aiResponse.content) {
      console.error('[ai-chat] Empty response from AI');
      const providerName = useLocalAI ? 'локального AI' : 'OpenAI';
      return res.status(500).json({ 
        error: `Не удалось получить ответ от ${providerName}. Проверьте настройки.` 
      });
    }

    // Сохраняем в историю (опционально, можно добавить таблицу для хранения истории)
    // Пока просто возвращаем ответ

    res.json({
      success: true,
      message: aiResponse.content,
      usage: aiResponse.usage || null,
      provider: useLocalAI ? 'local' : 'openai',
    });

  } catch (error) {
    console.error('[ai-chat] Error:', error);
    const useLocalAI = process.env.USE_LOCAL_AI === 'true' || process.env.USE_LOCAL_AI === '1';
    
    // Обработка ошибок локального AI
    if (error.message?.includes('LOCAL_AI_CONNECTION_ERROR')) {
      return res.status(503).json({
        error: 'Локальный AI недоступен',
        details: error.message.includes('LM Studio') 
          ? 'Убедитесь, что LM Studio запущен и сервер активен (Local Server > Start Server)'
          : 'Убедитесь, что Ollama запущен (ollama serve)',
        suggestion: 'Проверьте настройки LOCAL_AI_URL и убедитесь, что локальный сервер запущен.'
      });
    }
    
    // Обработка ошибок OpenAI
    if (error.message === 'OPENAI_REGION_NOT_SUPPORTED') {
      return res.status(503).json({
        error: 'OpenAI API недоступен в вашем регионе',
        details: 'Для использования OpenAI API требуется прокси. Добавьте OPENAI_PROXY_URL в .env файл.'
      });
    }

    if (error.message === 'OPENAI_INVALID_API_KEY') {
      return res.status(401).json({
        error: 'Неверный API ключ OpenAI',
        details: 'Проверьте переменную окружения OPENAI_API_KEY в .env файле.'
      });
    }

    res.status(500).json({ 
      error: error.message || 'Произошла ошибка при обработке запроса',
      details: useLocalAI 
        ? 'Проверьте настройки локального AI в .env файле'
        : 'Проверьте настройки OpenAI API'
    });
  }
});

// GET /api/ai-chat/history - Получить историю AI-чата пользователя (опционально)
router.get('/history', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Пока возвращаем пустую историю
    // В будущем можно добавить таблицу ai_chat_history для хранения истории
    res.json({
      success: true,
      history: []
    });
  } catch (error) {
    console.error('[ai-chat/history] Error:', error);
    res.status(500).json({ error: error.message || 'Ошибка получения истории' });
  }
});

// GET /api/ai-chat/status - Проверить статус AI провайдера
router.get('/status', requireAuth, async (req, res) => {
  try {
    const useLocalAI = process.env.USE_LOCAL_AI === 'true' || process.env.USE_LOCAL_AI === '1';
    const provider = process.env.LOCAL_AI_PROVIDER || 'lm-studio';
    
    let status = {
      provider: useLocalAI ? 'local' : 'openai',
      available: false,
      details: {},
    };

    if (useLocalAI) {
      status.available = await checkLocalAIAvailability();
      status.details = {
        provider,
        url: process.env.LOCAL_AI_URL || (provider === 'ollama' ? 'http://localhost:11434' : 'http://localhost:1234'),
        model: process.env.LOCAL_AI_MODEL || 'default',
      };
    } else {
      status.available = !!process.env.OPENAI_API_KEY;
      status.details = {
        hasApiKey: !!process.env.OPENAI_API_KEY,
        proxyUrl: process.env.OPENAI_PROXY_URL || null,
      };
    }

    res.json({
      success: true,
      ...status,
    });
  } catch (error) {
    console.error('[ai-chat/status] Error:', error);
    res.status(500).json({ error: error.message || 'Ошибка проверки статуса' });
  }
});

export default router;

