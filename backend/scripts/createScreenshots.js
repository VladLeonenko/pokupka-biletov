import pool from '../db.js';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');
const imagesDir = path.join(projectRoot, 'frontend/public/legacy/img/cases');

// Создаем директорию для изображений, если её нет
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// Функция для создания скриншота страницы
async function createScreenshot(page, url, outputPath, options = {}) {
  try {
    console.log(`    Загружаю: ${url}`);
    
    // Пробуем разные стратегии загрузки
    try {
      await page.goto(url, { 
        waitUntil: 'networkidle', 
        timeout: 30000 
      });
    } catch (networkError) {
      // Если networkidle не сработал, пробуем domcontentloaded
      try {
        await page.goto(url, { 
          waitUntil: 'domcontentloaded', 
          timeout: 15000 
        });
      } catch (domError) {
        // Если и это не сработало, пробуем load
        await page.goto(url, { 
          waitUntil: 'load', 
          timeout: 10000 
        });
      }
    }
    
    // Ждем немного, чтобы страница полностью загрузилась
    await page.waitForTimeout(2000);
    
    // Делаем скриншот
    await page.screenshot({
      path: outputPath,
      fullPage: options.fullPage !== false,
      type: 'png',
    });
    
    console.log(`    ✅ Сохранено: ${outputPath}`);
    return true;
  } catch (error) {
    // Не выводим ошибку, просто возвращаем false
    return false;
  }
}

// Функция для создания скриншотов для одного кейса
async function createCaseScreenshots(browser, caseData) {
  const { slug, donor_url, title } = caseData;
  
  if (!donor_url) {
    console.log(`  ⏭️  ${slug}: нет донора, пропускаю`);
    return false;
  }
  
  const caseDir = path.join(imagesDir, slug);
  
  // Создаем директорию для кейса
  if (!fs.existsSync(caseDir)) {
    fs.mkdirSync(caseDir, { recursive: true });
  }
  
  console.log(`  📸 ${slug} (${title})`);
  console.log(`    Донор: ${donor_url}`);
  
  const context = await browser.newContext({ 
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true
  });
  const page = await context.newPage();
  
  let created = 0;
  
  try {
    // Обложка - главная страница
    const coverPath = path.join(caseDir, 'cover.png');
    if (!fs.existsSync(coverPath)) {
      if (await createScreenshot(page, donor_url, coverPath)) {
        created++;
      }
    } else {
      console.log(`    ⏭️  Обложка уже существует`);
    }
    
    // Галерея 1 - главная страница
    const gallery1Path = path.join(caseDir, 'gallery-1.png');
    if (!fs.existsSync(gallery1Path)) {
      if (await createScreenshot(page, donor_url, gallery1Path)) {
        created++;
      }
    } else {
      console.log(`    ⏭️  Gallery-1 уже существует`);
    }
    
    // Галерея 2 - пытаемся найти каталог/услуги
    const gallery2Path = path.join(caseDir, 'gallery-2.png');
    if (!fs.existsSync(gallery2Path)) {
      const catalogUrls = [
        `${donor_url}/catalog`,
        `${donor_url}/catalogue`,
        `${donor_url}/products`,
        `${donor_url}/services`,
        `${donor_url}/uslugi`,
        `${donor_url}/katalog`,
        `${donor_url}/shop`,
        `${donor_url}/catalog.html`,
        `${donor_url}/index.html#catalog`,
      ];
      
      let gallery2Created = false;
      for (const catalogUrl of catalogUrls) {
        if (await createScreenshot(page, catalogUrl, gallery2Path)) {
          gallery2Created = true;
          created++;
          break;
        }
      }
      
      // Если не нашли каталог, используем главную страницу с другим ракурсом
      if (!gallery2Created) {
        try {
          await page.goto(donor_url, { waitUntil: 'domcontentloaded', timeout: 15000 });
          await page.evaluate(() => window.scrollTo(0, window.innerHeight * 0.5));
          await page.waitForTimeout(1000);
          if (await createScreenshot(page, donor_url, gallery2Path, { fullPage: false })) {
            created++;
          }
        } catch (e) {
          // Если не удалось, пропускаем
        }
      }
    } else {
      console.log(`    ⏭️  Gallery-2 уже существует`);
    }
    
    // Галерея 3 - пытаемся найти контакты/форму
    const gallery3Path = path.join(caseDir, 'gallery-3.png');
    if (!fs.existsSync(gallery3Path)) {
      const contactUrls = [
        `${donor_url}/contacts`,
        `${donor_url}/contact`,
        `${donor_url}/kontakty`,
        `${donor_url}/about`,
        `${donor_url}/o-nas`,
        `${donor_url}/contact.html`,
        `${donor_url}/index.html#contacts`,
      ];
      
      let gallery3Created = false;
      for (const contactUrl of contactUrls) {
        if (await createScreenshot(page, contactUrl, gallery3Path)) {
          gallery3Created = true;
          created++;
          break;
        }
      }
      
      // Если не нашли контакты, скроллим главную страницу вниз
      if (!gallery3Created) {
        try {
          await page.goto(donor_url, { waitUntil: 'domcontentloaded', timeout: 15000 });
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await page.waitForTimeout(1000);
          if (await createScreenshot(page, donor_url, gallery3Path, { fullPage: false })) {
            created++;
          }
        } catch (e) {
          // Если не удалось, пропускаем
        }
      }
    } else {
      console.log(`    ⏭️  Gallery-3 уже существует`);
    }
    
  } finally {
    await page.close();
    await context.close();
  }
  
  return created > 0;
}

// Основная функция
async function main() {
  console.log('🚀 Начинаю создание скриншотов для кейсов...\n');
  
  // Получаем все кейсы с донорами
  // Для теста можно ограничить количество: LIMIT 5
  const limit = process.argv.includes('--test') ? 5 : null;
  let query = `
    SELECT slug, title, donor_url
    FROM cases 
    WHERE is_published = TRUE 
      AND donor_url IS NOT NULL
    ORDER BY created_at DESC
  `;
  if (limit) {
    query += ` LIMIT ${limit}`;
  }
  const result = await pool.query(query);
  
  console.log(`Найдено кейсов: ${result.rows.length}\n`);
  
  // Запускаем браузер
  console.log('🌐 Запускаю браузер...');
  const browser = await chromium.launch({
    headless: true,
  });
  
  let totalCreated = 0;
  let processed = 0;
  
  try {
    // Обрабатываем кейсы по одному
    for (const caseData of result.rows) {
      processed++;
      console.log(`\n[${processed}/${result.rows.length}]`);
      
      const created = await createCaseScreenshots(browser, caseData);
      if (created) {
        totalCreated++;
      }
      
      // Небольшая пауза между запросами
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  } catch (error) {
    console.error('\n❌ Ошибка при обработке:', error.message);
  } finally {
    await browser.close();
    await pool.end();
  }
  
  console.log(`\n✅ Готово!`);
  console.log(`   Обработано кейсов: ${processed}`);
  console.log(`   Создано новых изображений в ${totalCreated} кейсах`);
  console.log(`\n📁 Изображения сохранены в: ${imagesDir}`);
}

main().catch(error => {
  console.error('❌ Критическая ошибка:', error);
  process.exit(1);
});

