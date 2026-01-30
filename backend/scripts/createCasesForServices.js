import pool from '../db.js';

/**
 * Скрипт для создания кейсов на основе услуг из каталога
 * Создает кейсы для всех активных услуг, которых еще нет
 */

// Маппинг категорий услуг на категории кейсов
const serviceCategoryToCaseCategory = {
  'development': 'website',
  'design': 'design',
  'marketing': 'marketing',
  'branding': 'design',
  'consulting': 'seo',
  'other': 'website',
};

// Маппинг услуг на инструменты
const serviceToolsMap = {
  'разработка сайта': ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
  'интернет-магазин': ['React', 'Node.js', 'PostgreSQL', 'Stripe', 'Payment Gateway'],
  'мобильное приложение': ['React Native', 'TypeScript', 'Firebase'],
  'дизайн': ['Figma', 'Adobe XD', 'Photoshop', 'Illustrator'],
  'seo': ['Google Analytics', 'Google Search Console', 'Yandex.Webmaster'],
  'маркетинг': ['HubSpot', 'Mailchimp', 'Hootsuite', 'Buffer', 'Google Analytics', 'Facebook Business', 'Instagram Ads'],
  'реклама': ['Google Ads', 'Yandex.Direct', 'Facebook Ads', 'Analytics'],
  'брендинг': ['Figma', 'Illustrator', 'Photoshop'],
  'поддержка': ['Monitoring', 'CI/CD', 'Backup Systems'],
};

// Генерация текстового контента для кейса
function generateCaseContent(serviceTitle, serviceDescription, category) {
  const categoryTexts = {
    'website': {
      task: `Разработка современного веб-сайта для бизнеса. Требовалось создать функциональный, быстрый и удобный интернет-ресурс, который будет эффективно представлять компанию в сети и привлекать новых клиентов.`,
      solution: `Мы разработали полнофункциональный веб-сайт с современным дизайном и адаптивной версткой. Сайт оптимизирован для поисковых систем, имеет высокую скорость загрузки и интуитивно понятный интерфейс. Реализована интеграция с CRM-системой и системами аналитики.`,
      results: `После запуска сайта количество обращений увеличилось на 150%, время загрузки страниц составляет менее 2 секунд, конверсия выросла на 85%. Сайт занимает топовые позиции по ключевым запросам в поисковых системах.`,
    },
    'mobile': {
      task: `Разработка мобильного приложения для бизнеса. Требовалось создать удобное и функциональное приложение для iOS и Android, которое улучшит взаимодействие с клиентами и повысит вовлеченность.`,
      solution: `Мы разработали нативное мобильное приложение с современным дизайном и интуитивным интерфейсом. Приложение оптимизировано для работы на различных устройствах, имеет высокую производительность и безопасность данных. Реализованы push-уведомления и интеграция с бэкенд-системами.`,
      results: `После запуска приложения количество активных пользователей выросло на 200%, средний рейтинг в магазинах приложений составляет 4.8 звезд, время использования приложения увеличилось на 120%.`,
    },
    'seo': {
      task: `Комплексное SEO-продвижение сайта. Требовалось вывести сайт в топ поисковых систем по ключевым запросам, увеличить органический трафик и улучшить видимость в поиске.`,
      solution: `Мы провели комплексную SEO-оптимизацию сайта: технический аудит, исправление ошибок, оптимизация контента, построение ссылочной массы, работа с мета-тегами и структурированными данными. Реализована регулярная аналитика и мониторинг позиций.`,
      results: `Через 6 месяцев работы органический трафик вырос на 250%, сайт занимает топ-10 позиций по 45 ключевым запросам, количество конверсий из органического поиска увеличилось на 180%.`,
    },
    'marketing': {
      task: `Комплексное маркетинговое продвижение бизнеса. Требовалось разработать и внедрить стратегию маркетинга, которая увеличит узнаваемость бренда, привлечет новых клиентов и повысит лояльность существующих.`,
      solution: `Мы разработали комплексную маркетинговую стратегию: контент-маркетинг, SMM, email-маркетинг, работа с инфлюенсерами, создание воронок продаж и автоматизация маркетинговых процессов. Настроили аналитику и систему отслеживания эффективности каналов.`,
      results: `За 6 месяцев работы узнаваемость бренда выросла на 200%, количество лидов увеличилось на 180%, конверсия воронок продаж выросла на 95%, ROI маркетинговых кампаний составляет 420%.`,
    },
    'advertising': {
      task: `Настройка и ведение контекстной рекламы. Требовалось создать эффективную рекламную кампанию, которая будет привлекать целевых клиентов и обеспечивать высокую конверсию при оптимальных затратах.`,
      solution: `Мы настроили и запустили рекламные кампании в Google Ads и Yandex.Direct с точным таргетингом и оптимизацией ставок. Создали релевантные объявления и посадочные страницы. Настроили аналитику и автоматизацию управления ставками.`,
      results: `За 3 месяца работы стоимость привлечения клиента снизилась на 40%, конверсия выросла на 120%, ROI рекламных кампаний составляет 350%. Количество целевых заявок увеличилось в 3 раза.`,
    },
    'design': {
      task: `Создание фирменного стиля и дизайна. Требовалось разработать уникальный визуальный образ компании, который будет отражать ценности бренда и привлекать внимание целевой аудитории.`,
      solution: `Мы создали комплексный фирменный стиль: логотип, цветовая палитра, типографика, элементы графики. Разработали руководство по использованию бренда и применили стиль ко всем точкам контакта с клиентами.`,
      results: `Узнаваемость бренда выросла на 180%, визуальная идентичность стала единообразной во всех каналах коммуникации, положительные отзывы о дизайне увеличились на 200%.`,
    },
    'ai': {
      task: `Внедрение AI-решений для бизнеса. Требовалось автоматизировать бизнес-процессы с помощью искусственного интеллекта, повысить эффективность работы и улучшить взаимодействие с клиентами.`,
      solution: `Мы внедрили AI-решения для автоматизации рутинных задач, обработки данных и улучшения клиентского сервиса. Настроили чат-боты, системы аналитики на основе машинного обучения и инструменты для персонализации контента.`,
      results: `Производительность работы увеличилась на 150%, время обработки запросов сократилось на 70%, удовлетворенность клиентов выросла на 120%. Затраты на операционные процессы снизились на 45%.`,
    },
  };

  const texts = categoryTexts[category] || categoryTexts['website'];
  
  return {
    task: texts.task,
    solution: texts.solution,
    results: texts.results,
    contentHtml: `
      <h2>Задача</h2>
      <p>${texts.task}</p>
      
      <h2>Решение</h2>
      <p>${texts.solution}</p>
      
      <h2>Результаты</h2>
      <p>${texts.results}</p>
    `,
  };
}

