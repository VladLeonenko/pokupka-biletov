import type { ProposalSlide } from '@/types/cms';

const ABOUT_TEXT = `Студия PrimeCoder — это команда профессионалов с большим опытом в IT и Digital. Мы — программисты, маркетологи, дизайнеры, редакторы и специалисты по SEO. PrimeCoder реализует ваши идеи в прибыльные проекты!

Карточка предприятия: ИП Леоненко Владислав
Год основания: 2017 год | ИНН: 771896554467 | ОГРН: 319402700056528`;

const ADDITIONAL_ITEMS = [
  'В нашей студии доступны любые удобные Вам способы оплаты, а также поэтапная оплата работы и оплата на расчётный счёт компании.',
  'Вся отчётность о проделанной работе предоставляется один раз в неделю в любой удобной форме.',
  'Взаимодействие с участниками проекта реализуется через WhatsApp, E-mail или Telegram.',
  'Гарантия от 1-го года на разработанный сайт.',
  'Надеемся, что мы ответили на все Ваши вопросы. Уверены, наше сотрудничество будет комфортным и продуктивным. С радостью реализуем все Ваши цели и задачи. С наилучшими пожеланиями, КОМАНДА Primecoder!',
];

const DEFAULT_CONTACTS = [
  { name: 'PrimeCoder', phone: '8 800 555 62 34', email: 'info@primecoder.ru' },
];

export interface ProposalTemplateParams {
  clientName: string;
  company?: string;
  projectDescription?: string;
  goals?: string[];
  fromName: string;
  products: { title: string; price: string; period?: string; summary?: string; features?: string[] }[];
}

export function buildProposalTemplate(params: ProposalTemplateParams): ProposalSlide[] {
  const { clientName, company, projectDescription, goals = [], fromName, products } = params;

  const recipientLine = company
    ? `Кому: ${clientName}\nКомпания: ${company}\nОт: ${fromName}`
    : `Кому: ${clientName}\nОт: ${fromName}`;

  const packages = products.map((p) => ({
    name: p.title,
    price: p.price,
    period: p.period || '',
    description: p.summary || '',
    features: Array.isArray(p.features) ? p.features : (p.summary ? [p.summary] : []),
  }));

  // Если нет продуктов из каталога — добавляем примеры пакетов как в PDF
  const pricingPackages =
    packages.length > 0
      ? packages
      : [
          { name: 'Пакет "Старт"', price: 'от 45 000 ₽', period: '', description: '', features: ['до 20 страниц', 'Tilda', '1 месяц поддержки'] },
          { name: 'Пакет "Малый бизнес"', price: 'от 80 000 ₽', period: '', description: '', features: ['до 30 страниц', 'WordPress', 'Предпроектное исследование'] },
          { name: 'Пакет "Prime"', price: 'от 150 000 ₽', period: '', description: '', features: ['30+ страниц', 'Самописный', '3 месяца поддержки'] },
        ];

  const slides: ProposalSlide[] = [
    {
      slideType: 'hero',
      sortOrder: 0,
      content: {
        title: 'Коммерческое предложение',
        subtitle: recipientLine,
        description: '',
      },
    },
    {
      slideType: 'services',
      sortOrder: 1,
      content: {
        title: 'О нас',
        services: [{ title: 'PrimeCoder', description: ABOUT_TEXT, items: [] }],
      },
    },
    {
      slideType: 'services',
      sortOrder: 2,
      content: {
        title: 'Сведения о проекте',
        subtitle: projectDescription || 'Разработка сайта / цифрового продукта',
        services: goals.length > 0
          ? goals.map((g, i) => ({ title: `Цель ${i + 1}`, description: g, items: [] }))
          : [{ title: 'Цели и задачи', description: 'Проект будет реализован с учётом ваших требований и лучших практик отрасли.', items: [] }],
      },
    },
    {
      slideType: 'pricing',
      sortOrder: 3,
      content: {
        title: 'Стоимость работ',
        packages: pricingPackages,
      },
    },
    {
      slideType: 'roadmap',
      sortOrder: 4,
      content: {
        title: 'Календарный план',
        subtitle: 'Сроки реализации поставленных задач',
        phases: [
          { title: 'Предпроектная подготовка', period: '1-5 дней', actions: ['Анализ', 'ТЗ'], result: 'Утверждённый план' },
          { title: 'Frontend/backend разработка', period: '10-25 дней', actions: ['Дизайн', 'Вёрстка', 'Интеграции'], result: 'Готовый сайт' },
          { title: 'Подключение аналитики и сервисов', period: '2-5 дней', actions: ['Яндекс.Метрика', 'Google Analytics', 'SSL'], result: 'Настроенные системы' },
          { title: 'Тестирование и релиз', period: '2-5 дней', actions: ['Тесты', 'Запуск', 'Обучение'], result: 'Запущенный проект' },
        ],
      },
    },
    {
      slideType: 'guarantees',
      sortOrder: 5,
      content: {
        title: 'Дополнительно',
        guarantees: ADDITIONAL_ITEMS.map((text, i) => ({
          title: `Пункт ${i + 1}`,
          description: text,
          items: [],
        })),
      },
    },
    {
      slideType: 'contacts',
      sortOrder: 6,
      content: {
        title: 'Контакты',
        contacts: DEFAULT_CONTACTS,
        subtitle: 'Наш сайт: primecoder.ru',
      },
    },
  ];

  return slides;
}
