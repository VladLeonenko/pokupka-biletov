#!/usr/bin/env node
/**
 * SEO Audit — проверка уникальности и соответствия стандартам мета-тегов.
 * npm run seo:audit или node scripts/seo-audit.js
 */

const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..');
const FRONTEND = path.join(BASE, 'frontend/src');

const SEO_STANDARDS = {
  titleMin: 30,
  titleMax: 60,
  descriptionMin: 120,
  descriptionMax: 160,
};

// Статические страницы: путь → { title, description, noindex }
const STATIC_PAGES = {
  '/': {
    title: 'Разработка сайтов под ключ от 150 000 ₽ | PrimeCoder',
    description: 'Создание сайтов, лендингов и интернет-магазинов в Москве. SEO-продвижение, реклама у блогеров. 150+ проектов, конверсия от 8%. Закажите ИЗ — получите КТ.',
    source: 'HomePage',
  },
  '/catalog': {
    title: 'Услуги разработки сайтов и SEO — цены | PrimeCoder',
    description: 'Полный каталог: создание сайтов от 150 000 ₽, SEO-продвижение, реклама у блогеров, дизайн. Выберите услугу и получите расчёт за 24 часа.',
    source: 'CatalogPage',
  },
  '/contacts': {
    title: 'Контакты PrimeCoder — заказать разработку сайта',
    description: 'Свяжитесь с нами: телефон, email, мессенджеры. Консультация и расчёт стоимости бесплатно. Работаем по Москве и всей России.',
    source: 'ContactsPage',
  },
  '/new-client': {
    title: 'Заявка на разработку сайта — бриф | PrimeCoder',
    description: 'Заполните короткий бриф — получите персональное КП и расчёт стоимости за 24 часа. Без обязательств. Разработка сайтов, SEO, реклама.',
    source: 'NewClientPage',
  },
  '/politic': { title: 'Политика конфиденциальности | PrimeCoder', description: 'Политика обработки персональных данных веб-студии PrimeCoder. Условия сбора, хранения и защиты информации клиентов.', source: 'PrivacyPolicyPage' },
  '/privacy': { title: 'Политика конфиденциальности | PrimeCoder', description: 'Политика обработки персональных данных веб-студии PrimeCoder. Условия сбора, хранения и защиты информации клиентов.', source: 'PrivacyPolicyPage' },
  '/cases/winners': {
    title: 'Кейсы Awwwards — награждённые проекты | PrimeCoder',
    description: 'Проекты PrimeCoder, отмеченные Awwwards. Примеры премиум-разработки сайтов, дизайна и UX. Смотрите наши лучшие кейсы.',
    source: 'WinnersPage',
  },
  '/account': { title: 'Личный кабинет — PrimeCoder', description: 'Личный кабинет пользователя', noindex: true, source: 'AccountPage' },
  '/account/ai-team': { title: 'AI Boost Team — личный кабинет', description: 'Управление задачами AI Boost Team, лимитами и качеством', noindex: true, source: 'AccountAiTeamPage' },
  '/account/projects': { title: 'Мои проекты — PrimeCoder', description: 'Прогресс проектов и запросы на изменения', noindex: true, source: 'AccountProjectsPage' },
  '/account/personal-development': { title: 'Личное развитие — PrimeCoder', description: 'Тренировки, питание, чтение, образование, финансы', noindex: true, source: 'UserPersonalDevelopmentPage' },
  '/account/finance-planner': { title: 'Финансовый планировщик — PrimeCoder', description: 'Планирование бюджета, целей и инвестиций', noindex: true, source: 'UserFinancePlannerPage' },
  '/account/privacy-settings': { title: 'Настройки конфиденциальности — PrimeCoder', description: 'Управление согласиями на обработку персональных данных', noindex: true, source: 'PrivacySettingsPage' },
  '/ai-chat': { title: 'AI Ассистент — PrimeCoder', description: 'Задайте вопрос нашему AI-ассистенту. Поддержка голосового ввода и вывода.', noindex: true, source: 'PublicAIChatPage' },
  '/tools/position-checker': { title: 'Проверка позиций сайта в поиске — бесплатный инструмент', description: 'Узнайте позиции вашего сайта по ключевым запросам в Яндексе и Google. Введите ключи — получите отчёт. Без регистрации.', source: 'SeoPositionCheckerPage' },
  '/tools/technical-audit': { title: 'Бесплатный технический аудит сайта — SEO', description: 'Проверьте сайт: скорость загрузки, мобильная адаптация, ошибки. Получите отчёт с рекомендациями. За 2 минуты.', source: 'TechnicalAuditPage' },
  '/tools/reputation-monitor': { title: 'Мониторинг отзывов и репутации бренда в сети', description: 'Отслеживайте отзывы и упоминания компании. Агрегация из отзовиков, соцсетей, форумов. Управляйте репутацией онлайн.', source: 'ReputationMonitorPage' },
  '/tools/roi-calculator': { title: 'Калькулятор ROI рекламы — окупаемость вложений', description: 'Рассчитайте возврат инвестиций в рекламу и маркетинг. Введите данные — получите прогноз окупаемости и рекомендации.', source: 'RoiCalculatorPage' },
  '/register': { title: 'Регистрация — PrimeCoder', description: 'Создайте аккаунт для доступа к личному кабинету и всем услугам', noindex: true, source: 'RegisterPage' },
  '/search': { title: 'Умный поиск — PrimeCoder', description: 'Поиск товаров и услуг', noindex: true, source: 'SearchPage' },
  '/cart': { title: 'Корзина — PrimeCoder', description: 'Ваша корзина покупок', noindex: true, source: 'CartPage' },
  '/wishlist': { title: 'Избранное — PrimeCoder', description: 'Ваш список избранных товаров', noindex: true, source: 'WishlistPage' },
  '/about': {
    title: 'О компании PrimeCoder — веб-студия в Москве',
    description: 'Команда 150+ реализованных проектов. Разработка сайтов, SEO, реклама у блогеров. Часть выручки — в благотворительные фонды. Узнайте, почему выбирают нас.',
    source: 'AboutPage',
  },
  '/portfolio': {
    title: 'Портфолио PrimeCoder — кейсы и примеры сайтов',
    description: 'Реальные проекты: корпоративные сайты, интернет-магазины, лендинги, SEO. Убедитесь в качестве — смотрите 150+ кейсов.',
    source: 'PortfolioPage',
  },
  '/blog': {
    title: 'Блог о создании сайтов и SEO | PrimeCoder',
    description: 'Статьи о разработке сайтов, продвижении, рекламе. Практические советы от практиков. Читайте — применяйте в бизнесе.',
    source: 'PublicBlogPage',
  },
  '/promotion': {
    title: 'Акции на разработку сайтов и SEO | PrimeCoder',
    description: 'Скидки на создание сайтов, лендингов и SEO-продвижение. Текущие акции — экономьте на digital-услугах. О limited предложениях.',
    source: 'PublicPromotionsPage',
  },
  '/ai-team': {
    title: 'AI-команда маркетинга под ключ от 79 000 ₽/мес',
    description: 'Подписка на AI-специалистов: SMM, SEO, аналитика, контент. Замена 1–2 штатных сотрудников. Пилот бесплатно — оцените результат.',
    source: 'PublicHomePageAI',
  },
  '/404': { title: '404 — Страница не найдена | PrimeCoder', description: 'Страница не найдена. Кот нажал Delete.', noindex: true, source: 'NotFoundPage' },
  '/charity': {
    title: 'Благотворительность PrimeCoder — часть выручки в фонды',
    description: 'От каждого проекта направляем средства в благотворительные фонды. Выберите фонд при заказе — мы перечислим от вашего имени.',
    source: 'CharityPage',
  },
  '/reviews': {
    title: 'Отзывы о PrimeCoder — реальные клиенты о разработке сайтов',
    description: 'Честные отзывы заказчиков о создании сайтов, SEO и маркетинге. Рейтинг 4.9. Узнайте, что говорят те, кто уже работал с нами.',
    source: 'ReviewsPage',
  },
  '/houses-case': { title: 'Кейс: сайт Дома России | PrimeCoder', description: 'Корпоративный сайт для Дома России: современный дизайн, адаптивная вёрстка, интеграция с CRM. Смотрите реализацию и результат.', source: 'HousesCasePage' },
  '/madeo-case': { title: 'Кейс Madeo — Разработка сайта | PrimeCoder', description: 'Разработка сайта для компании Madeo. Современный дизайн, адаптивная верстка, интеграция с CRM.', source: 'MadeoCasePage' },
  '/polygon': { title: 'Кейс: сайт Полигон | PrimeCoder', description: 'Сайт для компании Полигон: дизайн, адаптивность, CRM. Реальный кейс — смотрите подход и результат.', source: 'PolygonCasePage' },
  '/straumann-case': { title: 'Кейс: сайт Straumann | PrimeCoder', description: 'Сайт для Straumann: premium-разработка, адаптив, CRM. Кейс международного бренда в медицине и стоматологии.', source: 'StraumannCasePage' },
};