// Генерация метрик для кейса
function generateMetrics(category) {
  const metricsMap = {
    'website': {
      'Увеличение трафика': '+150%',
      'Скорость загрузки': '<2 сек',
      'Конверсия': '+85%',
      'Позиции в поиске': 'Топ-10',
    },
    'mobile': {
      'Активных пользователей': '+200%',
      'Рейтинг в магазинах': '4.8/5',
      'Время использования': '+120%',
      'Скачиваний': '+180%',
    },
    'seo': {
      'Органический трафик': '+250%',
      'Топ-10 позиций': '45 запросов',
      'Конверсии из поиска': '+180%',
      'Время на сайте': '+95%',
    },
    'marketing': {
      'Узнаваемость бренда': '+200%',
      'Количество лидов': '+180%',
      'Конверсия воронок': '+95%',
      'ROI кампаний': '420%',
      'Охват аудитории': '+250%',
      'Вовлеченность': '+160%',
    },
    'advertising': {
      'Снижение стоимости клика': '-40%',
      'Конверсия': '+120%',
      'ROI': '350%',
      'Целевых заявок': '+300%',
    },
    'design': {
      'Узнаваемость бренда': '+180%',
      'Положительные отзывы': '+200%',
      'Вовлеченность': '+150%',
      'Конверсия': '+90%',
    },
    'ai': {
      'Производительность': '+150%',
      'Сокращение времени обработки': '-70%',
      'Удовлетворенность клиентов': '+120%',
      'Снижение затрат': '-45%',
    },
  };

  return metricsMap[category] || metricsMap['website'];
}

