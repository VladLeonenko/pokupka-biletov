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
    basePrices: { basic: 300000, standard: 550000, premium: 900000 },
    marketAvg: 680000,
    hours: { basic: 100, standard: 200, premium: 340 },
    roiMultiplier: 10,
    upsells: ['seo-prodvizhenie', 'tech-support', 'ai-boost']
  },
  'ui-ux-dizajn': {
    name: 'UI/UX дизайн',
    basePrices: { basic: 120000, standard: 250000, premium: 450000 },
    marketAvg: 320000,
    hours: { basic: 50, standard: 100, premium: 180 },
    roiMultiplier: 7,
    upsells: ['sajt-na-wordpress', 'landing-page', 'tech-support']
  },
  'seo-prodvizhenie': {
    name: 'SEO продвижение',
    basePrices: { monthly: 80000 },
    marketAvg: 120000,
    hours: { basic: 40 },
    roiMultiplier: 15,
    recurring: true,
    upsells: ['tech-support', 'ai-prodvizhenie', 'marketing-prodazhi']
  },
  'ai-prodvizhenie': {
    name: 'AI продвижение',
    basePrices: { monthly: 90000 },
    marketAvg: 150000,
    hours: { basic: 35 },
    roiMultiplier: 14,
    recurring: true,
    upsells: ['seo-prodvizhenie', 'marketing-prodazhi', 'tech-support']
  },
  'marketing-prodazhi': {
    name: 'Маркетинг + Продажи',
    basePrices: { monthly: 120000 },
    marketAvg: 200000,
    hours: { basic: 60 },
    roiMultiplier: 18,
    recurring: true,
    upsells: ['ai-prodvizhenie', 'seo-prodvizhenie', 'tech-support']
  },
  'reklama-u-blogerov': {
    name: 'Реклама у блогеров',
    basePrices: { monthly: 150000 },
    marketAvg: 250000,
    hours: { basic: 30 },
    roiMultiplier: 10,
    recurring: true,
    upsells: ['marketing-prodazhi', 'ai-prodvizhenie', 'tech-support']
  },
  'autsorsing-digital-agentstvo': {
    name: 'Аутсорсинг Digital-агенство',
    basePrices: { monthly: 200000 },
    marketAvg: 350000,
    hours: { basic: 100 },
    roiMultiplier: 20,
    recurring: true,
    upsells: ['ai-prodvizhenie', 'marketing-prodazhi', 'tech-support']
  }
};
