import pool from '../db.js';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');
const imagesDir = path.join(projectRoot, 'frontend/public/legacy/img/cases');

// Более скромные доноры (2-5 страница выдачи, не топ-3, не обязательно региональные)
const MODEST_DONORS = {
  advertising: [
    'https://www.stroymarket.ru',
    'https://www.medclinic.ru',
    'https://www.fitness-center.ru',
    'https://www.avtosalon.ru',
    'https://www.restaurant-premium.ru',
    'https://www.yuridicheskaya-kompaniya.ru',
    'https://www.strahovaya-kompaniya.ru',
    'https://www.obrazovatelnyy-tsentr.ru',
    'https://www.salon-krasoty-premium.ru',
    'https://www.logisticheskaya-kompaniya.ru',
  ],
  design: [
    'https://www.startup-tech.ru',
    'https://www.eco-brand.ru',
    'https://www.fitness-brand.ru',
    'https://www.restaurant-chain.ru',
    'https://www.financial-service.ru',
    'https://www.tech-startup.ru',
    'https://www.premium-boutique.ru',
    'https://www.creative-agency.ru',
  ],
  seo: [
    'https://www.real-estate-agency.ru',
    'https://www.education-online.ru',
    'https://www.medical-clinic-seo.ru',
    'https://www.saas-startup.ru',
    'https://www.ecommerce-store.ru',
    'https://www.local-business.ru',
    'https://www.veterinary-clinic.ru',
    'https://www.autosalon-seo.ru',
  ],
  website: [
    'https://www.remont-kvartir.ru',
    'https://www.dostavka-edy.ru',
    'https://www.avtoservis.ru',
    'https://www.stroitelstvo-domov.ru',
    'https://www.obuchenie-online.ru',
    'https://www.meditsinskie-uslugi.ru',
    'https://www.yuridicheskie-uslugi.ru',
    'https://www.dizayn-intererov.ru',
    'https://www.fitness-trenery.ru',
    'https://www.kosmetologiya.ru',
    'https://www.logistika-gruzov.ru',
    'https://www.remont-ofisov.ru',
  ],
  mobile: [
    'https://www.dostavka-edy-mobile.ru',
    'https://www.fitness-app.ru',
    'https://www.meditsina-online.ru',
    'https://www.obuchenie-mobile.ru',
  ],
  ai: [
    'https://www.ai-assistant-business.ru',
    'https://www.smart-analytics-company.ru',
    'https://www.automation-solutions.ru',
  ],
  marketing: [
    'https://www.digital-marketing-agency.ru',
    'https://www.content-marketing-agency.ru',
    'https://www.social-media-agency.ru',
    'https://www.email-marketing-service.ru',
    'https://www.influencer-marketing.ru',
    'https://www.affiliate-marketing.ru',
    'https://www.viral-marketing-agency.ru',
    'https://www.event-marketing.ru',
    'https://www.brand-activation-agency.ru',
    'https://www.promotional-agency.ru',
    'https://www.loyalty-program-agency.ru',
    'https://www.lead-generation-agency.ru',
    'https://www.conversion-optimization.ru',
    'https://www.landing-page-agency.ru',
    'https://www.marketing-automation-agency.ru',
  ],
};

// Функция для извлечения названия компании из URL (без города)
function extractCompanyName(url, title) {
  try {
    const domain = new URL(url).hostname.replace('www.', '').replace('.ru', '').replace('.com', '');
    // Преобразуем домен в читаемое название, исключая города
    const cityNames = ['spb', 'moscow', 'nsk', 'krd', 'kzn', 'ekb', 'nn', 'ufa', 'krasnodar', 
                       'novosibirsk', 'ekaterinburg', 'kazan', 'nizhny-novgorod', 'samara', 
                       'rostov', 'chelyabinsk', 'volgograd', 'voronezh'];
    const parts = domain.split('-').filter(part => !cityNames.includes(part.toLowerCase()));
    const capitalized = parts.map(part => 
      part.charAt(0).toUpperCase() + part.slice(1)
    ).join(' ');
    return capitalized;
  } catch {
    // Если не получилось, используем часть из title
    const match = title.match(/для\s+([^|]+)/i) || title.match(/([А-Я][а-я]+(?:\s+[А-Я][а-я]+)*)/);
    return match ? match[1] : 'Компания';
  }
}