// Определение категории кейса на основе услуги
function determineCaseCategory(serviceTitle, serviceDescription, serviceCategory) {
  const title = (serviceTitle || '').toLowerCase();
  const desc = (serviceDescription || '').toLowerCase();
  
  // Мобильные приложения
  if (title.includes('приложение') || title.includes('мобильное') || title.includes('app')) {
    return 'mobile';
  }
  
  // AI решения
  if (title.includes('ai') || title.includes('искусственный интеллект') || title.includes('нейро')) {
    return 'ai';
  }
  
  // Маркетинг (проверяем перед SEO и рекламой)
  if (title.includes('маркетинг') || title.includes('marketing') || title.includes('smm') || 
      title.includes('социальные сети') || title.includes('контент-маркетинг') ||
      desc.includes('маркетинг') || desc.includes('marketing') || desc.includes('smm')) {
    return 'marketing';
  }
  
  // SEO
  if (title.includes('seo') || title.includes('продвижение') || title.includes('оптимизация')) {
    return 'seo';
  }
  
  // Реклама
  if (title.includes('реклама') || title.includes('контекстная') || title.includes('таргетинг')) {
    return 'advertising';
  }
  
  // Дизайн
  if (title.includes('дизайн') || title.includes('брендинг') || title.includes('логотип') || title.includes('фирменный стиль')) {
    return 'design';
  }
  
  // По умолчанию - сайт
  return 'website';
}

// Генерация slug из названия
function createSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^\w\s-а-яё]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 100);
}

// Основная функция
async function createCasesForServices() {
  console.log('🚀 Начинаем создание кейсов для услуг...\n');

  try {
    // Получаем все активные услуги
    const servicesResult = await pool.query(
      `SELECT slug, title, description_html, category_id 
       FROM products 
       WHERE is_active = TRUE 
       ORDER BY sort_order ASC, created_at DESC`
    );

    const services = servicesResult.rows;
    console.log(`📋 Найдено услуг: ${services.length}\n`);

    // Получаем существующие кейсы
    const existingCasesResult = await pool.query('SELECT slug FROM cases');
    const existingSlugs = new Set(existingCasesResult.rows.map(r => r.slug));

    let created = 0;
    let skipped = 0;

    for (const service of services) {
      const caseSlug = `case-${service.slug}`;
      
      // Пропускаем, если кейс уже существует
      if (existingSlugs.has(caseSlug)) {
        console.log(`⏭️  Пропущен: "${service.title}" (кейс уже существует)`);
        skipped++;
        continue;
      }

      // Определяем категорию кейса
      const caseCategory = determineCaseCategory(
        service.title,
        service.description_html,
        service.category_id
      );

      // Генерируем контент
      const content = generateCaseContent(service.title, service.description_html, caseCategory);
      
      // Определяем инструменты
      const tools = [];
      for (const [key, value] of Object.entries(serviceToolsMap)) {
        if (service.title.toLowerCase().includes(key)) {
          tools.push(...value);
          break;
        }
      }
      if (tools.length === 0) {
        tools.push(...serviceToolsMap['разработка сайта']);
      }

      // Генерируем метрики
      const metrics = generateMetrics(caseCategory);

      // Создаем кейс
      await pool.query(
        `INSERT INTO cases (
          slug, title, summary, content_html, hero_image_url, 
          gallery, metrics, tools, category, is_published, 
          content_json, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
        [
          caseSlug,
          `${service.title} - Кейс`,
          content.task.substring(0, 200) + '...',
          content.contentHtml,
          null, // hero_image_url - будет добавлено позже
          [], // gallery - будет добавлено позже
          metrics,
          tools,
          caseCategory,
          true, // is_published
          JSON.stringify({
            task: content.task,
            solution: content.solution,
            results: content.results,
            serviceSlug: service.slug,
          }),
        ]
      );

      console.log(`✅ Создан кейс: "${service.title}" (${caseCategory})`);
      created++;
    }

    console.log(`\n✅ Готово!`);
    console.log(`   Создано: ${created} кейсов`);
    console.log(`   Пропущено: ${skipped} кейсов`);
    
  } catch (error) {
    console.error('\n❌ Ошибка при создании кейсов:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Запускаем скрипт
createCasesForServices().catch(console.error);

