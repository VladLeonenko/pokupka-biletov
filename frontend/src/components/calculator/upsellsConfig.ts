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
    targets: ['sajt-na-wordpress', 'sajt-vizitka', 'landing-page', 'razrabotka-sajta-na-tilda', 'tekhpodderzhka', 'skorost-sayta', 'devops-vps', 'wp-migratsiya', 'seo-audit', 'reklama-audit', 'kontekstnaya-reklama'],
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
    targets: ['sajt-na-wordpress', 'sajt-vizitka', 'razrabotka-sajta-na-tilda', 'tekhpodderzhka', 'skorost-sayta', 'wp-migratsiya'],
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
    targets: ['sajt-na-wordpress', 'sajt-na-1s-bitriks', 'internet-magazin', 'korporativnyj-sajt', 'tekhpodderzhka', 'ai-prodvizhenie', 'chat-boty', 'devops-vps', 'wp-migratsiya', 'pwa-mobilnoe-app', 'mobilnoe-prilozhenie'],
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
    targets: ['sajt-na-wordpress', 'internet-magazin', 'korporativnyj-sajt', 'sajt-na-1s-bitriks', 'seo-prodvizhenie', 'ai-prodvizhenie', 'tekhpodderzhka'],
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
    targets: ['internet-magazin', 'korporativnyj-sajt', 'sajt-na-1s-bitriks', 'ai-prodvizhenie', 'kontent-smm', 'chat-boty'],
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
    targets: ['internet-magazin', 'sajt-na-1s-bitriks', 'pwa-mobilnoe-app', 'chat-boty'],
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
    targets: ['sajt-na-wordpress', 'internet-magazin', 'korporativnyj-sajt', 'landing-page', 'chat-boty', 'kontekstnaya-reklama', 'reklama-audit'],
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
    targets: ['sajt-na-wordpress', 'internet-magazin', 'landing-page', 'razrabotka-sajta-na-tilda', 'devops-vps', 'reklama-audit', 'kontekstnaya-reklama'],
    conversionBoost: '+30% понимание ЦА',
    priority: 10
  }
];

export const upsellsById = Object.fromEntries(upsellsConfig.map(u => [u.id, u]));

/** Получить доп.услуги для конкретного продукта: приоритет serviceConfig.upsells, затем targets. */
export const getSmartUpsells = (
  serviceSlug: string,
  totalPrice: number,
  preferredIds?: string[]
): UpsellConfig[] => {
  const byTargets = upsellsConfig.filter(u => u.targets.includes(serviceSlug));
  const preferred = (preferredIds || [])
    .map(id => upsellsById[id])
    .filter((u): u is UpsellConfig => !!u);
  const rest = byTargets.filter(u => !preferred.includes(u));
  const merged = [...preferred, ...rest];
  const sorted = merged.sort((a, b) => {
    if (totalPrice < 100000) return a.price - b.price;
    return (a.priority - b.priority) || (merged.indexOf(a) - merged.indexOf(b));
  });
  return sorted.slice(0, 3);
};