// Функция для извлечения цветов из страницы
async function extractColors(page) {
  try {
    const colors = await page.evaluate(() => {
      const colorMap = new Map();
      const elements = document.querySelectorAll('*');
      
      elements.forEach(el => {
        const styles = window.getComputedStyle(el);
        const bgColor = styles.backgroundColor;
        const textColor = styles.color;
        const borderColor = styles.borderColor;
        
        [bgColor, textColor, borderColor].forEach(color => {
          if (color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent' && color !== 'rgb(0, 0, 0)') {
            // Конвертируем в hex
            const rgb = color.match(/\d+/g);
            if (rgb && rgb.length >= 3) {
              const hex = '#' + rgb.slice(0, 3).map(x => {
                const val = parseInt(x);
                return (val < 16 ? '0' : '') + val.toString(16);
              }).join('');
              
              if (!colorMap.has(hex)) {
                colorMap.set(hex, 0);
              }
              colorMap.set(hex, colorMap.get(hex) + 1);
            }
          }
        });
      });
      
      // Сортируем по частоте использования и берем топ-5
      return Array.from(colorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([color]) => color);
    });
    
    return colors.length > 0 ? colors : ['#ffbb00', '#141414', '#ffffff', '#333333', '#666666'];
  } catch {
    return ['#ffbb00', '#141414', '#ffffff', '#333333', '#666666'];
  }
}

// Функция для извлечения типографики из страницы
async function extractTypography(page) {
  try {
    const typography = await page.evaluate(() => {
      const fontMap = new Map();
      const elements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div, a');
      
      elements.forEach(el => {
        const styles = window.getComputedStyle(el);
        const fontFamily = styles.fontFamily;
        const fontSize = styles.fontSize;
        const fontWeight = styles.fontWeight;
        
        if (fontFamily && fontSize) {
          const key = `${fontFamily}-${fontSize}-${fontWeight}`;
          if (!fontMap.has(key)) {
            fontMap.set(key, {
              family: fontFamily.split(',')[0].replace(/['"]/g, ''),
              size: fontSize,
              weight: fontWeight,
            });
          }
        }
      });
      
      // Берем самый популярный шрифт
      const fonts = Array.from(fontMap.values());
      return fonts.length > 0 ? fonts[0] : {
        family: 'Inter, sans-serif',
        size: '16px',
        weight: '400',
      };
    });
    
    return typography;
  } catch {
    return {
      family: 'Inter, sans-serif',
      size: '16px',
      weight: '400',
    };
  }
}

// Функция для создания скриншота с обходом блокировок
async function createScreenshotWithBypass(page, url, outputPath) {
  try {
    // Устанавливаем User-Agent обычного браузера
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    });
    
    // Пробуем загрузить страницу с разными стратегиями
    let loaded = false;
    const strategies = [
      { waitUntil: 'domcontentloaded', timeout: 20000 },
      { waitUntil: 'load', timeout: 15000 },
      { waitUntil: 'networkidle', timeout: 30000 },
    ];
    
    for (const strategy of strategies) {
      try {
        await page.goto(url, strategy);
        loaded = true;
        break;
      } catch (e) {
        // Пробуем следующую стратегию
        continue;
      }
    }
    
    if (!loaded) {
      return false;
    }
    
    // Ждем загрузки контента
    await page.waitForTimeout(3000);
    
    // Проверяем на блокировку (Cloudflare, captcha и т.д.)
    const isBlocked = await page.evaluate(() => {
      const bodyText = document.body.innerText.toLowerCase();
      return bodyText.includes('checking your browser') ||
             bodyText.includes('подождите') ||
             bodyText.includes('captcha') ||
             bodyText.includes('доступ ограничен');
    });
    
    if (isBlocked) {
      console.log(`    ⚠️  Страница заблокирована, пропускаю`);
      return false;
    }
    
    // Делаем скриншот
    await page.screenshot({
      path: outputPath,
      fullPage: true,
      type: 'png',
    });
    
    return true;
  } catch (error) {
    return false;
  }
}

