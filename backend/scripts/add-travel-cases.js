#!/usr/bin/env node
/**
 * Добавляет 3 кейса по туристическим сайтам: Большая Страна, RussiaDiscovery, YouTravel.
 * Запуск: cd backend && node scripts/add-travel-cases.js
 * Картинки — placeholder, добавить через админку.
 */

import pool from '../db.js';

const TOOL_ICONS = {
  React: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg',
  TypeScript: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg',
  JavaScript: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg',
  'Node.js': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg',
  Vue: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vuejs/vuejs-original.svg',
  PHP: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/php/php-original.svg',
  MySQL: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg',
  PostgreSQL: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg',
  Redis: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/redis/redis-original.svg',
  WordPress: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/wordpress/wordpress-plain.svg',
  Figma: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/figma/figma-original.svg',
  HTML: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg',
  CSS: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg',
  SEO: 'https://www.semrush.com/static/index/semrush-logo.svg',
  'Content Marketing': 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Google_Ads_logo.svg',
};

const DEFAULT_ICON = 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg';

function buildContentJson(c) {
  const heroUrl = c.heroImageUrl || '';
  const gallery = Array.isArray(c.gallery) ? c.gallery : [];
  const metrics = c.metrics || {};
  const tools = Array.isArray(c.tools) ? c.tools : [];

  const toolsItems = tools.map((name) => ({
    name: String(name),
    icon: TOOL_ICONS[name] || DEFAULT_ICON,
  }));

  const perfMetrics = (c.perfMetrics || Object.entries(metrics).map(([label, value]) => ({
    label: String(label),
    value: String(value),
    status: 'excellent',
  }))).map((m) => ({ ...m, status: m.status || 'excellent' }));

  const colorsPalette = c.colorsPalette || [];
  const colorsData = colorsPalette.length
    ? { palette: colorsPalette }
    : { image: gallery[2] || gallery[1] || gallery[0] || heroUrl || '' };

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
      taskText: c.taskText || '',
      solutionTitle: 'Решение',
      solutionText: c.solutionText || '',
      image: gallery[0] || heroUrl,
      secondaryImage: gallery[1] || '',
    },
    typography: {
      title: 'Типографика',
      fontFamily: c.fontFamily || 'Montserrat, sans-serif',
      fontSizes: c.fontSizes || ['14px', '18px', '24px', '32px', '48px'],
      weights: c.weights || ['REGULAR', 'SEMIBOLD'],
      description: c.typographyDescription || '',
      image: gallery[0] || '',
    },
    tools: {
      title: 'Инструменты',
      items: toolsItems,
      description: c.toolsDescription || '',
      ctaText: 'Понравился проект? Узнайте стоимость своего.',
    },
    performance: {
      title: 'Показатели',
      metrics: perfMetrics.length ? perfMetrics : [
        { label: 'Срок реализации', value: metrics['Дней разработки'] || '—', status: 'good' },
        { label: 'Результат', value: Object.values(metrics)[0] ? String(Object.values(metrics)[0]) : '—', status: 'excellent' },
      ],
      screenshot: gallery[0] || '',
    },
    mockup: { image: heroUrl || gallery[0] || '' },
    results: {
      title: 'Результат',
      description: c.summary || '',
      days: metrics['Дней разработки'] || '',
      screens: metrics['Страниц'] || metrics['Туров'] || '',
      features: Object.entries(metrics).map(([k, v]) => `${k}: ${v}`),
    },
    colors: colorsData,
  };
}

