/**
 * Cold Lead Sales Pipeline — логика из n8n workflow:
 * загрузка сайта, извлечение HTML, аудит через OpenAI, извлечение телефона, шаблоны писем, отправка.
 */

import * as cheerio from 'cheerio';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Локальные HTML-шаблоны (без getTemplate UniSender — обход ошибки list_id). */
const LOCAL_TEMPLATE_FILES = {
  high: 'high-potential.html',
  medium: 'medium-potential.html',
  low: 'low-potential.html',
  basic: 'basic-no-audit.html',
};

const LOCAL_TEMPLATE_SUBJECTS = {
  high: 'Эксклюзивное предложение для [%company_name%] — PrimeCoder',
  medium: 'Аудит сайта [%company_name%] — PrimeCoder',
  low: 'Краткий обзор для [%company_name%] — PrimeCoder',
  basic: 'Возможности для роста бизнеса — PrimeCoder',
};

function loadLocalHtmlTemplate(templateKey, vars = {}) {
  const file = LOCAL_TEMPLATE_FILES[templateKey];
  if (!file) return null;
  const templatesDir = path.join(__dirname, '../email-templates/sales');
  const filePath = path.join(templatesDir, file);
  if (!fs.existsSync(filePath)) return null;
  let html = fs.readFileSync(filePath, 'utf-8');
  let subject = LOCAL_TEMPLATE_SUBJECTS[templateKey] || '';
  for (const [key, value] of Object.entries(vars)) {
    const val = value != null ? String(value) : '';
    const re = new RegExp(`\\[%${key}%\\]`, 'g');
    const re2 = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    subject = subject.replace(re, val).replace(re2, val);
    html = html.replace(new RegExp(`\\[%${key}%\\]`, 'g'), val).replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
  }
  return { subject, body: html };
}

/** ID шаблонов писем в UniSender (high, medium, low, basic). */
export const UNISENDER_TEMPLATE_IDS = {
  high: 7403454,
  medium: 7403446,
  low: 7403046,
  basic: 7403430,
};

/** Список шаблонов для админки (превью). */
export const TEMPLATE_LIST = [
  { key: 'high', name: 'Высокий потенциал', templateId: UNISENDER_TEMPLATE_IDS.high },
  { key: 'medium', name: 'Средний потенциал', templateId: UNISENDER_TEMPLATE_IDS.medium },
  { key: 'low', name: 'Низкий потенциал', templateId: UNISENDER_TEMPLATE_IDS.low },
  { key: 'basic', name: 'Без аудита (личная почта)', templateId: UNISENDER_TEMPLATE_IDS.basic },
];

const DEMO_VARS = {
  company_name: 'Пример компании',
  name: 'Иван Петров',
  website: 'https://example.com',
  audit_score: 65,
  audit_summary: 'Краткое резюме аудита: сильный контент, слабое SEO — рекомендуем продвижение.',
  personalized_intro: 'Мы проанализировали ваш сайт и видим потенциал для роста трафика и конверсии.',
  unsubscribe_url: '#',
};

/** Превью шаблона с подставленными демо-значениями (для админки). */
export function getTemplatePreview(templateKey) {
  return loadLocalHtmlTemplate(templateKey, DEMO_VARS);
}

/** Домены личной почты (не корпоративной). */
const PERSONAL_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'yandex.ru', 'ya.ru', 'yandex.com', 'mail.ru', 'bk.ru', 'inbox.ru',
  'list.ru', 'rambler.ru', 'hotmail.com', 'outlook.com', 'live.com', 'yahoo.com', 'icloud.com', 'me.com',
]);

/** Является ли email корпоративным (домен не личный). */
export function isCorporateEmail(email) {
  if (!email || !email.includes('@')) return false;
  const domain = email.split('@')[1]?.toLowerCase().trim();
  return domain && !PERSONAL_EMAIL_DOMAINS.has(domain);
}

/** Извлечь домен из email. При нескольких через запятую — из первого. */
export function getEmailDomain(email) {
  const first = String(email || '').split(',')[0]?.trim();
  if (!first || !first.includes('@')) return '';
  return first.split('@')[1]?.toLowerCase().trim() || '';
}

