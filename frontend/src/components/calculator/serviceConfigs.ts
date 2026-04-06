export interface ServiceConfig {
  name: string;
  basePrices: {
    basic?: number;
    standard?: number;
    premium?: number;
    monthly?: number;
  };
  marketAvg: number;
  hours: {
    basic?: number;
    standard?: number;
    premium?: number;
  };
  roiMultiplier: number;
  recurring?: boolean;
  complexity?: 'low' | 'medium' | 'high';
  upsells: string[];
}

export const serviceConfigs: Record<string, ServiceConfig> = {
  'razrabotka-sajta-na-tilda': {
    name: 'Сайт на Tilda',
    basePrices: { basic: 85000, standard: 180000, premium: 320000 },
    marketAvg: 220000,
    hours: { basic: 25, standard: 60, premium: 110 },
    roiMultiplier: 6,
    upsells: ['seo-audit', 'speed', 'sajt-na-wordpress']
  },
  'sajt-na-wordpress': {
    name: 'Сайт на WordPress',
    basePrices: { basic: 150000, standard: 350000, premium: 650000 },
    marketAvg: 450000,
    hours: { basic: 60, standard: 140, premium: 220 },
    roiMultiplier: 8,
    upsells: ['seo-audit', 'speed', 'tech-support', 'sajt-na-1s-bitriks']
  },
  'sajt-na-1s-bitriks': {
    name: 'Сайт на 1С-Битрикс',
    basePrices: { basic: 350000, standard: 750000, premium: 1400000 },
    marketAvg: 950000,
    hours: { basic: 120, standard: 250, premium: 450 },
    complexity: 'high',
    roiMultiplier: 11,
    upsells: ['seo-audit', 'tech-support', 'internet-magazin']
  },
  'internet-magazin': {
    name: 'Интернет-магазин',
    basePrices: { basic: 450000, standard: 950000, premium: 1600000 },
    marketAvg: 1100000,
    hours: { basic: 180, standard: 350, premium: 550 },
    roiMultiplier: 12,
    upsells: ['sajt-na-1s-bitriks', 'ai-boost', 'seo-monthly']
  },
  'sajt-vizitka': {
    name: 'Сайт-визитка',
    basePrices: { basic: 45000, standard: 65000, premium: 90000 },
    marketAvg: 120000,
    hours: { basic: 15, standard: 20, premium: 25 },
    roiMultiplier: 6,
    upsells: ['seo-audit', 'sajt-na-wordpress', 'tech-support']
  },
  'landing-page': {
    name: 'Landing Page',
    basePrices: { basic: 120000, standard: 250000, premium: 450000 },
    marketAvg: 320000,
    hours: { basic: 40, standard: 80, premium: 140 },
    roiMultiplier: 5,
    upsells: ['sajt-na-wordpress', 'ui-ux-dizajn', 'ai-boost']
  },
  'korporativnyj-sajt': {
    name: 'Корпоративный сайт',
    basePrices: { basic: 250000, standard: 550000, premium: 950000 },
    marketAvg: 650000,
    hours: { basic: 85, standard: 200, premium: 340 },
    roiMultiplier: 10,
    upsells: ['seo-prodvizhenie', 'tech-support', 'ai-boost']
  },
  'ui-ux-dizajn': {
    name: 'UI/UX дизайн',
    basePrices: { basic: 200000, standard: 450000, premium: 850000 },
    marketAvg: 550000,
    hours: { basic: 50, standard: 113, premium: 213 },
    roiMultiplier: 7,
    upsells: ['sajt-na-wordpress', 'landing-page', 'tech-support']
  },
  'seo-prodvizhenie': {
    name: 'SEO продвижение',
    basePrices: { monthly: 85000 },
    marketAvg: 210000,
    hours: { basic: 40 },
    roiMultiplier: 15,
    recurring: true,
    upsells: ['tech-support', 'ai-prodvizhenie', 'marketing-prodazhi']
  },
  'ai-prodvizhenie': {
    name: 'AI продвижение',
    basePrices: { basic: 320000, standard: 750000, premium: 1500000 },
    marketAvg: 1100000,
    hours: { basic: 80, standard: 188, premium: 375 },
    roiMultiplier: 14,
    complexity: 'high',
    upsells: ['seo-prodvizhenie', 'tech-support', 'ai-boost']
  },
  'marketing-prodazhi': {
    name: 'Маркетинг + Продажи',
    basePrices: { basic: 280000, standard: 650000, premium: 1200000 },
    marketAvg: 900000,
    hours: { basic: 70, standard: 163, premium: 300 },
    roiMultiplier: 18,
    complexity: 'high',
    upsells: ['ai-prodvizhenie', 'seo-prodvizhenie', 'tech-support']
  },
  'reklama-u-blogerov': {
    name: 'Реклама у блогеров',
    basePrices: { basic: 150000, standard: 350000, premium: 750000 },
    marketAvg: 550000,
    hours: { basic: 38, standard: 88, premium: 188 },
    roiMultiplier: 10,
    upsells: ['marketing-prodazhi', 'kontent-smm', 'analitika-setup']
  },
  'react-prilozhenie': {
    name: 'React приложение',
    basePrices: { basic: 850000, standard: 1800000, premium: 3000000 },
    marketAvg: 850000,
    hours: { basic: 480, standard: 680, premium: 920 },
    roiMultiplier: 9,
    complexity: 'high',
    upsells: ['tech-support', 'ai-boost', 'seo-prodvizhenie']
  },
'analitika-setup': {
    name: 'Аналитика setup',
    basePrices: { basic: 20000, standard: 45000, premium: 85000 },
    marketAvg: 110000,
    hours: { basic: 24, standard: 40, premium: 56 },
    roiMultiplier: 5,
    complexity: 'high',
    upsells: ['tech-support', 'seo-audit', 'seo-prodvizhenie']
  },
  'autsorsing-digital-agentstvo': {
    name: 'Аутсорсинг Digital-агенство',
    basePrices: { monthly: 200000 },
    marketAvg: 350000,
    hours: { basic: 100 },
    roiMultiplier: 20,
    recurring: true,
    upsells: ['ai-prodvizhenie', 'marketing-prodazhi', 'tech-support']
  },
  'ai-boost-team': {
    name: 'AI Boost Team',
    basePrices: { monthly: 70000 },
    marketAvg: 280000,
    hours: { basic: 28 },
    roiMultiplier: 10,
    recurring: true,
    upsells: ['seo-audit', 'tech-support', 'ai-boost']
  },
  'tekhpodderzhka': {
    name: 'Техподдержка',
    basePrices: { monthly: 35000 },
    marketAvg: 95000,
    hours: { basic: 14 },
    roiMultiplier: 10,
    recurring: true,
    upsells: ['seo-audit', 'speed', 'tech-support']
  },
  'kontent-smm': {
    name: 'Контент + SMM',
    basePrices: { monthly: 55000 },
    marketAvg: 134000,
    hours: { basic: 22 },
    roiMultiplier: 10,
    recurring: true,
    upsells: ['seo-audit', 'seo-monthly', 'ai-marketing']
  },
  'devops-vps': {
    name: 'DevOps/VPS',
    basePrices: { monthly: 65000 },
    marketAvg: 180000,
    hours: { basic: 26 },
    roiMultiplier: 10,
    recurring: true,
    upsells: ['tech-support', 'seo-audit', 'analytics-setup']
  },
  'skorost-sayta': {
    name: 'Скорость сайта',
    basePrices: { basic: 35000, standard: 65000, premium: 120000 },
    marketAvg: 95000,
    hours: { basic: 9, standard: 16, premium: 30 },
    roiMultiplier: 8,
    complexity: 'medium',
    upsells: ['tech-support', 'seo-audit', 'speed']
  },
  'reklama-audit': {
    name: 'Реклама-аудит',
    basePrices: { basic: 28000, standard: 55000, premium: 95000 },
    marketAvg: 77000,
    hours: { basic: 7, standard: 14, premium: 24 },
    roiMultiplier: 8,
    complexity: 'medium',
    upsells: ['seo-audit', 'analytics-setup', 'crm-integration']
  },
  'wp-migratsiya': {
    name: 'WP-миграция',
    basePrices: { basic: 30000, standard: 55000, premium: 95000 },
    marketAvg: 78000,
    hours: { basic: 8, standard: 14, premium: 24 },
    roiMultiplier: 8,
    complexity: 'medium',
    upsells: ['tech-support', 'speed', 'seo-audit']
  },
  'pwa-mobilnoe-app': {
    name: 'PWA + мобильное app',
    basePrices: { basic: 250000, standard: 450000, premium: 850000 },
    marketAvg: 672000,
    hours: { basic: 63, standard: 113, premium: 213 },
    roiMultiplier: 8,
    complexity: 'high',
    upsells: ['tech-support', 'mobile-app', 'seo-audit']
  },
  'chat-boty': {
    name: 'Чат-боты',
    basePrices: { basic: 85000, standard: 180000, premium: 320000 },
    marketAvg: 254000,
    hours: { basic: 21, standard: 45, premium: 80 },
    roiMultiplier: 8,
    complexity: 'medium',
    upsells: ['ai-boost', 'crm-integration', 'tech-support']
  },
  'kontekstnaya-reklama': {
    name: 'Контекстная реклама',
    basePrices: { monthly: 85000 },
    marketAvg: 210000,
    hours: { basic: 34 },
    roiMultiplier: 10,
    recurring: true,
    upsells: ['seo-audit', 'analytics-setup', 'crm-integration']
  },
  'mobilnoe-prilozhenie': {
    name: 'Мобильное приложение',
    basePrices: { basic: 450000, standard: 750000, premium: 1200000 },
    marketAvg: 1040000,
    hours: { basic: 113, standard: 188, premium: 300 },
    roiMultiplier: 8,
    complexity: 'high',
    upsells: ['tech-support', 'crm-integration', 'mobile-app']
  },
  'seo-audit': {
    name: 'SEO-аудит',
    basePrices: { basic: 25000, standard: 45000, premium: 75000 },
    marketAvg: 63000,
    hours: { basic: 6, standard: 11, premium: 19 },
    roiMultiplier: 8,
    complexity: 'medium',
    upsells: ['seo-monthly', 'tech-support', 'analytics-setup']
  }
};
