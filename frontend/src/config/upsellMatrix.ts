/**
 * Матрица апсейлов: для каждой услуги — рекомендуемые доп.услуги с benefit.
 * Ключи — slug продукта. Upsells — { name, benefit }, name резолвится в slug.
 */

/** Название услуги (из матрицы) → slug продукта в каталоге */
export const UPSELL_NAME_TO_SLUG: Record<string, string> = {
  'Сайт-визитка': 'sajt-vizitka',
  'WordPress': 'sajt-na-wordpress',
  'Лендинг': 'landing-page',
  'Корпоративный': 'korporativnyj-sajt',
  'Tilda': 'razrabotka-sajta-na-tilda',
  'Битрикс': 'sajt-na-1s-bitriks',
  'Интернет-магазин': 'internet-magazin',
  'UI/UX дизайн': 'ui-ux-dizajn',
  'Маркетинг+продажи': 'marketing-prodazhi',
  'Реклама у блогеров': 'reklama-u-blogerov',
  'AI продвижение': 'ai-prodvizhenie',
  'AI Boost Team': 'ai-boost-team',
  'Техподдержка': 'tekhpodderzhka',
  'SEO-продвижение': 'seo-prodvizhenie',
  'Контент+SMM': 'kontent-smm',
  'DevOps/VPS': 'devops-vps',
  'React-приложение': 'react-prilozhenie',
  'Скорость сайта': 'skorost-sayta',
  'Реклама-аудит': 'reklama-audit',
  'Аналитика setup': 'analitika-setup',
  'WP-миграция': 'wp-migratsiya',
  'PWA+app': 'pwa-mobilnoe-app',
  'Чат-боты': 'chat-boty',
  'Email-рассылки': 'email-rassylki',
  'Мобильное приложение': 'mobilnoe-prilozhenie',
  'SEO-аудит': 'seo-audit',
};

/** Slug → название (для обратного маппинга) */
const SLUG_TO_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(UPSELL_NAME_TO_SLUG).map(([name, slug]) => [slug, name])
);

export interface UpsellItem {
  name: string;
  benefit: string;
}

export interface UpsellMatrixEntry {
  upsells: UpsellItem[];
}

