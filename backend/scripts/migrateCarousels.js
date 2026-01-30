import db from '../db.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');
const SRC_DIR = join(projectRoot, 'src');

/**
 * Парсит HTML и извлекает элементы карусели
 */
function parseCarouselItems(html, selector) {
  const items = [];
  // Ищем карусель с учетом селектора
  const startRegex = new RegExp(`<div[^>]*class="[^"]*${selector}[^"]*"[^>]*>`, 'i');
  const startMatch = html.match(startRegex);
  
  if (!startMatch) return items;
  
  const startIndex = startMatch.index + startMatch[0].length;
  let depth = 1;
  let i = startIndex;
  
  // Находим закрывающий тег для карусели
  while (i < html.length && depth > 0) {
    if (html.substring(i, i + 4) === '<div') {
      depth++;
    } else if (html.substring(i, i + 6) === '</div>') {
      depth--;
      if (depth === 0) {
        const carouselHtml = html.substring(startIndex, i);
        
        // Ищем все элементы внутри карусели с классом item
        const itemRegex = /<div[^>]*class="[^"]*item[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
        let itemMatch;
        let index = 0;
        
        while ((itemMatch = itemRegex.exec(carouselHtml)) !== null) {
          const itemHtml = itemMatch[1];
          // Извлекаем изображение
          const imgMatch = itemHtml.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
          let imageUrl = imgMatch ? imgMatch[1] : null;
          if (imageUrl) {
            imageUrl = imageUrl.replace('@img/', '/legacy/img/');
          }
          
          // Извлекаем текст (h4 или другой заголовок)
          const textMatch = itemHtml.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i);
          const text = textMatch ? textMatch[1].trim() : '';
          
          // Извлекаем ссылку если есть
          const linkMatch = itemHtml.match(/<a[^>]+href=["']([^"']+)["'][^>]*>/i);
          const linkUrl = linkMatch ? linkMatch[1] : null;
          
          // Сохраняем весь HTML если есть изображение или текст
          const fullHtml = itemHtml.trim();
          
          items.push({
            kind: imageUrl ? 'image' : 'text',
            image_url: imageUrl,
            caption_html: text || fullHtml,
            link_url: linkUrl,
            sort_order: index++,
            is_active: true,
          });
        }
        break;
      }
    }
    i++;
  }
  
  return items;
}

/**
 * Парсит вертикальную карусель (carousel-list)
 */
function parseVerticalCarousel(html) {
  const items = [];
  // Ищем carousel-list с учетом вложенности
  const startRegex = /<div[^>]*class="[^"]*carousel-list[^"]*"[^>]*>/i;
  const startMatch = html.match(startRegex);
  
  if (!startMatch) return items;
  
  const startIndex = startMatch.index + startMatch[0].length;
  let depth = 1;
  let i = startIndex;
  
  // Находим закрывающий тег для carousel-list
  while (i < html.length && depth > 0) {
    if (html.substring(i, i + 4) === '<div') {
      depth++;
    } else if (html.substring(i, i + 6) === '</div>') {
      depth--;
      if (depth === 0) {
        const carouselHtml = html.substring(startIndex, i);
        
        // Парсим все div внутри
        const divRegex = /<div[^>]*>([\s\S]*?)<\/div>/gi;
        let divMatch;
        let index = 0;
        
        while ((divMatch = divRegex.exec(carouselHtml)) !== null) {
          const content = divMatch[1].trim();
          if (content && !content.match(/^\s*$/)) {
            items.push({
              kind: 'text',
              caption_html: content,
              sort_order: index++,
              is_active: true,
            });
          }
        }
        break;
      }
    }
    i++;
  }
  
  return items;
}

/**
 * Миграция существующих каруселей из кода в БД
 */