/** Сайт из корпоративного email: https://domain. Если личный — пустая строка. */
export function deriveWebsiteFromEmail(email) {
  if (!email) return '';
  const domain = getEmailDomain(email);
  if (!domain || PERSONAL_EMAIL_DOMAINS.has(domain)) return '';
  return `https://${domain}`;
}

/** Из списка email через запятую выбрать приоритетный: info@, sales@, marketing@, иначе первый. */
export function pickPrimaryEmail(emailsStr) {
  const list = String(emailsStr || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes('@'));
  const priority = ['info@', 'sales@', 'marketing@'];
  for (const p of priority) {
    const found = list.find((e) => e.startsWith(p));
    if (found) return found;
  }
  return list[0] || '';
}

function getChatUrl() {
  let url = process.env.OPENAI_PROXY_URL || 'https://api.openai.com/v1/chat/completions';
  if (!url.includes('/v1/chat/completions')) url = url.replace(/\/?$/, '') + '/v1/chat/completions';
  return url.replace(/\?.*$/, '');
}

/** Вызов OpenAI с JSON-ответом (модель и temperature для аудита/парсинга). */
export async function callOpenAIStructured(system, user, options = {}) {
  const key = process.env.OPENAI_API_KEY;
  if (!key?.trim() || key.trim().length < 20) return null;

  const model = options.model || 'gpt-4o-mini';
  const temperature = options.temperature ?? 0.2;

  try {
    const res = await fetch(getChatUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key.trim()}`,
      },
      body: JSON.stringify({
        model,
        temperature,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 4096,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[salesPipeline] OpenAI error:', res.status, errText?.slice(0, 300));
      return null;
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    if (!text) {
      console.error('[salesPipeline] OpenAI empty content:', JSON.stringify(data).slice(0, 400));
      return null;
    }
    try {
      return JSON.parse(text);
    } catch (parseErr) {
      console.error('[salesPipeline] OpenAI JSON parse failed:', parseErr.message, 'raw slice:', text.slice(0, 500));
      return null;
    }
  } catch (e) {
    console.error('[salesPipeline] OpenAI request failed:', e.message);
    return null;
  }
}

/** Скачать HTML по URL (до 100KB, таймаут 15s). */
export async function fetchWebsiteHtml(url) {
  if (!url || !url.startsWith('http')) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SalesPipelineBot/1.0)' },
      redirect: 'follow',
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const text = await res.text();
    return text.length <= 100000 ? text : text.slice(0, 100000);
  } catch (e) {
    console.error('[salesPipeline] fetchWebsiteHtml failed:', e.message);
    return null;
  }
}

/** Извлечь title, meta description, h1/h2 из HTML (как в n8n Extract Website Data). */
export function extractWebsiteData(html) {
  if (!html) return { title: '', metaDescription: '', headings: [] };
  const $ = cheerio.load(html);
  const title = $('title').text().trim() || '';
  const metaDesc = $('meta[name="description"]').attr('content')?.trim() || '';
  const headings = [];
  $('h1, h2').each((_, el) => {
    const t = $(el).text().trim();
    if (t) headings.push(t);
  });
  return { title, metaDescription: metaDesc, headings };
}

/** Аудит сайта через OpenAI. Оценка 0–100 по четырём критериям; рекомендации (редизайн, SEO, ИИ-продвижение, e-commerce) привязаны к логике. */
export async function runWebsiteAudit(companyName, website, websiteData) {
  const system = `Ты эксперт по аудиту сайтов и цифровому маркетингу. Проанализируй данные сайта и верни строго JSON.

Правила оценки (каждый критерий 0–25 баллов, итог audit_score = сумма четырёх, 0–100):
1) design_modernity_score (0–25): современность дизайна, актуальность верстки, мобильная адаптация. Если дизайн устаревший или плохо смотрится — ставь низкий балл (тогда мы предложим редизайн).
2) seo_score (0–25): наличие и качество title, meta description, заголовков, семантика. Если SEO слабое или отсутствует — низкий балл (предложим SEO).
3) ai_readiness_score (0–25): есть ли структурированные данные для ИИ-выдачи (разметка, понятные блоки, мета-теги, контент для поисковых ИИ). Если сайт не готов к ИИ-поиску — низкий балл (предложим ИИ-продвижение).
4) conversion_tech_score (0–25): конверсия, скорость, техсостояние, удобство форм и навигации.