// Функция для генерации текста на основе категории и донора
function generateCaseContent(category, companyName, donorUrl) {
  const categoryTexts = {
    website: {
      task: `Разработать современный корпоративный сайт для ${companyName}, который будет эффективно представлять компанию в интернете, привлекать новых клиентов и обеспечивать удобный пользовательский опыт.`,
      solution: `Мы создали полнофункциональный веб-сайт с современным дизайном, адаптивной версткой и интуитивно понятной навигацией. Сайт включает все необходимые разделы: главную страницу, каталог услуг, портфолио, контакты и форму обратной связи. Особое внимание уделено производительности и SEO-оптимизации.`,
      results: `В результате реализации проекта ${companyName} получила современный инструмент для привлечения клиентов. Сайт демонстрирует профессионализм компании, обеспечивает удобство взаимодействия с клиентами и способствует росту бизнеса.`,
    },
    mobile: {
      task: `Разработать мобильное приложение для ${companyName}, которое обеспечит удобный доступ к услугам компании с мобильных устройств и улучшит взаимодействие с клиентами.`,
      solution: `Мы разработали нативное мобильное приложение с интуитивным интерфейсом, быстрой загрузкой и стабильной работой. Приложение включает все ключевые функции компании, push-уведомления и интеграцию с основными сервисами.`,
      results: `Мобильное приложение для ${companyName} значительно упростило взаимодействие с клиентами, увеличило вовлеченность и обеспечило рост конверсий через мобильные устройства.`,
    },
    seo: {
      task: `Провести комплексное SEO-продвижение сайта ${companyName} для увеличения органического трафика и улучшения позиций в поисковых системах.`,
      solution: `Мы провели полный аудит сайта, оптимизировали техническую часть, улучшили контент и структуру, настроили внутреннюю перелинковку. Реализовали стратегию наращивания качественных внешних ссылок и регулярного обновления контента.`,
      results: `В результате SEO-оптимизации сайт ${companyName} значительно улучшил позиции в поисковых системах, увеличил органический трафик и количество целевых переходов, что привело к росту конверсий и продаж.`,
    },
    advertising: {
      task: `Настроить эффективную рекламную кампанию для ${companyName} в поисковых системах и социальных сетях для привлечения целевой аудитории и увеличения продаж.`,
      solution: `Мы разработали комплексную рекламную стратегию, настроили рекламные кампании в Яндекс.Директ и Google Ads, создали релевантные объявления и посадочные страницы. Оптимизировали ставки и таргетинг для максимальной эффективности.`,
      results: `Рекламная кампания для ${companyName} показала отличные результаты: увеличился поток целевых посетителей, выросла конверсия и снизилась стоимость привлечения клиента. ROI кампании превысил ожидания.`,
    },
    design: {
      task: `Создать современный фирменный стиль и дизайн для ${companyName}, который отражает ценности компании и привлекает целевую аудиторию.`,
      solution: `Мы разработали уникальный визуальный стиль, включающий логотип, цветовую палитру, типографику и набор графических элементов. Создали руководство по использованию бренда и применили новый стиль ко всем материалам компании.`,
      results: `Новый фирменный стиль ${companyName} значительно повысил узнаваемость бренда, создал единый визуальный образ компании и способствовал росту доверия со стороны клиентов и партнеров.`,
    },
    ai: {
      task: `Внедрить AI-решения для автоматизации бизнес-процессов ${companyName} и повышения эффективности работы.`,
      solution: `Мы разработали и внедрили комплекс AI-инструментов для автоматизации рутинных задач, анализа данных и улучшения взаимодействия с клиентами. Система интегрирована с существующей инфраструктурой компании.`,
      results: `AI-решения для ${companyName} позволили значительно сократить время на выполнение рутинных задач, улучшить качество обслуживания клиентов и повысить общую эффективность бизнеса.`,
    },
  };
  
  return categoryTexts[category] || categoryTexts.website;
}

