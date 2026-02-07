export interface UpsellConfig {
  id: string;
  name: string;
  price: number;
  hours?: number;
  margin: number;
  description: string;
  targets: string[];
  conversionBoost?: string;
  recurring?: boolean;
  ltvMultiplier?: number;
  icon?: string;
  priority: number;
}

export const upsellsConfig: UpsellConfig[] = [
  {
    id: 'seo-audit',
    name: 'SEO-аудит',
    price: 25000,
    hours: 8,
    margin: 0.84,
    description: '25+ ошибок + план роста трафика ×3',
    targets: ['sajt-na-wordpress', 'sajt-vizitka', 'landing-page', 'razrabotka-sajta-na-tilda'],
    conversionBoost: '+120% трафика за 3 мес',
    priority: 1
  },
  {
    id: 'speed',
    name: 'Оптимизация скорости ×2',
    price: 35000,
    hours: 10,
    margin: 0.83,
    description: 'PageSpeed 90+ баллов',
    targets: ['sajt-na-wordpress', 'sajt-vizitka', 'razrabotka-sajta-na-tilda'],
    conversionBoost: '+25% конверсия',
    priority: 2
  },
  {
    id: 'tech-support',
    name: 'Техподдержка',
    price: 35000,
    recurring: true,
    hours: 15,
    margin: 0.77,
    description: '15ч/мес • uptime 99.9% • backup',
    targets: ['sajt-na-wordpress', 'sajt-na-1s-bitriks', 'internet-magazin', 'korporativnyj-sajt'],
    ltvMultiplier: 12,
    priority: 3
  },
  {
    id: 'ai-boost',
    name: 'AI Boost Team',
    price: 70000,
    recurring: true,
    hours: 25,
    margin: 0.81,
    description: 'AI отдел аутсорс • чатботы + аналитика',
    targets: ['sajt-na-wordpress', 'internet-magazin', 'korporativnyj-sajt'],
    conversionBoost: '+40% конверсия',
    ltvMultiplier: 12,
    priority: 4
  },
  {
    id: 'seo-monthly',
    name: 'SEO продвижение (месяц)',
    price: 80000,
    recurring: true,
    hours: 40,
    margin: 0.75,
    description: 'Комплексное SEO • ТОП-10 Яндекс/Google',
    targets: ['sajt-na-wordpress', 'internet-magazin', 'korporativnyj-sajt', 'sajt-na-1s-bitriks'],
    conversionBoost: '+200% органический трафик',
    ltvMultiplier: 12,
    priority: 5
  },
  {
    id: 'ai-marketing',
    name: 'AI Маркетинг',
    price: 90000,
    recurring: true,
    hours: 35,
    margin: 0.79,
    description: 'Автоматизация маркетинга + AI аналитика',
    targets: ['internet-magazin', 'korporativnyj-sajt', 'sajt-na-1s-bitriks'],
    conversionBoost: '+150% эффективность рекламы',
    ltvMultiplier: 12,
    priority: 6
  },
  {
    id: 'ui-ux-redesign',
    name: 'UI/UX редизайн',
    price: 120000,
    hours: 50,
    margin: 0.82,
    description: 'Современный дизайн • UX-аудит',
    targets: ['sajt-na-wordpress', 'internet-magazin', 'korporativnyj-sajt'],
    conversionBoost: '+35% конверсия',
    priority: 7
  },
  {
    id: 'mobile-app',
    name: 'Мобильное приложение',
    price: 450000,
    hours: 200,
    margin: 0.73,
    description: 'iOS + Android • React Native',
    targets: ['internet-magazin', 'sajt-na-1s-bitriks'],
    conversionBoost: '+60% retention',
    priority: 8
  },
  {
    id: 'crm-integration',
    name: 'Интеграция CRM',
    price: 80000,
    hours: 35,
    margin: 0.78,
    description: 'AmoCRM/Bitrix24 • автоматизация продаж',
    targets: ['sajt-na-wordpress', 'internet-magazin', 'korporativnyj-sajt', 'landing-page'],
    conversionBoost: '+45% обработка лидов',
    priority: 9
  },
  {
    id: 'analytics-setup',
    name: 'Аналитика + метрики',
    price: 35000,
    hours: 12,
    margin: 0.85,
    description: 'GA4 + Яндекс.Метрика • dashboard',
    targets: ['sajt-na-wordpress', 'internet-magazin', 'landing-page', 'razrabotka-sajta-na-tilda'],
    conversionBoost: '+30% понимание ЦА',
    priority: 10
  }
];

export const getSmartUpsells = (serviceSlug: string, totalPrice: number): UpsellConfig[] => {
  const relevantUpsells = upsellsConfig.filter(upsell => 
    upsell.targets.includes(serviceSlug)
  );

  return relevantUpsells
    .sort((a, b) => {
      if (totalPrice < 100000) {
        return a.price - b.price;
      }
      return a.priority - b.priority;
    })
    .slice(0, 3);
};
