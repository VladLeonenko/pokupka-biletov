import pool from '../db.js';
import { chromium } from 'playwright';
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsRoot = path.resolve(__dirname, '..', 'uploads');
const imagesDir = path.join(uploadsRoot, 'images');

// Размеры изображений согласно требованиям
const HERO_SIZE = { width: 1920, height: 1080 }; // 16:9
const GALLERY_SIZE = { width: 1200, height: 800 }; // 3:2

/**
 * Делает скриншот сайта и обрабатывает его
 */
async function screenshotSite(url, options = {}) {
  const { 
    fullPage = true, 
    viewport = { width: 1920, height: 1080 },
    waitFor = 2000,
    timeout = 30000,
    scrollPosition = 0 // Позиция скролла для частичного скриншота
  } = options;

  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  const context = await browser.newContext({ 
    viewport,
    ignoreHTTPSErrors: true // Игнорируем ошибки SSL сертификатов
  });
  const page = await context.newPage();

  try {
    console.log(`  Открываем страницу: ${url}`);
    
    // Пробуем загрузить страницу с разными стратегиями
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout });
    } catch (networkError) {
      // Если networkidle не сработал, пробуем domcontentloaded
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeout / 2 });
      } catch (domError) {
        // Если и это не сработало, пробуем load
        await page.goto(url, { waitUntil: 'load', timeout: timeout / 3 });
      }
    }
    
    // Ждем дополнительное время для загрузки динамического контента
    await page.waitForTimeout(waitFor);
    
    // Скроллим вниз для загрузки ленивых изображений
    try {
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
        return new Promise(resolve => setTimeout(resolve, 1000));
      });
    } catch (e) {
      // Игнорируем ошибки скролла
    }
    
    // Устанавливаем нужную позицию скролла
    if (scrollPosition > 0) {
      try {
        await page.evaluate((pos) => window.scrollTo(0, pos), scrollPosition);
        await page.waitForTimeout(500);
      } catch (e) {
        // Игнорируем ошибки скролла
      }
    } else {
      // Возвращаемся наверх для полного скриншота
      try {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(500);
      } catch (e) {
        // Игнорируем ошибки скролла
      }
    }

    const screenshot = await page.screenshot({ 
      fullPage,
      type: 'png',
      timeout: 10000 // Таймаут для скриншота
    });

    await browser.close();
    return screenshot;
  } catch (error) {
    await browser.close();
    throw error;
  }
}

/**
 * Обрабатывает изображение: ресайз, обрезка, конвертация
 */
async function processImage(buffer, targetSize, outputPath, format = 'png') {
  try {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    let pipeline = sharp(buffer);

    // Получаем метаданные для определения ориентации
    const metadata = await pipeline.metadata();
    const srcWidth = metadata.width || 0;
    const srcHeight = metadata.height || 0;
    const aspectRatio = srcWidth / srcHeight;
    const targetAspectRatio = targetSize.width / targetSize.height;

    // Если исходное изображение меньше целевого, просто ресайзим с заполнением
    if (srcWidth < targetSize.width || srcHeight < targetSize.height) {
      // Ресайз с заполнением (cover) - изображение заполнит весь размер
      pipeline = pipeline.resize(targetSize.width, targetSize.height, {
        fit: 'cover',
        position: 'center'
      });
    } else {
      // Изображение достаточно большое - обрезаем до нужного размера
      if (aspectRatio > targetAspectRatio) {
        // Изображение шире - обрезаем по высоте
        const newWidth = Math.round(targetSize.height * aspectRatio);
        pipeline = pipeline
          .resize(newWidth, targetSize.height, { fit: 'cover' })
          .extract({ 
            left: Math.floor((newWidth - targetSize.width) / 2), 
            top: 0, 
            width: targetSize.width, 
            height: targetSize.height 
          });
      } else {
        // Изображение выше - обрезаем по ширине
        const newHeight = Math.round(targetSize.width / aspectRatio);
        pipeline = pipeline
          .resize(targetSize.width, newHeight, { fit: 'cover' })
          .extract({ 
            left: 0, 
            top: Math.floor((newHeight - targetSize.height) / 2), 
            width: targetSize.width, 
            height: targetSize.height 
          });
      }
    }

    // Конвертация в нужный формат
    if (format === 'jpg' || format === 'jpeg') {
      pipeline = pipeline.jpeg({ quality: 90 });
    } else {
      pipeline = pipeline.png({ quality: 90 });
    }

    await pipeline.toFile(outputPath);
    return outputPath;
  } catch (error) {
    throw new Error(`Ошибка обработки изображения: ${error.message}`);
  }
}

/**
 * Генерирует имя файла на основе slug кейса
 */
