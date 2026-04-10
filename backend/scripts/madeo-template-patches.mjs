/**
 * Тексты для вкладки «Madeo Template» (content_json) + summary/SEO.
 * Картинки не заданы — остаются из БД или пустые; пользователь подгружает сам.
 */

const I = {
  React: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg',
  TypeScript: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg',
  JavaScript: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg',
  'Node.js': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg',
  HTML: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg',
  CSS: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg',
  PHP: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/php/php-original.svg',
  MySQL: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg',
  PostgreSQL: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg',
  WordPress: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/wordpress/wordpress-plain.svg',
  WooCommerce: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/woocommerce/woocommerce-original.svg',
  OpenCart: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/opencart/opencart-original.svg',
  '1C-Bitrix': 'https://upload.wikimedia.org/wikipedia/commons/5/5e/1C_Bitrix_logo.svg',
  'React Native': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg',
  Figma: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/figma/figma-original.svg',
  Blender: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/blender/blender-original.svg',
  SEO: 'https://www.semrush.com/static/index/semrush-logo.svg',
};

export function toolItems(names) {
  return names.map((name) => ({ name, icon: I[name] || I.HTML }));
}

const S = {
  all: {
    hero: true,
    about: true,
    typography: true,
    colors: true,
    tools: true,
    performance: true,
    mockup: true,
    results: true,
    team: true,
    ask: true,
    form: true,
  },
};

function perf(metrics, score) {
  return {
    title: 'Показатели',
    score,
    metrics: metrics.map(([label, value, status = 'excellent']) => ({ label, value, status })),
  };
}

export const NEW_CASES = [
  {
    slug: 'umagazine-case',
    title: 'UMAGAZINE',
    summary:
      'Сайт редакции: устранение ошибок текущего портала, оптимизация кода и интеграций с 1С-Битрикс. Параллельно ведётся работа над UI/UX и новым интернет-порталом Umagazine на React.',
    category: 'website',
    tools: ['1C-Bitrix', 'React', 'PHP', 'JavaScript', 'MySQL'],
    metrics: { 'Дней разработки': 45, 'Этапов миграции': 3 },
    gallery: [],
    heroImageUrl: null,
    isPublished: false,
    seoTitle: 'Кейс Umagazine: Битрикс, React, медиаплатформа | PrimeCoder',
    seoDescription:
      'Стабилизация продакшена медиа и дорожная карта переноса на React без остановки редакции.',
    seoKeywords: 'Umagazine, Битрикс, React, медиа, PrimeCoder',
  },
  {
    slug: 'kchtz-case',
    title: 'KCHTZ',
    summary:
      'Интернет-магазин: исправление корзины и checkout, выгрузка остатков с 1С, API для сервиса «долями», корректная Метрика и Google Analytics, совместный редизайн, рост конверсии по ключевой воронке.',
    category: 'website',
    tools: ['PHP', 'JavaScript', 'MySQL', '1C-Bitrix', 'HTML', 'CSS'],
    metrics: { 'Дней разработки': 110, 'Страниц': 30 },
    gallery: [],
    heroImageUrl: null,
    isPublished: false,
    seoTitle: 'Кейс KCHTZ: e-commerce, 1С, аналитика | PrimeCoder',
    seoDescription:
      'Восстановление воронки покупки, интеграция склада и достоверная аналитика для масштабирования каналов.',
    seoKeywords: 'KCHTZ, интернет-магазин, 1С, конверсия, PrimeCoder',
  },
  {
    slug: 'opencart-secure-store-case',
    title: 'Интернет-магазин на OpenCart',
    summary:
      'Индивидуальный дизайн с динамичной графикой и анимацией, интернет-магазин на OpenCart, усиленная защита от DDoS на уровне инфраструктуры и пожелания заказчика по функционалу.',
    category: 'website',
    tools: ['OpenCart', 'PHP', 'JavaScript', 'MySQL', 'Figma'],
    metrics: { 'Дней разработки': 55, 'Страниц': 28 },
    gallery: [],
    heroImageUrl: null,
    isPublished: false,
    seoTitle: 'Кейс: OpenCart, DDoS-защита, индивидуальный дизайн | PrimeCoder',
    seoDescription:
      'Магазин на OpenCart с кастомным UI и серверной защитой. Подходит для бизнеса, которому важны скорость запуска и контроль над хостингом.',
    seoKeywords: 'OpenCart, интернет-магазин, DDoS защита, веб-разработка, PrimeCoder',
  },
  {
    slug: 'marketing-fullstack-catalog-case',
    title: 'Каталог под ключ: маркетинг, 3D и реклама',
    summary:
      'Полный цикл: маркетинг и рекомендации для отдела продаж, UI/UX, сайт-каталог, копирайтинг, 3D-модели экстерьера, регистрация в каталогах и кабинетах Яндекса, ведение Яндекс.Директа.',
    category: 'marketing',
    tools: ['Figma', 'WordPress', 'PHP', 'JavaScript', 'Blender'],
    metrics: { 'Дней разработки': 90, 'Каналов привлечения': 6 },
    gallery: [],
    heroImageUrl: null,
    isPublished: false,
    seoTitle: 'Кейс: маркетинг, каталог, 3D, Директ | PrimeCoder',
    seoDescription:
      'Связка стратегии, продукта и рекламы: от исследования до 3D и контекста. Для клиентов, которым нужен не только сайт, а внятная воронка.',
    seoKeywords: 'маркетинг, 3D визуализация, Яндекс Директ, каталог, PrimeCoder',
  },
  {
    slug: 'pixel-perfect-wordpress-case',
    title: 'Pixel Perfect на WordPress',
    summary:
      'Сайт по макету заказчика с pixel perfect вёрсткой на WordPress без готовых шаблонов — чистая тема, предсказуемая админка и точное совпадение с дизайном.',
    category: 'website',
    tools: ['WordPress', 'PHP', 'JavaScript', 'CSS', 'HTML'],
    metrics: { 'Дней разработки': 28, 'Макетов': 12 },
    gallery: [],
    heroImageUrl: null,
    isPublished: false,
    seoTitle: 'Кейс: Pixel Perfect, кастомная тема WordPress | PrimeCoder',
    seoDescription:
      'Точная посадка дизайна на WordPress для команд с утверждённым UI и жёсткими требованиями к пикселям и типографике.',
    seoKeywords: 'WordPress, pixel perfect, вёрстка, PrimeCoder',
  },
  {
    slug: 'bads-wordpress-case',
    title: 'Каталог БАДов и SMM',
    summary:
      'Сайт-каталог продажи БАДов на WordPress: адаптивный UI/UX в Figma, SMM, SEO, копирайтинг, мультиязычность (украинский), 3D-упаковки в Blender.',
    category: 'website',
    tools: ['WordPress', 'PHP', 'Figma', 'Blender', 'JavaScript'],
    metrics: { 'Дней разработки': 72, 'SKU': '100+' },
    gallery: [],
    heroImageUrl: null,
    isPublished: false,
    seoTitle: 'Кейс: БАДы, WordPress, 3D упаковка, мультиязычность | PrimeCoder',
    seoDescription:
      'E-commerce для нутрацевтики: дизайн, контент, SEO и соцсети плюс визуализация упаковки для доверия к бренду на полке и онлайн.',
    seoKeywords: 'БАД, WooCommerce, WordPress, Blender, мультиязычный сайт, PrimeCoder',
  },
  {
    slug: 'food-delivery-case',
    title: 'Доставка пиццы и суши',
    summary:
      'Сайт сервиса доставки еды: UX/UI, адаптивная вёрстка, личный кабинет, каталог, корзина и приём оплаты.',
    category: 'website',
    tools: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Figma'],
    metrics: { 'Дней разработки': 48, 'Экранов': 22 },
    gallery: [],
    heroImageUrl: null,
    isPublished: false,
    seoTitle: 'Кейс: доставка еды, ЛК, оплата, каталог | PrimeCoder',
    seoDescription:
      'Продуктовый сайт для быстрой еды: удобный заказ с телефона, понятная воронка и интеграция платежей.',
    seoKeywords: 'доставка еды, интернет-магазин, личный кабинет, PrimeCoder',
  },
  {
    slug: 'travel-wordpress-case',
    title: 'Туристический портал на WordPress',
    summary:
      'Сайт по туризму: ускорение загрузки, оптимизация медиа и блоков, поиск туров по операторам, подключение CRM.',
    category: 'website',
    tools: ['WordPress', 'PHP', 'JavaScript', 'MySQL'],
    metrics: { 'Дней разработки': 56, 'Интеграций': 3 },
    gallery: [],
    heroImageUrl: null,
    isPublished: false,
    seoTitle: 'Кейс: туры, поиск, CRM, WordPress | PrimeCoder',
    seoDescription:
      'Медиатяжёлый туристический проект: перфоманс, агрегатор предложений и связка с CRM для обработки лидов.',
    seoKeywords: 'туризм, WordPress, CRM, поиск туров, PrimeCoder',
  },
  {
    slug: 'internal-booking-case',
    title: 'Внутренняя система бронирования',
    summary:
      'Участие в разработке ПО для внутреннего использования: бронирование, внутренний чат и личные кабинеты сотрудников.',
    category: 'website',
    tools: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
    metrics: { 'Дней разработки': 120, 'Модулей': 5 },
    gallery: [],
    heroImageUrl: null,
    isPublished: false,
    seoTitle: 'Кейс: внутренний портал, бронь, чат | PrimeCoder',
    seoDescription:
      'Корпоративный софт: координация ресурсов, коммуникации и роли пользователей без лишней публичности.',
    seoKeywords: 'внутренний портал, бронирование, React, PrimeCoder',
  },
  {
    slug: 'autorus-case',
    title: 'Autorus — Яндекс Директ',
    summary:
      'Настройка и ведение Яндекс Директа для autorus.ru: семантика, структура кампаний, минусации, Метрика и сопутствующие работы по аналитике.',
    category: 'advertising',
    tools: ['SEO', 'JavaScript', 'HTML', 'CSS', 'MySQL'],
    metrics: { 'Кампаний': 12, 'Кластеров семантики': 40 },
    gallery: [],
    heroImageUrl: null,
    donorUrl: 'https://www.autorus.ru',
    isPublished: false,
    seoTitle: 'Кейс Autorus: Яндекс Директ, семантика | PrimeCoder',
    seoDescription:
      'Контекст для автозапчастей: ядро запросов, РСЯ и поиск, прозрачные KPI.',
    seoKeywords: 'Autorus, Директ, семантика, PrimeCoder',
  },
  {
    slug: 'roscapital-case',
    title: 'RosCapital — корпоративный сайт',
    summary:
      'Разработка корпоративного сайта roscapital.ru: архитектура разделов, UX/UI, адаптив, формы и интеграции, базовая SEO-подготовка.',
    category: 'website',
    tools: ['Figma', 'React', 'TypeScript', 'Node.js', 'PostgreSQL'],
    metrics: { 'Дней разработки': 72, 'Страниц': 32 },
    gallery: [],
    heroImageUrl: null,
    donorUrl: 'https://roscapital.ru',
    isPublished: false,
    seoTitle: 'Кейс RosCapital: корпоративный сайт | PrimeCoder',
    seoDescription:
      'Финансовый бренд в web: доверие, структура услуг и скорость для клиента.',
    seoKeywords: 'RosCapital, корпоративный сайт, PrimeCoder',
  },
  {
    slug: 'growfood-case',
    title: 'Доставка рационов (Growfood-подобный сервис)',
    summary:
      'Сайт доставки готового питания: меню, подписка, корзина, оплата и ЛК — в логике сервисов уровня Growfood и локальных white-label кухонь.',
    category: 'website',
    tools: ['Figma', 'React', 'TypeScript', 'Node.js', 'PostgreSQL'],
    metrics: { 'Дней разработки': 58, 'Экранов': 24 },
    gallery: [],
    heroImageUrl: null,
    donorUrl: 'https://growfood.ru',
    isPublished: false,
    seoTitle: 'Кейс: доставка рационов, подписка | PrimeCoder',
    seoDescription:
      'Foodtech-витрина: мобильная воронка, подписка и повторные заказы.',
    seoKeywords: 'доставка еды, growfood, foodtech, PrimeCoder',
  },
];

