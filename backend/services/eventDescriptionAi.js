/**
 * Описания мероприятий через OpenAI: структура как у афишных сайтов (кикер, подстрочник, лид, «О событии», meta).
 */

import {
  getPracticalTailSections,
  sectionsToPlain,
  MIN_TOTAL,
  buildEventDescriptionSections,
  extractHeroLeadFromPack,
} from './eventLongDescription.js';
import { classifyEventTitle } from './eventTitleHeuristics.js';
import {
  getOpenAiChatCompletionsUrl,
  getOpenAiChatExtraHeaders,
  openAiUpstreamCircuitOpen,
  throwOpenAiHttpError,
} from './openaiUpstream.js';
import {
  buildProgrammaticHeroLead,
  buildProgrammaticMetaRows,
  formatCatalogHintsSubline,
  kickerExtraFromTitle,
} from './eventTitleNarrative.js';

export function isEventDescriptionAiEnabled() {
  if (process.env.EVENT_DESCRIPTION_USE_OPENAI === '0') return false;
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function isLikelyAutoTemplateText(text) {
  const t = (text || '').trim();
  if (t.length < 1400) return false;
  const markers = [
    'Точные правила возврата и обмена зависят от организатора',
    'На этой странице вы выбираете дату, зону зала',
    'Матч и турнирный контекст',
    'Спектакль как живой жанр',
    'Концертный опыт: энергия и звук',
    'Редакционная справка',
    'детали программы раскрываются на месте',
    'задаёт общую рамку',
  ];
  return markers.some((m) => t.includes(m));
}

export function shouldRegenerateDescriptionWithAi(manualText) {
  const m = (manualText || '').trim();
  if (!m) return true;
  if (m.length < 650) return true;
  if (isLikelyAutoTemplateText(m)) return true;
  if (process.env.EVENT_DESCRIPTION_AI_ALWAYS === '1') return true;
  return false;
}

/**
 * @param {Array<{ role: string, content: string }>} messages
 * @param {{ temperature?: number }} [options]
 */
async function openaiJsonObject(messages, options = {}) {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error('Не задан OPENAI_API_KEY');

  const model = (process.env.EVENT_DESCRIPTION_OPENAI_MODEL || 'gpt-4o-mini').trim();
  const body = JSON.stringify({
    model,
    messages,
    temperature: options.temperature ?? 0.72,
    response_format: { type: 'json_object' },
  });

  const url = getOpenAiChatCompletionsUrl();
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
    ...getOpenAiChatExtraHeaders(),
  };
  /** @type {Response | undefined} */
  let res;
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 2000 * attempt));
      res = await fetch(url, {
        method: 'POST',
        headers,
        body,
      });
      break;
    } catch (e) {
      lastErr = e;
      if (attempt === 2) throw e;
    }
  }
  if (!res) throw lastErr ?? new Error('OpenAI: нет ответа');

  const text = await res.text();
  if (!res.ok) throwOpenAiHttpError(res, text);

  const data = JSON.parse(text);
  const raw = data.choices?.[0]?.message?.content;
  if (!raw || typeof raw !== 'string') throw new Error('OpenAI: пустой ответ');

  let jsonText = raw.trim();
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  }
  return JSON.parse(jsonText);
}

/**
 * Лёгкий запрос перед массовым прогоном скрипта: падает с понятной ошибкой при геоблоке и т.п.
 */
export async function assertOpenAiReachableForEventDescriptions() {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error('Не задан OPENAI_API_KEY');

  const url = getOpenAiChatCompletionsUrl();
  let host = url;
  try {
    host = new URL(url).host;
  } catch {
    /* */
  }
  console.error(`[eventDescriptionAi] endpoint host: ${host}`);

  const model = (process.env.EVENT_DESCRIPTION_OPENAI_MODEL || 'gpt-4o-mini').trim();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
      ...getOpenAiChatExtraHeaders(),
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: 'Ответь строго JSON-объектом: {"ok":true}' }],
      max_tokens: 16,
      temperature: 0,
      response_format: { type: 'json_object' },
    }),
  });
  const text = await res.text();
  if (!res.ok) throwOpenAiHttpError(res, text);
}

/**
 * @param {unknown} parsed
 * @returns {{ title: string; paragraphs: string[] }[] | null}
 */
