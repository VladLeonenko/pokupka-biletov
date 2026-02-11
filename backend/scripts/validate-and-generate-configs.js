#!/usr/bin/env node
/**
 * 1. Валидирует FAQ: проверяет соответствие цен в ответах тарифам карточки
 * 2. Генерирует serviceConfigs для калькулятора
 * 3. Выводит JSON для review и отчёт о расхождениях
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parsePrice(str) {
  const m = str.match(/(\d[\d\s]*)\s*₽/g);
  if (!m) return [];
  return m.map((s) => parseInt(s.replace(/[^\d]/g, ''), 10));
}

function extractNumbers(str) {
  return (str.match(/\d[\d\s]{2,}/g) || []).map((s) => parseInt(s.replace(/\s/g, ''), 10));
}

function validateFaq(product, removeMismatched = false) {
  const tariffs = product.content_json?.priceSection?.tariffs || [];
  const tarifPrices = tariffs.map((t) => {
    const m = (t.price || '').match(/(\d[\d\s]*)/);
    return m ? parseInt(m[1].replace(/\s/g, ''), 10) : null;
  }).filter(Boolean);
  const faqItems = [...(product.content_json?.faq?.items || [])];
  const issues = [];
  const toRemove = [];
  faqItems.forEach((item, i) => {
    const ansPrices = parsePrice(item.answer);
    const hasMismatch = ansPrices.length > 0 && tarifPrices.length > 0;
    if (hasMismatch) {
      const matchCount = ansPrices.filter((p) => tarifPrices.includes(p)).length;
      if (matchCount === 0) {
        issues.push({
          slug: product.slug,
          idx: i,
          question: item.question.slice(0, 60) + '...',
          answerPrices: ansPrices,
          tariffPrices: tarifPrices,
        });
        toRemove.push(i);
      }
    }
  });
  if (removeMismatched && toRemove.length) {
    const filtered = faqItems.filter((_, i) => !toRemove.includes(i));
    if (product.content_json?.faq) product.content_json.faq.items = filtered;
  }
  return issues;
}

function generateServiceConfig(product) {
  const tariffs = product.content_json?.priceSection?.tariffs || [];
  const prices = tariffs.map((t) => {
    const m = (t.price || '').match(/(\d[\d\s]*)/);
    return m ? parseInt(m[1].replace(/\s/g, ''), 10) : null;
  }).filter(Boolean);
  const recurring = product.price_period === 'monthly';
  const name = product.title.replace(/\s+/g, ' ').trim();

  const avg = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
  const marketAvg = Math.round(avg * 1.3);

  // ID из upsellsConfig (seo-audit, speed, tech-support, ai-boost, seo-monthly, …)
  const upsellsMap = {
    'ai-prodvizhenie': ['seo-audit', 'tech-support', 'ai-boost'],
    'ai-boost-team': ['seo-audit', 'tech-support', 'ai-boost'],
    'tekhpodderzhka': ['seo-audit', 'speed', 'tech-support'],
    'kontent-smm': ['seo-audit', 'seo-monthly', 'ai-marketing'],
    'devops-vps': ['tech-support', 'seo-audit', 'analytics-setup'],
    'seo-prodvizhenie': ['tech-support', 'ai-boost', 'seo-audit'],
    'skorost-sayta': ['tech-support', 'seo-audit', 'speed'],
    'reklama-audit': ['seo-audit', 'analytics-setup', 'crm-integration'],
    'wp-migratsiya': ['tech-support', 'speed', 'seo-audit'],
    'pwa-mobilnoe-app': ['tech-support', 'mobile-app', 'seo-audit'],
    'chat-boty': ['ai-boost', 'crm-integration', 'tech-support'],
    'kontekstnaya-reklama': ['seo-audit', 'analytics-setup', 'crm-integration'],
    'mobilnoe-prilozhenie': ['tech-support', 'crm-integration', 'mobile-app'],
    'seo-audit': ['seo-monthly', 'tech-support', 'analytics-setup'],
  };
  const finalUpsells = upsellsMap[product.slug] || ['seo-audit', 'tech-support', 'ai-boost'];

  let config;
  if (recurring && prices.length >= 1) {
    config = {
      name,
      basePrices: { monthly: prices[0] },
      marketAvg,
      hours: { basic: Math.round(prices[0] / 2500) || 20 },
      roiMultiplier: 10,
      recurring: true,
      upsells: finalUpsells,
    };
  } else if (prices.length >= 3) {
    const hrs = [
      Math.round(prices[0] / 4000) || 20,
      Math.round(prices[1] / 4000) || 40,
      Math.round(prices[2] / 4000) || 80,
    ];
    config = {
      name,
      basePrices: { basic: prices[0], standard: prices[1], premium: prices[2] },
      marketAvg,
      hours: { basic: hrs[0], standard: hrs[1], premium: hrs[2] },
      roiMultiplier: 8,
      complexity: prices[2] > 500000 ? 'high' : 'medium',
      upsells: finalUpsells,
    };
  } else if (prices.length >= 1) {
    config = {
      name,
      basePrices: { basic: prices[0], standard: prices[Math.min(1, prices.length - 1)] || prices[0] * 1.5, premium: prices[prices.length - 1] || prices[0] * 2 },
      marketAvg,
      hours: { basic: 20, standard: 40, premium: 60 },
      roiMultiplier: 8,
      upsells: finalUpsells,
    };
  } else {
    return null;
  }
  return config;
}

function main() {
  const removeBadFaq = process.argv.includes('--fix-faq');
  const jsonPath = path.join(__dirname, '../../data/products-import.json');
  const products = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  console.log('═══════════════════════════════════════════════════════════');
  console.log('Валидация FAQ vs тарифы' + (removeBadFaq ? ' (--fix-faq: удаляем несовпадающие)' : ''));
  console.log('═══════════════════════════════════════════════════════════\n');

  const allIssues = [];
  products.forEach((p) => {
    const issues = validateFaq(p, removeBadFaq);
    allIssues.push(...issues);
    if (issues.length > 0) {
      console.log(`⚠️  ${p.slug} (${p.title}):`);
      issues.forEach((i) => {
        console.log(`   FAQ #${i.idx + 1}: цены в ответе [${i.answerPrices.join(', ')}] не совпадают с тарифами [${i.tariffPrices.join(', ')}]`);
        console.log(`   Вопрос: ${i.question}`);
      });
      console.log('');
    }
  });

  if (allIssues.length === 0) {
    console.log('✅ Все FAQ соответствуют тарифам\n');
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('ServiceConfigs для serviceConfigs.ts');
  console.log('═══════════════════════════════════════════════════════════\n');

  const configs = {};
  products.forEach((p) => {
    const cfg = generateServiceConfig(p);
    if (cfg) configs[p.slug] = cfg;
  });

  const lines = Object.entries(configs).map(
    ([slug, cfg]) =>
      `  '${slug}': {\n` +
      `    name: '${cfg.name}',\n` +
      `    basePrices: ${JSON.stringify(cfg.basePrices)},\n` +
      `    marketAvg: ${cfg.marketAvg},\n` +
      `    hours: ${JSON.stringify(cfg.hours)},\n` +
      `    roiMultiplier: ${cfg.roiMultiplier},\n` +
      (cfg.recurring ? `    recurring: true,\n` : '') +
      (cfg.complexity ? `    complexity: '${cfg.complexity}',\n` : '') +
      `    upsells: ${JSON.stringify(cfg.upsells)}\n` +
      `  }`,
  );
  console.log(lines.join(',\n'));

  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('JSON для проверки (путь: data/products-import.json)');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Файл:', jsonPath);
  console.log('Размер:', JSON.stringify(products).length, 'символов');
  console.log('Товаров:', products.length);
  console.log('\nSlug\'и:', products.map((p) => p.slug).join(', '));

  if (removeBadFaq && allIssues.length) {
    fs.writeFileSync(jsonPath, JSON.stringify(products, null, 2), 'utf-8');
    console.log('\n✅ products-import.json обновлён (удалены FAQ с несовпадающими ценами)');
  }
}

main();