/** @type {Record<string, any>} */
export const PATCHES = {
  'umagazine-case': {
    summary:
      'Сайт редакции: стабилизация продакшена, устранение ошибок текущего портала, оптимизация кода и интеграций с 1С-Битрикс. Следующий этап — новый UI/UX и интернет-портал Umagazine на React.',
    seoTitle: 'Кейс Umagazine: Битрикс, React-портал, техдолг | PrimeCoder',
    seoDescription:
      'Как мы готовим медиаплатформу к росту: чистый бэкенд-контур под Битрикс, предсказуемые релизы и дорожная карта переноса на React для редакции и читателей.',
    seoKeywords: 'Umagazine, 1С-Битрикс, React, медиа, PrimeCoder',
    contentJson: {
      categories: ['website'],
      sections: S.all,
      hero: { title: 'Umagazine', subtitle: 'Медиаплатформа: стабильность сейчас и React завтра' },
      about: {
        title: 'О проекте',
        description:
          'Редакционный трафик и контент-машина требуют не «красивой витрины», а выносливого движка. Мы закрыли критические зоны риска: ошибки стабильности, тяжёлые интеграции с 1С-Битрикс и узкие места кода, которые мешали масштабированию. Параллельно выстроили понятную базу для перехода на React-портал — чтобы не ломать SEO и не терять операционку выпусков.\n\nДля нового клиента это сигнал: мы умеем жить в легаси и одновременно проектировать будущее без «большого взрыва».',
        taskTitle: 'Задачи',
        taskText:
          'Снять технический долг, устранить сбои продакшена, привести интеграции с Битрикс к предсказуемому поведению и подготовить концепцию нового портала на React с упором на скорость страниц и удобство редакции.',
        solutionTitle: 'Решение',
        solutionText:
          'Провели аудит и точечно переписали проблемные участки, укрепили контур интеграций, оптимизировали критический путь отдачи страниц. Зафиксировали требования к UI/UX нового портала и технический каркас будущего React-приложения, чтобы миграция шла поэтапно с измеримыми метриками.',
      },
      typography: {
        title: 'Типографика',
        fontFamily: '"PT Serif", Georgia, serif',
        description: 'Для медиа важна читабельность длинных материалов и дисциплина иерархии заголовков.',
        fontSizes: ['15px', '18px', '22px', '28px', '40px'],
      },
      tools: {
        title: 'Стек и инструменты',
        description:
          'Совмещаем зрелую CMS-экосистему с современным фронтом там, где это реально снижает риски.\nСтек подбираем так, чтобы редакция не страдала в админке, а разработка получала прозрачный деплой.',
        items: toolItems(['1C-Bitrix', 'React', 'PHP', 'JavaScript', 'MySQL']),
        ctaResults: ['Меньше инцидентов на проде', 'Прозрачный план миграции на React', 'Сохранение SEO-контура'],
      },
      performance: perf(
        [
          ['Время отклика API (цель)', '< 200 мс', 'good'],
          ['Стабильность релизов', 'контролируемые', 'excellent'],
          ['Готовность к React-этапу', 'роадмап', 'excellent'],
        ],
        91
      ),
      results: {
        title: 'Результат',
        description:
          'Платформа переведена в режим управляемых изменений: меньше неожиданных падений, ясная связка с Битрикс и понятный вектор на React без остановки бизнеса.',
        days: '45+',
        screens: 'многостраничный портал',
        features: ['Аудит и устранение критических ошибок', 'Оптимизация интеграций с 1С-Битрикс', 'Дорожная карта React-портала'],
      },
      colors: { palette: [{ color: '#1a1a1a' }, { color: '#f5f5f0' }, { color: '#c9a227' }] },
    },
  },

  'kchtz-case': {
    summary:
      'Интернет-магазин B2B/B2C: исправление корзины и о Checkout, синхронизация остатков с 1С, новый API для долевого сервиса, корректная аналитика (Яндекс.Метрика, Google Analytics), совместный редизайн с командой заказчика и рост ключевой конверсии.',
    seoTitle: 'Кейс KCHTZ: e-commerce, 1С, конверсия ×14 | PrimeCoder',
    seoDescription:
      'Восстановили доверие к воронке покупки, выстроили обмен с 1С и ввели измеримую аналитику. История для тех, кому нужен не лендинг, а промышленный e-commerce.',
    seoKeywords: 'интернет-магазин, 1С, конверсия, редизайн, PrimeCoder',
    contentJson: {
      categories: ['website', 'marketing'],
      sections: S.all,
      hero: { title: 'KCHTZ', subtitle: 'E-commerce, где корзина и склад говорят на одном языке' },
      about: {
        title: 'О проекте',
        description:
          'Сложный каталожный бизнес не прощает «почти работает»: если корзина и оформление заказа ломаются, страдает не только CR, но и доверие оптовых клиентов. Задача включала восстановление критических пользовательских сценариев, выгрузку остатков склада в реальном времени и подключение нового сервиса продажи «долями» через API.\n\nОтдельный пласт — аналитика: без чистых данных в Метрике и GA невозможно масштабировать рекламу и SEO. Мы синхронизировали события и цели с фактическими действиями пользователя.',
        taskTitle: 'Задачи',
        taskText:
          'Починить корзину и checkout, синхронизировать остатки с 1С, реализовать API для сервиса долей, настроить передачу событий в Метрику и GA, участвовать в редизайне и не потерять работающий трафик.',
        solutionTitle: 'Решение',
        solutionText:
          'Разобрали цепочку от карточки товара до заказа, устранили логические и фронтовые баги, настроили обмен с 1С так, чтобы склад был источником истины. Подготовили контракт API для внешнего сервиса оплаты частями. Совместно с дизайнерами заказчика внедрили обновлённые шаблоны и провели серию A/B-проверок на локальных контурах до выката на бой.',
      },
      typography: {
        title: 'Типографика',
        fontFamily: 'Inter, system-ui, sans-serif',
        description: 'Нейтральный гротеск для плотных каталожных таблиц и мобильной воронки.',
        fontSizes: ['14px', '16px', '20px', '26px', '34px'],
      },
      tools: {
        title: 'Инструменты',
        description: 'E-commerce уровня «завод × склад × маркетинг».\nИнтеграции и фронт должны выдерживать пиковые нагрузки.',
        items: toolItems(['PHP', 'JavaScript', 'MySQL', '1C-Bitrix', 'HTML', 'CSS']),
        ctaResults: ['Конверсия выросла многократно (по ключевой воронке)', 'Корректные данные для рекламы и SEO', 'Стабильный обмен с 1С'],
      },
      performance: perf(
        [
          ['Обмен остатками', 'стабильно', 'excellent'],
          ['Аналитика', 'сверка событий', 'excellent'],
          ['Конверсия ключевого сценария', 'рост ×14', 'excellent'],
        ],
        94
      ),
      results: {
        title: 'Результат',
        description:
          'Пользователь снова проходит путь от подбора до оплаты без тупиков, бизнес получает достоверную картину по каналам, а склад и сайт не спорят друг с другом.',
        days: '110+',
        screens: '30+',
        features: ['Рабочая корзина и оформление', 'Интеграция с 1С и API долей', 'Метрика и GA с корректными целями', 'Редизайн с учётом конверсии'],
      },
      colors: { palette: [{ color: '#0d1b2a' }, { color: '#e0e1dd' }, { color: '#fca311' }] },
    },
  },

  'madeo-case': {
    summary:
      'Интернет-магазин оптово-розничной торговли Madeo: UX/UI, акцент на качестве продукта в визуале, съёмка с выездом штатного фотографа в офис клиента для контента, который продаёт без «стоковой» серости.',
    seoTitle: 'Кейс Madeo: e-commerce, контент, UI/UX | PrimeCoder',
    seoDescription:
      'Как превратить FMCG/OEM-каталог в витрину доверия: дизайн, фотопроизводство и техреализация магазина, где товар чувствуется «живым».',
    seoKeywords: 'Madeo, интернет-магазин, UI/UX, фотоконтент, PrimeCoder',
    contentJson: {
      categories: ['website', 'design'],
      sections: S.all,
      hero: { title: 'Madeo', subtitle: 'Магазин, где продукт снимают так, как он выглядит в жизни' },
      about: {
        title: 'О проекте',
        description:
          'В нише, где конкурируют не только цены, но и ощущение бренда, шаблонные фото убивают дифференциацию. Мы выстроили дизайн вокруг реального продукта: от макета и композиции до производственной съёмки в офисе клиента. Так покупатель видит фактуру, упаковку и детали — то, ради чего он выбирает поставщика, а не «ещё один каталог».\n\nДля нового заказчика важен сигнал: PrimeCoder закрывает и продуктовую визуализацию, и инженерную часть магазина.',
        taskTitle: 'Задачи',
        taskText:
          'Спроектировать UX/UI под B2B/B2C закупки, усилить визуальную подачу товаров, организовать фотосессию на площадке клиента, внедрить адаптивную вёрстку и бизнес-логику корзины и каталога.',
        solutionTitle: 'Решение',
        solutionText:
          'Собрали дизайн-систему карточек и листингов, согласовали сценографию съёмок, отретушировали материалы под единый стиль бренда и связали контент с бэкендом так, чтобы контент-менеджер мог обновлять линейки без разработчика на каждый релиз.',
      },
      typography: {
        title: 'Типографика',
        fontFamily: 'Montserrat, "Helvetica Neue", sans-serif',
        description: 'Спокойный гротеск для заголовков и чёткий текст для характеристик и условий поставки.',
        fontSizes: ['14px', '17px', '22px', '30px', '44px'],
      },
      tools: {
        title: 'Инструменты',
        description: 'Полный цикл от Figma до готовых ассетов в магазине.\nЕдиный визуальный язык на всех брейкпоинтах.',
        items: toolItems(['Figma', '1C-Bitrix', 'PHP', 'JavaScript', 'MySQL']),
        ctaResults: ['Фото-контент «с полки», не со стока', 'Понятная навигация по категориям', 'Готовность к масштабированию ассортимента'],
      },
      performance: perf(
        [
          ['Скорость отдачи шаблонов', 'оптимизация', 'good'],
          ['Контент-процесс', 'выездная съёмка', 'excellent'],
          ['Конверсия в заявку', 'рост доверия', 'excellent'],
        ],
        90
      ),
      results: {
        title: 'Результат',
        description:
          'Каталог выглядит как бренд, а не как типовая витрина; команда клиента получила воспроизводимый пайплайн обновления товаров.',
        days: '90',
        screens: '25+',
        features: ['UI/UX под опт-розницу', 'Фотопродакшн на площадке клиента', 'Интеграция контента и магазина'],
      },
      colors: { palette: [{ color: '#2b2d42' }, { color: '#edf2f4' }, { color: '#ef233c' }] },
    },
  },

  'straumann-case': {
    summary:
      'Аутсорсинг для ООО «МедТех21»: веб-платформа, синхронизация с мобильным контуром и усиление безопасности данных в период интеграции со Straumann Group. Отдельные модули для согласованной работы сайта и приложений.',
    seoTitle: 'Кейс Straumann / МедТех21: веб, интеграции, compliance | PrimeCoder',
    seoDescription:
      'Медицинский B2B с жёсткими требованиями к данным: кастомные модули, связка с мобильной частью и дисциплина релизов при слияниях.',
    seoKeywords: 'медтех, Straumann, интеграция, безопасность данных, PrimeCoder',
    contentJson: {
      categories: ['website'],
      sections: S.all,
      hero: { title: 'Straumann Group', subtitle: 'Медтех и корпоративная трансформация без простоя' },
      about: {
        title: 'О проекте',
        description:
          'Фарма и медтех — это не только интерфейс, но и трассировка данных, разграничение доступа и готовность к аудиту при смене владельца бизнеса. Мы работали совместно с «МедТех21» на веб-части и мостах к мобильным сервисам, чтобы контент, каталоги и пользовательские сценарии не разъезжались при миграции в экосистему Straumann Group.\n\nДля нового клиента из регулируемых отраслей это означает предсказуемые процессы и минимизацию «ручных» зон риска.',
        taskTitle: 'Задачи',
        taskText:
          'Обеспечить устойчивую работу публичного веба, синхронизировать ключевые сущности с мобильным приложением, подготовить архитектуру к усиленным требованиям безопасности и отчётности.',
        solutionTitle: 'Решение',
        solutionText:
          'Спроектировали модульный контур API, внедрили согласованные форматы обмена, разделили публичные и служебные потоки данных, настроили практики code review и контроля деплоя, чтобы изменения не ломали mobile/web паритет.',
      },
      typography: {
        title: 'Типографика',
        fontFamily: '"IBM Plex Sans", sans-serif',
        description: 'Нейтральная корпоративная сетка: ясные подписи, спокойные отступы, высокая читабельность форм.',
        fontSizes: ['14px', '16px', '20px', '28px', '36px'],
      },
      tools: {
        title: 'Инструменты',
        description: 'Корпоративный стек с акцентом на типизацию и наблюдаемость.\nВажна не скорость «на старте», а предсказуемость на годы.',
        items: toolItems(['React', 'TypeScript', 'Node.js', 'PostgreSQL']),
        ctaResults: ['Единый источник данных для web/mobile', 'Готовность к усложнению compliance', 'Модульность без расползания кода'],
      },
      performance: perf(
        [
          ['Надёжность интеграций', 'мониторинг', 'excellent'],
          ['Безопасность', 'усиленный контур', 'excellent'],
          ['Time-to-market фич', 'по спринтам', 'good'],
        ],
        93
      ),
      results: {
        title: 'Результат',
        description:
          'Веб и мобильные сервисы развиваются согласованно; команда клиента получила управляемую платформу на период интеграции в глобальный холдинг.',
        days: '120',
        screens: '40+',
        features: ['Индивидуальные модули синхронизации', 'Усиление защиты данных', 'Поддержка процесса слияния со Straumann'],
      },
      colors: { palette: [{ color: '#003049' }, { color: '#f8f9fa' }, { color: '#669bbc' }] },
    },
  },

  'straumann-mobile-case': {
    summary:
      'Мобильные приложения iOS и Android для профильной аудитории Straumann: доступ к материалам, сервисам и сценариям, согласованным с веб-платформой MedTech21.',
    seoTitle: 'Кейс Straumann: iOS и Android | PrimeCoder',
    seoDescription:
      'Параллельная разработка двух нативных контуров и общая логика данных с вебом — для команд, которым нужна мобильность без фрагментации продуктовой линии.',
    seoKeywords: 'мобильное приложение, iOS, Android, медтех, PrimeCoder',
    contentJson: {
      categories: ['mobile', 'website'],
      sections: S.all,
      hero: { title: 'Straumann Mobile', subtitle: 'Два стора — одна продуктовая логика' },
      about: {
        title: 'О проекте',
        description:
          'В медицинском B2B часть ценности — «в поле»: врач или представитель не должен упираться в неудобный веб на телефоне. Мы помогли собрать мобильные клиенты, которые наследуют права, контент и ключевые действия от серверной части, не дублируя бизнес-правила вручную на каждой платформе.',
        taskTitle: 'Задачи',
        taskText:
          'Реализовать стабильные клиенты под iOS и Android, обеспечить офлайн-дружелюбные экраны там, где это критично, синхронизировать релизы с веб-модулями.',
        solutionTitle: 'Решение',
        solutionText:
          'Единый контракт API, общий дизайн-кит адаптированный под гайдлайны Apple и Google, модульная навигация и поэтапный вывод фич с бета-тестом на ключевых пользователях.',
      },
      typography: {
        title: 'Типографика',
        fontFamily: 'SF Pro Display, system-ui, sans-serif',
        description: 'Системные шрифты для нативного ощущения и предсказуемых размеров на экранах от SE до Pro Max.',
        fontSizes: ['13px', '15px', '17px', '22px', '28px'],
      },
      tools: {
        title: 'Инструменты',
        description: 'Кросс-командная разработка с общим бэкендом.\nМеньше сюрпризов при обновлениях App Store / Google Play.',
        items: toolItems(['React Native', 'TypeScript', 'Node.js']),
        ctaResults: ['Пара iOS + Android из одной кодовой базы', 'Согласованность с вебом', 'Контролируемые релизы'],
      },
      performance: perf(
        [
          ['Стабильность на слабых устройствах', 'профилирование', 'good'],
          ['Синхронизация с вебом', 'единый API', 'excellent'],
          ['Время отклика экранов', 'lazy + кэш', 'excellent'],
        ],
        92
      ),
      results: {
        title: 'Результат',
        description:
          'Пользователи получают привычный нативный UX, а бизнес — канал, который не расходится с корпоративным сайтом и внутренними процессами.',
        days: '90',
        screens: '35+',
        features: ['iOS и Android', 'Общая логика с веб-платформой', 'Поэтапный rollout фич'],
      },
      colors: { palette: [{ color: '#1b263b' }, { color: '#ffffff' }, { color: '#415a77' }] },
    },
  },

  'alaska-case': {
    summary:
      'Аналитика внутреннего и внешнего рынка для Alaska Firewood и проектирование UX/UI. Сложность — бизнес одновременно в Европе (производство в Италии) и в России: разные ожидания аудитории, логистика и язык коммуникации.',
    seoTitle: 'Кейс Alaska Firewood: UX/UI, международный бренд | PrimeCoder',
    seoDescription:
      'Как выстроить цифровой опыт для экспортного продукта с двумя географическими контурами и не потерять ясность оффера.',
    seoKeywords: 'Alaska Firewood, UX/UI, аналитика, B2B, PrimeCoder',
    contentJson: {
      categories: ['website', 'design'],
      sections: S.all,
      hero: { title: 'Alaska Firewood', subtitle: 'Один бренд — две культуры потребления' },
      about: {
        title: 'О проекте',
        description:
          'Дрова и твёрдое топливо продаются глазами «как это горит» и головой «как это приедет». Мы углубились в рынок: кто принимает решение в EU, кто в РФ, какие доказательства качества работают в каждой юрисдикции, и как это перевести в структуру сайта без перегруза.\n\nРезультат — UX/UI, который одинаково уверенно объясняет продукт и логистику, не смешивая контексты.',
        taskTitle: 'Задачи',
        taskText:
          'Исследовать конкурентов и ЦА в двух регионах, сформировать IA и контентную матрицу, подготовить UI с упором на доверие и производственную историю.',
        solutionTitle: 'Решение',
        solutionText:
          'Собрали карту болей и триггеров заказа, переразложили разделы под задачи сегментов, визуально усилили «происхождение» продукта и сделали понятную ветку логистики/документов для B2B.',
      },
      typography: {
        title: 'Типографика',
        fontFamily: '"Cormorant Garamond", "Times New Roman", serif',
        description: 'Сериф для премиального ощущения натурального продукта и контрастный sans для спецификаций.',
        fontSizes: ['15px', '18px', '22px', '32px', '48px'],
      },
      tools: {
        title: 'Инструменты',
        description: 'Дизайн-мышление + инженерная дисциплина.\nОтдельно проработаны сценарии опта и розницы.',
        items: toolItems(['Figma', 'React', 'TypeScript', 'Node.js']),
        ctaResults: ['Ясный оффер для EU и РФ', 'Снижение вопросов в поддержку', 'Основа для роста SEO и рекламы'],
      },
      performance: perf(
        [
          ['Понятность логистики', 'отдельный поток', 'excellent'],
          ['Глубина вовлечения', 'контент-матрица', 'good'],
          ['Единый бренд', 'одна дизайн-система', 'excellent'],
        ],
        89
      ),
      results: {
        title: 'Результат',
        description:
          'Сайт перестал быть «переводом брошюры» — он отвечает на реальные вопросы покупателя до контакта с отделом продаж.',
        days: '30',
        screens: '18',
        features: ['Исследование рынка EU/RU', 'UX/UI под двойной контур', 'Готовность к масштабированию контента'],
      },
      colors: { palette: [{ color: '#2f1812' }, { color: '#f4e9d8' }, { color: '#c45c26' }] },
    },
  },

  'litclinic-case': {
    summary:
      'Сайт и кабинет для московского медцентра: запись к врачу, анализы, онлайн-консультации, синхронизация с БИТ.Управление медицинским центром, соответствие требованиям ЕГИСЗ и защите данных.',
    seoTitle: 'Кейс медцентра: ЛК, БИТ, ЕГИСЗ | PrimeCoder',
    seoDescription:
      'Медицинский digital с юридически значимыми процессами: расписание, результаты, телемедицина и интеграция с учётной системой.',
    seoKeywords: 'медицинский сайт, личный кабинет, ЕГИСЗ, БИТ, PrimeCoder',
    contentJson: {
      categories: ['website'],
      sections: S.all,
      hero: { title: 'Медицинский центр', subtitle: 'Сервис для пациента и прозрачность для клиники' },
      about: {
        title: 'О проекте',
        description:
          'Медицина — высокорисковый домен: здесь не только UX, но и корректность статусов записи, защита ПДн и понимание того, что можно показывать онлайн, а что только после идентификации. Мы построили связку публичного сайта и ЛК: от выбора врача до просмотра результатов и телемедицинских сессий, синхронизированных с БИТ.УМК.\n\nДля новой клиники это снижает нагрузку на регистратуру и повышает лояльность за счёт предсказуемости.',
        taskTitle: 'Задачи',
        taskText:
          'Реализовать запись и статусы приёмов, выдачу результатов анализов в безопасном контуре, онлайн-консультации, интеграцию с БИТ и соблюдение требований по данным.',
        solutionTitle: 'Решение',
        solutionText:
          'Разделили публичный и персональный контур, внедрили строгую аутентификацию, журналирование действий и контролируемый обмен с МИС, согласовали с заказчиком политики хранения и отображения данных.',
      },
      typography: {
        title: 'Типографика',
        fontFamily: 'Manrope, system-ui, sans-serif',
        description: 'Спокойный UI с крупными зонами касаний — критично для пациентов старшего возраста на мобильных.',
        fontSizes: ['15px', '17px', '20px', '26px', '36px'],
      },
      tools: {
        title: 'Инструменты',
        description: 'WordPress как основа публичной части + кастомные модули ЛК и интеграции.\nФокус на доступности и ясных статусах.',
        items: toolItems(['WordPress', 'PHP', 'JavaScript', 'MySQL']),
        ctaResults: ['Меньше звонков в регистратуру', 'Пациент видит статус записи и анализов', 'Учётная система остаётся источником истины'],
      },
      performance: perf(
        [
          ['Защита данных', 'сегментация', 'excellent'],
          ['Синхронизация с БИТ', 'стабильный обмен', 'excellent'],
          ['Доступность UI', 'mobile-first', 'good'],
        ],
        91
      ),
      results: {
        title: 'Результат',
        description:
          'Клиника получает управляемый цифровой фронт, пациент — простой путь от записи до результата без хаоса в мессенджерах.',
        days: '60',
        screens: '28',
        features: ['ЛК с анализами и консультациями', 'Интеграция с БИТ.УМК', 'Учёт регламентов по данным'],
      },
      colors: { palette: [{ color: '#0f4c5c' }, { color: '#fbfff1' }, { color: '#bfdbf7' }] },
    },
  },

  'ursus-case': {
    summary:
      'Глубокая маркетинговая и SEO-аналитика, стратегия с календарём, семантическое ядро, исправление внутренней SEO-структуры, кампании в Google Ads и Яндекс Директ, сопровождение кабинетов, вывод в топ по ключевым запросам.',
    seoTitle: 'Кейс УРСУС: SEO, Директ, семантика | PrimeCoder',
    seoDescription:
      'От диагностики до топа: не абстрактный «рост трафика», а выверенное ядро, техническая гигиена и управляемый бюджет контекста.',
    seoKeywords: 'SEO, Яндекс Директ, Google Ads, семантика, PrimeCoder',
    contentJson: {
      categories: ['seo', 'marketing', 'advertising'],
      sections: S.all,
      hero: { title: 'Урсус', subtitle: 'Поиск + контекст как система, а не разовый «пакет»' },
      about: {
        title: 'О проекте',
        description:
          'Многие приходят с запросом «нам нужно SEO», имея в виду «хочу в топ завтра». Мы начинаем с диагностики: где сайт теряет краулинговый бюджет, как распределена семантика, что не так со сниппетами и как контекст дублирует органику без синергии. Дальше — календарь работ, а не слепой контент-план.\n\nТакой подход снижает стоимость лида и ускоряет обучение алгоритмов и аукционов в рекламе.',
        taskTitle: 'Задачи',
        taskText:
          'Собрать и кластеризовать семантику, устранить технические и структурные ошибки, запустить и оптимизировать Директ и Google Ads, вывести ключевые группы запросов в топ и закрепить процесс сопровождения.',
        solutionTitle: 'Решение',
        solutionText:
          'Перепаковали структуру посадочных, синхронизировали мета и контент с интентом, настроили цели и сквозную аналитику, развели кампании по намерению, ввели еженедельный контур отчётности и правок по поисковым справкам.',
      },
      typography: {
        title: 'Типографика',
        fontFamily: 'Inter, sans-serif',
        description: 'Нейтральная сетка для отчётных дашбордов и лендингов, которые живут в связке с ERP маркетинга.',
        fontSizes: ['14px', '16px', '18px', '24px', '32px'],
      },
      tools: {
        title: 'Инструменты',
        description: 'Сквозная аналитика и дисциплина гипотез.\nКаждая ставка и каждый title должны быть объяснимы.',
        items: toolItems(['SEO', 'JavaScript', 'HTML', 'CSS', 'WordPress']),
        ctaResults: ['Топ по целевым кластерам', 'Прозрачный PPC с управляемым CPA', 'Документированная стратегия на квартал'],
      },
      performance: perf(
        [
          ['Технический SEO', 'исправлено', 'excellent'],
          ['Семантика', 'ядро + кластеры', 'excellent'],
          ['Синергия SEO и PPC', 'единая модель', 'good'],
        ],
        93
      ),
      results: {
        title: 'Результат',
        description:
          'Органика и контекст перестают конкурировать за внимание бизнеса — они измеряются общими бизнес-целями и прогнозируемостью бюджета.',
        features: ['Семантика и структура', 'Внутреннее SEO', 'Директ и Google Ads', 'Сопровождение кабинетов'],
      },
      colors: { palette: [{ color: '#10002b' }, { color: '#f8f5f2' }, { color: '#c77dff' }] },
    },
  },

  'leta-case': {
    summary:
      'UX/UI интернет-магазина ювелирных украшений LETA: строгое ТЗ, корпоративные бренд-ограничения и дисциплина премиальной подачи без визуального шума.',
    seoTitle: 'Кейс LETA: ювелирный e-commerce, UI/UX | PrimeCoder',
    seoDescription:
      'Как продавать украшения онлайн, где важен каждый миллиметр кадра и доверие к бренду: дизайн под жёсткие гайды.',
    seoKeywords: 'LETA, ювелирный магазин, UI/UX, Figma, PrimeCoder',
    contentJson: {
      categories: ['website', 'design'],
      sections: S.all,
      hero: { title: 'LETA', subtitle: 'Ювелирный ритейл: точность визуала и ясность выбора' },
      about: {
        title: 'О проекте',
        description:
          'В jewelry e-commerce конверсия держится на микродеталях: как лежит блик на металле, как показана вставка, насколько понятна геометрия изделия на мобильном. LETA пришла с корпоративным ТЗ и бренд-рамками — наш UI/UX должен был усилить премиальность, не ломая узнаваемые коды бренда.',
        taskTitle: 'Задачи',
        taskText:
          'Сформировать IA каталога и карточки товара, проработать сценарии выбора характеристик, согласовать визуальные паттерны с бренд-гайдом, подготовить макеты для адаптива.',
        solutionTitle: 'Решение',
        solutionText:
          'Построили модульную сетку карточки с крупным медиа и вторичными подсказками, ввели единый ритм отступов и типографики, отделили «эмоциональный» слой от «инженерного» (проба, камень, геометрия).',
      },
      typography: {
        title: 'Типографика',
        fontFamily: '"Playfair Display", Georgia, serif',
        description: 'Контраст serif для премиальных заголовков и спокойный sans для спецификаций и условий.',
        fontSizes: ['14px', '16px', '20px', '30px', '42px'],
      },
      tools: {
        title: 'Инструменты',
        description: 'Figma как единый источник правды для дизайна и передачи в вёрстку.\nМеньше субъективных «поправьте чуть-чуть».',
        items: toolItems(['Figma', 'HTML', 'CSS', 'JavaScript']),
        ctaResults: ['Премиальный UI без перегруза', 'Карточка товара под mobile-first', 'Соответствие бренд-ТЗ'],
      },
      performance: perf(
        [
          ['Визуальная дисциплина', 'гайды', 'excellent'],
          ['Сложные характеристики', 'структурированы', 'good'],
          ['Согласования', 'итерации в Figma', 'excellent'],
        ],
        88
      ),
      results: {
        title: 'Результат',
        description:
          'Дизайн системы готов к масштабированию коллекций без потери целостности бренда на всех точках контакта.',
        days: '35',
        screens: '20',
        features: ['UI/UX под ювелирный сегмент', 'Строгие корпоративные ограничения', 'Адаптивные сценарии выбора'],
      },
      colors: { palette: [{ color: '#1a1a1a' }, { color: '#faf8f5' }, { color: '#c5a572' }] },
    },
  },

  'winwin-case': {
    summary:
      'Сайт на WordPress по готовому шаблону в жёстких сроках с мультиязычностью, включая китайский: нестандартная типографика, RTL-подобные нюансы верстки и дисциплина контент-импорта.',
    seoTitle: 'Кейс WinWin China: мультиязычный WordPress | PrimeCoder',
    seoDescription:
      'Быстрый запуск и китайский язык: сборка темы, языковые версии и контроль переносов/иерархии без поломки макета.',
    seoKeywords: 'WordPress, мультиязычность, китайский язык, PrimeCoder',
    contentJson: {
      categories: ['website'],
      sections: S.all,
      hero: { title: 'WinWin China', subtitle: 'Сжатые сроки и язык, который ломает шаблоны' },
      about: {
        title: 'О проекте',
        description:
          'Международный торговый контур требует не «перевод кнопок», а выстроенного пайплайна: где живёт контент, как версионируются страницы, как не дублируется SEO и как QA проверяет иероглифы на разных устройствах. Мы собрали WordPress-тему вокруг бизнес-шаблона заказчика и встроили мультиязычный режим с упором на китайскую локаль.',
        taskTitle: 'Задачи',
        taskText:
          'Уложиться в дедлайн, реализовать мультиязычность с китайским, стабилизировать вёрстку под расширяющиеся строки и разную ширину символов, подготовить инструкции для контент-команды.',
        solutionTitle: 'Решение',
        solutionText:
          'Настроили языковые версии и маршрутизацию slug, отладили типографику и межстрочные интервалы, автоматизировали часть импорта товарных данных, ввели чеклист QA для каждой локали.',
      },
      typography: {
        title: 'Типографика',
        fontFamily: '"Noto Sans SC", "Noto Sans", sans-serif',
        description: 'Поддержка китайского начертания и латиницы в одной системе без «каши» в весах начертаний.',
        fontSizes: ['14px', '16px', '20px', '26px', '34px'],
      },
      tools: {
        title: 'Инструменты',
        description: 'WordPress + Woo-подобные каталожные сценарии.\nСроки бьются процессом, не ночными «костылями».',
        items: toolItems(['WordPress', 'PHP', 'WooCommerce', 'JavaScript']),
        ctaResults: ['Запуск в сжатые сроки', 'Китайская локаль без поломки UI', 'Повторяемый контент-процесс'],
      },
      performance: perf(
        [
          ['Сроки', 'релиз в окне', 'excellent'],
          ['Мультиязычность', 'CN + др.', 'good'],
          ['Каталог', 'масштабируемый', 'excellent'],
        ],
        87
      ),
      results: {
        title: 'Результат',
        description:
          'Компания получила запускаемый мультиязычный фронт для торгового контура без постоянной зависимости от emergency-фиксов.',
        days: '75',
        screens: '25',
        features: ['WordPress без глубокой кастомизации шаблона', 'Китайский и другие языки', 'Каталог и зации на импорт'],
      },
      colors: { palette: [{ color: '#14213d' }, { color: '#ffffff' }, { color: '#fca311' }] },
    },
  },

  'houses-case': {
    summary:
      'Сайт-каталог для «Дома России»: презентация типовых решений и проектов, удобная навигация по линейкам и формы захвата лида для отдела продаж застройки.',
    seoTitle: 'Кейс Дома России: каталог, лидогенерация | PrimeCoder',
    seoDescription:
      'Строительный каталог, где важно показать планировки и отличия серий без перегруза — и довести до заявки.',
    seoKeywords: 'каталог домов, застройка, lead gen, PrimeCoder',
    contentJson: {
      categories: ['website', 'marketing'],
      sections: S.all,
      hero: { title: 'Дома России', subtitle: 'Каталог, который продаёт планировку, а не только «картинку»' },
      about: {
        title: 'О проекте',
        description:
          'Покупатель дома сравнивает десятки однотипных предложений. Мы построили UX так, чтобы быстро понять класс дома, отличия комплектаций и следующий шаг — консультация или выезд. Формы и CTA синхронизированы с воронкой отдела продаж, чтобы маркетинг не плодил «мёртвые» заявки.',
        taskTitle: 'Задачи',
        taskText:
          'Структурировать каталог серий, выделить сравнимые характеристики, сделать мобильную воронку заявки, внедрить аналитику конверсий.',
        solutionTitle: 'Решение',
        solutionText:
          'Ввели единые каркасы карточек домов, фильтры по ключевым параметрам, быстрый доступ к типовым планировкам и понятные маршруты к форме; настроили цели в аналитике для качества лидов.',
      },
      typography: {
        title: 'Типографика',
        fontFamily: 'Raleway, system-ui, sans-serif',
        description: 'Лёгкий гротеск для воздуха в длинных списках и уверенные акценты на цифрах метров и высот потолков.',
        fontSizes: ['15px', '17px', '22px', '28px', '40px'],
      },
      tools: {
        title: 'Инструменты',
        description: 'Классический стек для быстрых каталожных сайтов с формами.\nГибкость без тяжёлого SPA там, где это не нужно.',
        items: toolItems(['HTML', 'CSS', 'JavaScript', 'PHP', 'MySQL']),
        ctaResults: ['Выше доля квалифицированных лидов', 'Понятная структура для SEO', 'Быстрый mobile UX'],
      },
      performance: perf(
        [
          ['Скорость на 4G', 'оптимизация', 'good'],
          ['Конверсия в заявку', 'рост за счёт UX', 'excellent'],
          ['Масштаб каталога', '25+ страниц', 'excellent'],
        ],
        88
      ),
      results: {
        title: 'Результат',
        description:
          'Застройщик получает витрину, которая не «ломает» менеджеров нецелевыми звонками и поддерживает рост органического трафика.',
        days: '45',
        screens: '25',
        features: ['Каталог серий', 'Калькулятор/заявки', 'Адаптив и аналитика'],
      },
      colors: { palette: [{ color: '#283618' }, { color: '#fefae0' }, { color: '#bc6c25' }] },
    },
  },

  'polygon-case': {
    summary:
      'Сайт производственной компании «Полигон»: каталог продукции, техническая документация и онлайн-заявки для B2B-отдела.',
    seoTitle: 'Кейс Полигон: B2B, каталог, документация | PrimeCoder',
    seoDescription:
      'Промышленный сайт: показать мощность производства и дать инженеру быстро найти спецификацию.',
    seoKeywords: 'Полигон, производство, B2B сайт, PrimeCoder',
    contentJson: {
      categories: ['website'],
      sections: S.all,
      hero: { title: 'Полигон', subtitle: 'Производство, которому нужен цифровой двойник витрины' },
      about: {
        title: 'О проекте',
        description:
          'В B2B-инжиниринге сайт — это не «брошюра», а фильтр квалификации лида. Мы выстроили структуру так, чтобы инженер находил изделие, чертежные зоны и документы без звонка в офис, а коммерция получала заявки с понятными полями запроса.',
        taskTitle: 'Задачи',
        taskText:
          'Организовать каталог продукции, витрину документов, формы запроса КП и техприсоединения, обеспечить адаптив для выездных продаж.',
        solutionTitle: 'Решение',
        solutionText:
          'Разделили маркетинговые и технические разделы, внедрили быстрый поиск по артикулам, связали карточки продукции с PDF и регламентами, настроили отслеживание интереса к позициям.',
      },
      typography: {
        title: 'Типографика',
        fontFamily: 'Roboto, Arial, sans-serif',
        description: 'Нейтральный инженерный шрифт с отличной читаемостью таблиц и чертежных подписей.',
        fontSizes: ['14px', '16px', '18px', '24px', '32px'],
      },
      tools: {
        title: 'Инструменты',
        description: 'Лёгкий стек для долгой эксплуатации без тяжёлого DevOps.\nФокус на ясности B2B-сценариев.',
        items: toolItems(['HTML', 'CSS', 'JavaScript', 'PHP']),
        ctaResults: ['Меньше «пустых» звонков в офис', 'Быстрее выдача документов клиенту', 'Витрина под выставки и партнёров'],
      },
      performance: perf(
        [
          ['Страницы', '40+', 'excellent'],
          ['Поиск по каталогу', 'да', 'good'],
          ['Заявки B2B', 'структурированы', 'excellent'],
        ],
        89
      ),
      results: {
        title: 'Результат',
        description:
          'Коммерция и инженерия говорят на одном языке через сайт — меньше трения в первом касании с заказчиком.',
        days: '50',
        screens: '40',
        features: ['Каталог и документация', 'Онлайн-заявки', 'Адаптив для полевых менеджеров'],
      },
      colors: { palette: [{ color: '#212529' }, { color: '#f8f9fa' }, { color: '#e63946' }] },
    },
  },

  'greendent-case': {
    summary:
      'Сайт стоматологической клиники: сервисная витрина, онлайн-запись, понятная структура услуг и визуальная тёплая эстетика без медицинского «холодa».',
    seoTitle: 'Кейс Greendent: стоматология, онлайн-запись | PrimeCoder',
    seoDescription:
      'Медицинский сайт с акцентом на доверие: запись, услуги и человеческий тон коммуникации.',
    seoKeywords: 'стоматология, сайт клиники, онлайн-запись, PrimeCoder',
    contentJson: {
      categories: ['website', 'design'],
      sections: S.all,
      hero: { title: 'Greendent', subtitle: 'Стоматология online-first без клинической суровости' },
      about: {
        title: 'О проекте',
        description:
          'Пациент выбирает клинику эмоционально: страх и доверие решают больше, чем список услуг. Мы собрали подачу бренда через тёплую палитру, понятные маршруты «что лечим → как записаться → что ожидать» и прозрачные блоки о врачах без воды.',
        taskTitle: 'Задачи',
        taskText:
          'Сформировать IA услуг, подключить запись, обеспечить мобильную конверсию, дать админке простое обновление акций и врачей.',
        solutionTitle: 'Решение',
        solutionText:
          'Модульная структура на WordPress, интеграция формы записи в CRM/менеджер процессов клиники, оптимизация скорости на мобильных экранах.',
      },
      typography: {
        title: 'Типографика',
        fontFamily: '"Nunito Sans", system-ui, sans-serif',
        description: 'Мягкие формы букв и крупные интерлиньяжи снижают тревожность интерфейса.',
        fontSizes: ['15px', '17px', '20px', '26px', '36px'],
      },
      tools: {
        title: 'Инструменты',
        description: 'WordPress для самостоятельного контенту клиники.\nБез зависимости от разработчика на каждую акцию.',
        items: toolItems(['WordPress', 'PHP', 'JavaScript']),
        ctaResults: ['Рост онлайн-записей', 'Понятная структура услуг', 'Готовность к локальному SEO'],
      },
      performance: perf(
        [
          ['Записей в месяц', '180+ цель', 'good'],
          ['Mobile UX', 'первичный', 'excellent'],
          ['Скорость загрузки', 'оптимизация', 'good'],
        ],
        86
      ),
      results: {
        title: 'Результат',
        description:
          'Клиника получает понятный входящий поток пациентов и инструмент обновлять маркетинг без боли.',
        days: '40',
        screens: '18',
        features: ['Онлайн-запись', 'Услуги и врачи', 'Тёплый UX/UI'],
      },
      colors: { palette: [{ color: '#4a4e69' }, { color: '#f2e9e4' }, { color: '#9a8c98' }] },
    },
  },

  'autorus-case': {
    donorUrl: 'https://www.autorus.ru',
    summary:
      'Яндекс Директ для autorus.ru: «взрослая» семантика под автозапчасти и ремкомплекты, минус-слова, структура кампаний по намерению, объявления с УТП и динамика ставок. Плюс сопутствующие работы — чистка аналитики, цели в Метрике и связка с CRM, чтобы не покупать клики в стол.',
    seoTitle: 'Кейс Autorus: Яндекс Директ, семантика, performance | PrimeCoder',
    seoDescription:
      'Контекст для высококонкурентного автотематика: ядро запросов, минусации, РСЯ и поиск, прозрачные KPI без «залива бюджета».',
    seoKeywords: 'Autorus, Яндекс Директ, семантика, автозапчасти, контекстная реклама, PrimeCoder',
    contentJson: {
      categories: ['advertising', 'marketing', 'seo'],
      sections: S.all,
      hero: {
        title: 'Autorus',
        subtitle: 'Директ, в котором видно, за что платит бизнес — а не только CPC в отчёте',
      },
      about: {
        title: 'О проекте',
        description:
          'Рынок запчастей в Директе — это аукцион, аукцион ещё и в голове у заказчика: хочется «в топ», но важно купить клик там, где он конвертируется в заказ или звонок, а не в «посмотрел и ушёл». Мы собрали семантическое поле под SKU и категории, отсеяли мусорные и информационные запросы, развели кампании по поиску и РСЯ и синхронизировали UTM/цели так, чтобы менеджер в CRM понимал источник лида.\n\nПопутно закрыли типичные дыры: дубли объявлений, пустые посадочные под группы, негатив под бренды конкурентов там, где это уместно, и расширения, которые реально поднимают CTR.\n\nДля нового клиента в автотематике это образец процесса: не «запустили и забыли», а цикл гипотез — замер — правка ставок и текстов.',
        taskTitle: 'Задачи',
        taskText:
          'Пересобрать и обогатить семантику, настроить структуру кампаний и объявлений, внедрить минус-слова и правила по конверсиям, связать Метрику и CRM, дать понятные отчёты по стоимости лида.',
        solutionTitle: 'Решение',
        solutionText:
          'Прошлись от макро-ядра до long-tail по моделям и узлам, собрали матрицу «запрос → посадочная → коммерческое предложение в объявлении», настроили автостратегии там, где данных хватает, и ручной контроль там, где алгоритм ещё «голый». Еженедельно чистим поисковые запросы и расширяем негатив.',
      },
      typography: {
        title: 'Типографика',
        fontFamily: 'Inter, sans-serif',
        description: 'В рекламных лендингах и отчётах важна сухая читабельность цифр и аккуратные заголовки — без шума.',
        fontSizes: ['14px', '16px', '18px', '24px', '32px'],
      },
      tools: {
        title: 'Инструменты',
        description:
          'Яндекс Директ и Метрика — основной контур.\nДополняем скриптами и дашбордами, если заказчику нужна сквозная картина.',
        items: toolItems(['SEO', 'JavaScript', 'HTML', 'CSS', 'MySQL']),
        ctaResults: ['Семантика «под запас», а не под слив бюджета', 'Прозрачные цели и лиды', 'Сопровождение кабинетов без хаоса'],
      },
      performance: perf(
        [
          ['Структура кампаний', 'по интенту', 'excellent'],
          ['Минусация', 'регулярная', 'excellent'],
          ['Связка Метрика → CRM', 'настроена', 'good'],
        ],
        92
      ),
      results: {
        title: 'Результат',
        description:
          'Реклама перестаёт быть чёрным ящиком: видно, какие кластеры запросов кормят продажи, а какие только тратят деньги. Заказчик может масштабировать победителей и резать аутсайдеров на основе цифр, а не догадок.',
        features: [
          'Сбор и кластеризация семантики под каталог',
          'Яндекс Директ: поиск и РСЯ, объявления и ставки',
          'Минус-слова, чистка площадок и поисковых запросов',
          'Цели в Яндекс.Метрике и сквозная аналитика',
          'Сопровождение и оптимизация кампаний',
        ],
      },
      colors: { palette: [{ color: '#1b1b1e' }, { color: '#fbfff1' }, { color: '#ff6b35' }] },
    },
  },

  'roscapital-case': {
    donorUrl: 'https://roscapital.ru',
    summary:
      'Корпоративный сайт roscapital.ru: стратегия подачи услуг, UX/UI, адаптивная вёрстка, типовые модули для продуктов и пресс-центра, формы захвата и интеграция с маркетинговым контуром. Акцент на доверии, комплаенсе и ясной навигации для корпоративного и частного клиента.',
    seoTitle: 'Кейс RosCapital: корпоративный сайт, UX/UI, разработка | PrimeCoder',
    seoDescription:
      'Финансовый бренд в digital: структура услуг, визуальная дисциплина, скорость и доступность информации для ЦА.',
    seoKeywords: 'RosCapital, корпоративный сайт, финтех, UX, PrimeCoder',
    contentJson: {
      categories: ['website', 'design', 'marketing'],
      sections: S.all,
      hero: {
        title: 'RosCapital',
        subtitle: 'Корпоративный digital: серьёзность бренда и простота для пользователя',
      },
      about: {
        title: 'О проекте',
        description:
          'Финансовые институты редко выигрывают «лупами» и неоном — выигрывают ясностью оффера, предсказуемой структурой и ощущением надёжности при каждом скролле. Мы разработали сайт roscapital.ru как единую точку входа: кто пользователь — юридическое лицо, частный инвестор или партнёр — тот быстро находит свой сценарий без лабиринта из PDF и бесконечных вложенных меню.\n\nВ работу вошли: проектирование информационной архитектуры и пользовательских потоков, дизайн ключевых шаблонов и состояний (включая ошибки форм и мобильные сценарии), фронтенд и бэкенд-шаблоны, настройка форм обратной связи и заявок, базовая SEO-гигиена и подготовка контентной матрицы под дальнейшее наполнение.\n\nДля нового клиента из B2B/B2C финансов это демонстрирует: мы умеем сочетать строгий compliance-тон с живым, не «деревянным» интерфейсом.',
        taskTitle: 'Задачи',
        taskText:
          'Сформировать логичную структуру разделов под продуктовую линейку, сделать премиальный но сдержанный UI, реализовать адаптив, формы и интеграции, обеспечить скорость загрузки и доступность ключевых страниц.',
        solutionTitle: 'Решение',
        solutionText:
          'Прототипировали пользовательские потоки, согласовали визуальный язык с брендом, собрали компонентную библиотеку в вёрстке, внедрили типовые блоки для новостей и раскрытия услуг, настроили валидацию и антиспам на формах, провели оптимизацию ресурсов и критического CSS для первого экрана.',
      },
      typography: {
        title: 'Типографика',
        fontFamily: '"Source Serif 4", Georgia, serif',
        description: 'Serif в акцентах для доверия к финансовому бренду и нейтральный sans для форм и таблиц.',
        fontSizes: ['15px', '17px', '20px', '28px', '40px'],
      },
      tools: {
        title: 'Инструменты',
        description: 'Современный веб-стек с упором на долговечность вёрстки и удобство редакторов.\nМеньше «магии», больше контроля у команды клиента.',
        items: toolItems(['Figma', 'React', 'TypeScript', 'Node.js', 'PostgreSQL']),
        ctaResults: ['Структура под рост продуктовой линейки', 'Формы и заявки без потери лидов', 'Быстрый первый экран на мобильных'],
      },
      performance: perf(
        [
          ['IA и навигация', 'согласованы', 'excellent'],
          ['Мобильная воронка', 'отполирована', 'excellent'],
          ['ТехSEO база', 'заложена', 'good'],
        ],
        91
      ),
      results: {
        title: 'Результат',
        description:
          'Сайт выполняет роль цифрового штаба бренда: понятные продукты, рабочие точки входа в диалог с компанией и основа для SEO и рекламных кампаний без срочной переделки структуры.',
        days: '72',
        screens: '32',
        features: [
          'UX/UI корпоративного уровня',
          'Адаптив и единая компонентная сетка',
          'Продуктовые и информационные разделы',
          'Формы, заявки и интеграции',
          'Подготовка к масштабированию контента',
        ],
      },
      colors: { palette: [{ color: '#0a1628' }, { color: '#f6f8fc' }, { color: '#c5a065' }] },
    },
  },

  'growfood-case': {
    donorUrl: 'https://growfood.ru',
    summary:
      'Разработка сайта в сегменте локальной доставки готового питания (кейс в духе Growfood и сервисов из списков вроде Cossa): калькулятор рациона, подписка на неделю, понятная воронка первого заказа и оплата. Часто клиент работает как white-label кухня для бренда — мы проектируем digital так, чтобы канал продаж не зависел только от агрегаторов.',
    seoTitle: 'Кейс доставки рационов: Growfood-подобный сервис | PrimeCoder',
    seoDescription:
      'Сайт для доставки еды: подписка, меню, ЛК и оплата. Для локальных брендов без сильного digital-наследия.',
    seoKeywords: 'доставка еды, growfood, subscription, foodtech, PrimeCoder',
    contentJson: {
      categories: ['website', 'marketing', 'design'],
      sections: S.all,
      hero: {
        title: 'Доставка рационов',
        subtitle: 'Один сайт — витрина меню, подписка и повторные заказы без посредников-маркетплейсов',
      },
      about: {
        title: 'О проекте',
        description:
          'Рынок healthy food и «еда в контейнерах» давно научил пользователя ожидать калькулятор калорий, выбор типа рациона и доставку «завтра». Мы проектировали продукт для модели, близкой к Growfood: локальное производство, собственный бренд или франшизный, сайт как главный канал LTV — не только первый заказ, но и удержание через подписку и уведомления.\n\nИнтерфейс заточен под мобильный трафик и быстрый заказ «с work-friendly» сценария: минимум полей на первом шаге, прозрачная итоговая корзина, сохранённые адреса и слоты доставки. Для white-label варианта закладываем темизацию: палитра и типографика под суббренд без переписывания логики.\n\nДля нового заказчика в food-delivery это готовая архитектурная база: каталог рационов → персонализация → оплата → ЛК с историей и управлением подпиской.',
        taskTitle: 'Задачи',
        taskText:
          'Спроектировать UX/UI воронки первого и повторного заказа, каталог/меню с фильтрами, корзину и оплату, личный кабинет, интеграцию с кухонной или логистической системой при необходимости.',
        solutionTitle: 'Решение',
        solutionText:
          'Собрали дизайн-систему экранов в Figma, сверстали адаптив с приоритетом mobile, реализовали корзину с сохранением состояния, подключили платёжного провайдера и webhook-статусы, добавили ЛК с подпиской и паузой, оптимизировали изображения блюд под LCP.',
      },
      typography: {
        title: 'Типографика',
        fontFamily: '"DM Sans", system-ui, sans-serif',
        description: 'Дружелюбный гротеск и крупные числа калорий — читаемо в дороге с телефона.',
        fontSizes: ['15px', '17px', '22px', '28px', '36px'],
      },
      tools: {
        title: 'Инструменты',
        description: 'Стек под быстрый relaunch меню и маркетинговые акции.\nГотовность к нагрузке в обеденные пики.',
        items: toolItems(['Figma', 'React', 'TypeScript', 'Node.js', 'PostgreSQL']),
        ctaResults: ['Подписка и повторные заказы', 'Оплата без падений', 'Mobile-first воронка'],
      },
      performance: perf(
        [
          ['Конверсия в первый заказ', 'фокус UX', 'excellent'],
          ['LCP на мобильных', 'оптимизация медиа', 'good'],
          ['Удержание', 'ЛК + подписка', 'excellent'],
        ],
        90
      ),
      results: {
        title: 'Результат',
        description:
          'Бренд доставки получает собственный канал продаж: не только «красивая витрина», а механика подписки и повторных покупок — то, на чём строится юнит-экономика сервиса.',
        days: '58',
        screens: '24',
        features: [
          'Каталог рационов и калорийность',
          'Корзина, слоты доставки и оплата',
          'Личный кабинет и подписка',
          'White-label готовность оформления',
        ],
      },
      colors: { palette: [{ color: '#1a535c' }, { color: '#f7fff7' }, { color: '#4ecdc4' }] },
    },
  },
};