async function migrateCarousels() {
  try {
    console.log('🚀 Начало миграции каруселей...\n');

    // Определяем карусели для миграции
    const carousels = [
      {
        slug: 'main-vertical-carousel',
        name: 'Вертикальная карусель на главной',
        type: 'vertical',
        settings: {
          autoplay: true,
          autoplaySpeed: 3000,
          speed: 800,
          loop: true,
          vertical: true,
          slidesToShow: 3,
          slidesToScroll: 1,
        },
        items: null, // Будет парситься из HTML
        parseFrom: 'index.html',
        parseSelector: 'carousel-list',
        parseFunction: parseVerticalCarousel,
      },
      {
        slug: 'blog-filters',
        name: 'Фильтры блога',
        type: 'filter',
        settings: {
          loop: true,
          margin: 30,
          nav: false,
          dots: false,
          center: true,
          items: 1,
          responsive: {
            0: { items: 1, stagePadding: 50 },
          },
        },
        items: [
          { kind: 'text', caption_html: '<h5>Все</h5>', sort_order: 0, link_url: '#all' },
        ],
      },
      {
        slug: 'blog-nonloop',
        name: 'Карусель блога (главная)',
        type: 'horizontal',
        settings: {
          center: true,
          items: 6,
          loop: true,
          margin: 30,
          dots: false,
          nav: false,
          autoplay: true,
          autoplaySpeed: 3000,
          speed: 1000,
          responsive: {
            100: { items: 1, stagePadding: 50 },
            600: { items: 3 },
            1000: { items: 5 },
          },
        },
        items: null, // Будет парситься из HTML
        parseFrom: 'index.html',
        parseFunction: (html) => {
          // Ищем owl-carousel с классом nonloop
          const startRegex = /<div[^>]*class="[^"]*owl-carousel[^"]*nonloop[^"]*"[^>]*>/i;
          const startMatch = html.match(startRegex);
          
          if (!startMatch) return [];
          
          const startIndex = startMatch.index + startMatch[0].length;
          let depth = 1;
          let i = startIndex;
          const items = [];
          
          // Находим закрывающий тег
          while (i < html.length && depth > 0) {
            if (html.substring(i, i + 4) === '<div') {
              depth++;
            } else if (html.substring(i, i + 6) === '</div>') {
              depth--;
              if (depth === 0) {
                const carouselHtml = html.substring(startIndex, i);
                
                // Ищем все элементы с классом item
                const itemRegex = /<div[^>]*class="[^"]*item[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
                let itemMatch;
                let index = 0;
                
                while ((itemMatch = itemRegex.exec(carouselHtml)) !== null) {
                  const itemHtml = itemMatch[1];
                  // Извлекаем изображение
                  const imgMatch = itemHtml.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
                  let imageUrl = imgMatch ? imgMatch[1] : null;
                  if (imageUrl) {
                    imageUrl = imageUrl.replace('@img/', '/legacy/img/');
                  }
                  
                  // Извлекаем ссылку если есть
                  const linkMatch = itemHtml.match(/<a[^>]+href=["']([^"']+)["'][^>]*>/i);
                  const linkUrl = linkMatch ? linkMatch[1] : null;
                  
                  // Сохраняем весь HTML слайда
                  const captionHtml = itemHtml.trim();
                  
                  items.push({
                    kind: imageUrl ? 'image' : 'text',
                    image_url: imageUrl,
                    caption_html: captionHtml,
                    link_url: linkUrl,
                    sort_order: index++,
                    is_active: true,
                  });
                }
                break;
              }
            }
            i++;
          }
          
          return items;
        },
      },
      {
        slug: 'menu-nav',
        name: 'Навигационное меню',
        type: 'horizontal',
        settings: {
          items: 3,
          loop: false,
          margin: 30,
          dots: false,
          nav: false,
        },
        items: [], // Будет заполнено из HTML
      },
      {
        slug: 'team',
        name: 'Команда',
        type: 'horizontal',
        settings: {
          items: 4,
          loop: false,
          margin: 30,
          dots: false,
          nav: true,
          responsive: {
            100: { items: 1, stagePadding: 50 },
            650: { items: 3 },
            1000: { items: 4 },
          },
        },
        items: [], // Будет заполнено из HTML
      },
      {
        slug: 'cases-team',
        name: 'Команда (кейсы)',
        type: 'horizontal',
        settings: {
          items: 4,
          loop: false,
          margin: 30,
          dots: false,
          nav: true,
          responsive: {
            100: { items: 1 },
            600: { items: 3 },
            1000: { items: 4 },
          },
        },
        items: [], // Будет заполнено из HTML кейсов
      },
      {
        slug: 'ads-team',
        name: 'Команда (продукты)',
        type: 'horizontal',
        settings: {
          items: 4,
          loop: false,
          margin: 30,
          dots: false,
          nav: true,
          responsive: {
            100: { items: 1, stagePadding: 50 },
            600: { items: 2 },
            1000: { items: 3 },
          },
        },
        items: [], // Будет заполнено из HTML продуктов
      },
    ];

    // Проверяем существующие карусели
    for (const carouselData of carousels) {
      const existing = await db.query('SELECT id FROM carousels WHERE slug = $1', [carouselData.slug]);
      
      let carouselId;
      if (existing.rows.length > 0) {
        console.log(`⏭️  Карусель "${carouselData.name}" уже существует, обновляем слайды...`);
        carouselId = existing.rows[0].id;
        // Удаляем старые слайды
        await db.query('DELETE FROM carousel_slides WHERE carousel_id = $1', [carouselId]);
      } else {
        // Создаем карусель
        const carouselResult = await db.query(
          'INSERT INTO carousels (slug, title) VALUES ($1, $2) RETURNING id',
          [carouselData.slug, carouselData.name]
        );
        carouselId = carouselResult.rows[0].id;
      }

      // Парсим слайды из HTML если нужно
      let items = carouselData.items;
      if (items === null && carouselData.parseFrom) {
        try {
          const htmlPath = join(SRC_DIR, carouselData.parseFrom);
          const html = readFileSync(htmlPath, 'utf-8');
          
          if (carouselData.parseFunction) {
            items = carouselData.parseFunction(html);
          } else if (carouselData.parseSelector) {
            items = parseCarouselItems(html, carouselData.parseSelector);
          }
          
          console.log(`   📄 Парсинг из ${carouselData.parseFrom}: найдено ${items?.length || 0} слайдов`);
        } catch (error) {
          console.warn(`   ⚠️  Не удалось распарсить ${carouselData.parseFrom}:`, error.message);
          items = [];
        }
      }

      // Создаем слайды
      if (items && items.length > 0) {
        for (const item of items) {
          await db.query(
            `INSERT INTO carousel_slides 
             (carousel_id, kind, image_url, caption_html, width, height, link_url, sort_order, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              carouselId,
              item.kind || 'text',
              item.image_url || null,
              item.caption_html || null,
              item.width || null,
              item.height || null,
              item.link_url || null,
              item.sort_order || 0,
              item.is_active !== undefined ? item.is_active : true,
            ]
          );
        }
        console.log(`✅ ${existing.rows.length > 0 ? 'Обновлена' : 'Создана'} карусель: "${carouselData.name}" (${items.length} слайдов)`);
      } else {
        console.log(`✅ ${existing.rows.length > 0 ? 'Обновлена' : 'Создана'} карусель: "${carouselData.name}" (0 слайдов - нужно заполнить вручную)`);
      }
    }

    console.log('\n✅ Миграция каруселей завершена!');
    console.log('\n📝 Примечание:');
    console.log('   - Некоторые карусели созданы с пустыми слайдами');
    console.log('   - Заполните их через админ-панель /admin/carousels');
    console.log('   - Или обновите скрипт для автоматического парсинга HTML');

  } catch (error) {
    console.error('❌ Ошибка при миграции каруселей:', error);
    process.exit(1);
  } finally {
    await db.end();
  }
}

migrateCarousels();