Дополнительно:
- is_ecommerce (boolean): является ли сайт интернет-магазином или каталогом с товарами/услугами для заказа.
- recommendations (array of strings): включи только теги по правилам: если design_modernity_score < 13 — добавь "redesign"; если seo_score < 13 — "seo"; если ai_readiness_score < 13 — "ai_promotion"; если is_ecommerce === true и есть потенциал — "ecommerce_services". Не придумывай другие теги.
- key_issues (array of strings): конкретные проблемы по сайту.
- opportunities (array of strings): возможности роста.
- business_potential ("high" | "medium" | "low"): high если audit_score >= 65 и есть возможности; low если audit_score < 40; иначе medium.
- recommended_approach (string): краткое резюме для письма, обязательно упомяни предложения по тегам из recommendations (редизайн, SEO, ИИ-продвижение, доработки для e-commerce — только то, что есть в recommendations).
- personalized_intro (string): персонализированное вступление для письма, с привязкой к рекомендациям (например: «У вас сильный контент, но устаревший дизайн и слабое SEO — мы можем предложить редизайн и продвижение.»).

Верни JSON с полями: design_modernity_score, seo_score, ai_readiness_score, conversion_tech_score, audit_score (сумма четырёх), is_ecommerce, recommendations, key_issues, opportunities, business_potential, recommended_approach, personalized_intro.`;

  const user = `Компания: ${companyName}, Сайт: ${website}\nДанные сайта: ${JSON.stringify(websiteData)}`;
  const out = await callOpenAIStructured(system, user, { model: 'gpt-4o', temperature: 0.2 });
  if (!out) {
    console.warn('[salesPipeline] runWebsiteAudit: OpenAI returned null', { companyName, website, websiteDataKeys: Object.keys(websiteData || {}) });
    return null;
  }

  const d = (v) => (typeof v === 'number' && v >= 0 && v <= 25 ? Math.round(v) : 0);
  const design = d(out.design_modernity_score);
  const seo = d(out.seo_score);
  const ai = d(out.ai_readiness_score);
  const conv = d(out.conversion_tech_score);
  const auditScore = Math.min(100, Math.max(0, design + seo + ai + conv));
  const recommendations = Array.isArray(out.recommendations)
    ? out.recommendations.filter((r) => ['redesign', 'seo', 'ai_promotion', 'ecommerce_services'].includes(String(r)))
    : [];

  return {
    design_modernity_score: design,
    seo_score: seo,
    ai_readiness_score: ai,
    conversion_tech_score: conv,
    audit_score: typeof out.audit_score === 'number' ? Math.max(0, Math.min(100, Math.round(out.audit_score))) : auditScore,
    is_ecommerce: Boolean(out.is_ecommerce),
    recommendations,
    key_issues: Array.isArray(out.key_issues) ? out.key_issues : [],
    opportunities: Array.isArray(out.opportunities) ? out.opportunities : [],
    business_potential: ['high', 'medium', 'low'].includes(out.business_potential) ? out.business_potential : (auditScore >= 65 ? 'high' : auditScore < 40 ? 'low' : 'medium'),
    recommended_approach: String(out.recommended_approach || ''),
    personalized_intro: String(out.personalized_intro || ''),
  };
}

/** Извлечь телефон из текста страницы через OpenAI. */
export async function extractPhoneFromHtml(html) {
  if (!html) return '';
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 15000);
  const system = 'Верни JSON с одним полем: phone (строка — найденный номер телефона на сайте в любом формате; если не найден — пустая строка).';
  const out = await callOpenAIStructured(system, `Текст страницы:\n${text}`, { temperature: 0.1 });
  return (out?.phone && String(out.phone).trim()) || '';
}

/** Нормализация телефона в +7XXXXXXXXXX. */
export function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  let normalized = digits;
  if (normalized.startsWith('8') && normalized.length === 11) normalized = '7' + normalized.slice(1);
  else if (normalized.startsWith('9') && normalized.length === 10) normalized = '7' + normalized;
  else if (!normalized.startsWith('7') || normalized.length !== 11) normalized = normalized || '';
  return normalized.length === 11 ? '+' + normalized : normalized;
}

/** Выбор шаблона письма по business_potential (как в n8n Template High/Medium/Low). */
export function getEmailTemplate(potential, lead, auditSummary) {
  const name = lead.company_name || 'Компания';
  const site = lead.website || '';
  const summary = auditSummary?.personalized_intro || auditSummary?.recommended_approach || JSON.stringify(auditSummary || {});

  const templates = {
    high: {
      subject: `Эксклюзивное предложение для ${name}`,
      body: `Здравствуйте!\n\nМы провели аудит вашего сайта ${site} и обнаружили значительный потенциал для роста.\n\n${summary}\n\nГотовы обсудить, как мы можем помочь вам реализовать этот потенциал? Давайте назначим встречу.\n\nС уважением`,
      templateId: 'high_potential',
    },
    medium: {
      subject: `Аудит сайта ${name}`,
      body: `Здравствуйте!\n\nМы проанализировали ваш сайт ${site} и подготовили несколько рекомендаций.\n\n${summary}\n\nБудем рады обсудить возможности улучшения.\n\nС уважением`,
      templateId: 'medium_potential',
    },
    low: {
      subject: 'Краткий обзор вашего сайта',
      body: `Здравствуйте!\n\nМы провели быстрый анализ ${site}.\n\n${summary}\n\nЕсли вас заинтересует более детальный аудит, дайте знать.\n\nС уважением`,
      templateId: 'low_potential',
    },
    basic: {
      subject: 'Возможности для роста бизнеса',
      body: `Здравствуйте!\n\nМы помогаем компаниям внедрять AI-решения и автоматизацию для роста бизнеса: интеграция AI-инструментов, автоматизация процессов, увеличение конверсии.\n\nБудем рады обсудить возможности. Напишите, когда удобно созвониться.\n\nС уважением`,
      templateId: 'basic_no_audit',
    },
  };
  return templates[potential] || templates.medium;
}

/** Получить шаблон письма из UniSender по ID (subject + body). POST, чтобы api_key не попадал в URL (рекомендация UniSender). */
export async function getUniSenderTemplate(templateId) {
  const apiKey = process.env.UNISENDER_API_KEY;
  if (!apiKey) return null;
  try {
    const params = new URLSearchParams();
    params.set('format', 'json');
    params.set('api_key', apiKey);
    params.set('template_id', String(templateId));
    const res = await fetch('https://api.unisender.com/ru/api/getTemplate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return null;
    }
    if (data.error) {
      console.error('[salesPipeline] getUniSenderTemplate error:', data.code || '', data.error?.slice(0, 200));
      return null;
    }
    const result = data?.result;
    if (!result?.body) return null;
    return { subject: result.subject || '', body: result.body };
  } catch (e) {
    console.error('[salesPipeline] getUniSenderTemplate failed:', e.message);
    return null;
  }
}

/** Подставить переменные в текст шаблона ([%var%] и {{var}}). */
function fillTemplatePlaceholders(text, vars = {}) {
  if (!text) return text;
  let out = text;
  for (const [key, value] of Object.entries(vars)) {
    const val = value != null ? String(value) : '';
    out = out.replace(new RegExp(`\\[%${key}%\\]`, 'g'), val);
    out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
  }
  return out;
}

/** Добавить контакт в список UniSender (subscribe). double_optin=3 — без письма подтверждения, сразу в список. */
export async function subscribeUniSenderContact(email, listId, fields = {}) {
  const apiKey = process.env.UNISENDER_API_KEY;
  if (!apiKey || !listId) return { ok: false, reason: 'no_config' };
  const listIdStr = String(listId).trim();
  if (!listIdStr) return { ok: false, reason: 'no_list_id' };
  try {
    const params = new URLSearchParams();
    params.set('format', 'json');
    params.set('api_key', apiKey);
    params.set('list_ids', listIdStr);
    params.set('fields[email]', String(email || '').trim());
    params.set('double_optin', '3');
    if (fields.Name) params.set('fields[Name]', String(fields.Name).slice(0, 255));
    if (fields.Name === undefined && fields.name) params.set('fields[Name]', String(fields.name).slice(0, 255));
    const res = await fetch('https://api.unisender.com/ru/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error('[salesPipeline] subscribe response not JSON:', text?.slice(0, 150));
      return { ok: false, reason: 'subscribe_response_not_json' };
    }
    if (data.error) {
      const reason = data.code ? `${data.code}: ${data.error}` : data.error;
      console.error('[salesPipeline] UniSender subscribe error:', reason);
      return { ok: false, reason };
    }
    return { ok: true };
  } catch (e) {
    console.error('[salesPipeline] subscribe failed:', e.message);
    return { ok: false, reason: e.message };
  }
}

/**
 * Создать письмо в UniSender (createEmailMessage). Нужно для рассылки через createCampaign, чтобы письмо попало в историю и аналитику.
 */
async function createEmailMessageUniSender(senderName, senderEmail, subject, body, listId) {
  const apiKey = process.env.UNISENDER_API_KEY;
  if (!apiKey || !listId) return { ok: false, reason: 'no_config' };
  try {
    const params = new URLSearchParams();
    params.set('format', 'json');
    params.set('api_key', apiKey);
    params.set('sender_name', String(senderName || '').slice(0, 255));
    params.set('sender_email', String(senderEmail || '').trim());
    params.set('subject', String(subject || '').slice(0, 500));
    params.set('body', String(body || '').slice(0, 8 * 1024 * 1024)); // макс 8 МБ
    params.set('list_id', String(listId).trim());
    params.set('lang', 'ru');
    params.set('generate_text', '1');
    const res = await fetch('https://api.unisender.com/ru/api/createEmailMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error('[salesPipeline] createEmailMessage response not JSON:', text?.slice(0, 200));
      return { ok: false, reason: 'createEmailMessage_response_not_json' };
    }
    if (data.error) {
      const reason = data.code ? `${data.code}: ${data.error}` : data.error;
      return { ok: false, reason };
    }
    const messageId = data?.result?.message_id;
    if (!messageId) return { ok: false, reason: 'no_message_id' };
    return { ok: true, message_id: messageId };
  } catch (e) {
    console.error('[salesPipeline] createEmailMessage failed:', e.message);
    return { ok: false, reason: e.message };
  }
}

/**
 * Запустить рассылку по созданному письму (createCampaign). Письмо появится в «Рассылки → История» с аналитикой доставки, прочтений, переходов.
 */
async function createCampaignUniSender(messageId, contactsEmail, trackRead = 1, trackLinks = 1) {
  const apiKey = process.env.UNISENDER_API_KEY;
  if (!apiKey) return { ok: false, reason: 'no_config' };
  try {
    const params = new URLSearchParams();
    params.set('format', 'json');
    params.set('api_key', apiKey);
    params.set('message_id', String(messageId));
    params.set('contacts', String(contactsEmail || '').trim());
    params.set('track_read', trackRead ? '1' : '0');
    params.set('track_links', trackLinks ? '1' : '0');
    const res = await fetch('https://api.unisender.com/ru/api/createCampaign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error('[salesPipeline] createCampaign response not JSON:', text?.slice(0, 200));
      return { ok: false, reason: 'createCampaign_response_not_json' };
    }
    if (data.error) {
      const reason = data.code ? `${data.code}: ${data.error}` : data.error;
      return { ok: false, reason };
    }
    const campaignId = data?.result?.campaign_id;
    const status = data?.result?.status;
    return { ok: true, campaign_id: campaignId, status: status || 'scheduled' };
  } catch (e) {
    console.error('[salesPipeline] createCampaign failed:', e.message);
    return { ok: false, reason: e.message };
  }
}

/**
 * Отправить письмо через createEmailMessage + createCampaign, чтобы оно отображалось в UniSender в «Рассылки → История» с аналитикой доставки/прочтений/переходов.
 * При ошибке (лимит API, и т.д.) откатываемся на sendEmail.
 */
export async function sendUniSenderEmailViaCampaign(toEmail, subject, body, senderName, senderEmail) {
  const listId = (process.env.UNISENDER_LIST_ID || '').trim();
  if (!listId) return { ok: false, reason: 'no_list_id' };
  const name = senderName || process.env.SENDER_NAME || 'Команда';
  const from = senderEmail || process.env.SENDER_EMAIL;
  if (!from) return { ok: false, reason: 'no_sender' };

  const msg = await createEmailMessageUniSender(name, from, subject, body, listId);
  if (!msg.ok) return msg;

  const camp = await createCampaignUniSender(msg.message_id, toEmail, 1, 1);
  if (!camp.ok) {
    console.warn('[salesPipeline] createCampaign failed, fallback to sendEmail:', camp.reason);
    return sendUniSenderEmail(toEmail, subject, body, senderName, senderEmail);
  }
  return { ok: true, campaign_id: camp.campaign_id, status: camp.status };
}

/**
 * Отправить email через UniSender по шаблону из кабинета (getTemplate): загружаем шаблон по ID, подставляем переменные, добавляем контакт в список (subscribe), отправляем через createCampaign (видно в истории UniSender и аналитике), при ошибке — sendEmail.
 * vars: company_name, website, audit_score, audit_summary, personalized_intro, unsubscribe_url и т.д.
 */
export async function sendUniSenderEmailByTemplate(toEmail, templateKey, senderName, senderEmail, vars = {}) {
  const templateId = UNISENDER_TEMPLATE_IDS[templateKey];
  if (!templateId) return { ok: false, reason: 'unknown_template_key' };
  const tpl = await getUniSenderTemplate(templateId);
  if (!tpl) return { ok: false, reason: 'template_fetch_failed' };
  const subject = fillTemplatePlaceholders(tpl.subject, vars);
  const body = fillTemplatePlaceholders(tpl.body, vars);
  const listId = (process.env.UNISENDER_LIST_ID || '').trim();
  if (listId) {
    const sub = await subscribeUniSenderContact(toEmail, listId, { Name: vars.company_name || vars.name || '' });
    if (!sub.ok) console.warn('[salesPipeline] subscribe before send failed (continuing):', sub.reason);
  }
  if (!listId) return sendUniSenderEmail(toEmail, subject, body, senderName, senderEmail);
  return sendUniSenderEmailViaCampaign(toEmail, subject, body, senderName, senderEmail);
}

/** Отправка через UniSender Telegram (если есть api_key и channel_id и телефон). Параметры в теле POST, чтобы длинный text не резал URL. */
export async function sendUniSenderTelegram(phone, text) {
  const apiKey = process.env.UNISENDER_API_KEY;
  const channelId = process.env.UNISENDER_CHANNEL_ID;
  if (!apiKey || !channelId) return { ok: false, reason: 'no_config' };
  try {
    const params = new URLSearchParams();
    params.set('format', 'json');
    params.set('api_key', apiKey);
    params.set('channel_id', channelId);
    params.set('phone', String(phone).trim());
    params.set('text', String(text).slice(0, 4000));
    const res = await fetch('https://api.unisender.com/ru/api/sendTelegramMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const responseText = await res.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      const snippet = (responseText || '').slice(0, 300).replace(/\s+/g, ' ');
      console.error('[salesPipeline] UniSender Telegram: status=', res.status, 'response not JSON, length=', responseText?.length, 'body:', snippet);
      const shortReason = res.status !== 200 ? `HTTP ${res.status}` : 'ответ не JSON';
      return { ok: false, reason: `Telegram API: ${shortReason}. В логах сервера (pm2 logs) — полный ответ.` };
    }
    if (data.error) {
      const reason = data.code ? `${data.code}: ${data.error}` : data.error;
      console.error('[salesPipeline] UniSender Telegram error:', reason, 'phone=', (phone || '').slice(-4));
      return { ok: false, reason };
    }
    return { ok: true };
  } catch (e) {
    console.error('[salesPipeline] UniSender Telegram request failed:', e.message);
    return { ok: false, reason: e.message };
  }
}

/** Отправка email через UniSender sendEmail. Если задан UNISENDER_LIST_ID — передаём list_id; при ошибке "Invalid setting 'list_id'" повторяем без list_id. */
export async function sendUniSenderEmail(toEmail, subject, body, senderName, senderEmail) {
  const apiKey = process.env.UNISENDER_API_KEY;
  if (!apiKey) return { ok: false, reason: 'no_config' };
  const name = senderName || process.env.SENDER_NAME || 'Команда';
  const from = senderEmail || process.env.SENDER_EMAIL;
  if (!from) return { ok: false, reason: 'no_sender' };
  const listId = (process.env.UNISENDER_LIST_ID || '').trim();

  function buildBody(withListId) {
    let s =
      'format=json' +
      '&api_key=' + encodeURIComponent(apiKey) +
      '&email=' + encodeURIComponent(toEmail) +
      '&sender_name=' + encodeURIComponent(name) +
      '&sender_email=' + encodeURIComponent(from) +
      '&subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body);
    if (withListId && listId) s += '&list_id=' + encodeURIComponent(listId);
    return s;
  }

  async function doSend(bodyStr) {
    const res = await fetch('https://api.unisender.com/ru/api/sendEmail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: bodyStr,
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error('[salesPipeline] UniSender response not JSON:', text.slice(0, 200));
      return { ok: false, reason: 'Ответ API не JSON (возможно ошибка сервера)' };
    }
    if (data.error) {
      const reason = data.code ? `${data.code}: ${data.error}` : data.error;
      return { ok: false, reason };
    }
    return { ok: true };
  }

  try {
    let result = await doSend(buildBody(true));
    if (!result.ok && result.reason && String(result.reason).includes('list_id') && listId) {
      console.warn('[salesPipeline] sendEmail с list_id не прошёл, повтор без list_id:', result.reason);
      result = await doSend(buildBody(false));
    }
    if (!result.ok) console.error('[salesPipeline] UniSender Email error:', result.reason);
    return result;
  } catch (e) {
    console.error('[salesPipeline] UniSender Email request failed:', e.message);
    return { ok: false, reason: e.message };
  }
}

/** Анализ ответа клиента (как Response Analysis Agent в n8n). */
export async function analyzeClientResponse(emailText) {
  const system = `Ты менеджер по продажам. Проанализируй ответ клиента на наше письмо с аудитом. Верни строго JSON:
is_qualified (boolean),
interest_level ("high" | "medium" | "low"),
meeting_ready (boolean),
suggested_response (string),
next_action ("ready_to_meet" | "no_interest" | "follow_up_later" | "questions").`;

  const out = await callOpenAIStructured(system, `Ответ клиента:\n${emailText}`, { model: 'gpt-4o', temperature: 0.2 });
  if (!out) return null;
  return {
    is_qualified: Boolean(out.is_qualified),
    interest_level: ['high', 'medium', 'low'].includes(out.interest_level) ? out.interest_level : 'medium',
    meeting_ready: Boolean(out.meeting_ready),
    suggested_response: String(out.suggested_response || ''),
    next_action: ['ready_to_meet', 'no_interest', 'follow_up_later', 'questions'].includes(out.next_action) ? out.next_action : 'follow_up_later',
  };
}

/**
 * Контекст для менеджера переписки: клиент + услуги/цены (только из контекста — AI не выдумывает цифры).
 * @typedef {Object} CorrespondenceContext
 * @property {string} clientName
 * @property {string} company
 * @property {object} [auditSummary] — результат аудита сайта (если был)
 * @property {Array<{title: string, priceFormatted: string}>} [services] — услуги с ценами в рублях (например из products)
 */

/**
 * Полноценный менеджер переписки: анализ по смыслу, предложение услуги, апсейл, корректные цены и даты.
 * Определяет намерение (встреча/предложение/интерес/отказ), формирует черновик ответа для info@ или Telegram.
 */
export async function analyzeClientResponseWithProposal(context, emailText) {
  const { clientName = '', company = '', auditSummary = {}, services = [] } = context;
  const servicesBlock =
    services.length > 0
      ? `\nУслуги и цены (указывать ТОЛЬКО эти, не выдумывать):\n${services.map((s) => `- ${s.title}: ${s.priceFormatted}`).join('\n')}`
      : '\nКонкретных цен в базе нет — в предложении не указывай суммы, пиши «обсуждается индивидуально» или «назначим созвон и рассчитаем под вашу задачу».';

  const system = `Ты менеджер по продажам PrimeCoder. Общение с клиентами ведётся с почты info@prime-coder.ru или через Telegram. Твоя задача: понять ответ по смыслу (не по одной фразе), предложить нужную услугу, при необходимости апсейл, не ошибиться в стоимости и датах.

