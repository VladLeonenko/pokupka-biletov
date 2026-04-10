/**
 * Хелперы для сборки карточек каталога 2026 (content_json под ProductPage).
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Полный FAQ из Google Sheets: slug → [ [вопрос, ответ], … ]. Файл генерируется build-catalog-2026-faq-json.py */
let catalog2026FaqBySlug;
function getCatalog2026FaqMap() {
  if (!catalog2026FaqBySlug) {
    try {
      catalog2026FaqBySlug = JSON.parse(
        readFileSync(join(__dirname, 'catalog-2026-faq.json'), 'utf8')
      );
    } catch {
      catalog2026FaqBySlug = {};
    }
  }
  return catalog2026FaqBySlug;
}

export function tariffsFromRows(rows) {
  const names = ['Старт', 'Малый бизнес', 'Prime'];
  const ids = ['start', 'business', 'premium'];
  return names.map((name, i) => ({
    id: ids[i],
    name,
    price: rows[0][i + 1],
    subtitle: '',
    description: '',
    featuresLeft: rows.slice(1).map((r) => `${r[0]}: ${r[i + 1]}`),
    featuresRight: [],
  }));
}

export function stepsFromBlock(multiline) {
  const lines = multiline.trim().split('\n').map((l) => l.trim()).filter(Boolean);
  return lines.map((line) => {
    const d = line.indexOf(' — ');
    if (d === -1) return { title: line, description: '' };
    return { title: line.slice(0, d).trim(), description: line.slice(d + 3).trim() };
  });
}

export function faqPairs(items) {
  return items.map(([q, a]) => ({ question: q, answer: a }));
}

export function buildProduct(slug, cfg) {
  const {
    title,
    summary,
    description_html,
    full_description_html,
    price_rub,
    price_period,
    features,
    tags,
    meta_title,
    meta_description,
    meta_keywords,
    descTitle,
    descText,
    tariffRows,
    stepsBlock,
    statsItems,
    faqItems,
  } = cfg;

  const faqMap = getCatalog2026FaqMap();
  const resolvedFaq = slug in faqMap ? faqMap[slug] : faqItems;

  return {
    slug,
    title,
    summary,
    description_html: description_html || `<p>${summary}</p>`,
    full_description_html: full_description_html || '',
    price_rub,
    currency: 'RUB',
    price_period: price_period || 'one_time',
    features: features || [],
    tags: tags || [],
    meta_title,
    meta_description,
    meta_keywords: meta_keywords || '',
    content_json: {
      description: { title: descTitle || '', text: descText || summary },
      priceSection: { title: 'Тарифы и сроки', tariffs: tariffsFromRows(tariffRows) },
      workSteps: { title: 'Этапы работ', steps: stepsFromBlock(stepsBlock) },
      stats: { title: 'Результаты наших клиентов', items: statsItems },
      faq: { title: 'Часто задаваемые вопросы', items: faqPairs(resolvedFaq) },
    },
  };
}