// Функция для генерации метрик на основе категории
function generateMetrics(category) {
  const baseMetrics = {
    website: {
      days: Math.floor(Math.random() * 30) + 15, // 15-45 дней
      pages: Math.floor(Math.random() * 20) + 5, // 5-25 страниц
    },
    mobile: {
      days: Math.floor(Math.random() * 60) + 30, // 30-90 дней
      features: Math.floor(Math.random() * 15) + 5, // 5-20 функций
    },
    seo: {
      days: Math.floor(Math.random() * 90) + 60, // 60-150 дней
      keywords: Math.floor(Math.random() * 100) + 50, // 50-150 ключевых слов
    },
    advertising: {
      days: Math.floor(Math.random() * 30) + 15, // 15-45 дней
      campaigns: Math.floor(Math.random() * 10) + 3, // 3-13 кампаний
    },
    design: {
      days: Math.floor(Math.random() * 20) + 10, // 10-30 дней
      elements: Math.floor(Math.random() * 20) + 10, // 10-30 элементов
    },
    ai: {
      days: Math.floor(Math.random() * 60) + 30, // 30-90 дней
      automations: Math.floor(Math.random() * 10) + 3, // 3-13 автоматизаций
    },
  };
  
  return baseMetrics[category] || baseMetrics.website;
}

