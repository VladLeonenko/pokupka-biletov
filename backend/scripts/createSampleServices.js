import pool from '../db.js';

// Базовый список услуг на основе типичных услуг веб-студий
const sampleServices = [
  {
    title: 'Разработка сайта под ключ',
    category: 'development',
    tags: ['разработка', 'сайт', 'под-ключ', 'комплексный'],
    price: 50000
  },
  {
    title: 'Создание интернет-магазина',
    category: 'development',
    tags: ['разработка', 'интернет-магазин', 'e-commerce'],
    price: 150000
  },
  {
    title: 'Дизайн логотипа и фирменного стиля',
    category: 'branding',
    tags: ['дизайн', 'логотип', 'брендинг', 'фирменный-стиль'],
    price: 30000
  },
  {
    title: 'UI/UX дизайн интерфейсов',
    category: 'design',
    tags: ['дизайн', 'ui', 'ux', 'интерфейс'],
    price: 40000
  },
  {
    title: 'Продвижение сайта (SEO)',
    category: 'marketing',
    tags: ['seo', 'продвижение', 'оптимизация'],
    price: 25000
  },
  {
    title: 'Контекстная реклама',
    category: 'marketing',
    tags: ['реклама', 'контекстная', 'яндекс-директ', 'google-ads'],
    price: 20000
  },
  {
    title: 'Консультация по разработке',
    category: 'consulting',
    tags: ['консультация', 'разработка'],
    price: 5000
  },
  {
    title: 'Техническая поддержка сайта',
    category: 'other',
    tags: ['поддержка', 'техническая', 'обслуживание'],
    price: 10000
  }
];

function createSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^\w\s-а-яё]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 100);
}

function generateDescription(title, category) {
  const descriptions = {
    development: `Профессиональная разработка "${title}" с использованием современных технологий. Мы создаем качественные веб-решения, которые работают эффективно и приносят результат вашим бизнес-задачам.`,
    design: `Создание уникального дизайна для "${title}". Наша команда дизайнеров создаст визуальное решение, которое отражает вашу уникальность и привлекает внимание целевой аудитории.`,
    marketing: `Эффективное продвижение "${title}" с помощью проверенных инструментов интернет-маркетинга. Мы поможем увеличить трафик и конверсию вашего сайта.`,
    branding: `Разработка комплексного брендинга "${title}". Создадим узнаваемый образ вашего бренда, который будет работать на вас долгие годы.`,
    consulting: `Профессиональная консультация по "${title}". Получите экспертные рекомендации от наших специалистов для принятия правильных решений.`,
    other: `Профессиональная услуга "${title}". Мы гарантируем качественное выполнение работ и индивидуальный подход к каждому клиенту.`
  };
  
  return descriptions[category] || descriptions.other;
}

function generateExtendedDescription(title, description, category) {
  return `
    <div class="service-description">
      <h2>О услуге "${title}"</h2>
      <p>${description}</p>
      
      <h3>Что включает услуга:</h3>
      <ul>
        <li>Профессиональный подход к выполнению задачи</li>
        <li>Индивидуальный подход к каждому клиенту</li>
        <li>Гарантия качества выполненных работ</li>
        <li>Своевременное выполнение в указанные сроки</li>
        <li>Техническая поддержка после завершения работы</li>
      </ul>
      
      <h3>Почему выбирают нас:</h3>
      <ul>
        <li>Опыт работы с различными проектами</li>
        <li>Использование современных технологий и инструментов</li>
        <li>Прозрачное ценообразование без скрытых платежей</li>
        <li>Гибкий график работы</li>
        <li>Консультации на всех этапах сотрудничества</li>
      </ul>
      
      <h3>Как заказать:</h3>
      <p>Для заказа услуги "${title}" заполните форму обратной связи на этой странице или свяжитесь с нами по указанным контактам. Наш менеджер свяжется с вами в ближайшее время для обсуждения деталей проекта.</p>
    </div>
  `;
}

function generateSEO(title, description) {
  return {
    title: `${title} - Профессиональные услуги | PrimeCoder`,
    description: `${description.substring(0, 150)}... Заказать ${title.toLowerCase()} в PrimeCoder. Качественные услуги по доступным ценам.`,
    keywords: `${title.toLowerCase()}, услуги, профессиональные услуги, заказать, ${title.split(' ').join(', ')}`
  };
}

async function main() {
  console.log('Creating sample services...\n');
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Создаем категории
    const categories = [
      { slug: 'design', name: 'Дизайн' },
      { slug: 'development', name: 'Разработка' },
      { slug: 'marketing', name: 'Маркетинг' },
      { slug: 'consulting', name: 'Консалтинг' },
      { slug: 'branding', name: 'Брендинг' },
      { slug: 'other', name: 'Прочие услуги' }
    ];
    
    const categoryMap = {};
    for (const cat of categories) {
      const existing = await client.query(
        'SELECT id FROM product_categories WHERE slug = $1',
        [cat.slug]
      );
      
      if (existing.rows.length === 0) {
        const result = await client.query(
          `INSERT INTO product_categories (slug, name, description, is_active, sort_order)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [cat.slug, cat.name, `Категория услуг: ${cat.name}`, true, 0]
        );
        categoryMap[cat.slug] = result.rows[0].id;
        console.log(`✅ Created category: ${cat.name}`);
      } else {
        categoryMap[cat.slug] = existing.rows[0].id;
      }
    }
    
    console.log('\nCreating services...\n');
    
    // Создаем услуги
    let created = 0;
    let skipped = 0;
    
    for (let i = 0; i < sampleServices.length; i++) {
      const service = sampleServices[i];
      const slug = createSlug(service.title);
      
      // Проверяем, существует ли уже
      const existing = await client.query(
        'SELECT id FROM products WHERE slug = $1',
        [slug]
      );
      
      if (existing.rows.length > 0) {
        console.log(`⏭️  Skipping "${service.title}" (already exists)`);
        skipped++;
        continue;
      }
      
      const description = generateDescription(service.title, service.category);
      const extendedDescription = generateExtendedDescription(service.title, description, service.category);
      const seo = generateSEO(service.title, description);
      
      const contentJson = {
        seo: seo,
        extendedDescription: extendedDescription,
        source: 'manual',
        features: [
          'Профессиональный подход',
          'Индивидуальный подход',
          'Гарантия качества',
          'Своевременное выполнение',
          'Техническая поддержка'
        ],
        examples: [],
        quickActions: [
          { type: 'order', label: 'Заказать услугу', action: 'order' },
          { type: 'consultation', label: 'Получить консультацию', action: 'consultation' },
          { type: 'calculate', label: 'Рассчитать стоимость', action: 'calculate' }
        ]
      };
      
      await client.query(
        `INSERT INTO products (
          slug, title, description_html, price_cents, currency, price_period,
          features, is_active, sort_order, content_json, category_id,
          image_url, gallery, stock_quantity, sku, tags
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          slug,
          service.title,
          extendedDescription,
          service.price * 100, // в центах
          'RUB',
          'one_time',
          contentJson.features,
          true,
          i,
          JSON.stringify(contentJson),
          categoryMap[service.category],
          null,
          [],
          999,
          `SVC-${Date.now()}-${i}`,
          service.tags
        ]
      );
      
      console.log(`✅ Created: "${service.title}" (${service.category})`);
      created++;
    }
    
    await client.query('COMMIT');
    
    console.log(`\n✅ Import completed!`);
    console.log(`   Created: ${created} services`);
    console.log(`   Skipped: ${skipped} services`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);

