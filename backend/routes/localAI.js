/**
 * Адаптер для локальных моделей ИИ
 * Поддерживает:
 * - LM Studio (localhost:1234)
 * - Ollama (localhost:11434)
 * - Другие OpenAI-совместимые локальные API
 */

// Функция для вызова локального AI через LM Studio
export async function callLMStudio(messages, options = {}) {
  const {
    baseUrl = process.env.LM_STUDIO_URL || 'http://localhost:1234',
    model = process.env.LM_STUDIO_MODEL || 'local-model',
    temperature = 0.7,
    maxTokens = 2000,
  } = options;

  const apiUrl = `${baseUrl}/v1/chat/completions`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[LM Studio] API Error:', response.status, errorText);
      throw new Error(`LM Studio API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';

    if (!text) {
      console.error('[LM Studio] Пустой ответ от API');
      return null;
    }

    return {
      content: text,
      usage: data.usage || null,
    };
  } catch (error) {
    if (error.message?.includes('ECONNREFUSED') || error.message?.includes('fetch failed')) {
      console.error('[LM Studio] Не удалось подключиться к локальному серверу. Убедитесь, что LM Studio запущен.');
      throw new Error('LOCAL_AI_CONNECTION_ERROR: LM Studio не запущен или недоступен');
    }
    console.error('[LM Studio] Ошибка запроса:', error.message);
    throw error;
  }
}

// Функция для вызова локального AI через Ollama
export async function callOllama(messages, options = {}) {
  const {
    baseUrl = process.env.OLLAMA_URL || 'http://localhost:11434',
    model = process.env.OLLAMA_MODEL || 'llama3',
    temperature = 0.7,
    stream = false,
  } = options;

  const apiUrl = `${baseUrl}/api/chat`;

  try {
    // Ollama использует другой формат запроса
    // Преобразуем messages в формат Ollama
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    const systemMessage = messages.find(m => m.role === 'system');
    
    const ollamaMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: ollamaMessages,
        system: systemMessage?.content || '',
        options: {
          temperature,
        },
        stream,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Ollama] API Error:', response.status, errorText);
      throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const text = data.message?.content || '';

    if (!text) {
      console.error('[Ollama] Пустой ответ от API');
      return null;
    }

    return {
      content: text,
      usage: data.eval_count ? {
        prompt_tokens: data.prompt_eval_count,
        completion_tokens: data.eval_count,
        total_tokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      } : null,
    };
  } catch (error) {
    if (error.message?.includes('ECONNREFUSED') || error.message?.includes('fetch failed')) {
      console.error('[Ollama] Не удалось подключиться к локальному серверу. Убедитесь, что Ollama запущен.');
      throw new Error('LOCAL_AI_CONNECTION_ERROR: Ollama не запущен или недоступен');
    }
    console.error('[Ollama] Ошибка запроса:', error.message);
    throw error;
  }
}

// Универсальная функция для вызова локального AI
// Автоматически определяет провайдера по настройкам
export async function callLocalAI(messages, options = {}) {
  const provider = process.env.LOCAL_AI_PROVIDER || 'lm-studio'; // 'lm-studio' | 'ollama' | 'openai-compatible'
  const baseUrl = process.env.LOCAL_AI_URL || (provider === 'ollama' ? 'http://localhost:11434' : 'http://localhost:1234');

  console.log(`[Local AI] Using provider: ${provider}, baseUrl: ${baseUrl}`);

  try {
    switch (provider.toLowerCase()) {
      case 'lm-studio':
        return await callLMStudio(messages, { ...options, baseUrl });
      
      case 'ollama':
        return await callOllama(messages, { ...options, baseUrl });
      
      case 'openai-compatible':
        // Для других OpenAI-совместимых локальных API (например, vLLM, text-generation-webui)
        return await callLMStudio(messages, { ...options, baseUrl });
      
      default:
        throw new Error(`Unknown local AI provider: ${provider}`);
    }
  } catch (error) {
    console.error('[Local AI] Error:', error);
    throw error;
  }
}

// Функция для проверки доступности локального AI
export async function checkLocalAIAvailability() {
  const provider = process.env.LOCAL_AI_PROVIDER || 'lm-studio';
  const baseUrl = process.env.LOCAL_AI_URL || (provider === 'ollama' ? 'http://localhost:11434' : 'http://localhost:1234');

  try {
    if (provider === 'ollama') {
      const response = await fetch(`${baseUrl}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      return response.ok;
    } else {
      // Для LM Studio и других OpenAI-совместимых
      const response = await fetch(`${baseUrl}/v1/models`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      return response.ok;
    }
  } catch (error) {
    return false;
  }
}







