import pool from '../db.js';

/**
 * Генератор кейсов для портфолио
 * Создает рандомное количество кейсов (13-45) для каждой категории услуг
 */

// Базовые данные для генерации кейсов по категориям
const caseTemplates = {
  website: {
    industries: [
      'Медицинский центр', 'Стоматологическая клиника', 'Строительная компания',
      'Юридическая фирма', 'Образовательная платформа', 'Фитнес-центр',
      'Ресторан', 'Отель', 'Недвижимость', 'Автосалон', 'Салон красоты',
      'Ветеринарная клиника', 'Страховая компания', 'Банк', 'Логистика',
      'Производство', 'Ритейл', 'E-commerce', 'Новостной портал', 'Блог'
    ],
    tools: [
      ['React', 'Node.js', 'PostgreSQL'],
      ['Vue.js', 'Laravel', 'MySQL'],
      ['Next.js', 'TypeScript', 'MongoDB'],
      ['1С-Битрикс', 'HTML', 'CSS'],
      ['WordPress', 'PHP', 'MySQL'],
      ['Angular', 'Express', 'PostgreSQL'],
      ['Gatsby', 'GraphQL', 'Contentful']
    ],
    metrics: {
      days: [15, 45],
      pages: [20, 100],
      hours: [200, 1200]
    }
  },
  mobile: {
    industries: [
      'Мобильное приложение для доставки', 'Фитнес-трекер', 'Медицинский дневник',
      'Банковское приложение', 'Социальная сеть', 'Игровое приложение',
      'Приложение для обучения', 'Транспортное приложение', 'Еда и рестораны',
      'Спорт и здоровье', 'Финансы', 'Путешествия', 'Музыка', 'Видео',
      'Новости', 'Погода', 'Карты', 'Фоторедактор', 'Мессенджер'
    ],
    tools: [
      ['React Native', 'Firebase', 'Redux'],
      ['Flutter', 'Dart', 'Firebase'],
      ['Swift', 'iOS', 'Core Data'],
      ['Kotlin', 'Android', 'Room'],
      ['Ionic', 'Angular', 'SQLite'],
      ['Xamarin', 'C#', 'SQLite']
    ],
    metrics: {
      days: [30, 90],
      pages: [10, 50],
      hours: [400, 2000]
    }
  },
  ai: {
    industries: [
      'AI-ассистент для бизнеса', 'Автоматизация документооборота', 'Чат-бот для поддержки',
      'AI-аналитика данных', 'Голосовой помощник', 'Распознавание изображений',
      'Обработка естественного языка', 'Рекомендательная система', 'Автоматизация продаж',
      'AI-контент генератор', 'Анализ настроений', 'Персонализация контента',
      'Автоматизация маркетинга', 'AI-помощник в разработке', 'Умный поиск'
    ],
    tools: [
      ['Python', 'TensorFlow', 'OpenAI API'],
      ['Python', 'PyTorch', 'FastAPI'],
      ['Python', 'scikit-learn', 'Pandas'],
      ['Node.js', 'OpenAI', 'LangChain'],
      ['Python', 'Hugging Face', 'Transformers']
    ],
    metrics: {
      days: [20, 60],
      pages: [5, 30],
      hours: [300, 1500]
    }
  },
  seo: {
    industries: [
      'SEO-продвижение интернет-магазина', 'Вывод в топ строительной компании',
      'Продвижение медицинской клиники', 'SEO для юридических услуг',
      'Продвижение образовательного портала', 'SEO для недвижимости',
      'Продвижение автосалона', 'SEO для ресторанного бизнеса',
      'Продвижение фитнес-центра', 'SEO для салона красоты',
      'Продвижение ветеринарной клиники', 'SEO для страховой компании',
      'Продвижение банка', 'SEO для логистики', 'Продвижение производства'
    ],
    tools: [
      ['Google Analytics', 'Google Search Console', 'Ahrefs'],
      ['SEMrush', 'Screaming Frog', 'Yoast SEO'],
      ['Google Tag Manager', 'PageSpeed Insights', 'GTmetrix'],
      ['Moz', 'Majestic', 'SERPstat']
    ],
    metrics: {
      days: [60, 180],
      pages: [50, 200],
      hours: [100, 500]
    }
  },
  advertising: {
    industries: [
      'Контекстная реклама для интернет-магазина', 'Таргетированная реклама в соцсетях',
      'Реклама медицинских услуг', 'Реклама недвижимости',
      'Реклама образовательных услуг', 'Реклама автосалона',
      'Реклама ресторана', 'Реклама фитнес-центра',
      'Реклама салона красоты', 'Реклама юридических услуг',
      'Реклама строительной компании', 'Реклама банка',
      'Реклама страховой компании', 'Реклама логистики'
    ],
    tools: [
      ['Яндекс.Директ', 'Google Ads', 'Facebook Ads'],
      ['VK Ads', 'MyTarget', 'Instagram Ads'],
      ['TikTok Ads', 'LinkedIn Ads', 'Twitter Ads']
    ],
    metrics: {
      days: [30, 120],
      pages: [10, 50],
      hours: [50, 300]
    }
  },
  design: {
    industries: [
      'Брендинг для стартапа', 'Дизайн логотипа компании', 'Фирменный стиль',
      'Дизайн упаковки', 'Дизайн интерфейса', 'Иллюстрации для сайта',
      'Дизайн презентации', 'Дизайн буклета', 'Дизайн визиток',
      'Дизайн баннера', 'Дизайн инфографики', '3D-визуализация',
      'Анимация', 'Моушн-дизайн', 'Графический дизайн'
    ],
    tools: [
      ['Figma', 'Adobe Photoshop', 'Adobe Illustrator'],
      ['Adobe XD', 'Sketch', 'InVision'],
      ['Adobe After Effects', 'Cinema 4D', 'Blender'],
      ['Adobe InDesign', 'Canva', 'Procreate']
    ],
    metrics: {
      days: [7, 30],
      pages: [1, 20],
      hours: [40, 200]
    }
  }
};

