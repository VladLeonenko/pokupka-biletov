#!/usr/bin/env node
/**
 * Парсит txt-файл с продающими блоками и генерирует JSON для импорта.
 * Использование: node scripts/parse-products-txt.js <path-to-txt>
 * Вывод: data/products-import.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { toSlug } from './transliterate-slug.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function extractPrice(str) {
  const m = str.match(/(\d[\d\s]*)\s*(?:₽|руб)/);
  if (!m) return null;
  return parseInt(m[1].replace(/\s/g, ''), 10);
}

function extractTariffPrice(str) {
  const m = str.match(/(\d[\d\s]*)\s*₽/);
  return m ? parseInt(m[1].replace(/\s/g, ''), 10) : null;
}

function parseBlock(text) {
  const lines = text.split('\n').map((l) => l.trim());
  const result = { raw: {} };

  // Название: первая строка "Продающий блок для X" — берём X и приводим к именительному падежу
  const TITLE_FIX = {
    'AI продвижения': 'AI продвижение', 'SEO-продвижения': 'SEO-продвижение', 'техподдержки': 'Техподдержка',
    'скорости сайта': 'Скорость сайта', 'реклама-аудита': 'Реклама-аудит', 'WP-миграции': 'WP-миграция',
    'чат-ботов': 'Чат-боты', 'контекстной рекламы': 'Контекстная реклама', 'мобильного приложения': 'Мобильное приложение',
    'SEO-аудита': 'SEO-аудит',
  };
  const firstLine = text.split('\n')[0] || '';
  const nameMatch = firstLine.match(/Продающий блок для\s+(.+)/);
  let rawTitle = nameMatch ? nameMatch[1].trim() : 'Услуга';
  result.title = TITLE_FIX[rawTitle] || rawTitle;
  result.slug = toSlug(result.title);

  // H1 и Описание
  const h1Match = text.match(/H1:\s*(.+?)(?=\n(?:Описание|Ключевые|$))/s);
  const descMatch = text.match(/Описание:\s*(.+?)(?=\nКлючевые особенности:|$)/s);
  if (h1Match) result.raw.h1 = h1Match[1].trim().replace(/\s+/g, ' ');
  if (descMatch) result.raw.description = descMatch[1].trim().replace(/\s+/g, ' ');

  // Ключевые особенности (строки с *)
  const features = [];
  let inFeatures = false;
  for (const line of lines) {
    if (line.startsWith('Ключевые особенности:')) {
      inFeatures = true;
      continue;
    }
    if (inFeatures && (line.startsWith('*') || line.startsWith('•'))) {
      features.push(line.replace(/^[\*•]\s*/, '').trim());
    } else if (inFeatures && line && !line.startsWith('*') && !line.startsWith('•') && !line.match(/^\d+\./)) {
      break;
    }
  }
  result.features = features.filter(Boolean);

  // Тарифы: СТАРТ/START, МАЛЫЙ БИЗНЕС, PRIME
  const tariffs = [];
  const tariffRegex = /(?:СТАРТ|START)\s*—\s*([^\n]+)/i;
  const tariffRegex2 = /МАЛЫЙ БИЗНЕС\s*—\s*([^\n]+)/i;
  const tariffRegex3 = /PRIME\s*—\s*([^\n]+)/i;

  const fmtPrice = (n) => (n ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '');

  const parseTariffBlock = (blockText) => {
    const features = [];
    const lines = blockText.split('\n');
    let desc = '';
    let section = '';
    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;
      if (t.startsWith('•') || t.startsWith('*')) {
        features.push(t.replace(/^[•*]\s*/, '').trim());
      } else if (t.endsWith(':') && t.length < 30) {
        section = t.replace(/:$/, '').trim();
      } else if (!/^(СТАРТ|START|МАЛЫЙ БИЗНЕС|PRIME|text)$/i.test(t) && features.length === 0 && desc.length < 200) {
        desc = (desc ? desc + ' ' : '') + t;
      }
    }
    return { description: desc.trim().slice(0, 150), features };
  };

  const addTariff = (id, name, match) => {
    if (!match) return;
    const line = match[1];
    const priceMatch = line.match(/(\d[\d\s]*)\s*₽(?:\s*[•\/]\s*[\d\w\s]+)?/);
    const priceVal = priceMatch ? parseInt(priceMatch[1].replace(/\s/g, ''), 10) : null;
    const price = priceVal ? `${fmtPrice(priceVal)} ₽` : line.split('—')[1]?.trim() || '';
    const afterPrice = line.replace(/^\s*\d[\d\s]*\s*₽\s*[•\/]?\s*/, '').trim();
    const daysMatch = line.match(/(\d+)\s*(?:дн|день|дней)/i) || line.match(/(\d+)\s*дней/);
    const days = daysMatch ? daysMatch[1] : '';
    const blockRaw = text.split(match[0])[1]?.split(/(?=МАЛЫЙ БИЗНЕС\s*—|PRIME\s*—|ВСЕ ТАРИФЫ ВКЛЮЧАЮТ|Этапы работ|Детальные этапы|Ключевые показатели)/)[0] || '';
    const { description: blockDesc, features: blockFeatures } = parseTariffBlock(blockRaw);
    const descLines = blockRaw.split('\n').filter((l) => l.trim() && !l.startsWith('•') && !l.match(/^(Чат-бот|Контент|Конверсия|Интеграции|Часы|Посты|Видео|Кабинеты|Ошибки|AI модули|Прогноз|Рекомендаций|ROI план):/)).slice(0, 3);
    const desc = blockDesc || descLines.map((l) => l.replace(/:$/, '').trim()).filter((l) => l.length > 3 && l.length < 120).join(' ').slice(0, 120);

    const half = Math.ceil(blockFeatures.length / 2);
    tariffs.push({
      id,
      name,
      subtitle: days ? `${afterPrice.split(/[•\/]/)[0]?.trim() || ''} • ${days} дней` : afterPrice.slice(0, 50),
      price: price || line,
      description: desc || afterPrice.slice(0, 100),
      featuresLeft: blockFeatures.length <= 8 ? blockFeatures : blockFeatures.slice(0, half),
      featuresRight: blockFeatures.length > 8 ? blockFeatures.slice(half) : [],
    });
  };

  const startMatch = text.match(tariffRegex);
  const bizMatch = text.match(tariffRegex2);
  const primeMatch = text.match(tariffRegex3);
  addTariff('start', 'СТАРТ', startMatch);
  addTariff('business', 'МАЛЫЙ БИЗНЕС', bizMatch);
  addTariff('prime', 'PRIME', primeMatch);

  // Для тарифов /мес
  if (tariffs.length === 0) {
    const altStart = text.match(/(?:СТАРТ|START)\s*—\s*([^\n]+)/i);
    const altBiz = text.match(/МАЛЫЙ БИЗНЕС\s*—\s*([^\n]+)/i);
    const altPrime = text.match(/PRIME\s*—\s*([^\n]+)/i);
    addTariff('start', 'СТАРТ', altStart);
    addTariff('business', 'МАЛЫЙ БИЗНЕС', altBiz);
    addTariff('prime', 'PRIME', altPrime);
  }
  result.raw.tariffs = tariffs;

  // Базовая цена (из первого тарифа или заголовка)
  const headerPrice = text.match(/(?:от|от)\s+([\d\s]+)\s*(?:₽|руб)/);
  result.price_rub = headerPrice ? parseInt(headerPrice[1].replace(/\s/g, ''), 10) : (extractTariffPrice(tariffs[0]?.price) || 0);

  // Period: первый тариф (СТАРТ/START) содержит ₽/мес
  const firstTariffBlock = text.match(/(?:СТАРТ|START)\s*—\s*([^\n]+)/i);
  const hasMonthly = firstTariffBlock && /₽\/мес/.test(firstTariffBlock[1]);
  result.price_period = hasMonthly ? 'monthly' : 'one_time';

  // Этапы работ
  const steps = [];
  const stepLines = text.split(/(?=\d+\.\s+[А-Яа-яA-Za-z])/);
  for (const blk of stepLines) {
    const numMatch = blk.match(/^(\d+)\.\s+([^\n(]+?)(?:\s*\(\d+\s*дн|$)/);
    if (numMatch) {
      const desc = blk
        .replace(numMatch[0], '')
        .split('\n')
        .filter((l) => l.trim().startsWith('•'))
        .map((l) => l.replace(/^•\s*/, ''))
        .join('\n');
      steps.push({ number: String(numMatch[1]), title: numMatch[2].trim(), description: desc.trim() });
    }
  }
  result.raw.workSteps = steps.slice(0, 10);

  // Ключевые показатели (категории)
  const statsMatch = text.match(/Ключевые показатели[^\n]*(?:\n\n)?([\s\S]*?)(?=Рекомендуемые доп|SEO настройки|Часто задаваемые|$)/);
  const statsLines = statsMatch ? statsMatch[1].trim().split('\n') : [];
  const categories = [];
  let curCat = null;
  for (const l of statsLines) {
    if (l.match(/^[A-Za-zА-Яа-я][^•]+$/) && !l.trim().startsWith('•')) {
      curCat = { title: l.trim(), bullets: [] };
      categories.push(curCat);
    } else if (curCat && l.trim().startsWith('•')) {
      curCat.bullets.push(l.replace(/^•\s*/, '').trim());
    }
  }
  result.raw.stats = categories.filter((c) => c.bullets.length > 0);

  // FAQ: Q без таба, A с табом. Следующий Q тоже с табом — распознаём по "?"
  const faqSection = text.match(/Часто задаваемые вопросы[\s\S]*?(?=Продающий блок для|$)/);
  const faqItems = [];
  if (faqSection) {
    const content = faqSection[0].replace(/^Часто задаваемые вопросы[^\n]*\n+/i, '').trim();
    const lines = content.split('\n');
    let curQ = '';
    let curA = [];
    for (const line of lines) {
      const trimmed = line.replace(/^\s+/, '').trim();
      if (!trimmed) continue;
      const hasIndent = line.startsWith('\t') || /^\s{2,}/.test(line);
      if (!hasIndent) {
        if (curQ && curA.length) faqItems.push({ question: curQ.trim(), answer: curA.join(' ').trim() });
        curQ = trimmed;
        curA = [];
      } else if (hasIndent && trimmed.endsWith('?')) {
        if (curQ && curA.length) faqItems.push({ question: curQ.trim(), answer: curA.join(' ').trim() });
        curQ = trimmed;
        curA = [];
      } else {
        curA.push(trimmed);
      }
    }
    if (curQ && curA.length) faqItems.push({ question: curQ.trim(), answer: curA.join(' ').trim() });
  }
  result.raw.faq = faqItems.slice(0, 15);

  // SEO
  const titleMatch = text.match(/Title:\s*(.+?)(?=\n|$)/);
  const descMetaMatch = text.match(/Description:\s*(.+?)(?=\n\n|\n\d\.|$)/s);
  const fmtRub = (n) => (n ? n.toLocaleString('ru') : '');
  result.raw.meta_title = titleMatch ? titleMatch[1].trim() : `${result.title} от ${fmtRub(result.price_rub)} руб | Prime Coder`;
  result.raw.meta_description = descMetaMatch ? descMetaMatch[1].trim().replace(/\s+/g, ' ').slice(0, 160) : result.raw.description?.slice(0, 160);

  return result;
}

function buildProduct(p) {
  const descHtml = p.raw.description
    ? `<p>${p.raw.description}</p>`
    : '';
  const fullDescHtml = `<h2>${p.title}</h2>\n<p>${p.raw.description || ''}</p>\n<h3>Ключевые особенности:</h3>\n<ul>${p.features.map((f) => `<li>${f}</li>`).join('')}</ul>`;

  const headerDescBlock = p.raw.headerDesc || p.raw.description || '';
  const checkmarks = (p.raw.headerCheckmarks || '').split('\n').filter(Boolean).slice(0, 4).join('\n');

  const content = {
    header: {
      title: p.raw.h1 || `${p.title} от ${p.price_rub?.toLocaleString('ru')} руб`,
      description: checkmarks || headerDescBlock,
      primaryButtonText: 'Получить КП',
      primaryButtonLink: '/contacts',
      secondaryButtonText: 'Рассчитать стоимость',
      secondaryButtonLink: '#calculator',
    },
    description: {
      title: p.raw.h1 || p.title,
      text: [p.raw.description, p.features.length ? '\nКлючевые особенности:\n• ' + p.features.join('\n• ') : ''].filter(Boolean).join(''),
    },
    priceSection: {
      title: `Тарифы ${p.title.toLowerCase()}`,
      tariffs: p.raw.tariffs && p.raw.tariffs.length ? p.raw.tariffs : [
        { id: 'start', name: 'СТАРТ', subtitle: 'Базовый', price: `${p.price_rub?.toLocaleString('ru')} ₽`, description: '', featuresLeft: [], featuresRight: [] },
      ],
    },
    workSteps: {
      title: 'Детальные этапы работ',
      description: 'Полный цикл от анализа до запуска',
      steps: p.raw.workSteps?.length ? p.raw.workSteps : [],
    },
    stats: {
      title: 'Ключевые показатели клиентов',
      description: 'Реальные результаты',
      categories: p.raw.stats?.length ? p.raw.stats : [],
    },
    relatedServices: {
      title: 'Рекомендуемые доп. услуги',
      services: [
        { title: 'SEO продвижение', description: 'Органический трафик', link: '/catalog/seo-prodvizhenie' },
        { title: 'AI продвижение', description: 'Автоматизация', link: '/catalog/ai-prodvizhenie' },
        { title: 'Контент + SMM', description: 'Органика и реклама', link: '/catalog/kontent-smm' },
      ],
    },
    faq: {
      title: `Часто задаваемые вопросы по ${p.title.toLowerCase()}`,
      items: p.raw.faq || [],
    },
  };

  return {
    slug: p.slug,
    title: p.title.toUpperCase(),
    description_html: descHtml,
    summary: p.raw.description?.slice(0, 200) || p.title,
    full_description_html: fullDescHtml,
    price_rub: p.price_rub || 0,
    currency: 'RUB',
    price_period: p.price_period || 'one_time',
    features: p.features,
    tags: [],
    meta_title: p.raw.meta_title || `${p.title} от ${p.price_rub} руб | Prime Coder`,
    meta_description: p.raw.meta_description || p.raw.description?.slice(0, 160),
    meta_keywords: `${p.title}, ${p.slug}`,
    is_active: true,
    content_json: content,
  };
}

function main() {
  const txtPath = process.argv[2];
  if (!txtPath) {
    console.error('Использование: node scripts/parse-products-txt.js <path-to-txt>');
    process.exit(1);
  }

  const fullPath = path.resolve(txtPath);
  const raw = fs.readFileSync(fullPath, 'utf-8');

  const blocks = raw.split(/(?=Продающий блок для\s+)/).filter((b) => b.trim().startsWith('Продающий'));
  console.log(`Найдено блоков: ${blocks.length}`);

  const products = [];
  for (const block of blocks) {
    const parsed = parseBlock(block);
    products.push(buildProduct(parsed));
    console.log(`  ${parsed.slug} — ${parsed.title}`);
  }

  const outPath = path.join(__dirname, '../../data/products-import.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(products, null, 2), 'utf-8');
  console.log(`\n✅ Записано в ${outPath}`);
}

main();
