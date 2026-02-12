#!/usr/bin/env node
/**
 * Заполняет content_json для кейсов alaska-case, litclinic-case, leta-case, ursus-case и др.
 * Hero, About, Typography, Tools, Performance, Mockup, Results.
 * Запуск: cd backend && node scripts/seed-portfolio-cases-content.js
 */

import pool from '../db.js';

const TOOL_ICONS = {
  React: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg',
  TypeScript: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg',
  JavaScript: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg',
  'Node.js': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg',
  HTML: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg',
  HTML5: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg',
  CSS: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg',
  CSS3: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg',
  PHP: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/php/php-original.svg',
  MySQL: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg',
  PostgreSQL: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg',
  WordPress: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/wordpress/wordpress-plain.svg',
  WooCommerce: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/woocommerce/woocommerce-original.svg',
  '1C-Bitrix': 'https://upload.wikimedia.org/wikipedia/commons/5/5e/1C_Bitrix_logo.svg',
  'React Native': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg',
  SEO: 'https://www.semrush.com/static/index/semrush-logo.svg',
  'Content Marketing': 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Google_Ads_logo.svg',
  'Link Building': 'https://www.semrush.com/static/index/semrush-logo.svg',
};

const TARGET_SLUGS = [
  'alaska-case',
  'litclinic-case',
  'leta-case',
  'ursus-case',
  'straumann-mobile-case',
  'winwin-case',
  'greendent-case',
  'polygon-case',
];

function buildContentJson(c) {
  const heroUrl = c.hero_image_url || '';
  const gallery = Array.isArray(c.gallery) ? c.gallery : [];
  const metrics = c.metrics || {};
  const tools = Array.isArray(c.tools) ? c.tools : [];

  const toolsItems = tools.map((name) => ({
    name: String(name),
    icon: TOOL_ICONS[name] || 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg',
  }));

  const perfMetrics = Object.entries(metrics).map(([label, value]) => ({
    label: String(label),
    value: String(value),
  }));

  return {
    hero: {
      title: c.title || '',
      subtitle: c.summary || '',
      backgroundImage: heroUrl,
    },
    about: {
      title: 'О проекте',
      description: c.summary || '',
      taskTitle: 'Задачи',
      taskText: `Реализация проекта ${c.title || 'клиента'}. Создание современного решения с учётом требований заказчика и лучших практик отрасли.`,
      solutionTitle: 'Решение',
      solutionText: `Мы разработали полноценное решение: от анализа требований до запуска. Результат — рабочий продукт, отвечающий целям бизнеса.`,
      image: gallery[0] || heroUrl,
      secondaryImage: gallery[1] || '',
    },
    typography: {
      title: 'Типографика',
      fontFamily: 'Montserrat, sans-serif',
      fontSizes: ['14px', '18px', '24px', '32px', '48px'],
      image: gallery[0] || '',
    },
    tools: {
      title: 'Инструменты',
      items: toolsItems,
      description: '',
      ctaText: 'Понравился проект? Узнайте стоимость своего.',
    },
    performance: {
      title: 'Показатели',
      metrics: perfMetrics.length ? perfMetrics : [
        { label: 'Срок реализации', value: metrics['Дней разработки'] || metrics['дней'] || '—' },
        { label: 'Результат', value: Object.values(metrics)[0] ? String(Object.values(metrics)[0]) : '—' },
      ],
      screenshot: gallery[0] || '',
    },
    mockup: {
      image: heroUrl || gallery[0] || '',
    },
    results: {
      title: 'Результат',
      description: c.summary || '',
      days: metrics['Дней разработки'] || metrics['дней'] || '',
      screens: metrics['Страниц'] || metrics['страниц'] || '',
      features: Object.entries(metrics).map(([k, v]) => `${k}: ${v}`),
    },
  };
}

async function main() {
  const r = await pool.query(
    `SELECT slug, title, summary, hero_image_url, gallery, metrics, tools, content_json 
     FROM cases 
     WHERE slug = ANY($1)`,
    [TARGET_SLUGS]
  );

  if (r.rows.length === 0) {
    console.log('Кейсы не найдены в БД. Убедитесь, что они есть в таблице cases.');
    await pool.end();
    return;
  }

  console.log(`Найдено кейсов: ${r.rows.length}`);

  for (const row of r.rows) {
    const existing = row.content_json || {};
    const hasContent = existing.hero?.title || existing.about?.description;

    if (hasContent) {
      console.log(`⏭️ ${row.slug}: content_json уже заполнен, пропуск`);
      continue;
    }

    const contentJson = buildContentJson(row);

    await pool.query(
      `UPDATE cases 
       SET content_json = $2::jsonb, updated_at = NOW() 
       WHERE slug = $1`,
      [row.slug, JSON.stringify(contentJson)]
    );

    console.log(`✅ ${row.slug}: Hero, About, Typography, Tools, Performance, Mockup, Results — заполнено`);
  }

  await pool.end();
  console.log('\nГотово. Откройте Admin → Кейсы и проверьте заполнение.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
