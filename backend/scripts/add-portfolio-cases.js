import pool from '../db.js';

const cases = [
  // E-commerce и интернет-магазины (нишевые)
  {
    slug: 'boutique-fashion-store',
    title: 'Бутик модной одежды - Интернет-магазин',
    summary: 'Разработка премиального интернет-магазина для бутика модной одежды. Увеличение онлайн-продаж на 85%',
    category: 'website',
    tools: ['React', 'Shopify', 'Stripe'],
    heroImageUrl: '/legacy/img/madeo-case-banner.png',
    isPublished: true,
  },
  {
    slug: 'handmade-marketplace',
    title: 'Маркетплейс хендмейда - Платформа для мастеров',
    summary: 'Создание маркетплейса для продажи изделий ручной работы. Интеграция платежей и доставки',
    category: 'website',
    tools: ['Vue.js', 'Laravel', 'MySQL', 'Stripe'],
    heroImageUrl: '/legacy/img/polygon-banner.png',
    isPublished: true,
  },
  {
    slug: 'organic-food-store',
    title: 'Магазин органических продуктов - E-commerce',
    summary: 'Разработка интернет-магазина органических продуктов с системой подписок и доставки',
    category: 'website',
    tools: ['React', 'Node.js', 'PostgreSQL'],
    heroImageUrl: '/legacy/img/online-shop.png',
    isPublished: true,
  },
  {
    slug: 'vintage-store-app',
    title: 'Винтажный магазин - Мобильное приложение',
    summary: 'Разработка мобильного приложения для винтажного магазина одежды и аксессуаров',
    category: 'mobile',
    tools: ['React Native', 'Firebase', 'Stripe'],
    heroImageUrl: '/legacy/img/bitrix-project-madeo-mobile.png',
    isPublished: true,
  },
  
  // Финансы и финтех (нишевые)
  {
    slug: 'p2p-lending-platform',
    title: 'P2P кредитная платформа - Финтех решение',
    summary: 'Разработка платформы для peer-to-peer кредитования с системой скоринга и автоматических выплат',
    category: 'website',
    tools: ['React', 'Node.js', 'PostgreSQL', 'Blockchain'],
    heroImageUrl: '/legacy/img/finance.png',
    isPublished: true,
  },
  {
    slug: 'crypto-wallet-app',
    title: 'Криптокошелек - Мобильное приложение',
    summary: 'Создание безопасного мобильного приложения для хранения и обмена криптовалют',
    category: 'mobile',
    tools: ['React Native', 'Web3', 'Ethereum'],
    heroImageUrl: '/legacy/img/bitrix-project-straumann-mobile.png',
    isPublished: true,
  },
  {
    slug: 'accounting-saas',
    title: 'Облачный учет для малого бизнеса - SaaS',
    summary: 'Разработка SaaS-платформы для ведения учета и отчетности для малого бизнеса',
    category: 'website',
    tools: ['React', 'Django', 'PostgreSQL', 'Stripe'],
    heroImageUrl: '/legacy/img/corporate-site.png',
    isPublished: true,
  },
  
  // Медицина и здравоохранение (нишевые)
  {
    slug: 'telemedicine-platform',
    title: 'Телемедицина - Платформа онлайн-консультаций',
    summary: 'Разработка платформы для онлайн-консультаций с врачами. Интеграция видеосвязи и оплаты',
    category: 'website',
    tools: ['React', 'WebRTC', 'Node.js', 'Stripe'],
    heroImageUrl: '/legacy/img/bitrix-project-litclinic.png',
    isPublished: true,
  },
  {
    slug: 'dental-clinic-app',
    title: 'Стоматологическая клиника - Мобильное приложение',
    summary: 'Создание мобильного приложения для записи к стоматологу с напоминаниями и историей лечения',
    category: 'mobile',
    tools: ['Flutter', 'Firebase', 'Push Notifications'],
    heroImageUrl: '/legacy/img/bitrix-project-litclinic-mobile.png',
    isPublished: true,
  },
  {
    slug: 'wellness-platform',
    title: 'Платформа wellness и здорового образа жизни',
    summary: 'Разработка платформы для ведения здорового образа жизни с трекингом активности и питания',
    category: 'website',
    tools: ['Vue.js', 'Laravel', 'MySQL', 'Charts.js'],
    heroImageUrl: '/legacy/img/straumann-banner.png',
    isPublished: true,
  },
  
  // Образование (нишевые)
  {
    slug: 'music-school-platform',
    title: 'Онлайн-школа музыки - Платформа обучения',
    summary: 'Создание платформы для онлайн-обучения музыке с видеоуроками и обратной связью от преподавателей',
    category: 'website',
    tools: ['React', 'Node.js', 'WebRTC', 'Stripe'],
    heroImageUrl: '/legacy/img/madeo-monitor.png',
    isPublished: true,
  },
  {
    slug: 'language-exchange-app',
    title: 'Языковой обмен - Мобильное приложение',
    summary: 'Разработка мобильного приложения для языкового обмена между носителями разных языков',
    category: 'mobile',
    tools: ['React Native', 'Firebase', 'WebRTC'],
    heroImageUrl: '/legacy/img/bitrix-project-leta-mobile.png',
    isPublished: true,
  },
  {
    slug: 'professional-courses-lms',
    title: 'Профессиональные курсы - LMS система',
    summary: 'Разработка системы управления обучением для профессиональных курсов с сертификацией',
    category: 'website',
    tools: ['Laravel', 'Vue.js', 'PostgreSQL', 'PDF Generation'],
    heroImageUrl: '/legacy/img/polygon-monitor.png',
    isPublished: true,
  },
  
  // Недвижимость (нишевые)
  {
    slug: 'commercial-real-estate',
    title: 'Коммерческая недвижимость - Платформа',
    summary: 'Разработка платформы для аренды и продажи коммерческой недвижимости с виртуальными турами',
    category: 'website',
    tools: ['React', 'Three.js', 'Node.js', 'PostgreSQL'],
    heroImageUrl: '/legacy/img/houses-case.png',
    isPublished: true,
  },
  {
    slug: 'co-living-platform',
    title: 'Co-living платформа - Поиск соседей',
    summary: 'Создание платформы для поиска соседей и совместного проживания с системой матчинга',
    category: 'website',
    tools: ['Vue.js', 'Laravel', 'MySQL', 'Matching Algorithm'],
    heroImageUrl: '/legacy/img/house-case-mobile.png',
    isPublished: true,
  },
  {
    slug: 'property-management-app',
    title: 'Управление недвижимостью - Мобильное приложение',
    summary: 'Разработка мобильного приложения для управления сдаваемой недвижимостью',
    category: 'mobile',
    tools: ['Flutter', 'Firebase', 'Stripe'],
    heroImageUrl: '/legacy/img/house-case-mobile-2.png',
    isPublished: true,
  },
  
  // Еда и рестораны (нишевые)
  {
    slug: 'meal-prep-service',
    title: 'Сервис готовых блюд - Платформа подписок',
    summary: 'Разработка платформы для заказа готовых блюд по подписке с персонализацией меню',
    category: 'website',
    tools: ['React', 'Node.js', 'PostgreSQL', 'Stripe Subscriptions'],
    heroImageUrl: '/legacy/img/madeo-cofee.png',
    isPublished: true,
  },
  {
    slug: 'local-food-delivery',
    title: 'Локальная доставка еды - Мобильное приложение',
    summary: 'Создание мобильного приложения для доставки еды из местных ресторанов',
    category: 'mobile',
    tools: ['React Native', 'Firebase', 'Maps API'],
    heroImageUrl: '/legacy/img/opencart-project-polygon-mobile.png',
    isPublished: true,
  },
  {
    slug: 'restaurant-reservation',
    title: 'Система бронирования ресторанов',
    summary: 'Разработка системы онлайн-бронирования столиков в ресторанах с интеграцией календаря',
    category: 'website',
    tools: ['Vue.js', 'Laravel', 'MySQL', 'Calendar API'],
    heroImageUrl: '/legacy/img/leta-case.png',
    isPublished: true,
  },
  
  // Путешествия (нишевые)
  {
    slug: 'adventure-tours',
    title: 'Приключенческие туры - Платформа бронирования',
    summary: 'Разработка платформы для бронирования экстремальных и приключенческих туров',
    category: 'website',
    tools: ['React', 'Node.js', 'PostgreSQL', 'Payment Gateway'],
    heroImageUrl: '/legacy/img/alaska-case.png',
    isPublished: true,
  },
  {
    slug: 'local-experiences-app',
    title: 'Локальные впечатления - Мобильное приложение',
    summary: 'Создание мобильного приложения для поиска и бронирования уникальных локальных впечатлений',
    category: 'mobile',
    tools: ['Flutter', 'Firebase', 'Maps API'],
    heroImageUrl: '/legacy/img/bitrix-project-alaska-mobile.png',
    isPublished: true,
  },
  {
    slug: 'carpooling-platform',
    title: 'Карпулинг - Платформа совместных поездок',
    summary: 'Разработка платформы для поиска попутчиков и организации совместных поездок',
    category: 'website',
    tools: ['Vue.js', 'Laravel', 'MySQL', 'Maps API'],
    heroImageUrl: '/legacy/img/alaska-main.png',
    isPublished: true,
  },
  
  // Технологии и IT (нишевые)
  {
    slug: 'dev-tools-platform',
    title: 'Платформа инструментов для разработчиков',
    summary: 'Создание платформы с набором инструментов для разработчиков: API тестирование, мониторинг',
    category: 'website',
    tools: ['React', 'Node.js', 'MongoDB', 'WebSocket'],
    heroImageUrl: '/legacy/img/straumann-case.png',
    isPublished: true,
  },
  {
    slug: 'freelance-platform',
    title: 'Фриланс-платформа - Биржа удаленной работы',
    summary: 'Разработка платформы для поиска фрилансеров и удаленной работы с системой рейтингов',
    category: 'website',
    tools: ['React', 'Node.js', 'PostgreSQL', 'Stripe Connect'],
    heroImageUrl: '/legacy/img/polygon-case.png',
    isPublished: true,
  },
  {
    slug: 'code-review-platform',
    title: 'Платформа code review - Инструмент для команд',
    summary: 'Создание платформы для code review с интеграцией Git и системой комментариев',
    category: 'website',
    tools: ['React', 'Python', 'Git API', 'WebSocket'],
    heroImageUrl: '/legacy/img/madeo-case.png',
    isPublished: true,
  },
  
  // Медиа и контент (нишевые)
  {
    slug: 'podcast-platform',
    title: 'Платформа подкастов - Аудио контент',
    summary: 'Разработка платформы для размещения и прослушивания подкастов с системой подписок',
    category: 'website',
    tools: ['React', 'Node.js', 'AWS S3', 'Audio Streaming'],
    heroImageUrl: '/legacy/img/winwin-case.png',
    isPublished: true,
  },
  {
    slug: 'photo-stock-platform',
    title: 'Фотосток - Платформа продажи фотографий',
    summary: 'Создание платформы для продажи стоковых фотографий с системой лицензирования',
    category: 'website',
    tools: ['Vue.js', 'Laravel', 'AWS S3', 'Stripe'],
    heroImageUrl: '/legacy/img/greendent-case.png',
    isPublished: true,
  },
  {
    slug: 'live-streaming-app',
    title: 'Прямые трансляции - Мобильное приложение',
    summary: 'Разработка мобильного приложения для проведения прямых трансляций с чатом и донатами',
    category: 'mobile',
    tools: ['React Native', 'WebRTC', 'Firebase'],
    heroImageUrl: '/legacy/img/opencart-project-polygon-mobile.png',
    isPublished: true,
  },
  
  // Автомобили (нишевые)
  {
    slug: 'car-sharing-platform',
    title: 'Каршеринг - Платформа аренды авто',
    summary: 'Разработка платформы для краткосрочной аренды автомобилей с системой бронирования',
    category: 'website',
    tools: ['React', 'Node.js', 'PostgreSQL', 'Maps API'],
    heroImageUrl: '/legacy/img/ursus-case.png',
    isPublished: true,
  },
  {
    slug: 'auto-service-booking',
    title: 'Запись в автосервис - Платформа',
    summary: 'Создание платформы для онлайн-записи в автосервисы с выбором услуг и времени',
    category: 'website',
    tools: ['Vue.js', 'Laravel', 'MySQL', 'Calendar'],
    heroImageUrl: '/legacy/img/tilda-project-evacuator.png',
    isPublished: true,
  },
  {
    slug: 'car-maintenance-app',
    title: 'Уход за автомобилем - Мобильное приложение',
    summary: 'Разработка мобильного приложения для отслеживания обслуживания и расходов на автомобиль',
    category: 'mobile',
    tools: ['Flutter', 'Firebase', 'Local Storage'],
    heroImageUrl: '/legacy/img/tilda-project-evacuator-mobile.png',
    isPublished: true,
  },
  
  // Спорт и фитнес (нишевые)
  {
    slug: 'yoga-studio-platform',
    title: 'Йога-студия - Платформа онлайн-классов',
    summary: 'Разработка платформы для проведения онлайн-классов йоги с системой подписок',
    category: 'website',
    tools: ['React', 'WebRTC', 'Node.js', 'Stripe'],
    heroImageUrl: '/legacy/img/houses-case-adaptive.png',
    isPublished: true,
  },
  {
    slug: 'running-community-app',
    title: 'Беговое сообщество - Мобильное приложение',
    summary: 'Создание мобильного приложения для бегунов с трекингом маршрутов и социальными функциями',
    category: 'mobile',
    tools: ['React Native', 'GPS', 'Firebase', 'Maps'],
    heroImageUrl: '/legacy/img/opencart-project-polygon-mobile.png',
    isPublished: true,
  },
  {
    slug: 'sports-equipment-rental',
    title: 'Аренда спортивного инвентаря - Платформа',
    summary: 'Разработка платформы для аренды спортивного инвентаря с системой бронирования',
    category: 'website',
    tools: ['Vue.js', 'Laravel', 'MySQL', 'Payment'],
    heroImageUrl: '/legacy/img/tablet-houses-case.png',
    isPublished: true,
  },
  
  // Кейсы по увеличению дохода
  {
    slug: 'boutique-revenue-growth',
    title: 'Бутик одежды - Увеличение онлайн-продаж на 140%',
    summary: 'Оптимизация интернет-магазина премиум-бутика. Внедрение персонализации и улучшение UX. Рост конверсии на 65%',
    category: 'website',
    tools: ['React', 'A/B Testing', 'Google Analytics', 'Personalization'],
    heroImageUrl: '/legacy/img/madeo-stat.png',
    isPublished: true,
  },
  {
    slug: 'saas-conversion-optimization',
    title: 'SaaS-стартап - Рост конверсии на 95%',
    summary: 'Оптимизация воронки продаж SaaS-платформы. Внедрение автоматизации email-маркетинга и улучшение onboarding',
    category: 'website',
    tools: ['React', 'Stripe', 'Mixpanel', 'Email Automation'],
    heroImageUrl: '/legacy/img/polygon-stat.png',
    isPublished: true,
  },
  {
    slug: 'niche-marketplace-revenue',
    title: 'Нишевый маркетплейс - Рост выручки на 78%',
    summary: 'Внедрение новых способов монетизации и оптимизация комиссионной модели. Улучшение системы рекомендаций',
    category: 'website',
    tools: ['React', 'Node.js', 'Data Analytics', 'ML Recommendations'],
    heroImageUrl: '/legacy/img/straumann-stat.png',
    isPublished: true,
  },
  {
    slug: 'subscription-revenue-increase',
    title: 'Сервис подписок - Увеличение MRR на 110%',
    summary: 'Оптимизация модели подписок и внедрение гибких тарифов. Улучшение удержания клиентов',
    category: 'website',
    tools: ['React', 'Stripe Subscriptions', 'Churn Analysis', 'A/B Testing'],
    heroImageUrl: '/legacy/img/conversion.png',
    isPublished: true,
  },
  
  // Кейсы по разработке дизайна
  {
    slug: 'startup-design-system',
    title: 'Стартап - Разработка дизайн-системы',
    summary: 'Создание комплексной дизайн-системы для технологического стартапа. Унификация всех продуктов',
    category: 'website',
    tools: ['Figma', 'Storybook', 'React', 'Design Tokens'],
    heroImageUrl: '/legacy/img/web-design.png',
    isPublished: true,
  },
  {
    slug: 'b2b-platform-redesign',
    title: 'B2B платформа - Полный редизайн',
    summary: 'Современный редизайн B2B платформы с фокусом на конверсию и улучшение пользовательского опыта',
    category: 'website',
    tools: ['Figma', 'React', 'GSAP', 'User Research'],
    heroImageUrl: '/legacy/img/promo-site.png',
    isPublished: true,
  },
  {
    slug: 'mobile-app-ui-design',
    title: 'Мобильное приложение - UI/UX дизайн',
    summary: 'Разработка дизайна мобильного приложения с нуля. Создание интуитивного интерфейса и пользовательских сценариев',
    category: 'mobile',
    tools: ['Figma', 'Principle', 'React Native', 'Prototyping'],
    heroImageUrl: '/legacy/img/tilda-project-maxol-mobile.png',
    isPublished: true,
  },
  {
    slug: 'brand-identity-design',
    title: 'Брендинг и айдентика - Полный редизайн',
    summary: 'Разработка нового визуального стиля и брендбука для технологической компании',
    category: 'website',
    tools: ['Figma', 'Adobe Creative Suite', 'Brand Guidelines'],
    heroImageUrl: '/legacy/img/brandbook.png',
    isPublished: true,
  },
  
  // Кейсы по настройке интеграций
  {
    slug: 'crm-salesforce-integration',
    title: 'Интеграция с Salesforce CRM',
    summary: 'Настройка двусторонней интеграции сайта с Salesforce. Автоматизация продаж и синхронизация данных',
    category: 'website',
    tools: ['Salesforce API', 'REST API', 'Webhooks', 'Node.js'],
    heroImageUrl: '/legacy/img/settings.png',
    isPublished: true,
  },
  {
    slug: 'multi-payment-integration',
    title: 'Интеграция множественных платежных систем',
    summary: 'Настройка интеграции с 15+ платежными системами. Унифицированный API и автоматическое переключение',
    category: 'website',
    tools: ['Stripe', 'PayPal', 'Sberbank API', 'Tinkoff API', 'Node.js'],
    heroImageUrl: '/legacy/img/finance-selected.png',
    isPublished: true,
  },
  {
    slug: '1c-erp-integration',
    title: 'Интеграция с 1С:ERP',
    summary: 'Настройка двусторонней синхронизации между сайтом и 1С:ERP. Автоматизация складских операций и заказов',
    category: 'website',
    tools: ['1C API', 'REST API', 'RabbitMQ', 'Data Sync'],
    heroImageUrl: '/legacy/img/1Cbitrix.png',
    isPublished: true,
  },
  {
    slug: 'analytics-stack-integration',
    title: 'Комплексная интеграция аналитики',
    summary: 'Настройка полного стека аналитики: Google Analytics 4, Яндекс.Метрика, Mixpanel, Amplitude, Hotjar',
    category: 'website',
    tools: ['Google Analytics', 'Yandex Metrica', 'Mixpanel', 'Amplitude'],
    heroImageUrl: '/legacy/img/analytic-advantages.png',
    isPublished: true,
  },
  {
    slug: 'email-marketing-integration',
    title: 'Интеграция email-маркетинга',
    summary: 'Настройка интеграции с Mailchimp/SendGrid. Автоматизация email-кампаний и сегментация аудитории',
    category: 'website',
    tools: ['Mailchimp API', 'SendGrid', 'Node.js', 'Email Automation'],
    heroImageUrl: '/legacy/img/marketing.png',
    isPublished: true,
  },
  
  // Дополнительные нишевые кейсы
  {
    slug: 'hr-portal-development',
    title: 'HR портал - Внутренняя система',
    summary: 'Разработка корпоративного HR портала для сотрудников с интеграцией документооборота и календаря',
    category: 'website',
    tools: ['React', 'Laravel', 'LDAP', 'Document Management'],
    heroImageUrl: '/legacy/img/corporate-site.png',
    isPublished: true,
  },
  {
    slug: 'landing-conversion-optimization',
    title: 'Лендинг - Оптимизация конверсии на 325%',
    summary: 'A/B тестирование и оптимизация лендинга. Увеличение конверсии с 2.1% до 8.9% через улучшение UX',
    category: 'website',
    tools: ['React', 'Google Optimize', 'Hotjar', 'A/B Testing'],
    heroImageUrl: '/legacy/img/landing.png',
    isPublished: true,
  },
  {
    slug: 'b2b-marketplace-platform',
    title: 'B2B маркетплейс - Многоуровневая платформа',
    summary: 'Разработка B2B маркетплейса с системой рейтингов, отзывов, автоматических выплат и инвойсов',
    category: 'website',
    tools: ['React', 'Node.js', 'PostgreSQL', 'Redis', 'Invoice System'],
    heroImageUrl: '/legacy/img/ecommerce.png',
    isPublished: true,
  },
  {
    slug: 'recurring-billing-platform',
    title: 'Платформа рекуррентных платежей - SaaS',
    summary: 'Разработка платформы для управления подписками с автоматическим биллингом и уведомлениями',
    category: 'website',
    tools: ['React', 'Stripe Billing', 'Node.js', 'PostgreSQL', 'Webhooks'],
    heroImageUrl: '/legacy/img/order.png',
    isPublished: true,
  },
  {
    slug: 'appointment-booking-system',
    title: 'Система онлайн-записи - Универсальная платформа',
    summary: 'Разработка системы онлайн-бронирования для салонов красоты, медицинских клиник и сервисных центров',
    category: 'website',
    tools: ['Vue.js', 'Laravel', 'MySQL', 'Calendar API', 'SMS Notifications'],
    heroImageUrl: '/legacy/img/litclinic-case.png',
    isPublished: true,
  },
  {
    slug: 'b2b-catalog-system',
    title: 'B2B каталог - Платформа для оптовиков',
    summary: 'Создание B2B каталога с персонализированными ценами, интеграцией с поставщиками и системой заказов',
    category: 'website',
    tools: ['React', 'Node.js', 'Elasticsearch', 'GraphQL', 'Price Management'],
    heroImageUrl: '/legacy/img/catalog.png',
    isPublished: true,
  },
  {
    slug: 'professional-network',
    title: 'Профессиональная сеть - Нишевая платформа',
    summary: 'Разработка социальной сети для профессионалов конкретной отрасли с функциями сообществ и событий',
    category: 'website',
    tools: ['React', 'Node.js', 'Socket.io', 'MongoDB', 'Event Management'],
    heroImageUrl: '/legacy/img/tilda-project-maxol.png',
    isPublished: true,
  },
  {
    slug: 'educational-video-platform',
    title: 'Образовательная видео-платформа',
    summary: 'Создание платформы для размещения и просмотра образовательных видео с системой прогресса и сертификатов',
    category: 'website',
    tools: ['React', 'Video.js', 'Node.js', 'AWS S3', 'Progress Tracking'],
    heroImageUrl: '/legacy/img/wp-project-doma.png',
    isPublished: true,
  },
  {
    slug: 'team-communication-platform',
    title: 'Корпоративный мессенджер - Командная коммуникация',
    summary: 'Разработка корпоративного мессенджера с интеграцией в рабочие процессы и файловым хранилищем',
    category: 'website',
    tools: ['React', 'WebSocket', 'Node.js', 'MongoDB', 'File Storage'],
    heroImageUrl: '/legacy/img/telegram.png',
    isPublished: true,
  },
  {
    slug: 'business-intelligence-dashboard',
    title: 'BI дашборд - Система бизнес-аналитики',
    summary: 'Создание системы бизнес-аналитики с интерактивными дашбордами, отчетами и прогнозированием',
    category: 'website',
    tools: ['React', 'D3.js', 'Python', 'PostgreSQL', 'Machine Learning'],
    heroImageUrl: '/legacy/img/grafic.png',
    isPublished: true,
  },
  {
    slug: 'inventory-management-system',
    title: 'Система управления складом - WMS',
    summary: 'Разработка системы управления складом с интеграцией сканеров, автоматическим учетом и отчетностью',
    category: 'website',
    tools: ['React', 'Node.js', 'PostgreSQL', 'Barcode Scanner API'],
    heroImageUrl: '/legacy/img/wp-project-specrent.png',
    isPublished: true,
  },
  {
    slug: 'project-management-tool',
    title: 'Инструмент управления проектами - PM платформа',
    summary: 'Создание платформы для управления проектами с канбан-досками, тайм-трекингом и отчетностью',
    category: 'website',
    tools: ['React', 'Node.js', 'PostgreSQL', 'WebSocket', 'Time Tracking'],
    heroImageUrl: '/legacy/img/wp-project-doma-mobile.png',
    isPublished: true,
  },
];