Правила:
- Определяй намерение по смыслу: «давайте обсудим», «интересует», «напишите когда удобно», «готовы рассмотреть» и т.п. = готовность к встрече/обсуждению (meeting_ready: true).
- Цены и даты указывай ТОЛЬКО из переданного контекста. Если контекста нет — не называй цифры.
- Черновик ответа (proposal_draft) — готовое письмо/сообщение: приветствие, суть предложения, призыв к действию (созвон/встреча). Тон: экспертный, дружелюбный, без воды.
- Если у клиента явный интерес — предложи подходящую услугу из списка и при необходимости доп. опции (апсейл).
${servicesBlock}

Верни строго JSON:
intent ("wants_meeting" | "wants_offer" | "interested" | "no_interest" | "follow_up_later" | "questions"),
meeting_ready (boolean — по смыслу готов к встрече/созвону),
interest_level ("high" | "medium" | "low"),
is_qualified (boolean),
suggested_response (краткая рекомендация менеджеру: что сделать),
proposal_draft (string — полный черновик ответа клиенту для отправки с info@ или в Telegram),
suggested_services (array of strings — какие услуги из контекста предложить, или пустой массив),
upsell_note (string — что предложить дополнительно, или пустая строка),
next_action ("ready_to_meet" | "no_interest" | "follow_up_later" | "questions").`;

  const userContent = `Клиент: ${clientName || '—'}, компания: ${company || '—'}.
${auditSummary && Object.keys(auditSummary).length ? `Кратко из аудита: ${JSON.stringify(auditSummary).slice(0, 500)}` : ''}

Ответ клиента:
${emailText}`;

  const out = await callOpenAIStructured(system, userContent, { model: 'gpt-4o', temperature: 0.25 });
  if (!out) return null;

  const nextAction = ['ready_to_meet', 'no_interest', 'follow_up_later', 'questions'].includes(out.next_action) ? out.next_action : 'follow_up_later';
  const meetingReady = Boolean(out.meeting_ready) || nextAction === 'ready_to_meet';

  return {
    intent: ['wants_meeting', 'wants_offer', 'interested', 'no_interest', 'follow_up_later', 'questions'].includes(out.intent) ? out.intent : 'interested',
    meeting_ready: meetingReady,
    interest_level: ['high', 'medium', 'low'].includes(out.interest_level) ? out.interest_level : 'medium',
    is_qualified: Boolean(out.is_qualified),
    suggested_response: String(out.suggested_response || ''),
    proposal_draft: String(out.proposal_draft || ''),
    suggested_services: Array.isArray(out.suggested_services) ? out.suggested_services : [],
    upsell_note: String(out.upsell_note || ''),
    next_action: nextAction,
  };
}