/** Развёрнутый Madeo Template для кейсов, созданных из PDF (после INSERT). */
const NEW_CASE_MADEO = {
  'opencart-secure-store-case': {
    about: {
      description:
        'Заказчикy нужен был магазин с характером: не «ещё один шаблон», а узнаваемая витрина с динамичными блоками и анимацией, которая не отвлекает от покупки. Параллельно — серьёзная инфраструктурная повестка: защита от DDoS на уровне сервера, чтобы конкуренты или боты не выбивали витрину из строя в пик сезона.\n\nДля нового клиента это пример связки креатива и инженерии: OpenCart остаётся понятной CMS для операционки, а безопасность и дизайн не противоречат друг другу.',
      taskText:
        'Спроектировать индивидуальный UI с анимациями под performance-бюджет, реализовать магазин на OpenCart, настроить усиленную защиту от DDoS, сохранить скорость TTFB и стабильность checkout.',
      solutionText:
        'Собрали кастомную тему и модули без ломки ядра OpenCart, вынесли тяжёлые анимации в контролируемые слои, на стороне сервера настроили фильтрацию и rate limiting. Провели нагрузочные прогоны ключевых страниц и корзины.',
    },
    tools: {
      description: 'OpenCart как зрелая e-commerce база + кастомный фронт.\nБезопасность закладываем так же серьёзно, как UX.',
      ctaResults: ['Индивидуальный UI с motion', 'Защищённый контур хостинга', 'Масштабируемый каталог'],
    },
    performance: perf(
      [
        ['Устойчивость к DDoS', 'сервер + правила', 'excellent'],
        ['Корзина', 'стабильная', 'excellent'],
        ['Скорость UX', 'при анимациях', 'good'],
      ],
      90
    ),
    results: {
      description:
        'Магазин выдерживает внешнее давление и при этом выглядит как бренд, а не как дефолтная тема. Команда заказчика получает управляемую админку и понятный процесс обновлений.',
      features: ['Кастомный дизайн и анимации', 'OpenCart без хака ядра', 'Анти-DDoS на инфраструктуре'],
    },
    colors: { palette: [{ color: '#1b4332' }, { color: '#f8f9fa' }, { color: '#40916c' }] },
  },
  'marketing-fullstack-catalog-case': {
    about: {
      description:
        'Это кейс про связку «маркетинг → продукт → реклама». Заказчику нужен был не только сайт-каталог, а выстроенная воронка: рекомендации отделу продаж, текстовая упаковка, 3D-экстерьеры для презентаций и доверия, регистрация в справочниках Яндекса и ведение Директа с понятными KPI.\n\nТакой проект удобен бизнесу, который выходит на новый рынок и хочет одного подрядчика на стартовый пакет.',
      taskText:
        'Синхронизировать маркетинговую стратегию и сайт, подготовить копирайтинг и структуру каталога, смоделировать 3D экстерьеры, завести компанию в каталогах и кабинетах Яндекса, запустить и сопровождать Директ.',
      solutionText:
        'Мы согласовали единое позиционирование, перенесли его в IA сайта и тексты, подготовили 3D-визуалы под коммерческие презентации, оформили digital-паспорт компании в экосистеме Яндекса и ввели еженедельный цикл оптимизации Директа.',
    },
    tools: {
      description: 'Кросс-дисциплинарная команда: стратегия, дизайн, 3D, perf-маркетинг.\nОдин таймлайн вместо пяти подрядчиков.',
      ctaResults: ['Каталог + тексты под продажи', '3D под презентации и сайт', 'Директ под измеримые цели'],
    },
    performance: perf(
      [
        ['Каналы привлечения', '6+', 'good'],
        ['Согласования', 'единый продюсер', 'excellent'],
        ['Яндекс.экосистема', 'оформлена', 'excellent'],
      ],
      89
    ),
    results: {
      description:
        'У заказчика появляется цельная история для клиента от первого касания в поиске до заявки и сделки с отделом продаж.',
      features: ['Маркетинг и продажи', 'Сайт-каталог', '3D экстерьер', 'Яндекс + Директ'],
    },
    colors: { palette: [{ color: '#240046' }, { color: '#ffedd8' }, { color: '#7b2cbf' }] },
  },
  'pixel-perfect-wordpress-case': {
    about: {
      description:
        'Иногда у заказчика уже есть идеальный Figma-пиксель, и задача разработки — не «улучшить по ходу», а честно попасть в макет. Мы собрали кастомную тему WordPress без покупных шаблонов: только нужные post types, чистые шаблоны и предсказуемая админка.\n\nДля агентств и брендов это снижает стоимость сопровождения: нет скрытых зависимостей от многоцелевого конструктора.',
      taskText:
        'Верстка pixel perfect по макету заказчика на WordPress, без стороннего шаблона; адаптив с согласованными брейкпоинтами; быстрый контент-ввод.',
      solutionText:
        'Разложили макет на компоненты темы, настроили базовые поля ACF/кастомайзера там, где уместно, ввели стиль-код для классов и отступов, прогнали визуальное регрессионное сравнение с эталоном.',
    },
    tools: {
      description: 'Чистая тема и дисциплина вёрстки.\nМеньше магии Page Builder — больше контроля.',
      ctaResults: ['Совпадение с макетом', 'Без template clutter', 'Простая поддержка'],
    },
    performance: perf(
      [
        ['Точность вёрстки', 'контроль', 'excellent'],
        ['Админка', 'без перегруза', 'good'],
        ['Скорость', 'лайт тема', 'excellent'],
      ],
      91
    ),
    results: {
      description: 'Дизайн-студия и клиент видят на проде то, что подписали в макете — без сюрпризов на релизе.',
      features: ['Custom WordPress theme', 'Pixel perfect', 'Адаптив'],
    },
    colors: { palette: [{ color: '#000000' }, { color: '#ffffff' }, { color: '#333333' }] },
  },
  'bads-wordpress-case': {
    about: {
      description:
        'Ниша БАДов требует аккуратной коммуникации: нельзя обещать «лекарство от всего», но нужно объяснять состав, пользу и доверие к бренду. Мы сделали каталог на WordPress с продуманной подачей карточек, SEO-текстами и SMM, плюс мультиязычность (украинский) для выхода на дополнительную аудиторию.\n\n3D-упаковки в Blender усиливают узнаваемость на маркетплейсах и в соцсетях — картинка становится активом.',
      taskText:
        'Адаптивный UI/UX в Figma, разработка каталога на WordPress, SMM и SEO, копирайтинг, UA-локаль, 3D-модели упаковок.',
      solutionText:
        'Согласовали юридически безопасные формулировки, собрали структуру посадочных под семантику, настроили мультиязычность и импорт контента, оформили SMM-гайд, смоделировали и отрендерили упаковки.',
    },
    tools: {
      description: 'Витрина + контент + 3D.\nГотовый набор для omnichannel в нише wellness.',
      ctaResults: ['SEO-каркас под нише', 'SMM с визуалом', '3D упаковки для промо'],
    },
    performance: perf(
      [
        ['Локали', 'UA + RU', 'good'],
        ['Контент-поток', 'редакция', 'excellent'],
        ['3D пайплайн', 'Blender', 'excellent'],
      ],
      88
    ),
    results: {
      description:
        'Бренд получает связку «сайт + соцсети + поиск» и визуальный актив упаковки для рекламных креативов.',
      features: ['WordPress каталог', 'SMM + SEO', 'Мультиязычность', 'Blender 3D'],
    },
    colors: { palette: [{ color: '#2d6a4f' }, { color: '#f1faee' }, { color: '#95d5b2' }] },
  },
  'food-delivery-case': {
    about: {
      description:
        'Доставка еды живёт на мобильном и в пиках нагрузки вечером. Пользователь должен за три касания собрать корзину и оплатить; ресторан — видеть заказ без падений. Мы спроектировали UX/UI под быстрый выбор позиций, ЛК для истории и адресов, интеграцию эквайринга.',
      taskText:
        'UX/UI, адаптив, каталог и корзина, личный кабинет, приём оплат, стабильная работа на мобильных.',
      solutionText:
        'Собрали дизайн-систему экранов, состояния загрузки и ошибок сети, настроили платежный провайдер и webhooks, оптимизировали медиа блюд.',
    },
    tools: {
      description: 'Современный стек для отзывчивого веба.\nГотовность к росту числа филиалов.',
      ctaResults: ['Быстрая корзина с телефона', 'Оплата без трения', 'ЛК для повторных заказов'],
    },
    performance: perf(
      [
        ['Мобильная доля', 'primary', 'excellent'],
        ['Платежи', 'стабильно', 'excellent'],
        ['Пиковые часы', 'устойчивость', 'good'],
      ],
      90
    ),
    results: {
      description: 'Сервис доставки получает цифровой канал заказа с конверсией, ориентированной на мобильную аудиторию.',
      features: ['Каталог и корзина', 'ЛК', 'Эквайринг'],
    },
    colors: { palette: [{ color: '#d00000' }, { color: '#fff3e0' }, { color: '#ffba08' }] },
  },
  'travel-wordpress-case': {
    about: {
      description:
        'Туристический сайт часто страдает от тяжёлых баннеров и синхронных запросов к операторам. Мы оптимизировали загрузку, переразложили блоки под сканирование глазами и внедрили модуль поиска туров по операторам — чтобы пользователь не уходил на агрегаторы.\n\nCRM дала менеджерам единую воронку лидов вместо Excel и мессенджеров.',
      taskText:
        'Ускорить сайт на WordPress, оптимизировать изображения и блоки, внедрить поиск туров, подключить CRM.',
      solutionText:
        'Профилировали тему и плагины, внедрили lazy-load и сжатие, вынесли запросы к API туров в кэшируемый слой, связали формы с CRM по событиям.',
    },
    tools: {
      description: 'WordPress как хаб контента + интеграции.\nСкорость — часть конверсии в заявку.',
      ctaResults: ['Быстрее LCP', 'Поиск по операторам', 'Лиды в CRM'],
    },
    performance: perf(
      [
        ['Поиск туров', 'интеграция', 'excellent'],
        ['CRM', 'подключена', 'excellent'],
        ['Перфоманс', 'улучшен', 'good'],
      ],
      87
    ),
    results: {
      description:
        'Агентство обрабатывает запросы централизованно, а пользователь получает быстрый ответ по турам без «потерянных» сообщений.',
      features: ['Оптимизация WP', 'Модуль поиска', 'CRM'],
    },
    colors: { palette: [{ color: '#0077b6' }, { color: '#caf0f8' }, { color: '#48cae4' }] },
  },
  'internal-booking-case': {
    about: {
      description:
        'Внутреннее ПО редко попадает в портфолио, но именно оно экономит тысячи часов: бронирование ресурсов, чат команд и ЛК сотрудника с ролями. Мы работали как аутсорс-команда в составе заказчика — с фокусом на безопасность и аудит действий.',
      taskText:
        'Реализовать систему бронирования, внутренний чат и личные кабинеты с разграничением прав.',
      solutionText:
        'Ввели доменную модель броней и конфликтов, сделали real-time чат поверх проверенного транспорта, настроили RBAC и журналы для админов.',
    },
    tools: {
      description: 'React + Node для скорости итераций.\nГотовность к on-premise развёртыванию.',
      ctaResults: ['Меньше Excel-админки', 'Прозрачные брони', 'Коммуникации в одном месте'],
    },
    performance: perf(
      [
        ['RBAC', 'внедрено', 'excellent'],
        ['Нагрузка чата', 'масштабируемо', 'good'],
        ['Аудит', 'логи', 'excellent'],
      ],
      92
    ),
    results: {
      description: 'Компания переводит операционку в единый контур: меньше накладок и ручных согласований.',
      features: ['Бронирование', 'Внутренний чат', 'ЛК сотрудников'],
    },
    colors: { palette: [{ color: '#343a40' }, { color: '#e9ecef' }, { color: '#495057' }] },
  },
};

