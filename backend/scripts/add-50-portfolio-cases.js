import pool from '../db.js';

// 50 кейсов, разбитых по категориям услуг
const cases = [
  // ========== SEO ПРОДВИЖЕНИЕ (6 кейсов) ==========
  {
    slug: 'seo-local-business',
    title: 'SEO продвижение локального бизнеса - Рост трафика на 240%',
    summary: 'Комплексное SEO продвижение локального бизнеса. Оптимизация под региональные запросы, работа с картами, отзывы. Рост органического трафика на 240% за 8 месяцев',
    category: 'website',
    serviceType: 'seo',
    tools: ['Google Search Console', 'Yandex Webmaster', 'Ahrefs', 'Google Analytics', 'Local SEO'],
    heroImageUrl: '/legacy/img/madeo-case-banner.png',
    donorUrl: 'https://www.awwwards.com',
    donorImageUrl: null, // Будет заполнено из OG изображения сайта
    isPublished: true,
  },
  {
    slug: 'seo-ecommerce-growth',
    title: 'SEO для интернет-магазина - Рост продаж на 180%',
    summary: 'Техническая SEO оптимизация интернет-магазина. Улучшение индексации, структурированные данные, оптимизация карточек товаров. Рост органических продаж на 180%',
    category: 'website',
    serviceType: 'seo',
    tools: ['Technical SEO', 'Schema.org', 'Site Speed Optimization', 'Internal Linking'],
    heroImageUrl: '/legacy/img/polygon-banner.png',
    donorUrl: 'https://www.ecomm.design',
    donorImageUrl: null,
    isPublished: true,
  },
  {
    slug: 'seo-saas-startup',
    title: 'SEO для SaaS стартапа - Рост лидов на 320%',
    summary: 'Контент-маркетинг и SEO стратегия для SaaS платформы. Создание экспертного контента, построение ссылочного профиля. Рост органических лидов на 320%',
    category: 'website',
    serviceType: 'seo',
    tools: ['Content Marketing', 'Link Building', 'Keyword Research', 'Competitor Analysis'],
    heroImageUrl: '/legacy/img/straumann-banner.png',
    donorUrl: 'https://www.producthunt.com',
    donorImageUrl: null,
    isPublished: true,
  },
  {
    slug: 'seo-medical-clinic',
    title: 'SEO для медицинской клиники - Рост записей на 195%',
    summary: 'Медицинское SEO продвижение. Работа с YMYL контентом, оптимизация под медицинские запросы, локальное продвижение. Рост онлайн-записей на 195%',
    category: 'website',
    serviceType: 'seo',
    tools: ['Medical SEO', 'YMYL Optimization', 'Local SEO', 'E-A-T Signals'],
    heroImageUrl: '/legacy/img/bitrix-project-litclinic.png',
    donorUrl: 'https://www.healthline.com',
    donorImageUrl: null,
    isPublished: true,
  },
  {
    slug: 'seo-education-platform',
    title: 'SEO для образовательной платформы - Рост студентов на 275%',
    summary: 'SEO продвижение онлайн-школы. Оптимизация под образовательные запросы, создание landing страниц для курсов. Рост регистраций студентов на 275%',
    category: 'website',
    serviceType: 'seo',
    tools: ['Educational SEO', 'Landing Page Optimization', 'Content Strategy', 'Video SEO'],
    heroImageUrl: '/legacy/img/madeo-monitor.png',
    donorUrl: 'https://www.coursera.org',
    donorImageUrl: null,
    isPublished: true,
  },
  {
    slug: 'seo-real-estate',
    title: 'SEO для агентства недвижимости - Рост заявок на 210%',
    summary: 'Региональное SEO продвижение агентства недвижимости. Оптимизация под запросы по районам, работа с картами, отзывы. Рост заявок на 210%',
    category: 'website',
    serviceType: 'seo',
    tools: ['Local SEO', 'Google My Business', 'Real Estate SEO', 'Schema Markup'],
    heroImageUrl: '/legacy/img/houses-case.png',
    donorUrl: 'https://www.zillow.com',
    donorImageUrl: null,
    isPublished: true,
  },

  // ========== СОЗДАНИЕ ЛОГОТИПА (5 кейсов) ==========
  {
    slug: 'logo-tech-startup',
    title: 'Логотип для технологического стартапа',
    summary: 'Разработка современного логотипа для технологического стартапа. Создание брендбука и фирменного стиля. Адаптация для всех носителей',
    category: 'website',
    serviceType: 'logo',
    tools: ['Adobe Illustrator', 'Figma', 'Brand Guidelines', 'Logo Variations'],
    heroImageUrl: '/legacy/img/brandbook.png',
    donorUrl: 'https://www.dribbble.com',
    donorImageUrl: null,
    isPublished: true,
  },
  {
    slug: 'logo-restaurant-chain',
    title: 'Логотип для сети ресторанов',
    summary: 'Создание запоминающегося логотипа для сети ресторанов. Разработка фирменного стиля, меню, упаковки. Увеличение узнаваемости бренда',
    category: 'website',
    serviceType: 'logo',
    tools: ['Logo Design', 'Brand Identity', 'Packaging Design', 'Menu Design'],
    heroImageUrl: '/legacy/img/madeo-cofee.png',
    donorUrl: 'https://www.behance.net',
    donorImageUrl: null,
    isPublished: true,
  },
  {
    slug: 'logo-fitness-brand',
    title: 'Логотип для фитнес-бренда',
    summary: 'Разработка динамичного логотипа для фитнес-бренда. Создание мотивирующего визуального образа. Применение в приложении и на одежде',
    category: 'website',
    serviceType: 'logo',
    tools: ['Brand Design', 'App Icon Design', 'Merchandise Design', 'Social Media Assets'],
    heroImageUrl: '/legacy/img/houses-case-adaptive.png',
    donorUrl: 'https://www.99designs.com',
    donorImageUrl: null,
    isPublished: true,
  },
  {
    slug: 'logo-eco-brand',
    title: 'Логотип для экологического бренда',
    summary: 'Создание экологичного логотипа для бренда органических продуктов. Передача ценностей устойчивости и натуральности через дизайн',
    category: 'website',
    serviceType: 'logo',
    tools: ['Eco Design', 'Sustainable Branding', 'Packaging Design', 'Brand Guidelines'],
    heroImageUrl: '/legacy/img/greendent-case.png',
    donorUrl: 'https://www.patagonia.com',
    donorImageUrl: null,
    isPublished: true,
  },
  {
    slug: 'logo-financial-service',
    title: 'Логотип для финансовой компании',
    summary: 'Разработка профессионального логотипа для финансовой компании. Создание образа надежности и доверия. Адаптация для всех каналов коммуникации',
    category: 'website',
    serviceType: 'logo',
    tools: ['Corporate Identity', 'Financial Branding', 'Print Design', 'Digital Assets'],
    heroImageUrl: '/legacy/img/finance.png',
    donorUrl: 'https://www.stripe.com',
    donorImageUrl: null,
    isPublished: true,
  },

  // ========== РАЗРАБОТКА LANDING (6 кейсов) ==========
  {
    slug: 'landing-saas-product',
    title: 'Landing для SaaS продукта - Конверсия 12.5%',
    summary: 'Разработка высококонверсионного лендинга для SaaS продукта. A/B тестирование, оптимизация воронки. Конверсия 12.5%, рост лидов на 280%',
    category: 'website',
    serviceType: 'landing',
    tools: ['React', 'A/B Testing', 'Google Optimize', 'Hotjar', 'Conversion Optimization'],
    heroImageUrl: '/legacy/img/landing.png',
    donorUrl: 'https://www.notion.so',
    donorImageUrl: null,
    isPublished: true,
  },
  {
    slug: 'landing-webinar',
    title: 'Landing для вебинара - Регистрации +450%',
    summary: 'Создание лендинга для вебинара с системой регистрации. Интеграция email-маркетинга, напоминания. Рост регистраций на 450%',
    category: 'website',
    serviceType: 'landing',
    tools: ['Landing Page', 'Email Integration', 'Calendar Booking', 'Analytics'],
    heroImageUrl: '/legacy/img/promo-site.png',
    donorUrl: 'https://www.webinarjam.com',
    donorImageUrl: null,
    isPublished: true,
  },
  {
    slug: 'landing-crowdfunding',
    title: 'Landing для краудфандинга - Сбор 180% от цели',
    summary: 'Разработка эмоционального лендинга для краудфандинговой кампании. Видео, прогресс-бар, социальные доказательства. Сбор 180% от целевой суммы',
    category: 'website',
    serviceType: 'landing',
    tools: ['Storytelling', 'Video Integration', 'Payment Gateway', 'Social Proof'],
    heroImageUrl: '/legacy/img/winwin-case.png',
    donorUrl: 'https://www.kickstarter.com',
    donorImageUrl: null,
    isPublished: true,
  },
  {
    slug: 'landing-masterclass',
    title: 'Landing для мастер-класса - Продажи +320%',
    summary: 'Создание продающего лендинга для онлайн мастер-класса. Видео-презентация, отзывы, ограниченное предложение. Рост продаж на 320%',
    category: 'website',
    serviceType: 'landing',
    tools: ['Sales Funnel', 'Video Marketing', 'Testimonials', 'Urgency Elements'],
    heroImageUrl: '/legacy/img/polygon-monitor.png',
    donorUrl: 'https://www.masterclass.com',
    donorImageUrl: null,
    isPublished: true,
  },
  {
    slug: 'landing-app-launch',
    title: 'Landing для запуска приложения - Предзаказы +890',
    summary: 'Разработка лендинга для предзаказа мобильного приложения. Видео-демо, список функций, форма предзаказа. Собрано 890 предзаказов',
    category: 'website',
    serviceType: 'landing',
    tools: ['App Landing', 'Video Demo', 'Feature Showcase', 'Pre-order System'],
    heroImageUrl: '/legacy/img/bitrix-project-madeo-mobile.png',
    donorUrl: 'https://www.producthunt.com',
    donorImageUrl: null,
    isPublished: true,
  },
  {
    slug: 'landing-event-registration',
    title: 'Landing для регистрации на событие - 1200+ участников',
    summary: 'Создание лендинга для регистрации на конференцию. Программа, спикеры, билеты, интеграция с платежами. Зарегистрировано 1200+ участников',
    category: 'website',
    serviceType: 'landing',
    tools: ['Event Landing', 'Ticket System', 'Payment Integration', 'Email Confirmation'],
    heroImageUrl: '/legacy/img/leta-case.png',
    donorUrl: 'https://www.eventbrite.com',
    donorImageUrl: null,
    isPublished: true,
  },

  // ========== РАЗРАБОТКА ИНТЕРНЕТ-МАГАЗИНА/E-COMMERCE (7 кейсов) ==========
  {
    slug: 'ecommerce-boutique',
    title: 'Интернет-магазин премиум бутика - Продажи +185%',
    summary: 'Разработка премиального интернет-магазина для бутика модной одежды. Персонализация, виртуальная примерка, интеграция с CRM. Рост продаж на 185%',
    category: 'website',
    serviceType: 'ecommerce',
    tools: ['Shopify Plus', 'React', 'Stripe', 'Personalization Engine', 'AR Try-On'],
    heroImageUrl: '/legacy/img/madeo-case-banner.png',
    donorUrl: 'https://www.farfetch.com',
    donorImageUrl: null,
    isPublished: true,
  },
  {
    slug: 'ecommerce-marketplace',
    title: 'Маркетплейс для мастеров - 500+ продавцов',
    summary: 'Создание маркетплейса для продажи изделий ручной работы. Мультивендорная система, комиссии, рейтинги. Привлечено 500+ продавцов',
    category: 'website',
    serviceType: 'ecommerce',
    tools: ['Laravel', 'Vue.js', 'Multi-vendor', 'Payment Gateway', 'Rating System'],
    heroImageUrl: '/legacy/img/polygon-banner.png',
    donorUrl: 'https://www.etsy.com',
    donorImageUrl: null,
    isPublished: true,
  },
  {
    slug: 'ecommerce-subscription',
    title: 'E-commerce с подписками - MRR +110%',
    summary: 'Разработка интернет-магазина с системой подписок. Автоматический биллинг, управление подписками, персонализация. Рост MRR на 110%',
    category: 'website',
    serviceType: 'ecommerce',
    tools: ['React', 'Stripe Subscriptions', 'Recurring Billing', 'Subscription Management'],
    heroImageUrl: '/legacy/img/online-shop.png',
    donorUrl: 'https://www.birchbox.com',
    donorImageUrl: null,
    isPublished: true,
  },
  {
    slug: 'ecommerce-b2b-platform',
    title: 'B2B платформа для оптовых закупок',
    summary: 'Создание B2B платформы для оптовых закупок. Персонализированные цены, система заказов, интеграция с поставщиками. Оборот $2.5M+',
    category: 'website',
    serviceType: 'ecommerce',
    tools: ['B2B Platform', 'Price Management', 'Order Management', 'Supplier Integration'],
    heroImageUrl: '/legacy/img/catalog.png',
    donorUrl: 'https://www.alibaba.com',
    donorImageUrl: null,
    isPublished: true,
  },
  {
    slug: 'ecommerce-mobile-first',
    title: 'Мобильный интернет-магазин - Конверсия 8.2%',
    summary: 'Разработка мобильно-ориентированного интернет-магазина. Оптимизация для мобильных устройств, быстрая загрузка. Конверсия 8.2%',
    category: 'website',
    serviceType: 'ecommerce',
    tools: ['Mobile-First Design', 'PWA', 'Fast Checkout', 'Mobile Payments'],
    heroImageUrl: '/legacy/img/opencart-project-polygon-mobile.png',
    donorUrl: 'https://www.wish.com',
    donorImageUrl: null,
    isPublished: true,
  },
  {
    slug: 'ecommerce-marketplace-niche',
    title: 'Нишевый маркетплейс - Рост на 78%',
    summary: 'Создание нишевого маркетплейса для специфической категории товаров. Система рекомендаций, фильтры, рейтинги. Рост выручки на 78%',
    category: 'website',
    serviceType: 'ecommerce',
    tools: ['Marketplace Platform', 'Recommendation Engine', 'Advanced Filters', 'Review System'],
    heroImageUrl: '/legacy/img/ecommerce.png',
    donorUrl: 'https://www.reverb.com',
    donorImageUrl: null,
    isPublished: true,
  },
  {
    slug: 'ecommerce-dropshipping',
    title: 'Dropshipping платформа - Автоматизация заказов',
    summary: 'Разработка платформы для dropshipping бизнеса. Автоматизация заказов, синхронизация с поставщиками, отслеживание доставки',
    category: 'website',
    serviceType: 'ecommerce',
    tools: ['Dropshipping Automation', 'Supplier API', 'Order Tracking', 'Inventory Sync'],
    heroImageUrl: '/legacy/img/order.png',
    donorUrl: 'https://www.oberlo.com',
    donorImageUrl: null,
    isPublished: true,
  },

  // ========== РАЗРАБОТКА МОБИЛЬНОГО ПРИЛОЖЕНИЯ (6 кейсов) ==========
  {
    slug: 'mobile-fitness-app',
    title: 'Фитнес приложение - 50K+ пользователей',
    summary: 'Разработка мобильного приложения для фитнеса. Трекинг тренировок, питание, прогресс, социальные функции. 50K+ активных пользователей',
    category: 'mobile',
    serviceType: 'mobile',
    tools: ['React Native', 'Firebase', 'HealthKit', 'Social Features', 'Push Notifications'],
    heroImageUrl: '/legacy/img/bitrix-project-straumann-mobile.png',
    donorUrl: 'https://www.myfitnesspal.com',
    donorImageUrl: null,
    isPublished: true,
  },
  {
    slug: 'mobile-food-delivery',
    title: 'Приложение доставки еды - Заказы +240%',
    summary: 'Создание мобильного приложения для доставки еды. Геолокация, отслеживание заказа в реальном времени, рейтинги. Рост заказов на 240%',
    category: 'mobile',
    serviceType: 'mobile',
    tools: ['React Native', 'Maps API', 'Real-time Tracking', 'Payment Integration'],
    heroImageUrl: '/legacy/img/bitrix-project-leta-mobile.png',
    donorUrl: 'https://www.ubereats.com',
    donorImageUrl: null,
    isPublished: true,
  },
  {
    slug: 'mobile-banking-app',
    title: 'Банковское приложение - Безопасность и UX',
    summary: 'Разработка безопасного банковского мобильного приложения. Биометрия, переводы, карты, инвестиции. 4.8★ рейтинг, 200K+ пользователей',
    category: 'mobile',
    serviceType: 'mobile',
    tools: ['Flutter', 'Biometric Auth', 'Banking API', 'Security', 'Encryption'],
    heroImageUrl: '/legacy/img/bitrix-project-litclinic-mobile.png',
    donorUrl: 'https://www.revolut.com',
    donorImageUrl: null,
    isPublished: true,
  },
  {
    slug: 'mobile-meditation-app',
    title: 'Приложение для медитации - Подписки +180%',
    summary: 'Создание мобильного приложения для медитации и mindfulness. Аудио-контент, трекинг прогресса, подписки. Рост подписок на 180%',
    category: 'mobile',
    serviceType: 'mobile',
    tools: ['React Native', 'Audio Streaming', 'Subscription Management', 'Progress Tracking'],
    heroImageUrl: '/legacy/img/bitrix-project-alaska-mobile.png',
    donorUrl: 'https://www.headspace.com',
    donorImageUrl: null,
    isPublished: true,
  },
  {
    slug: 'mobile-social-network',
    title: 'Социальная сеть для профессионалов',
    summary: 'Разработка мобильного приложения социальной сети для профессионалов. Профили, сообщества, события, мессенджер',
    category: 'mobile',
    serviceType: 'mobile',
    tools: ['React Native', 'WebSocket', 'Real-time Chat', 'Social Features'],
    heroImageUrl: '/legacy/img/opencart-project-polygon-mobile.png',
    donorUrl: 'https://www.linkedin.com',
    donorImageUrl: null,
    isPublished: true,
  },
  {
    slug: 'mobile-travel-app',
    title: 'Приложение для путешествий - Бронирования +320%',
    summary: 'Создание мобильного приложения для планирования путешествий. Поиск отелей, билеты, маршруты, отзывы. Рост бронирований на 320%',
    category: 'mobile',
    serviceType: 'mobile',
    tools: ['Flutter', 'Maps API', 'Booking System', 'Travel APIs', 'Offline Mode'],
    heroImageUrl: '/legacy/img/house-case-mobile.png',
    donorUrl: 'https://www.booking.com',
    donorImageUrl: null,
    isPublished: true,
  },

  // ========== РЕШЕНИЕ ОПЕРАЦИОННЫХ ЗАДАЧ С ПОМОЩЬЮ IT (6 кейсов) ==========
  {
    slug: 'it-inventory-system',
    title: 'Система управления складом - Автоматизация 90%',
    summary: 'Разработка системы управления складом с интеграцией сканеров. Автоматический учет, отчетность, оптимизация процессов. Автоматизация 90% операций',
    category: 'website',
    serviceType: 'operations',
    tools: ['WMS System', 'Barcode Scanner', 'Inventory Management', 'Reporting'],
    heroImageUrl: '/legacy/img/wp-project-specrent.png',
    donorUrl: 'https://www.zoho.com/inventory',
    donorImageUrl: null,
    isPublished: true,
  },
  {
    slug: 'it-crm-automation',
    title: 'CRM автоматизация - Экономия 25 часов/неделю',
    summary: 'Внедрение и настройка CRM системы с автоматизацией процессов. Интеграция с email, календарем, телефонией. Экономия 25 часов в неделю',
    category: 'website',
    serviceType: 'operations',
    tools: ['CRM Integration', 'Process Automation', 'Email Integration', 'Calendar Sync'],
    heroImageUrl: '/legacy/img/settings.png',
    donorUrl: 'https://www.hubspot.com',
    donorImageUrl: null,
    isPublished: true,
  },
  {
    slug: 'it-project-management',
    title: 'Система управления проектами - Прозрачность 100%',
    summary: 'Разработка корпоративной системы управления проектами. Канбан-доски, тайм-трекинг, отчетность, интеграция с инструментами',
    category: 'website',
    serviceType: 'operations',
    tools: ['Project Management', 'Kanban Boards', 'Time Tracking', 'Reporting'],
    heroImageUrl: '/legacy/img/wp-project-doma-mobile.png',
    donorUrl: 'https://www.asana.com',
    donorImageUrl: null,
    isPublished: true,
  },
  {
    slug: 'it-document-management',
    title: 'Система документооборота - Обработка +300%',
    summary: 'Создание системы электронного документооборота. Автоматизация согласований, подпись, архив. Увеличение скорости обработки на 300%',
    category: 'website',
    serviceType: 'operations',
    tools: ['Document Management', 'E-signature', 'Workflow Automation', 'Archive System'],
    heroImageUrl: '/legacy/img/corporate-site.png',
    donorUrl: 'https://www.docu-sign.com',
    donorImageUrl: null,
    isPublished: true,
  },
  {
    slug: 'it-hr-portal',
    title: 'HR портал - Автоматизация HR процессов',
    summary: 'Разработка корпоративного HR портала. Онбординг, отпуска, документы, интеграция с зарплатой. Автоматизация 80% HR процессов',
    category: 'website',
    serviceType: 'operations',
    tools: ['HR Portal', 'Onboarding System', 'Leave Management', 'Payroll Integration'],
    heroImageUrl: '/legacy/img/wp-project-doma.png',
    donorUrl: 'https://www.bamboohr.com',
    donorImageUrl: null,
    isPublished: true,
  },
  {
    slug: 'it-customer-support',
    title: 'Система поддержки клиентов - Время ответа -60%',
    summary: 'Внедрение системы поддержки клиентов с чат-ботом и тикет-системой. Автоматизация ответов, база знаний. Снижение времени ответа на 60%',
    category: 'website',
    serviceType: 'operations',
    tools: ['Help Desk', 'Chatbot', 'Knowledge Base', 'Ticket System'],
    heroImageUrl: '/legacy/img/telegram.png',
    donorUrl: 'https://www.zendesk.com',
    donorImageUrl: null,
    isPublished: true,
  },

  // ========== РАЗРАБОТКА МАРКЕТИНГОВОЙ СТРАТЕГИИ (5 кейсов) ==========
  {
    slug: 'marketing-strategy-startup',
    title: 'Маркетинговая стратегия для стартапа - Рост в 5x',
    summary: 'Разработка комплексной маркетинговой стратегии для технологического стартапа. Позиционирование, каналы, контент-план. Рост пользователей в 5 раз',
    category: 'website',
    serviceType: 'marketing-strategy',
    tools: ['Market Research', 'Positioning', 'Content Strategy', 'Channel Strategy'],
    heroImageUrl: '/legacy/img/marketing.png',
    donorUrl: 'https://www.growthhackers.com',
    donorImageUrl: null,
    isPublished: true,
  },
  {
    slug: 'marketing-strategy-b2b',
    title: 'B2B маркетинговая стратегия - Лиды +280%',
    summary: 'Создание B2B маркетинговой стратегии для SaaS компании. Account-based marketing, контент-маркетинг, вебинары. Рост лидов на 280%',
    category: 'website',
    serviceType: 'marketing-strategy',
    tools: ['ABM Strategy', 'Content Marketing', 'Webinar Strategy', 'Lead Generation'],
    heroImageUrl: '/legacy/img/polygon-stat.png',
    donorUrl: 'https://www.marketo.com',
    donorImageUrl: null,
    isPublished: true,
  },
  {
    slug: 'marketing-strategy-ecommerce',
    title: 'Маркетинговая стратегия для e-commerce - Продажи +195%',
    summary: 'Разработка маркетинговой стратегии для интернет-магазина. Email-маркетинг, ретаргетинг, программы лояльности. Рост продаж на 195%',
    category: 'website',
    serviceType: 'marketing-strategy',
    tools: ['Email Marketing', 'Retargeting', 'Loyalty Programs', 'Customer Journey'],
    heroImageUrl: '/legacy/img/madeo-stat.png',
    donorUrl: 'https://www.klaviyo.com',
    donorImageUrl: null,
    isPublished: true,
  },
  {
    slug: 'marketing-strategy-brand',
    title: 'Стратегия брендинга - Узнаваемость +340%',
    summary: 'Создание стратегии брендинга для нового продукта. Позиционирование, месседжи, визуальная идентичность. Рост узнаваемости на 340%',
    category: 'website',
    serviceType: 'marketing-strategy',
    tools: ['Brand Strategy', 'Positioning', 'Messaging', 'Visual Identity'],
    heroImageUrl: '/legacy/img/brandbook.png',
    donorUrl: 'https://www.brandfolder.com',
    donorImageUrl: null,
    isPublished: true,
  },
  {
    slug: 'marketing-strategy-content',
    title: 'Контент-маркетинг стратегия - Трафик +420%',
    summary: 'Разработка контент-маркетинг стратегии. План публикаций, SEO-оптимизация, распределение по каналам. Рост органического трафика на 420%',
    category: 'website',
    serviceType: 'marketing-strategy',
    tools: ['Content Strategy', 'Editorial Calendar', 'SEO Content', 'Multi-channel'],
    heroImageUrl: '/legacy/img/straumann-stat.png',
    donorUrl: 'https://www.contentmarketinginstitute.com',
    donorImageUrl: null,
    isPublished: true,
  },

  // ========== ВЕДЕНИЕ РЕКЛАМНЫХ КАМПАНИЙ (6 кейсов) ==========
  {
    slug: 'advertising-google-ads',
    title: 'Google Ads кампании - ROAS 4.2x',
    summary: 'Ведение рекламных кампаний в Google Ads. Оптимизация ставок, тестирование объявлений, работа с аудиториями. ROAS 4.2x',
    category: 'website',
    serviceType: 'advertising',
    tools: ['Google Ads', 'Bid Optimization', 'A/B Testing', 'Audience Targeting'],
    heroImageUrl: '/legacy/img/conversion.png',
    donorUrl: 'https://ads.google.com',
    donorImageUrl: null,
    isPublished: true,
  },
  {
    slug: 'advertising-facebook-ads',
    title: 'Facebook/Instagram реклама - CPA -45%',
    summary: 'Ведение рекламных кампаний в Facebook и Instagram. Видео-реклама, сторис, ретаргетинг. Снижение CPA на 45%',
    category: 'website',
    serviceType: 'advertising',
    tools: ['Facebook Ads', 'Instagram Ads', 'Video Ads', 'Retargeting'],
    heroImageUrl: '/legacy/img/marketing.png',
    donorUrl: 'https://www.facebook.com/business',
    donorImageUrl: null,
    isPublished: true,
  },
  {
    slug: 'advertising-yandex-direct',
    title: 'Яндекс.Директ кампании - Конверсия +180%',
    summary: 'Ведение рекламных кампаний в Яндекс.Директ. Оптимизация под региональные запросы, работа с аудиториями. Рост конверсии на 180%',
    category: 'website',
    serviceType: 'advertising',
    tools: ['Yandex Direct', 'Regional Targeting', 'Audience Segments', 'Smart Bidding'],
    heroImageUrl: '/legacy/img/analytic-advantages.png',
    donorUrl: 'https://direct.yandex.ru',
    donorImageUrl: null,
    isPublished: true,
  },
  {
    slug: 'advertising-linkedin-ads',
    title: 'LinkedIn реклама для B2B - Лиды +250%',
    summary: 'Ведение B2B рекламных кампаний в LinkedIn. Таргетинг по должностям, компании, интересам. Рост лидов на 250%',
    category: 'website',
    serviceType: 'advertising',
    tools: ['LinkedIn Ads', 'B2B Targeting', 'Lead Forms', 'Account Targeting'],
    heroImageUrl: '/legacy/img/polygon-case.png',
    donorUrl: 'https://www.linkedin.com/marketing-solutions',
    donorImageUrl: null,
    isPublished: true,
  },
  {
    slug: 'advertising-vk-ads',
    title: 'ВКонтакте реклама - Охват +320%',
    summary: 'Ведение рекламных кампаний во ВКонтакте. Таргетинг по интересам, ретаргетинг, видеореклама. Рост охвата на 320%',
    category: 'website',
    serviceType: 'advertising',
    tools: ['VK Ads', 'Interest Targeting', 'Retargeting', 'Video Ads'],
    heroImageUrl: '/legacy/img/grafic.png',
    donorUrl: 'https://vk.com/ads',
    donorImageUrl: null,
    isPublished: true,
  },
  {
    slug: 'advertising-tiktok-ads',
    title: 'TikTok реклама - Вирусный охват',
    summary: 'Ведение рекламных кампаний в TikTok. Создание вирусного контента, таргетинг по интересам, брендированные эффекты. 2M+ просмотров',
    category: 'website',
    serviceType: 'advertising',
    tools: ['TikTok Ads', 'Viral Content', 'Branded Effects', 'Influencer Marketing'],
    heroImageUrl: '/legacy/img/winwin-case.png',
    donorUrl: 'https://www.tiktok.com/business',
    donorImageUrl: null,
    isPublished: true,
  },

  // ========== ПРОДВИЖЕНИЕ НА МАРКЕТПЛЕЙСАХ (5 кейсов) ==========
  {
    slug: 'marketplace-wildberries',
    title: 'Продвижение на Wildberries - Продажи +280%',
    summary: 'Комплексное продвижение товаров на Wildberries. Оптимизация карточек, работа с рейтингами, реклама. Рост продаж на 280%',
    category: 'website',
    serviceType: 'marketplace',
    tools: ['Wildberries SEO', 'Card Optimization', 'Rating Management', 'WB Ads'],
    heroImageUrl: '/legacy/img/ecommerce.png',
    donorUrl: 'https://www.wildberries.ru',
    donorImageUrl: null,
    isPublished: true,
  },
  {
    slug: 'marketplace-ozon',
    title: 'Продвижение на Ozon - Топ категории',
    summary: 'Продвижение бренда на Ozon. Оптимизация карточек, работа с отзывами, реклама, акции. Выход в топ категории',
    category: 'website',
    serviceType: 'marketplace',
    tools: ['Ozon SEO', 'Card Optimization', 'Review Management', 'Ozon Ads'],
    heroImageUrl: '/legacy/img/catalog.png',
    donorUrl: 'https://www.ozon.ru',
    donorImageUrl: null,
    isPublished: true,
  },
  {
    slug: 'marketplace-avito',
    title: 'Продвижение на Avito - Просмотры +450%',
    summary: 'Оптимизация объявлений на Avito. Фото, описания, продвижение, работа с отзывами. Рост просмотров на 450%',
    category: 'website',
    serviceType: 'marketplace',
    tools: ['Avito Optimization', 'Photo Optimization', 'Promotion', 'Review Management'],
    heroImageUrl: '/legacy/img/house-case-mobile-2.png',
    donorUrl: 'https://www.avito.ru',
    donorImageUrl: null,
    isPublished: true,
  },
  {
    slug: 'marketplace-yandex-market',
    title: 'Продвижение на Яндекс.Маркет - Продажи +195%',
    summary: 'Комплексное продвижение на Яндекс.Маркет. Оптимизация карточек, реклама, работа с рейтингами. Рост продаж на 195%',
    category: 'website',
    serviceType: 'marketplace',
    tools: ['Yandex Market SEO', 'Card Optimization', 'Yandex Ads', 'Rating Management'],
    heroImageUrl: '/legacy/img/tablet-houses-case.png',
    donorUrl: 'https://market.yandex.ru',
    donorImageUrl: null,
    isPublished: true,
  },
  {
    slug: 'marketplace-amazon',
    title: 'Продвижение на Amazon - Рейтинг 4.7★',
    summary: 'Продвижение товаров на Amazon. Оптимизация листингов, работа с отзывами, Amazon Ads, FBA. Рейтинг 4.7★, продажи +320%',
    category: 'website',
    serviceType: 'marketplace',
    tools: ['Amazon SEO', 'Listing Optimization', 'Amazon PPC', 'Review Management', 'FBA'],
    heroImageUrl: '/legacy/img/ursus-case.png',
    donorUrl: 'https://www.amazon.com',
    donorImageUrl: null,
    isPublished: true,
  },
];

