/**
 * Подбор обложки: OpenAI предлагает URL страниц афиши → probePosterImages (og:image и т.д.).
 * Без Google Custom Search JSON API.
 */

import { probePosterImages } from './posterPageProbe.js';
import { getOpenAiChatCompletionsUrl, getOpenAiChatExtraHeaders, throwOpenAiHttpError } from './openaiUpstream.js';

/**
 * @returns {boolean}
 */
export function isOpenAIPosterSearchConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

/**
 * @param {Array<{ role: string, content: string }>} messages
 * @returns {Promise<Record<string, unknown> | null>}
 */
async function openaiJsonResponse(messages) {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;

  const model = (process.env.POSTER_OPENAI_MODEL || 'gpt-4o-mini').trim();
  const res = await fetch(getOpenAiChatCompletionsUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
      ...getOpenAiChatExtraHeaders(),
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      response_format: { type: 'json_object' },
    }),
  });

  const text = await res.text();
  if (!res.ok) throwOpenAiHttpError(res, text);

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('OpenAI: некорректный JSON в ответе');
  }

  const raw = data.choices?.[0]?.message?.content;
  if (!raw || typeof raw !== 'string') return null;

  let jsonText = raw.trim();
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  }
  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

/** @param {unknown} v */
function normalizePageUrls(v) {
  if (!Array.isArray(v)) return [];
  const out = [];
  const seen = new Set();
  for (const x of v) {
    if (typeof x !== 'string') continue;
    const u = x.trim();
    if (!u.startsWith('https://')) continue;
    try {
      const p = new URL(u);
      if (p.protocol !== 'https:') continue;
      if (seen.has(p.href)) continue;
      seen.add(p.href);
      out.push(p.href);
    } catch {
      /* skip */
    }
    if (out.length >= 6) break;
  }
  return out;
}

/**
 * @param {string} title
 * @returns {Promise<{ url: string; title: string | null; thumbnailLink: null; rawItems: number; source: string } | null>}
 */
export async function searchPosterImageByEventTitleViaOpenAI(title) {
  if (!isOpenAIPosterSearchConfigured()) {
    throw new Error('Не задан OPENAI_API_KEY в backend/.env');
  }

  const t = (title || '').trim();
  if (!t) {
    throw new Error('Пустое название мероприятия');
  }

  const userPrompt = `Репертуар РФ, афиша спектакля/концерта.
Название: ${t}

Верни строго JSON-объект:
{ "pages": [ "https://..." ] }

До 5 URL **страниц** (HTML), где у события обычно есть постер: og:image (карточка на Яндекс.Афише, PortalBilet, официальный сайт театра).
Примеры хостов: afisha.yandex.ru, portalbilet.ru, mxat.ru, lenkom.ru, vakhtangov.ru, bolshoi.ru и т.п.
Не придумывай несуществующие пути. Если нет уверенных URL — "pages": [].
Без markdown, только JSON.`;

  const parsed = await openaiJsonResponse([
    {
      role: 'system',
      content:
        'Ты помощник по театральной афише РФ. Отвечай только валидным JSON-объектом с ключом pages (массив строк https).',
    },
    { role: 'user', content: userPrompt },
  ]);

  const pages = normalizePageUrls(parsed?.pages);
  if (pages.length === 0) {
    return null;
  }

  for (let i = 0; i < pages.length; i++) {
    const pageUrl = pages[i];
    try {
      const { bestUrl, candidates } = await probePosterImages(pageUrl);
      if (bestUrl) {
        return {
          url: bestUrl,
          title: t,
          thumbnailLink: null,
          rawItems: candidates?.length ?? 0,
          source: `openai+probe:${pageUrl}`,
        };
      }
    } catch {
      /* allowlist / сеть / нет og — пробуем следующую страницу */
    }
  }

  return null;
}