function normalizeAiSections(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  const arr = /** @type {Record<string, unknown>} */ (parsed).sections;
  if (!Array.isArray(arr) || arr.length === 0) return null;

  /** @type {{ title: string; paragraphs: string[] }[]} */
  const out = [];
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue;
    const title = String(/** @type {Record<string, unknown>} */ (item).title ?? '').trim();
    const paragraphs = /** @type {unknown} */ (/** @type {Record<string, unknown>} */ (item).paragraphs);
    const paras = Array.isArray(paragraphs)
      ? paragraphs.map((p) => String(p).trim()).filter(Boolean)
      : [];
    if (!title || paras.length === 0) continue;
    out.push({ title, paragraphs: paras });
  }
  return out.length ? out : null;
}

/** @param {unknown} v */
function cleanStr(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

/**
 * @param {unknown} raw
 * @returns {{ label: string; value: string }[]}
 */
function normalizeMetaRows(raw) {
  if (!Array.isArray(raw)) return [];
  /** @type {{ label: string; value: string }[]} */
  const out = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = /** @type {Record<string, unknown>} */ (item);
    const label = cleanStr(o.label ?? o.Label);
    const value = cleanStr(o.value ?? o.Value);
    if (!label || !value) continue;
    if (value.length > 1200) continue;
    out.push({ label, value });
    if (out.length >= 10) break;
  }
  return out;
}

/**
 * @param {Record<string, unknown>} parsed
 * @param {string} title
 */
function parseStructuredAi(parsed, title) {
  const heroKicker = cleanStr(parsed.heroKicker);
  const heroSubline = cleanStr(parsed.heroSubline);
  let heroLead = cleanStr(parsed.heroLead);
  const meta = normalizeMetaRows(parsed.meta);

  let aboutParagraphs = Array.isArray(parsed.aboutParagraphs)
    ? parsed.aboutParagraphs.map((p) => String(p).trim()).filter(Boolean)
    : [];

  /** @type {{ title: string; paragraphs: string[] }[]} */
  const detailSections = [];
  if (Array.isArray(parsed.detailSections)) {
    for (const item of parsed.detailSections) {
      if (!item || typeof item !== 'object') continue;
      const o = /** @type {Record<string, unknown>} */ (item);
      const tit = cleanStr(o.title) || 'Дополнительно';
      const paras = Array.isArray(o.paragraphs)
        ? o.paragraphs.map((p) => String(p).trim()).filter(Boolean)
        : [];
      if (paras.length) detailSections.push({ title: tit, paragraphs: paras });
    }
  }

  if (aboutParagraphs.length === 0) {
    const legacy = normalizeAiSections(parsed);
    if (legacy && legacy.length > 0) {
      aboutParagraphs = legacy[0].paragraphs;
      if (!heroLead && legacy[0].paragraphs[0]) heroLead = legacy[0].paragraphs[0];
      for (let i = 1; i < legacy.length; i++) {
        detailSections.push(legacy[i]);
      }
    }
  }

  if (aboutParagraphs.length === 0) {
    throw new Error('OpenAI: пустой aboutParagraphs');
  }

  if (!heroLead) {
    heroLead = aboutParagraphs[0].length > 280 ? `${aboutParagraphs[0].slice(0, 277).trimEnd()}…` : aboutParagraphs[0];
  }

  return { heroKicker, heroSubline, heroLead, meta, aboutParagraphs, detailSections };
}

/**
 * @param {object} input
 * @param {string} input.title
 * @param {string} input.kind
 * @param {string} input.categoryLabel
 * @param {string | null | undefined} input.venueLabel
 * @param {string | null | undefined} input.manualHint
 * @param {{ ageLimit?: string | null, cityName?: string | null, beginSample?: string | null } | null | undefined} input.catalogHints
 */