// Базовые изображения для каждой категории (можно заменить на реальные из Figma)
const defaultImages = {
  website: [
    '/legacy/img/madeo-case-banner.png',
    '/legacy/img/polygon-banner.png',
    '/legacy/img/houses-case.png',
    '/legacy/img/straumann-banner.png',
    '/legacy/img/corporate-site.png'
  ],
  mobile: [
    '/legacy/img/bitrix-project-madeo-mobile.png',
    '/legacy/img/bitrix-project-straumann-mobile.png',
    '/legacy/img/bitrix-project-litclinic-mobile.png'
  ],
  ai: [
    '/legacy/img/finance.png',
    '/legacy/img/corporate-site.png'
  ],
  seo: [
    '/legacy/img/online-shop.png',
    '/legacy/img/corporate-site.png'
  ],
  advertising: [
    '/legacy/img/online-shop.png',
    '/legacy/img/corporate-site.png'
  ],
  design: [
    '/legacy/img/madeo-case-banner.png',
    '/legacy/img/polygon-banner.png'
  ]
};

function slugify(text) {
  const transliterationMap = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
  };

  return text
    .toLowerCase()
    .split('')
    .map(char => transliterationMap[char] || char)
    .join('')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateCase(category, index) {
  const template = caseTemplates[category];
  const industry = getRandomElement(template.industries);
  const tools = getRandomElement(template.tools);
  const images = defaultImages[category] || defaultImages.website;
  
  const days = getRandomInt(template.metrics.days[0], template.metrics.days[1]);
  const pages = getRandomInt(template.metrics.pages[0], template.metrics.pages[1]);
  const hours = getRandomInt(template.metrics.hours[0], template.metrics.hours[1]);
  
  const title = industry;
  const slug = `${slugify(industry)}-${index}`;
  
  const summaries = {
    website: [
      `Разработка современного корпоративного сайта для ${industry.toLowerCase()}. Адаптивный дизайн, интеграция с CRM, личный кабинет.`,
      `Создание сайта для ${industry.toLowerCase()} с системой онлайн-записи и интеграцией платежей.`,
      `Разработка многостраничного сайта для ${industry.toLowerCase()} с админ-панелью и системой управления контентом.`
    ],
    mobile: [
      `Разработка мобильного приложения для ${industry.toLowerCase()}. Нативные iOS и Android версии.`,
      `Создание кроссплатформенного мобильного приложения для ${industry.toLowerCase()} с синхронизацией данных.`,
      `Разработка мобильного приложения для ${industry.toLowerCase()} с push-уведомлениями и офлайн-режимом.`
    ],
    ai: [
      `Внедрение AI-решений для ${industry.toLowerCase()}. Автоматизация процессов и повышение эффективности.`,
      `Разработка AI-системы для ${industry.toLowerCase()} с использованием машинного обучения.`,
      `Создание интеллектуального помощника для ${industry.toLowerCase()} на базе искусственного интеллекта.`
    ],
    seo: [
      `SEO-продвижение сайта ${industry.toLowerCase()}. Вывод в топ поисковых систем, увеличение органического трафика.`,
      `Комплексное SEO-продвижение для ${industry.toLowerCase()}. Оптимизация, контент-маркетинг, ссылочное продвижение.`,
      `Продвижение ${industry.toLowerCase()} в поисковых системах. Рост позиций по ключевым запросам на 150%+.`
    ],
    advertising: [
      `Настройка контекстной рекламы для ${industry.toLowerCase()}. Рост конверсий и снижение стоимости клика.`,
      `Запуск рекламных кампаний для ${industry.toLowerCase()} в Яндекс.Директ и Google Ads.`,
      `Таргетированная реклама для ${industry.toLowerCase()} в социальных сетях. Увеличение продаж на 200%+.`
    ],
    design: [
      `Разработка фирменного стиля для ${industry.toLowerCase()}. Логотип, брендбук, айдентика.`,
      `Создание дизайна для ${industry.toLowerCase()}. Современный визуальный стиль и брендинг.`,
      `Дизайн-проект для ${industry.toLowerCase()}. Уникальная визуальная концепция и айдентика.`
    ]
  };
  
  const summary = getRandomElement(summaries[category] || summaries.website);
  
  return {
    slug,
    title,
    summary,
    category,
    tools,
    heroImageUrl: getRandomElement(images),
    metrics: {
      days,
      pages,
      hours
    },
    isPublished: true
  };
}