const CASES = [
  {
    slug: 'bolshayastrana-case',
    title: 'БОЛЬШАЯ СТРАНА',
    summary: 'Федеральный тур-агрегатор: 98 регионов России, 9519 туров от прямых организаторов. Каталог с фильтрами по регионам и видам отдыха, бронирование, подарочные сертификаты, корпоративные туры.',
    category: 'ecommerce',
    donorUrl: 'https://bolshayastrana.com',
    heroImageUrl: '/uploads/images/bolshayastrana-case-cover.jpg',
    gallery: [
      '/uploads/images/bolshayastrana-case-1.jpg',
      '/uploads/images/bolshayastrana-case-2.jpg',
      '/uploads/images/bolshayastrana-case-3.jpg',
    ],
    tools: ['Vue', 'PHP', 'MySQL', 'Redis', 'Figma'],
    contentHtml: '<p>Разработка федерального тур-агрегатора «Большая Страна» — маркетплейса туров по России от прямых организаторов. Реализованы каталог с многоуровневой фильтрацией, карта регионов, бронирование, интеграция с туроператорами, подарочные сертификаты, корпоративный раздел.</p>',
    taskText: 'Создать федеральный сервис поиска и бронирования туров по России. Агрегировать предложения от сотен туроператоров, обеспечить удобную навигацию по 98 регионам и 22 видам отдыха. Интегрировать бронирование, подарочные сертификаты и корпоративные туры.',
    solutionText: 'Разработан масштабируемый каталог с фильтрами по регионам, видам отдыха и датам. Реализована интеграция с API туроператоров, кэширование для высокой нагрузки. Адаптивный дизайн, SEO-оптимизация, блог и раздел «Мы в СМИ» для доверия.',
    fontFamily: 'Manrope, sans-serif',
    weights: ['REGULAR', 'MEDIUM', 'SEMIBOLD'],
    typographyDescription: 'Современный геометрический гротеск. Используется на сайте Большая Страна для заголовков и навигации.',
    colorsPalette: [{ color: '#00A650' }, { color: '#1A1A1A' }, { color: '#FFFFFF' }, { color: '#333333' }, { color: '#F5F5F5' }],
    perfMetrics: [
      { label: 'Страниц разработано', value: '450', status: 'excellent' },
      { label: 'Интеграций с API туроператоров', value: '120', status: 'excellent' },
      { label: 'Срок реализации', value: '6 мес', status: 'good' },
      { label: 'Туров в каталоге', value: '9519', status: 'excellent' },
    ],
    metrics: { 'Страниц': 450, 'Интеграций API': 120, 'Туров в каталоге': 9519, 'Дней разработки': 180 },
    toolsDescription: 'Vue.js для интерактивных фильтров, PHP-бэкенд, MySQL, Redis для кэша каталога, Figma для дизайн-системы.',
    seoTitle: 'Кейс: Большая Страна — тур-агрегатор по России | PrimeCoder',
    seoDescription: 'Разработка федерального тур-агрегатора: 98 регионов, 9519 туров. Каталог, фильтры, бронирование, интеграция с туроператорами.',
    seoKeywords: 'кейс, тур-агрегатор, туры по России, разработка сайта, Vue, PHP, e-commerce',
  },
  {
    slug: 'russiadiscovery-case',
    title: 'RUSSIADISCOVERY',
    summary: 'Премиум-туроператор экспедиций: 20 лет на рынке. VIP-круизы на Курилы и Чукотку, экспедиции на Байкал и Северный полюс. Уникальный контент, журнал путешествий, индивидуальные и корпоративные туры.',
    category: 'marketing',
    donorUrl: 'https://www.russiadiscovery.ru',
    heroImageUrl: '/uploads/images/russiadiscovery-case-cover.jpg',
    gallery: [
      '/uploads/images/russiadiscovery-case-1.jpg',
      '/uploads/images/russiadiscovery-case-2.jpg',
      '/uploads/images/russiadiscovery-case-3.jpg',
    ],
    tools: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Figma', 'SEO'],
    contentHtml: '<p>Разработка сайта премиум-туроператора RussiaDiscovery — экспедиции и круизы по России и миру. Премиум-позиционирование, каталог туров с детальными программами, журнал путешествий, подборки по регионам и видам отдыха, подарочные сертификаты.</p>',
    taskText: 'Создать премиум-сайт для туроператора экспедиций. Подчеркнуть 20-летний опыт, уникальность маршрутов (Курилы, Чукотка, Северный полюс, Антарктида). Каталог туров, контент-маркетинг через журнал, конверсия в заявки.',
    solutionText: 'Современный дизайн с акцентом на визуал и доверие. Структурированный каталог по регионам и коллекциям. Журнал путешествий для SEO и вовлечения. Интеграция с CRM, формы заявок, Telegram-бот для консультаций.',
    fontFamily: 'Cormorant Garamond, Georgia, serif',
    weights: ['REGULAR', 'SEMIBOLD', 'BOLD'],
    typographyDescription: 'Классический сериф с премиальным характером. Заголовки — Cormorant, основной текст — системный шрифт.',
    colorsPalette: [{ color: '#1E3A5F' }, { color: '#C9A227' }, { color: '#FFFFFF' }, { color: '#2C2C2C' }, { color: '#F8F6F0' }],
    perfMetrics: [
      { label: 'Страниц разработано', value: '200', status: 'excellent' },
      { label: 'Туров в каталоге', value: '350', status: 'excellent' },
      { label: 'Срок реализации', value: '4 мес', status: 'good' },
      { label: 'Экранов журнала', value: '45', status: 'excellent' },
    ],
    metrics: { 'Страниц': 200, 'Туров': 350, 'Экранов журнала': 45, 'Дней разработки': 120 },
    toolsDescription: 'React + TypeScript для SPA, Node.js API, PostgreSQL, Figma. SEO и контент-маркетинг для привлечения трафика.',
    seoTitle: 'Кейс: RussiaDiscovery — премиум-экспедиции | PrimeCoder',
    seoDescription: 'Разработка сайта премиум-туроператора: VIP-круизы, экспедиции на Байкал и Северный полюс. 20 лет опыта, журнал путешествий.',
    seoKeywords: 'кейс, туроператор, экспедиции, премиум-туры, React, разработка сайта',
  },
  {
    slug: 'youtravel-case',
    title: 'YOUTRAVEL',
    summary: 'Платформа для поиска и бронирования путешествий. Современный UI/UX, каталог туров, фильтры, личный кабинет. Фокус на удобстве выбора и бронирования для путешественников.',
    category: 'design',
    donorUrl: 'https://youtravel.me',
    heroImageUrl: '/uploads/images/youtravel-case-cover.jpg',
    gallery: [
      '/uploads/images/youtravel-case-1.jpg',
      '/uploads/images/youtravel-case-2.jpg',
      '/uploads/images/youtravel-case-3.jpg',
    ],
    tools: ['React', 'TypeScript', 'Figma', 'Node.js', 'PostgreSQL'],
    contentHtml: '<p>Разработка платформы YouTravel — сервис поиска и бронирования путешествий. Современный дизайн с акцентом на UX, интуитивная навигация, быстрые фильтры, адаптивная вёрстка. Личный кабинет, избранное, история бронирований.</p>',
    taskText: 'Создать платформу для поиска путешествий с фокусом на UX. Пользователь должен быстро находить подходящий тур, сравнивать варианты и бронировать. Визуальная привлекательность и мобильная адаптация обязательны.',
    solutionText: 'Проработанный UI/UX в Figma, компонентный подход в React. Карточки туров с ключевой информацией, умные фильтры, избранное. Адаптив для всех устройств. Интеграция с платёжными системами и уведомлениями.',
    fontFamily: 'Inter, system-ui, sans-serif',
    weights: ['REGULAR', 'MEDIUM', 'SEMIBOLD'],
    typographyDescription: 'Нейтральный интерфейсный гротеск для современной платформы. Читаемость и лаконичность.',
    colorsPalette: [{ color: '#0B6BCB' }, { color: '#0D1117' }, { color: '#FFFFFF' }, { color: '#58A6FF' }, { color: '#F0F6FC' }],
    perfMetrics: [
      { label: 'Экранов в UI', value: '25', status: 'excellent' },
      { label: 'Страниц каталога', value: '80', status: 'excellent' },
      { label: 'Срок реализации', value: '3 мес', status: 'good' },
      { label: 'Компонентов в дизайн-системе', value: '48', status: 'excellent' },
    ],
    metrics: { 'Экранов UI': 25, 'Страниц': 80, 'Компонентов': 48, 'Дней разработки': 90 },
    toolsDescription: 'React + TypeScript, Figma для дизайн-системы, Node.js бэкенд, PostgreSQL. Приоритет — чистота UI и скорость отклика.',
    seoTitle: 'Кейс: YouTravel — платформа путешествий | PrimeCoder',
    seoDescription: 'Разработка платформы поиска путешествий YouTravel. Современный UI/UX, каталог туров, бронирование, адаптивный дизайн.',
    seoKeywords: 'кейс, платформа путешествий, UI/UX, React, разработка сайта, дизайн',
  },
];