export async function generateEventDescriptionWithOpenAI(input) {
  const title = String(input.title || '').trim() || 'Мероприятие';
  const kind = String(input.kind || 'default');
  const categoryLabel = String(input.categoryLabel || 'Мероприятие').trim();
  const venue = input.venueLabel != null && String(input.venueLabel).trim() ? String(input.venueLabel).trim() : null;
  const hint = input.manualHint != null && String(input.manualHint).trim() ? String(input.manualHint).trim() : null;
  const hints = input.catalogHints || {};

  if (openAiUpstreamCircuitOpen) {
    return buildTemplateDescriptionPack({
      title,
      kind,
      categoryLabel,
      venueLabel: venue,
      manualText: hint,
      catalogHints: hints,
    });
  }

  const system = `Ты — главный редактор русской афиши (театр, концерты, спорт). Пишешь только по-русски.

Нужен материал для страницы билета в стиле качественных афиш: без воды, без фраз «уникальная возможность», без «категория мероприятие задаёт рамку», без «детали раскроются на месте».

Структура ответа — один JSON-объект:
{
  "heroKicker": "строка: тип · жанр или характер · возраст (например «Спектакль · Трагедия · 16+»). Если возраст неизвестен — без плюса в конце.",
  "heroSubline": "одна строка: город (если есть во входе), день недели и дата сеанса (если есть во входе), площадка. Если даты нет — «Даты и время — в расписании ниже» + площадка если есть.",
  "heroLead": "2–3 коротких предложения: цепляют внимание, без заголовка «О событии», без повтора heroSubline.",
  "aboutParagraphs": ["абзацы под заголовком «О событии» — 4–7 развёрнутых абзацев, живой стиль"],
  "detailSections": [{"title":"заголовок опциональной секции","paragraphs":["..."]}],
  "meta": [{"label":"Театр-постановщик","value":"..."}, {"label":"Режиссёр","value":"..."}, ...]
}

Правила содержания:
- Театр, опера, балет, мюзикл: опирайся на общеизвестные сведения о произведении (сюжет, темы, почему смотрят). Можно интерпретировать постановку образно, как в театральной аннотации.
- В meta «В ролях», «Режиссёр», «Время» указывай только если это устойчиво известная постановка/труппа и данные не выглядят выдуманными; иначе значение «уточняйте в программе на сайте театра» или опусти строку meta.
- Спорт: интрига матча, атмосфера, без выдуманного счёта, составов, цитат, дат турнира.
- Концерт: жанр, ожидания от шоу; без выдуманного сет-листа и тура.
- Не описывай оплату на сайте, возврат билетов, QR — это добавится отдельным блоком на странице.

Объём: суммарно не меньше 2800 символов в aboutParagraphs + detailSections (без heroLead и meta).

Если чего-то нет во входных данных — не выдумывай конкретику; лучше нейтральная формулировка.`;

  const userPayload = {
    eventTitle: title,
    internalKind: kind,
    suggestedCategory: categoryLabel,
    venueName: venue,
    cityName: hints.cityName ?? null,
    ageLimit: hints.ageLimit ?? null,
    sampleSessionStart: hints.beginSample ?? null,
    optionalOrganizerNote:
      hint && hint.length < 1400 ? hint : hint ? `${hint.slice(0, 1300)}…` : null,
  };

  const parsed = await openaiJsonObject(
    [
      { role: 'system', content: system },
      { role: 'user', content: JSON.stringify(userPayload) },
    ],
    { temperature: 0.7 },
  );

  if (!parsed || typeof parsed !== 'object') throw new Error('OpenAI: нет JSON');
  const rec = /** @type {Record<string, unknown>} */ (parsed);

  const structured = parseStructuredAi(rec, title);

  const tail = getPracticalTailSections(venue);
  /** @type {{ id: string; title: string; paragraphs: string[] }[]} */
  const sections = [
    {
      id: 'ai-about',
      title: 'О событии',
      paragraphs: structured.aboutParagraphs,
    },
    ...structured.detailSections.map((s, i) => ({
      id: `ai-detail-${i + 1}`,
      title: s.title,
      paragraphs: s.paragraphs,
    })),
    ...tail.map((s, i) => ({
      id: `svc-${i + 1}`,
      title: s.title,
      paragraphs: s.paragraphs,
    })),
  ];

  let plainText = sectionsToPlain(sections);
  if (plainText.length < MIN_TOTAL) {
    const extra = await openaiJsonObject(
      [
        {
          role: 'system',
          content:
            'Дополни только художественный текст. JSON {"paragraphs":["..."]} — 3–5 абзацев, ≥900 символов, без про билеты и возврат.',
        },
        {
          role: 'user',
          content: `Событие: «${title}». Уже есть:\n${plainText.slice(0, 1400)}…`,
        },
      ],
      { temperature: 0.55 },
    );
    const paras = Array.isArray(extra.paragraphs)
      ? extra.paragraphs.map((p) => String(p).trim()).filter(Boolean)
      : [];
    if (paras.length) {
      const aboutIdx = sections.findIndex((s) => s.id === 'ai-about');
      if (aboutIdx >= 0) {
        sections[aboutIdx] = {
          ...sections[aboutIdx],
          paragraphs: [...sections[aboutIdx].paragraphs, ...paras],
        };
        plainText = sectionsToPlain(sections);
      }
    }
  }

  return {
    sections,
    plainText,
    totalChars: plainText.length,
    heroKicker: structured.heroKicker,
    heroSubline: structured.heroSubline,
    heroLead: structured.heroLead,
    eventMeta: structured.meta,
  };
}