async function generatePortfolioCases() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const categories = ['website', 'mobile', 'ai', 'seo', 'advertising', 'design'];
    let totalCreated = 0;
    
    for (const category of categories) {
      // Генерируем рандомное количество кейсов от 13 до 45
      const count = getRandomInt(13, 45);
      console.log(`\n📦 Генерация ${count} кейсов для категории: ${category}`);
      
      let created = 0;
      let skipped = 0;
      
      for (let i = 1; i <= count; i++) {
        const caseData = generateCase(category, i);
        
        // Проверяем, существует ли уже кейс с таким slug
        const existing = await client.query(
          'SELECT slug FROM cases WHERE slug = $1',
          [caseData.slug]
        );
        
        if (existing.rows.length > 0) {
          // Если slug занят, добавляем суффикс
          let newSlug = `${caseData.slug}-${Date.now()}`;
          caseData.slug = newSlug;
        }
        
        try {
          // Генерируем базовый HTML контент
          const contentHtml = `
            <h2>Задачи</h2>
            <p>${caseData.summary}</p>
            <h2>Решение</h2>
            <p>Разработано современное решение с использованием передовых технологий. Проект выполнен в срок и соответствует всем требованиям заказчика.</p>
            <h2>Результаты</h2>
            <p>Срок разработки: ${caseData.metrics.days} дней</p>
            <p>Объем проекта: ${caseData.metrics.pages} страниц</p>
            <p>Время работы: ${caseData.metrics.hours} часов</p>
          `;
          
          // Генерируем галерею (2-4 изображения)
          const galleryCount = getRandomInt(2, 4);
          const gallery = [];
          for (let j = 0; j < galleryCount; j++) {
            gallery.push(getRandomElement(defaultImages[category] || defaultImages.website));
          }
          
          await client.query(
            `INSERT INTO cases (
              slug, title, summary, category, tools, hero_image_url,
              content_html, gallery, metrics, is_published, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
            [
              caseData.slug,
              caseData.title,
              caseData.summary,
              caseData.category,
              caseData.tools,
              caseData.heroImageUrl,
              contentHtml,
              JSON.stringify(gallery),
              JSON.stringify(caseData.metrics),
              caseData.isPublished
            ]
          );
          
          created++;
          totalCreated++;
          console.log(`  ✓ ${caseData.title}`);
        } catch (error) {
          console.error(`  ✗ Ошибка при создании кейса ${caseData.slug}:`, error.message);
          skipped++;
        }
      }
      
      console.log(`  ✅ Создано: ${created}, Пропущено: ${skipped}`);
    }
    
    await client.query('COMMIT');
    
    console.log(`\n🎉 Успешно создано ${totalCreated} кейсов!`);
    console.log('\n📊 Статистика по категориям:');
    
    // Выводим статистику
    for (const category of categories) {
      const result = await client.query(
        'SELECT COUNT(*) as count FROM cases WHERE category = $1',
        [category]
      );
      console.log(`  ${category}: ${result.rows[0].count} кейсов`);
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Ошибка при генерации кейсов:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

generatePortfolioCases()
  .then(() => {
    console.log('\n✅ Генерация завершена!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  });


