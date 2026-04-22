/**
 * Единая точка: URL chat/completions и заголовки для OpenAI-совместимых API (прокси, OpenRouter и т.д.).
 */

/** После 401/403/429 дальнейшие вызовы LLM в этом процессе обходят сеть (шаблоны). */
export let openAiUpstreamCircuitOpen = false;

let openAiUpstreamCircuitWarned = false;

export function resetOpenAiUpstreamCircuit() {
  openAiUpstreamCircuitOpen = false;
  openAiUpstreamCircuitWarned = false;
}

/**
 * @returns {string}
 */
export function getOpenAiChatCompletionsUrl() {
  const full = process.env.OPENAI_API_BASE_URL?.trim();
  if (full) return full.replace(/\/$/, '');

  const compat = process.env.OPENAI_COMPATIBLE_BASE_URL?.trim();
  if (compat) {
    const b = compat.replace(/\/$/, '');
    return b.includes('chat/completions') ? b : `${b}/chat/completions`;
  }

  const apiUrl = process.env.OPENAI_PROXY_URL?.trim() || 'https://api.openai.com/v1/chat/completions';
  if (process.env.OPENAI_PROXY_URL?.trim() && !apiUrl.includes('/v1/chat/completions')) {
    return apiUrl.replace(/\/$/, '') + '/v1/chat/completions';
  }
  return apiUrl;
}

/**
 * @returns {Record<string, string>}
 */
export function getOpenAiChatExtraHeaders() {
  const url = getOpenAiChatCompletionsUrl();
  const h = {};
  if (url.includes('openrouter.ai')) {
    h['HTTP-Referer'] = process.env.OPENROUTER_HTTP_REFERER?.trim() || 'https://localhost';
    h['X-Title'] = process.env.OPENROUTER_APP_TITLE?.trim() || 'pokupka-biletov';
  }
  return h;
}

/**
 * @param {Response} res
 * @param {string} bodyText
 * @returns {never}
 */
export function throwOpenAiHttpError(res, bodyText) {
  let msg = bodyText.slice(0, 500);
  try {
    const j = JSON.parse(bodyText);
    msg = j?.error?.message || msg;
  } catch {
    /* */
  }
  const base = `OpenAI: ${res.status} ${msg}`;

  const noCircuit = process.env.OPENAI_DISABLE_UPSTREAM_CIRCUIT === '1';
  if (!noCircuit && (res.status === 401 || res.status === 403 || res.status === 429)) {
    openAiUpstreamCircuitOpen = true;
    if (!openAiUpstreamCircuitWarned) {
      openAiUpstreamCircuitWarned = true;
      console.warn(
        `[openaiUpstream] HTTP ${res.status} — повторные запросы к LLM в этом процессе отключены; используются шаблоны. При геоблоке см. OPENAI_PROXY_URL / OPENAI_COMPATIBLE_BASE_URL в backend/.env.example.`,
      );
    }
  }

  if (res.status === 403 && /Country|country|region|territory|not supported/i.test(String(msg))) {
    throw new Error(
      `${base}\n\n` +
        `Геоблок API: запрос отклонён по региону/IP или настройкам аккаунта. Варианты:\n` +
        `• OPENAI_PROXY_URL — прокси с выходом в US/EU (корень воркера; путь /v1/chat/completions добавится).\n` +
        `• OPENAI_API_BASE_URL — полный URL до …/v1/chat/completions, если прокси уже с готовым путём.\n` +
        `• OPENAI_COMPATIBLE_BASE_URL=https://openrouter.ai/api/v1 и ключ OpenRouter в OPENAI_API_KEY; модель, например: EVENT_DESCRIPTION_OPENAI_MODEL=openai/gpt-4o-mini.\n` +
        `• Запуск скрипта на VPS в поддерживаемом регионе или VPN для разработки.\n` +
        `Пока прокси не настроен, приложение и скрипты продолжают работу на шаблонных текстах.`,
    );
  }
  throw new Error(base);
}