const DYNAMIC_PAGES = [
  { path: '/products/:slug', source: 'ProductPage', note: 'metaTitle/metaDescription из CMS или product' },
  { path: '/blog/:slug', source: 'PublicBlogPostPage', note: 'seo из поста блога' },
  { path: '/cases/:slug', source: 'CasePage', note: 'title из caseData' },
  { path: '/orders/:orderNumber', source: 'OrderDetailPage', note: 'динамический по номеру заказа (noindex)' },
  { path: '/:slug', source: 'PublicPageView', note: 'seo из страницы CMS' },
];

function checkLength(str, min, max, label) {
  if (!str || typeof str !== 'string') return { ok: false, msg: `${label} отсутствует` };
  const len = str.length;
  if (len < min) return { ok: false, msg: `${label}: ${len} символов (мин. ${min})` };
  if (len > max) return { ok: false, msg: `${label}: ${len} символов (макс. ${max})` };
  return { ok: true };
}

function main() {
  console.log('\n🔍 SEO Audit — проверка мета-тегов\n');
  console.log('Стандарты: title 30-60 символов, description 120-160 символов\n');

  const errors = [];
  const warnings = [];
  const titleToPaths = {};

  for (const [route, meta] of Object.entries(STATIC_PAGES)) {
    const { title, description, source } = meta;
    if (!titleToPaths[title]) titleToPaths[title] = [];
    titleToPaths[title].push(route);

    const tCheck = checkLength(title, SEO_STANDARDS.titleMin, SEO_STANDARDS.titleMax, 'Title');
    if (!tCheck.ok) warnings.push(`[${route}] ${tCheck.msg}`);

    if (description && !meta.noindex) {
      const dCheck = checkLength(description, SEO_STANDARDS.descriptionMin, SEO_STANDARDS.descriptionMax, 'Description');
      if (!dCheck.ok) warnings.push(`[${route}] ${dCheck.msg}`);
    }
  }

  const duplicates = Object.entries(titleToPaths).filter(([, paths]) => {
    if (paths.length <= 1) return false;
    if (paths.length === 2 && paths.includes('/politic') && paths.includes('/privacy')) return false;
    return true;
  });
  if (duplicates.length > 0) {
    duplicates.forEach(([title, paths]) => {
      errors.push(`Дубликат title "${title}" на: ${paths.join(', ')}`);
    });
  }

  console.log('═══ СТАТИЧЕСКИЕ СТРАНИЦЫ ═══\n');
  for (const [route, meta] of Object.entries(STATIC_PAGES)) {
    const tLen = (meta.title || '').length;
    const dLen = (meta.description || '').length;
    const tOk = tLen >= SEO_STANDARDS.titleMin && tLen <= SEO_STANDARDS.titleMax;
    const dOk = meta.noindex || (dLen >= SEO_STANDARDS.descriptionMin && dLen <= SEO_STANDARDS.descriptionMax);
    const status = (tOk && dOk) ? '✅' : '⚠️';
    console.log(`  ${status} ${route}`);
    console.log(`      title: ${meta.title}`);
    console.log(`      len: ${tLen} (${tOk ? 'OK' : 'не в диапазоне 30-60'})`);
    if (meta.description) console.log(`      desc: ${meta.description.substring(0, 60)}...`);
    console.log('');
  }

  console.log('═══ ДИНАМИЧЕСКИЕ СТРАНИЦЫ (CMS) ═══\n');
  DYNAMIC_PAGES.forEach((p) => {
    console.log(`  📄 ${p.path}`);
    console.log(`     Источник: ${p.source}`);
    console.log(`     Примечание: ${p.note}`);
    console.log('');
  });

  if (errors.length > 0) {
    console.log('═══ ❌ ОШИБКИ ═══\n');
    errors.forEach((e) => console.log('  ' + e));
    console.log('');
  }

  if (warnings.length > 0) {
    console.log('═══ ⚠️ ПРЕДУПРЕЖДЕНИЯ ═══\n');
    warnings.forEach((w) => console.log('  ' + w));
    console.log('');
  }

  console.log('═══ РЕКОМЕНДАЦИИ ═══\n');
  console.log('1. Убедитесь, что в CMS (страницы, продукты, блог, кейсы) заполнены metaTitle и metaDescription.');
  console.log('2. title: 50-60 символов — оптимально для выдачи Google.');
  console.log('3. description: 150-160 символов — оптимально для сниппета.');
  console.log('4. Каждая индексируемая страница должна иметь уникальные title и description.');
  console.log('5. Личные кабинеты, поиск, корзина — noindex (уже настроено).');
  console.log('');

  if (errors.length === 0) {
    console.log('✅ Критических ошибок не найдено.');
  } else {
    console.log(`❌ Найдено ошибок: ${errors.length}`);
    process.exit(1);
  }
}

main();