async function addCases() {
  try {
    // Удаляем старые кейсы, которые были добавлены ранее
    console.log('Удаляем старые кейсы...');
    const oldSlugs = [
      'wildberries-redesign', 'ozon-mobile-app', 'lamoda-platform',
      'sberbank-mobile', 'tinkoff-invest', 'alfabank-corporate',
      'medsi-platform', 'docdoc-app', 'invitro-lk',
      'skyeng-platform', 'geekbrains-lms', 'foxford-mobile',
      'cian-platform', 'avito-real-estate', 'domclick-integration',
      'yandex-eda', 'delivery-club-app', 'sbermarket-platform',
      'ostrovok-platform', 'tutu-mobile', 'aviasales-redesign',
      'yandex-cloud-console', 'mailru-cloud', 'habr-redesign',
      'kinopoisk-platform', 'ivi-mobile', 'okko-platform',
      'avito-auto', 'drom-platform', 'yandex-taxi-app',
      'sportmaster-online', 'world-class-app', 'retail-revenue-increase',
      'saas-revenue-growth', 'marketplace-optimization', 'fintech-design-system',
      'ecommerce-redesign', 'mobile-app-design', 'crm-integration',
      'payment-systems-integration', 'erp-integration', 'analytics-integration',
      'corporate-portal', 'landing-page-optimization', 'marketplace-platform',
      'subscription-platform', 'booking-system', 'catalog-platform',
      'social-network', 'video-platform', 'chat-platform', 'dashboard-analytics'
    ];
    
    for (const slug of oldSlugs) {
      await pool.query('DELETE FROM cases WHERE slug = $1', [slug]);
    }
    console.log(`✅ Удалено ${oldSlugs.length} старых кейсов\n`);
    
    console.log(`Начинаем добавление ${cases.length} новых кейсов...`);
    
    for (const caseData of cases) {
      // Проверяем, существует ли уже кейс
      const checkResult = await pool.query(
        'SELECT slug FROM cases WHERE slug = $1',
        [caseData.slug]
      );
      
      if (checkResult.rows.length > 0) {
        // Обновляем данные существующего кейса (изображение, контент, галерея)
        const existingCase = checkResult.rows[0];
        
        // Формируем подробное описание задачи и решения
        const taskDescription = caseData.summary || 'Разработка современного веб-решения для бизнеса клиента.';
        const solutionDescription = `Мы разработали полнофункциональное решение, которое включает в себя современный дизайн, оптимизацию производительности и удобный пользовательский интерфейс. Проект был реализован с использованием передовых технологий: ${(caseData.tools || []).join(', ')}. Результатом работы стало улучшение пользовательского опыта, увеличение конверсии и рост бизнес-показателей клиента.`;
        
        // Используем существующий контент, если он есть и содержит больше информации
        const contentHtml = existingCase.content_html && existingCase.content_html.length > 200
          ? existingCase.content_html 
          : caseData.contentHtml || `
          <div style="margin-bottom: 3rem;">
            <h3 style="font-size: 1.5rem; font-weight: 400; margin-bottom: 1.5rem; color: #fff;">Задача</h3>
            <p style="font-size: 1.125rem; line-height: 1.8; color: rgba(255, 255, 255, 0.9); margin-bottom: 1.5rem;">${taskDescription}</p>
          </div>
          <div style="margin-bottom: 3rem;">
            <h3 style="font-size: 1.5rem; font-weight: 400; margin-bottom: 1.5rem; color: #fff;">Решение</h3>
            <p style="font-size: 1.125rem; line-height: 1.8; color: rgba(255, 255, 255, 0.9); margin-bottom: 1.5rem;">${solutionDescription}</p>
          </div>
        `;
        
        // Формируем галерею с несколькими изображениями
        const galleryImages = [
          caseData.heroImageUrl,
          ...(existingCase.gallery && Array.isArray(existingCase.gallery) && existingCase.gallery.length > 1 
            ? existingCase.gallery.filter((img) => img !== caseData.heroImageUrl).slice(0, 3)
            : [])
        ];
        // Если галерея пуста, добавляем дополнительные изображения из доступных
        if (galleryImages.length === 1) {
          const additionalImages = [
            '/legacy/img/madeo-case.png',
            '/legacy/img/polygon-case.png',
            '/legacy/img/straumann-case.png',
            '/legacy/img/houses-case.png',
            '/legacy/img/alaska-case.png',
            '/legacy/img/leta-case.png'
          ].filter(img => img !== caseData.heroImageUrl);
          galleryImages.push(...additionalImages.slice(0, 2));
        }
        
        await pool.query(
          `UPDATE cases 
           SET hero_image_url = $1, 
               content_html = $2,
               gallery = $3,
               updated_at = NOW() 
           WHERE slug = $4`,
          [caseData.heroImageUrl, contentHtml, JSON.stringify(galleryImages), caseData.slug]
        );
        console.log(`🔄 Обновлен кейс: ${caseData.title}`);
        continue;
      }
      
      // Подготавливаем подробный контент для нового кейса
      const taskDescription = caseData.summary || 'Разработка современного веб-решения для бизнеса клиента.';
      const solutionDescription = `Мы разработали полнофункциональное решение, которое включает в себя современный дизайн, оптимизацию производительности и удобный пользовательский интерфейс. Проект был реализован с использованием передовых технологий: ${(caseData.tools || []).join(', ')}. Результатом работы стало улучшение пользовательского опыта, увеличение конверсии и рост бизнес-показателей клиента.`;
      
      const contentHtml = caseData.contentHtml || `
        <div style="margin-bottom: 3rem;">
          <h3 style="font-size: 1.5rem; font-weight: 400; margin-bottom: 1.5rem; color: #fff;">Задача</h3>
          <p style="font-size: 1.125rem; line-height: 1.8; color: rgba(255, 255, 255, 0.9); margin-bottom: 1.5rem;">${taskDescription}</p>
        </div>
        <div style="margin-bottom: 3rem;">
          <h3 style="font-size: 1.5rem; font-weight: 400; margin-bottom: 1.5rem; color: #fff;">Решение</h3>
          <p style="font-size: 1.125rem; line-height: 1.8; color: rgba(255, 255, 255, 0.9); margin-bottom: 1.5rem;">${solutionDescription}</p>
        </div>
      `;
      
      // Формируем галерею с несколькими изображениями
      const galleryImages = [caseData.heroImageUrl];
      const additionalImages = [
        '/legacy/img/madeo-case.png',
        '/legacy/img/polygon-case.png',
        '/legacy/img/straumann-case.png',
        '/legacy/img/houses-case.png',
        '/legacy/img/alaska-case.png',
        '/legacy/img/leta-case.png',
        '/legacy/img/winwin-case.png',
        '/legacy/img/greendent-case.png'
      ].filter(img => img !== caseData.heroImageUrl);
      galleryImages.push(...additionalImages.slice(0, 2));
      
      // Сначала добавляем кейс без category (на случай если колонка не существует)
      await pool.query(
        `INSERT INTO cases (slug, title, summary, tools, hero_image_url, content_html, gallery, is_published, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        [
          caseData.slug,
          caseData.title,
          caseData.summary,
          caseData.tools,
          caseData.heroImageUrl,
          contentHtml,
          JSON.stringify(galleryImages),
          caseData.isPublished,
        ]
      );
      
      // Затем обновляем category если колонка существует
      try {
        await pool.query(
          `UPDATE cases SET category = $1 WHERE slug = $2`,
          [caseData.category, caseData.slug]
        );
      } catch (err) {
        // Игнорируем ошибку если колонка не существует
        console.log(`⚠️  Колонка category не найдена, пропускаем обновление для ${caseData.slug}`);
      }
      
      console.log(`✅ Добавлен кейс: ${caseData.title}`);
    }
    
    console.log(`\n🎉 Успешно добавлено ${cases.length} кейсов!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error(error);
    process.exit(1);
  }
}

addCases();

