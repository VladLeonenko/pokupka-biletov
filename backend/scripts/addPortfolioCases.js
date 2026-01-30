import pool from '../db.js';

// Кейсы из portfolio.html (11 основных работ)
const cases = [
  {
    slug: 'houses-case',
    title: 'ДОМА РОССИИ',
    summary: 'Разработка сайта-каталога для строительной компании. Современный дизайн, удобная навигация, адаптивная верстка. Реализованы каталог домов, калькулятор стоимости, форма заявки.',
    category: 'website',
    heroImageUrl: '/legacy/img/cases/houses-case/cover.png',
    gallery: [
      '/legacy/img/cases/houses-case/gallery-1.png',
      '/legacy/img/cases/houses-case/gallery-2.png',
      '/legacy/img/cases/houses-case/gallery-3.png'
    ],
    tools: ['HTML', 'CSS', 'JavaScript', 'PHP', 'MySQL'],
    metrics: {
      'Страниц': 25,
      'Дней разработки': 45
    },
    contentHtml: '<p>Разработка современного сайта-каталога для строительной компании. Реализованы функции каталога домов с фильтрацией, калькулятор стоимости, форма заявки.</p>',
    isPublished: true,
  },
  {
    slug: 'alaska-case',
    title: 'ALASKA FIREWOOD',
    summary: 'Редизайн сайта компании по продаже дров. Улучшенный пользовательский опыт, современный дизайн, оптимизация под мобильные устройства.',
    category: 'website',
    heroImageUrl: '/legacy/img/cases/alaska-case/cover.png',
    gallery: [
      '/legacy/img/cases/alaska-case/gallery-1.png',
      '/legacy/img/cases/alaska-case/gallery-2.png'
    ],
    tools: ['React', 'TypeScript', 'Node.js'],
    metrics: {
      'Улучшение конверсии': 35,
      'Дней разработки': 30
    },
    isPublished: true,
  },
  {
    slug: 'litclinic-case',
    title: 'МЕДИЦИНСКИЙ ЦЕНТР',
    summary: 'Разработка сайта медицинской клиники с системой онлайн-записи. Интеграция с CRM, личный кабинет пациента, расписание врачей.',
    category: 'website',
    heroImageUrl: '/legacy/img/cases/litclinic-case/cover.png',
    gallery: [
      '/legacy/img/cases/litclinic-case/gallery-1.png',
      '/legacy/img/cases/litclinic-case/gallery-2.png',
      '/legacy/img/cases/litclinic-case/gallery-3.png'
    ],
    tools: ['WordPress', 'PHP', 'JavaScript', 'MySQL'],
    metrics: {
      'Онлайн-записей в месяц': 250,
      'Дней разработки': 60
    },
    contentHtml: '<p>Создание современного сайта медицинской клиники с удобной системой записи на прием. Реализован личный кабинет, интеграция с CRM системой.</p>',
    isPublished: true,
  },
  {
    slug: 'madeo-case',
    title: 'MADEO',
    summary: 'Разработка интернет-магазина розничной торговли. Полнофункциональная корзина, интеграция с платежными системами, система управления заказами.',
    category: 'website',
    heroImageUrl: '/legacy/img/cases/madeo-case/cover.png',
    gallery: [
      '/legacy/img/cases/madeo-case/gallery-1.png',
      '/legacy/img/cases/madeo-case/gallery-2.png',
      '/legacy/img/cases/madeo-case/gallery-3.png'
    ],
    tools: ['1C-Bitrix', 'PHP', 'JavaScript', 'MySQL'],
    metrics: {
      'Товаров в каталоге': 5000,
      'Дней разработки': 90
    },
    contentHtml: '<p>Создание полнофункционального интернет-магазина с интеграцией 1С, системой управления заказами, платежными системами.</p>',
    isPublished: true,
  },
  {
    slug: 'straumann-case',
    title: 'STRAUMANN GROUP',
    summary: 'Разработка корпоративного сайта для международной компании. Многоязычность, каталог продукции, интеграция с международными системами.',
    category: 'website',
    heroImageUrl: '/legacy/img/cases/straumann-case/cover.png',
    gallery: [
      '/legacy/img/cases/straumann-case/gallery-1.png',
      '/legacy/img/cases/straumann-case/gallery-2.png',
      '/legacy/img/cases/straumann-case/gallery-3.png'
    ],
    tools: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
    metrics: {
      'Языков': 5,
      'Дней разработки': 120
    },
    contentHtml: '<p>Разработка корпоративного сайта для международной компании с поддержкой нескольких языков и регионов.</p>',
    isPublished: true,
  },
  {
    slug: 'straumann-mobile-case',
    title: 'STRAUMANN GROUP - Мобильное приложение',
    summary: 'Разработка мобильного приложения для медицинских специалистов. Каталог продукции, обучение, новости отрасли.',
    category: 'mobile',
    heroImageUrl: '/legacy/img/cases/straumann-mobile-case/cover.png',
    gallery: [
      '/legacy/img/cases/straumann-mobile-case/gallery-1.png',
      '/legacy/img/cases/straumann-mobile-case/gallery-2.png'
    ],
    tools: ['React Native', 'TypeScript', 'Node.js'],
    metrics: {
      'Пользователей': 10000,
      'Дней разработки': 90
    },
    isPublished: true,
  },
  {
    slug: 'polygon-case',
    title: 'ПОЛИГОН',
    summary: 'Разработка сайта производственной компании. Каталог продукции, техническая документация, онлайн-заявки.',
    category: 'website',
    heroImageUrl: '/legacy/img/cases/polygon-case/cover.png',
    gallery: [
      '/legacy/img/cases/polygon-case/gallery-1.png',
      '/legacy/img/cases/polygon-case/gallery-2.png'
    ],
    tools: ['HTML', 'CSS', 'JavaScript', 'PHP'],
    metrics: {
      'Страниц': 40,
      'Дней разработки': 50
    },
    isPublished: true,
  },
  {
    slug: 'ursus-case',
    title: 'УРСУС',
    summary: 'SEO продвижение сайта компании. Комплексная оптимизация, работа с контентом, построение ссылочного профиля.',
    category: 'seo',
    heroImageUrl: '/legacy/img/cases/ursus-case/cover.png',
    gallery: [
      '/legacy/img/cases/ursus-case/gallery-1.png'
    ],
    tools: ['SEO', 'Content Marketing', 'Link Building'],
    metrics: {
      'Рост трафика': 180,
      'Топовых запросов': 50
    },
    contentHtml: '<p>Комплексное SEO продвижение сайта. Работа с технической оптимизацией, контентом, построением ссылочного профиля.</p>',
    isPublished: true,
  },
  {
    slug: 'leta-case',
    title: 'LETA',
    summary: 'Разработка корпоративного сайта. Современный дизайн, презентация услуг, интеграция с CRM.',
    category: 'website',
    heroImageUrl: '/legacy/img/cases/leta-case/cover.png',
    gallery: [
      '/legacy/img/cases/leta-case/gallery-1.png',
      '/legacy/img/cases/leta-case/gallery-2.png'
    ],
    tools: ['HTML', 'CSS', 'JavaScript'],
    metrics: {
      'Страниц': 15,
      'Дней разработки': 35
    },
    isPublished: true,
  },
  {
    slug: 'winwin-case',
    title: 'WINWIN CHINA',
    summary: 'Разработка сайта для международной торговой компании. Каталог товаров, онлайн-заявки, мультиязычность.',
    category: 'website',
    heroImageUrl: '/legacy/img/cases/winwin-case/cover.png',
    gallery: [
      '/legacy/img/cases/winwin-case/gallery-1.png',
      '/legacy/img/cases/winwin-case/gallery-2.png',
      '/legacy/img/cases/winwin-case/gallery-3.png'
    ],
    tools: ['WordPress', 'PHP', 'WooCommerce'],
    metrics: {
      'Товаров': 3000,
      'Дней разработки': 75
    },
    isPublished: true,
  },
  {
    slug: 'greendent-case',
    title: 'GREENDENT',
    summary: 'Разработка сайта стоматологической клиники. Онлайн-запись, информация об услугах, галерея работ.',
    category: 'website',
    heroImageUrl: '/legacy/img/cases/greendent-case/cover.png',
    gallery: [
      '/legacy/img/cases/greendent-case/gallery-1.png',
      '/legacy/img/cases/greendent-case/gallery-2.png'
    ],
    tools: ['WordPress', 'PHP', 'JavaScript'],
    metrics: {
      'Записей в месяц': 180,
      'Дней разработки': 40
    },
    isPublished: true,
  }
];