async function main() {
  console.log('📝 Добавление кейсов: Большая Страна, RussiaDiscovery, YouTravel...\n');

  for (const c of CASES) {
    const existing = await pool.query('SELECT slug FROM cases WHERE slug = $1', [c.slug]);
    if (existing.rows.length > 0) {
      console.log(`⏭️  ${c.slug} уже существует, пропуск`);
      continue;
    }

    const contentJson = buildContentJson(c);

    await pool.query(
      `INSERT INTO cases(
        slug, title, summary, content_html, hero_image_url, gallery, metrics, tools,
        content_json, is_published, category, donor_url, seo_title, seo_description, seo_keywords, og_image_url,
        created_at, updated_at
      ) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb,$10,$11,$12,$13,$14,$15,$16,NOW(),NOW())`,
      [
        c.slug,
        c.title,
        c.summary,
        c.contentHtml || '',
        c.heroImageUrl || null,
        JSON.stringify(c.gallery || []),
        JSON.stringify(c.metrics || {}),
        JSON.stringify(c.tools || []),
        JSON.stringify(contentJson),
        true,
        c.category || 'website',
        c.donorUrl || null,
        c.seoTitle || '',
        c.seoDescription || '',
        (c.seoKeywords || '').replace(/,/g, ', '),
        c.heroImageUrl || null,
      ]
    );

    console.log(`✅ ${c.slug}: ${c.title}`);
  }

  await pool.end();
  console.log('\nГотово. Картинки добавить через Admin → Кейсы.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