/** Матрица: ключ = название услуги (будет резолвиться в slug) */
const RAW_MATRIX: Record<string, UpsellMatrixEntry> = {
  'Сайт-визитка': {
    upsells: [
      { name: 'Скорость сайта', benefit: '+47% конверсия' },
      { name: 'SEO-аудит', benefit: 'ТОП-10 Яндекс' },
      { name: 'Аналитика setup', benefit: '+347% лидов' },
    ],
  },
  'WordPress': {
    upsells: [
      { name: 'Техподдержка', benefit: '0% downtime' },
      { name: 'Скорость сайта', benefit: 'PageSpeed 97+' },
      { name: 'Email-рассылки', benefit: 'ROI 42x' },
    ],
  },
  'Лендинг': {
    upsells: [
      { name: 'Аналитика setup', benefit: 'GA4+лиды' },
      { name: 'Скорость сайта', benefit: 'LCP<2.5с' },
      { name: 'Чат-боты', benefit: '47% лидов' },
    ],
  },
  'Корпоративный': {
    upsells: [
      { name: 'SEO-продвижение', benefit: 'ТОП-5' },
      { name: 'Скорость сайта', benefit: 'Core Web Vitals A' },
      { name: 'Аналитика setup', benefit: 'LTV/CAC' },
    ],
  },
  'Tilda': {
    upsells: [
      { name: 'Скорость сайта', benefit: 'PageSpeed 92+' },
      { name: 'Аналитика setup', benefit: '25 целей' },
      { name: 'Email-рассылки', benefit: '+37% корзин' },
    ],
  },
  'Битрикс': {
    upsells: [
      { name: 'Скорость сайта', benefit: '×2.5 быстрее' },
      { name: 'DevOps/VPS', benefit: '15к посетителей/сек' },
      { name: 'Техподдержка', benefit: 'SLA 4ч' },
    ],
  },
  'Интернет-магазин': {
    upsells: [
      { name: 'Email-рассылки', benefit: 'ROI 42x' },
      { name: 'Чат-боты', benefit: '47% лидов' },
      { name: 'PWA+app', benefit: '+347% конверсия' },
    ],
  },
  'UI/UX дизайн': {
    upsells: [
      { name: 'React-приложение', benefit: 'PageSpeed 98+' },
      { name: 'PWA+app', benefit: 'Mobile-first' },
      { name: 'Скорость сайта', benefit: 'CLS<0.1' },
    ],
  },
  'Маркетинг+продажи': {
    upsells: [
      { name: 'Реклама-аудит', benefit: 'CPA -47%' },
      { name: 'Контент+SMM', benefit: '+320% охвата' },
      { name: 'Чат-боты', benefit: '47% лидов' },
    ],
  },
  'Реклама у блогеров': {
    upsells: [
      { name: 'Контент+SMM', benefit: '×10 охвата' },
      { name: 'Email-рассылки', benefit: '18% win-back' },
      { name: 'Аналитика setup', benefit: 'ROI по блогерам' },
    ],
  },
  'AI продвижение': {
    upsells: [
      { name: 'Скорость сайта', benefit: 'Чанки индексация' },
      { name: 'SEO-продвижение', benefit: 'GEO+SEO' },
      { name: 'Аналитика setup', benefit: 'AI impressions' },
    ],
  },
  'AI Boost Team': {
    upsells: [
      { name: 'PWA+app', benefit: 'AI контент PWA' },
      { name: 'React-приложение', benefit: 'Next.js 15' },
      { name: 'Чат-боты', benefit: 'GPT-4o' },
    ],
  },
  'Техподдержка': {
    upsells: [
      { name: 'Скорость сайта', benefit: 'PageSpeed 97+' },
      { name: 'DevOps/VPS', benefit: 'Auto-scaling' },
      { name: 'WP-миграция', benefit: '0% downtime' },
    ],
  },
  'SEO-продвижение': {
    upsells: [
      { name: 'Скорость сайта', benefit: 'Core Web Vitals' },
      { name: 'Аналитика setup', benefit: 'LTV/CAC' },
      { name: 'Реклама-аудит', benefit: 'ROI +320%' },
    ],
  },
  'Контент+SMM': {
    upsells: [
      { name: 'Email-рассылки', benefit: 'ROI 42x' },
      { name: 'Чат-боты', benefit: '47% лидов' },
      { name: 'AI продвижение', benefit: '+320% нейросети' },
    ],
  },
  'DevOps/VPS': {
    upsells: [
      { name: 'Скорость сайта', benefit: 'TTFB<100ms' },
      { name: 'Техподдержка', benefit: 'SLA 4ч' },
      { name: 'WP-миграция', benefit: 'New Relic APM' },
    ],
  },
  'React-приложение': {
    upsells: [
      { name: 'PWA+app', benefit: '+347% мобильных' },
      { name: 'Скорость сайта', benefit: 'PageSpeed 98+' },
      { name: 'UI/UX дизайн', benefit: 'Figma → React' },
    ],
  },
  'Скорость сайта': {
    upsells: [
      { name: 'Аналитика setup', benefit: 'A/B скорость' },
      { name: 'SEO-продвижение', benefit: 'Core Vitals' },
      { name: 'Техподдержка', benefit: 'Мониторинг 97+' },
    ],
  },
  'Реклама-аудит': {
    upsells: [
      { name: 'Аналитика setup', benefit: 'ROI трекинг' },
      { name: 'SEO-продвижение', benefit: '×5.7 hybrid' },
      { name: 'Чат-боты', benefit: '47% лидов' },
    ],
  },
  'Аналитика setup': {
    upsells: [
      { name: 'Email-рассылки', benefit: 'RFM сегменты' },
      { name: 'Чат-боты', benefit: 'Funnel анализ' },
      { name: 'Реклама-аудит', benefit: 'CPA -47%' },
    ],
  },
  'WP-миграция': {
    upsells: [
      { name: 'Скорость сайта', benefit: '+47% PageSpeed' },
      { name: 'Техподдержка', benefit: '30 дней гарантия' },
      { name: 'DevOps/VPS', benefit: 'Ubuntu+Redis' },
    ],
  },
  'PWA+app': {
    upsells: [
      { name: 'Email-рассылки', benefit: 'Push+Email' },
      { name: 'Чат-боты', benefit: 'PWA chatbot' },
      { name: 'Аналитика setup', benefit: 'Push метрики' },
    ],
  },
  'Чат-боты': {
    upsells: [
      { name: 'Email-рассылки', benefit: 'Omnichannel' },
      { name: 'Аналитика setup', benefit: 'Bot funnel' },
      { name: 'Маркетинг+продажи', benefit: '47%→67% лидов' },
    ],
  },
  'Email-рассылки': {
    upsells: [
      { name: 'Чат-боты', benefit: 'Email+Bot' },
      { name: 'Аналитика setup', benefit: 'RFM анализ' },
      { name: 'Контент+SMM', benefit: '×3 LTV' },
    ],
  },
  'Мобильное приложение': {
    upsells: [
      { name: 'PWA+app', benefit: 'iOS+Android 1 код' },
      { name: 'Скорость сайта', benefit: 'App PageSpeed 98+' },
      { name: 'Аналитика setup', benefit: 'Push метрики' },
    ],
  },
};

/** По slug продукта получить рекомендованные апсейлы: { slug, benefit }[] */
export function getUpsellsForProduct(productSlug: string): { slug: string; benefit: string }[] {
  const productName = SLUG_TO_NAME[productSlug];
  if (!productName) return [];

  const entry = RAW_MATRIX[productName];
  if (!entry?.upsells?.length) return [];

  return entry.upsells
    .map((u) => {
      const slug = UPSELL_NAME_TO_SLUG[u.name];
      return slug ? { slug, benefit: u.benefit } : null;
    })
    .filter((x): x is { slug: string; benefit: string } => x !== null);
}