async function addPortfolioCases() {
  try {
    console.log(`📝 Начинаю добавление ${cases.length} кейсов из портфолио...`);
    
    let added = 0;
    let skipped = 0;
    
    for (const caseData of cases) {
      try {
        // Проверяем, существует ли уже кейс с таким slug
        const existing = await pool.query('SELECT slug FROM cases WHERE slug = $1', [caseData.slug]);
        
        if (existing.rows.length > 0) {
          console.log(`⏭️  Кейс "${caseData.title}" уже существует, пропускаю...`);
          skipped++;
          continue;
        }
        
        // Добавляем кейс
        await pool.query(
          `INSERT INTO cases(
            slug, title, summary, content_html, hero_image_url, 
            gallery, metrics, tools, is_published, category, created_at, updated_at
          ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
          [
            caseData.slug,
            caseData.title,
            caseData.summary || '',
            caseData.contentHtml || '',
            caseData.heroImageUrl || null,
            JSON.stringify(caseData.gallery || []),
            JSON.stringify(caseData.metrics || {}),
            caseData.tools || [],
            caseData.isPublished || false,
            caseData.category || null
          ]
        );
        
        console.log(`✅ Добавлен кейс: ${caseData.title} (${caseData.slug})`);
        added++;
      } catch (error) {
        console.error(`❌ Ошибка при добавлении кейса "${caseData.title}":`, error.message);
      }
    }
    
    console.log(`\n📊 Результат:`);
    console.log(`   ✅ Добавлено: ${added}`);
    console.log(`   ⏭️  Пропущено: ${skipped}`);
    console.log(`   📝 Всего обработано: ${cases.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  }
}

addPortfolioCases();
