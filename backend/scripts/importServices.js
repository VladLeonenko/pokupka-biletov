import pool from '../db.js';
import fs from 'fs';
import { createHash } from 'crypto';

// Функция для создания slug из названия
function createSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^\w\s-а-яё]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 100);
}

// Функция для извлечения цены из текста
function extractPrice(priceText) {
  if (!priceText) return null;
  
  const priceMatch = priceText.match(/(\d+[\s,.]?\d*)/);
  if (priceMatch) {
    const price = parseInt(priceMatch[1].replace(/\s/g, '').replace(',', '').replace('.', ''));
    return price * 100; // Конвертируем в центы
  }
  return null;
}

// Функция для генерации SEO текста
function generateSEOText(title, description) {
  const seoTitle = `${title} - Профессиональные услуги | PrimeCoder`;
  const seoDescription = description 
    ? `${description.substring(0, 150)}... Заказать ${title.toLowerCase()} в PrimeCoder.`
    : `Заказать ${title.toLowerCase()} у профессионалов. Качественные услуги по доступным ценам.`;
  
  const seoKeywords = [
    title.toLowerCase(),
    'услуги',
    'профессиональные услуги',
    'заказать',
    ...title.split(' ').map(w => w.toLowerCase())
  ].filter((v, i, a) => a.indexOf(v) === i).join(', ');
  
  return {
    title: seoTitle,
    description: seoDescription,
    keywords: seoKeywords
  };
}

// Функция для генерации расширенного описания
function generateExtendedDescription(title, description, source) {
  const baseDescription = description || `Профессиональная услуга "${title}" от PrimeCoder.`;
  
  const extended = `
    <div class="service-description">
      <h2>О услуге "${title}"</h2>
      <p>${baseDescription}</p>
      
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
  
  return extended.trim();
}

// Функция для определения категории и тегов
function determineCategoryAndTags(title, description) {
  const text = (title + ' ' + description).toLowerCase();
  
  // Определяем категорию
  let categorySlug = 'other';
  let categoryName = 'Прочие услуги';
  
  if (text.includes('дизайн') || text.includes('design')) {
    categorySlug = 'design';
    categoryName = 'Дизайн';
  } else if (text.includes('разработка') || text.includes('разработка сайт') || text.includes('веб')) {
    categorySlug = 'development';
    categoryName = 'Разработка';
  } else if (text.includes('маркетинг') || text.includes('реклама') || text.includes('продвижение')) {
    categorySlug = 'marketing';
    categoryName = 'Маркетинг';
  } else if (text.includes('консалтинг') || text.includes('консультация')) {
    categorySlug = 'consulting';
    categoryName = 'Консалтинг';
  } else if (text.includes('брендинг') || text.includes('логотип')) {
    categorySlug = 'branding';
    categoryName = 'Брендинг';
  }
  
  // Определяем теги
  const tags = [];
  if (text.includes('срочно')) tags.push('срочно');
  if (text.includes('индивидуальный')) tags.push('индивидуальный');
  if (text.includes('комплекс')) tags.push('комплексный');
  if (text.includes('поддержка')) tags.push('поддержка');
  if (text.includes('консультация')) tags.push('консультация');
  if (text.includes('аудит')) tags.push('аудит');
  if (text.includes('оптимизация')) tags.push('оптимизация');
  
  // Добавляем теги из категории
  tags.push(categoryName.toLowerCase());
  
  return { categorySlug, categoryName, tags };
}

// Основная функция импорта
async function importServices() {
  console.log('Starting service import...\n');
  
  // Читаем спарсенные услуги
  let services = [];
  try {
    const data = fs.readFileSync('parsed_services.json', 'utf8');
    services = JSON.parse(data);
    console.log(`Loaded ${services.length} services from parsed_services.json\n`);
  } catch (error) {
    console.error('Error reading parsed_services.json:', error.message);
    console.log('Please run parseServices.js first to parse services from websites.');
    process.exit(1);
  }
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Создаем категории, если их нет
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
      } else {
        categoryMap[cat.slug] = existing.rows[0].id;
      }
    }
    
    console.log('Categories ready\n');
    
    // Импортируем услуги
    let imported = 0;
    let skipped = 0;
    
    for (const service of services) {
      const slug = createSlug(service.title);
      
      // Проверяем, существует ли уже товар с таким slug
      const existing = await client.query(
        'SELECT id FROM products WHERE slug = $1',
        [slug]
      );
      
      if (existing.rows.length > 0) {
        console.log(`⏭️  Skipping "${service.title}" (already exists)`);
        skipped++;
        continue;
      }
      
      // Определяем категорию и теги
      const { categorySlug, categoryName, tags } = determineCategoryAndTags(
        service.title,
        service.description
      );
      
      // Генерируем контент
      const seo = generateSEOText(service.title, service.description);
      const extendedDescription = generateExtendedDescription(
        service.title,
        service.description,
        service.source
      );
      
      // Извлекаем цену
      const priceCents = extractPrice(service.priceText);
      
      // Создаем контент JSON
      const contentJson = {
        seo: {
          title: seo.title,
          description: seo.description,
          keywords: seo.keywords
        },
        extendedDescription: extendedDescription,
        source: service.source,
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
      
      // Вставляем товар
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
          priceCents || 0,
          'RUB',
          'one_time',
          contentJson.features,
          true,
          imported,
          JSON.stringify(contentJson),
          categoryMap[categorySlug],
          service.imageUrl || null,
          service.imageUrl ? [service.imageUrl] : [],
          999, // Неограниченное количество
          `SVC-${Date.now()}-${imported}`,
          tags
        ]
      );
      
      console.log(`✅ Imported: "${service.title}" (${categoryName})`);
      imported++;
    }
    
    await client.query('COMMIT');
    
    console.log(`\n✅ Import completed!`);
    console.log(`   Imported: ${imported} services`);
    console.log(`   Skipped: ${skipped} services`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error importing services:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

importServices().catch(console.error);