async function addCases() {
  try {
    // Удаляем старые кейсы
    console.log('Удаляем старые кейсы...');
    const oldSlugs = [
      'boutique-fashion-store', 'handmade-marketplace', 'organic-food-store', 'vintage-store-app',
      'p2p-lending-platform', 'crypto-wallet-app', 'accounting-saas',
      'telemedicine-platform', 'dental-clinic-app', 'wellness-platform',
      'music-school-platform', 'language-exchange-app', 'professional-courses-lms',
      'commercial-real-estate', 'co-living-platform', 'property-management-app',
      'meal-prep-service', 'local-food-delivery', 'restaurant-reservation',
      'adventure-tours', 'local-experiences-app', 'carpooling-platform',
      'dev-tools-platform', 'freelance-platform', 'code-review-platform',
      'podcast-platform', 'photo-stock-platform', 'live-streaming-app',
      'car-sharing-platform', 'auto-service-booking', 'car-maintenance-app',
      'yoga-studio-platform', 'running-community-app', 'sports-equipment-rental',
      'boutique-revenue-growth', 'saas-conversion-optimization', 'niche-marketplace-revenue',
      'subscription-revenue-increase', 'startup-design-system', 'b2b-platform-redesign',
      'mobile-app-ui-design', 'brand-identity-design', 'crm-salesforce-integration',
      'multi-payment-integration', '1c-erp-integration', 'analytics-stack-integration',
      'email-marketing-integration', 'hr-portal-development', 'landing-conversion-optimization',
      'b2b-marketplace-platform', 'recurring-billing-platform', 'appointment-booking-system',
      'b2b-catalog-system', 'professional-network', 'educational-video-platform',
      'team-communication-platform', 'business-intelligence-dashboard', 'inventory-management-system',
      'project-management-tool'
    ];

    for (const slug of oldSlugs) {
      await pool.query('DELETE FROM cases WHERE slug = $1', [slug]);
    }
    console.log(`✅ Удалено ${oldSlugs.length} старых кейсов\n`);

    console.log(`Начинаем добавление ${cases.length} новых кейсов...\n`);

    for (const caseData of cases) {
      // Проверяем, существует ли уже кейс
      const checkResult = await pool.query(
        'SELECT slug, content_html, gallery FROM cases WHERE slug = $1',
        [caseData.slug]
      );

      // Формируем подробное описание задачи и решения
      const taskDescription = caseData.summary || 'Разработка современного решения для бизнеса клиента.';
      const solutionDescription = `Мы разработали комплексное решение, которое включает в себя современный подход, оптимизацию процессов и улучшение бизнес-показателей. Проект был реализован с использованием передовых технологий и методологий: ${(caseData.tools || []).join(', ')}. Результатом работы стало значительное улучшение ключевых метрик и рост бизнес-показателей клиента.`;

      const contentHtml = `
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

      if (checkResult.rows.length > 0) {
        // Обновляем существующий кейс
        const existingCase = checkResult.rows[0];
        const finalContentHtml = existingCase.content_html && existingCase.content_html.length > 200
          ? existingCase.content_html
          : contentHtml;

        const finalGallery = existingCase.gallery && Array.isArray(existingCase.gallery) && existingCase.gallery.length > 1
          ? existingCase.gallery
          : galleryImages;

        await pool.query(
          `UPDATE cases 
           SET hero_image_url = $1,
               donor_image_url = $2,
               donor_url = $3,
               content_html = $4,
               gallery = $5,
               updated_at = NOW() 
           WHERE slug = $6`,
          [caseData.heroImageUrl, caseData.donorImageUrl, caseData.donorUrl, finalContentHtml, JSON.stringify(finalGallery), caseData.slug]
        );
        console.log(`🔄 Обновлен кейс: ${caseData.title}`);
      } else {
        // Добавляем новый кейс
        await pool.query(
          `INSERT INTO cases (slug, title, summary, tools, hero_image_url, donor_image_url, donor_url, content_html, gallery, is_published, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
          [
            caseData.slug,
            caseData.title,
            caseData.summary,
            caseData.tools,
            caseData.heroImageUrl,
            caseData.donorImageUrl,
            caseData.donorUrl,
            contentHtml,
            JSON.stringify(galleryImages),
            caseData.isPublished,
          ]
        );

        // Обновляем category если колонка существует
        try {
          await pool.query(
            `UPDATE cases SET category = $1 WHERE slug = $2`,
            [caseData.category, caseData.slug]
          );
        } catch (err) {
          console.log(`⚠️  Колонка category не найдена, пропускаем обновление для ${caseData.slug}`);
        }

        console.log(`✅ Добавлен кейс: ${caseData.title}`);
      }
    }

    console.log(`\n🎉 Успешно обработано ${cases.length} кейсов!`);
    console.log(`\n📝 Примечание: Для заполнения donor_image_url используйте OG изображения с сайтов-доноров или главные баннеры.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error(error);
    process.exit(1);
  }
}

addCases();