// Основная функция обновления кейса
async function updateCase(browser, caseData) {
  const { slug, title, category, donor_url } = caseData;
  const categoryKey = category || 'website';
  
  // Получаем более скромного донора
  const donors = MODEST_DONORS[categoryKey] || MODEST_DONORS.website;
  const seed = slug.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const newDonorUrl = donors[seed % donors.length];
  
  // Извлекаем название компании (без города)
  const companyName = extractCompanyName(newDonorUrl, title);
  
  // Убираем город из названия, если он есть
  const cityPatterns = /\s+(Москва|СПб|Санкт-Петербург|Краснодар|Новосибирск|Екатеринбург|Казань|Нижний Новгород|Самара|Ростов|Челябинск|Волгоград|Уфа|Воронеж|Krasnodar|Novosibirsk|Ekaterinburg|Kazan|Samara|Rostov|Chelyabinsk|Volgograd|Ufa|Voronezh|Spb|Moscow|Nsk|Krd|Kzn|Ekb|Nn)\s*/gi;
  const cleanedTitle = title.replace(cityPatterns, ' ').replace(/\s+/g, ' ').trim();
  
  // Обновляем название кейса с названием компании (без города)
  const newTitle = cleanedTitle.includes(companyName) 
    ? cleanedTitle 
    : `${cleanedTitle} для ${companyName}`;
  
  console.log(`\n📝 Обновляю кейс: ${slug}`);
  console.log(`   Название: ${newTitle}`);
  console.log(`   Донор: ${newDonorUrl}`);
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  
  try {
    // Создаем скриншоты
    const caseDir = path.join(imagesDir, slug);
    if (!fs.existsSync(caseDir)) {
      fs.mkdirSync(caseDir, { recursive: true });
    }
    
    const coverPath = path.join(caseDir, 'cover.png');
    const coverCreated = await createScreenshotWithBypass(page, newDonorUrl, coverPath);
    
    // Извлекаем цвета и типографику
    let colors = ['#ffbb00', '#141414', '#ffffff'];
    let typography = { family: 'Inter, sans-serif', size: '16px', weight: '400' };
    
    if (coverCreated && ['website', 'mobile', 'design'].includes(categoryKey)) {
      try {
        colors = await extractColors(page);
        typography = await extractTypography(page);
      } catch (e) {
        console.log(`   ⚠️  Не удалось извлечь цвета/типографику`);
      }
    }
    
    // Генерируем контент
    const content = generateCaseContent(categoryKey, companyName, newDonorUrl);
    const metrics = generateMetrics(categoryKey);
    
    // Обновляем в базе данных
    const contentJson = {
      ...(['website', 'mobile', 'design'].includes(categoryKey) && {
        colors: {
          palette: colors,
        },
        typography: {
          fontFamily: typography.family,
          fontSize: typography.size,
          fontWeight: typography.weight,
        },
      }),
    };
    
    const updateQuery = `
      UPDATE cases 
      SET 
        title = $1,
        donor_url = $2,
        hero_image_url = $3,
        content_json = $4,
        summary = $5,
        content_html = $6,
        metrics = $7,
        updated_at = NOW()
      WHERE slug = $8
    `;
    
    const heroImageUrl = coverCreated ? `/legacy/img/cases/${slug}/cover.png` : null;
    const summary = content.task.substring(0, 150) + '...';
    const contentHtml = `
      <div style="margin-bottom: 3rem;">
        <h3 style="font-size: 1.5rem; font-weight: 400; margin-bottom: 1.5rem; color: #fff;">Задача</h3>
        <p style="font-size: 1.125rem; line-height: 1.8; color: rgba(255, 255, 255, 0.9); margin-bottom: 1.5rem;">${content.task}</p>
      </div>
      <div style="margin-bottom: 3rem;">
        <h3 style="font-size: 1.5rem; font-weight: 400; margin-bottom: 1.5rem; color: #fff;">Решение</h3>
        <p style="font-size: 1.125rem; line-height: 1.8; color: rgba(255, 255, 255, 0.9); margin-bottom: 1.5rem;">${content.solution}</p>
      </div>
      <div style="margin-bottom: 3rem;">
        <h3 style="font-size: 1.5rem; font-weight: 400; margin-bottom: 1.5rem; color: #fff;">Результаты</h3>
        <p style="font-size: 1.125rem; line-height: 1.8; color: rgba(255, 255, 255, 0.9); margin-bottom: 1.5rem;">${content.results}</p>
      </div>
    `;
    
    const metricsJson = {
      days: metrics.days,
      ...(categoryKey === 'website' && { pages: metrics.pages }),
      ...(categoryKey === 'mobile' && { features: metrics.features }),
      ...(categoryKey === 'seo' && { keywords: metrics.keywords }),
      ...(categoryKey === 'advertising' && { campaigns: metrics.campaigns }),
      ...(categoryKey === 'design' && { elements: metrics.elements }),
      ...(categoryKey === 'ai' && { automations: metrics.automations }),
    };
    
    await pool.query(updateQuery, [
      newTitle,
      newDonorUrl,
      heroImageUrl,
      JSON.stringify(contentJson),
      summary,
      contentHtml,
      JSON.stringify(metricsJson),
      slug,
    ]);
    
    console.log(`   ✅ Кейс обновлен`);
    
    // Пауза между запросами
    await new Promise(resolve => setTimeout(resolve, 5000));
    
  } catch (error) {
    console.error(`   ❌ Ошибка: ${error.message}`);
  } finally {
    await page.close();
    await context.close();
  }
}

// Основная функция
async function main() {
  console.log('🚀 Начинаю комплексное обновление кейсов...\n');
  
  const limit = process.argv.includes('--test') ? 3 : null;
  let query = `
    SELECT slug, title, category, donor_url
    FROM cases 
    WHERE is_published = TRUE
    ORDER BY created_at DESC
  `;
  if (limit) {
    query += ` LIMIT ${limit}`;
  }
  
  const result = await pool.query(query);
  console.log(`Найдено кейсов: ${result.rows.length}\n`);
  
  const browser = await chromium.launch({
    headless: true,
  });
  
  try {
    for (let i = 0; i < result.rows.length; i++) {
      const caseData = result.rows[i];
      console.log(`\n[${i + 1}/${result.rows.length}]`);
      await updateCase(browser, caseData);
    }
  } finally {
    await browser.close();
    await pool.end();
  }
  
  console.log('\n✅ Все кейсы обновлены!');
}

main().catch(error => {
  console.error('❌ Критическая ошибка:', error);
  process.exit(1);
});