function generateFilename(caseSlug, type, index = null) {
  const suffix = index !== null ? `-${index}` : '';
  return `${caseSlug}-${type}${suffix}.png`;
}

/**
 * Основная функция для создания скриншотов кейсов
 */
async function screenshotCases() {
  try {
    console.log('📸 Начинаем создание скриншотов для кейсов...\n');

    // Проверяем аргументы командной строки
    const forceUpdate = process.argv.includes('--force') || process.argv.includes('-f');
    const skipExisting = process.argv.includes('--skip-existing') || process.argv.includes('-s');

    // Получаем кейсы с donor_url
    let query = `
      SELECT slug, title, donor_url, hero_image_url, gallery 
      FROM cases 
      WHERE donor_url IS NOT NULL 
      AND donor_url != '' 
      AND is_published = TRUE
    `;
    
    // Если не force и не skip-existing, обновляем только те, у которых нет hero_image_url
    if (!forceUpdate && !skipExisting) {
      query += ` AND (hero_image_url IS NULL OR hero_image_url = '')`;
    }
    
    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query);

    console.log(`Найдено ${result.rows.length} кейсов с donor_url\n`);

    if (result.rows.length === 0) {
      console.log('Нет кейсов для обработки');
      process.exit(0);
    }

    let processed = 0;
    let skipped = 0;
    let failed = 0;

    for (const row of result.rows) {
      const { slug, title, donor_url, hero_image_url, gallery } = row;
      
      console.log(`\n📋 Обрабатываем: ${title}`);
      console.log(`   Slug: ${slug}`);
      console.log(`   URL: ${donor_url}`);

      // Пропускаем, если уже есть изображение и не force
      if (hero_image_url && !forceUpdate && skipExisting) {
        console.log(`   ⏭️  Пропускаем (уже есть изображение: ${hero_image_url})`);
        skipped++;
        continue;
      }

      try {
        // Делаем основной скриншот для Hero (верх страницы)
        const heroScreenshot = await screenshotSite(donor_url, {
          fullPage: false,
          viewport: { width: 1920, height: 1080 },
          waitFor: 3000,
          scrollPosition: 0
        });

        // Создаем Hero изображение
        const heroFilename = generateFilename(slug, 'hero');
        const heroPath = path.join(imagesDir, heroFilename);
        await processImage(heroScreenshot, HERO_SIZE, heroPath, 'png');
        const heroUrl = `/uploads/images/${heroFilename}`;
        console.log(`   ✅ Hero изображение: ${heroUrl}`);

        // Создаем дополнительные изображения для галереи (2 штуки)
        // Делаем скриншоты разных частей страницы для разнообразия
        const galleryImages = [];
        const scrollPositions = [400, 800]; // Позиции скролла для разных частей страницы
        
        for (let i = 0; i < 2; i++) {
          const galleryScreenshot = await screenshotSite(donor_url, {
            fullPage: false,
            viewport: { width: 1920, height: 1080 },
            waitFor: 2000,
            scrollPosition: scrollPositions[i]
          });

          const galleryFilename = generateFilename(slug, 'gallery', i + 1);
          const galleryPath = path.join(imagesDir, galleryFilename);
          await processImage(galleryScreenshot, GALLERY_SIZE, galleryPath, 'png');
          const galleryUrl = `/uploads/images/${galleryFilename}`;
          galleryImages.push(galleryUrl);
          console.log(`   ✅ Галерея ${i + 1}: ${galleryUrl}`);
          
          // Задержка между скриншотами одной страницы
          await new Promise(resolve => setTimeout(resolve, 3000)); // 3 секунды между скриншотами
        }

        // Обновляем БД
        const updatedGallery = gallery && Array.isArray(gallery) 
          ? [...gallery, ...galleryImages].slice(0, 10) // Максимум 10 изображений
          : [heroUrl, ...galleryImages];

        await pool.query(
          `UPDATE cases 
           SET hero_image_url = $1, 
               gallery = $2, 
               updated_at = NOW() 
           WHERE slug = $3`,
          [heroUrl, JSON.stringify(updatedGallery), slug]
        );

        console.log(`   ✅ БД обновлена`);
        processed++;

        // Увеличиваем задержку между запросами, чтобы избежать блокировок
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5 секунд между кейсами

      } catch (error) {
        console.log(`   ❌ Ошибка: ${error.message}`);
        failed++;
      }
    }

    console.log(`\n\n🎉 Готово!`);
    console.log(`   Обработано: ${processed}`);
    console.log(`   Пропущено: ${skipped}`);
    console.log(`   Ошибок: ${failed}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Запуск скрипта
screenshotCases();