for (const nc of NEW_CASES) {
  if (PATCHES[nc.slug]) continue;
  const extra = NEW_CASE_MADEO[nc.slug] || {};
  const base = {
    summary: nc.summary,
    seoTitle: nc.seoTitle,
    seoDescription: nc.seoDescription,
    seoKeywords: nc.seoKeywords,
    contentJson: deepMerge(
      {
        categories: [nc.category],
        sections: S.all,
        hero: { title: nc.title.split(':')[0].trim(), subtitle: nc.summary.slice(0, 130) + (nc.summary.length > 130 ? '…' : '') },
        about: {
          title: 'О проекте',
          taskTitle: 'Задачи',
          solutionTitle: 'Решение',
        },
        typography: {
          title: 'Типографика',
          fontFamily: 'Inter, sans-serif',
          description: 'Уточним под финальный макет после вашей загрузки визуалов.',
          fontSizes: ['14px', '16px', '20px', '28px', '40px'],
        },
        tools: {
          title: 'Инструменты',
          items: toolItems(nc.tools),
        },
        performance: perf(
          [
            ['Сроки', 'по плану', 'good'],
            ['Качество', 'QA', 'excellent'],
            ['Поддержка', 'договор', 'good'],
          ],
          88
        ),
        results: {
          title: 'Результат',
          days: String(nc.metrics['Дней разработки'] ?? '—'),
          screens: String(nc.metrics['Страниц'] ?? nc.metrics['Экранов'] ?? nc.metrics['SKU'] ?? nc.metrics['Модулей'] ?? '—'),
        },
        colors: { palette: [{ color: '#141414' }, { color: '#ffffff' }, { color: '#ffbb00' }] },
      },
      extra
    ),
  };
  PATCHES[nc.slug] = base;
}

function deepMerge(base, patch) {
  if (patch === null || patch === undefined) return base;
  if (Array.isArray(patch)) return patch.slice();
  if (typeof patch !== 'object') return patch;
  const out = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = deepMerge(base[k] || {}, v);
    } else {
      out[k] = v;
    }
  }
  return out;
}