/**
 * @param {object} opts
 * @param {string} opts.title
 * @param {'sport' | 'football' | 'concert' | 'theater' | 'kids' | 'default'} opts.kind
 * @param {string} opts.categoryLabel
 * @param {string | null | undefined} opts.venueLabel
 * @param {string | null | undefined} opts.manualText
 * @param {{ ageLimit?: string | null, cityName?: string | null, beginSample?: string | null } | undefined} opts.catalogHints
 */
function buildTemplateDescriptionPack(opts) {
  const base = buildEventDescriptionSections({
    title: opts.title,
    kind: opts.kind,
    categoryLabel: opts.categoryLabel,
    venueLabel: opts.venueLabel,
    manualText: opts.manualText,
  });
  const cls = classifyEventTitle(opts.title);
  const heroLead =
    buildProgrammaticHeroLead(opts.title, opts.kind, opts.categoryLabel, opts.venueLabel) ||
    extractHeroLeadFromPack(base, {}) ||
    cls.descriptionBlurb ||
    '';

  const h = opts.catalogHints || {};
  const kickerParts = [];
  const cat = (opts.categoryLabel || cls.categoryLabel || '').trim();
  if (cat && cat !== 'Мероприятие') {
    kickerParts.push(cat);
  }
  const kExtra = kickerExtraFromTitle(opts.title, opts.kind);
  if (kExtra) kickerParts.push(kExtra);
  const ageRaw = h.ageLimit != null ? String(h.ageLimit).trim() : '';
  if (ageRaw) {
    kickerParts.push(ageRaw.includes('+') ? ageRaw : `${ageRaw.replace(/\+$/, '')}+`);
  }
  const heroKicker = kickerParts.length ? kickerParts.join(' · ') : null;

  const heroSubline = formatCatalogHintsSubline(h, opts.venueLabel);

  /** @type {{ label: string; value: string }[]} */
  const eventMeta = [...buildProgrammaticMetaRows(opts.title, opts.kind)];
  if (opts.venueLabel?.trim()) {
    eventMeta.push({ label: 'Площадка', value: opts.venueLabel.trim() });
  }
  if (ageRaw) {
    eventMeta.push({ label: 'Возраст', value: ageRaw.includes('+') ? ageRaw : `${ageRaw.replace(/\+$/, '')}+` });
  }
  if (h.cityName?.trim()) {
    eventMeta.push({ label: 'Город', value: h.cityName.trim() });
  }

  return {
    ...base,
    heroKicker,
    heroSubline,
    heroLead: heroLead || null,
    eventMeta,
  };
}

/**
 * @param {object} opts
 * @param {string} opts.title
 * @param {'sport' | 'football' | 'concert' | 'theater' | 'kids' | 'default'} opts.kind
 * @param {string} opts.categoryLabel
 * @param {string | null | undefined} opts.venueLabel
 * @param {string | null | undefined} opts.manualText
 * @param {{ ageLimit?: string | null, cityName?: string | null, beginSample?: string | null } | undefined} [opts.catalogHints]
 */
export async function buildEventDescriptionPackResolved(opts) {
  const manual = opts.manualText != null ? String(opts.manualText) : '';
  const useAi = isEventDescriptionAiEnabled() && shouldRegenerateDescriptionWithAi(manual);

  if (useAi) {
    try {
      return await generateEventDescriptionWithOpenAI({
        title: opts.title,
        kind: opts.kind,
        categoryLabel: opts.categoryLabel,
        venueLabel: opts.venueLabel,
        manualHint: manual.trim() || null,
        catalogHints: opts.catalogHints ?? null,
      });
    } catch (e) {
      if (!openAiUpstreamCircuitOpen) {
        console.warn('[eventDescriptionAi]', e instanceof Error ? e.message : e);
      }
    }
  }

  return buildTemplateDescriptionPack(opts);
}
