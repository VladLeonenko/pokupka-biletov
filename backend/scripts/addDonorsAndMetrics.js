import pool from '../db.js';

// Релевантные .ru сайты для разных категорий
const DONOR_SITES = {
  advertising: [
    'https://www.mediametrics.ru',
    'https://www.advmaker.ru',
    'https://www.advertology.ru',
    'https://www.kommersant.ru',
    'https://www.rbc.ru',
    'https://www.vedomosti.ru',
  ],
  website: [
    'https://www.tinkoff.ru',
    'https://www.sberbank.ru',
    'https://www.alfabank.ru',
    'https://www.raiffeisen.ru',
    'https://www.qiwi.com',
  ],
  mobile: [
    'https://www.tinkoff.ru',
    'https://www.sberbank.ru',
    'https://www.delivery-club.ru',
  ],
  seo: [
    'https://www.seonews.ru',
    'https://www.searchengines.ru',
  ],
  design: [
    'https://www.design.ru',
  ],
  ai: [
    'https://www.habr.com',
    'https://www.vc.ru',
  ],
};

// Генерация релевантных метрик для категорий
function generateMetrics(category, slug) {
  const seed = slug ? slug.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : Math.random() * 1000;
  const random = (seed * 9301 + 49297) % 233280 / 233280;
  
  switch (category) {
    case 'advertising':
      return {
        ctr: (3.5 + random * 2).toFixed(1), // 3.5-5.5%
        cpc: Math.floor(30 + random * 30), // 30-60 ₽
        conversion: (8 + random * 8).toFixed(1), // 8-16%
        roi: Math.floor(250 + random * 200), // 250-450%
        reach: Math.floor(150 + random * 200), // 150-350%
        engagement: Math.floor(120 + random * 180), // 120-300%
        clicks: Math.floor(5000 + random * 10000), // 5000-15000
        impressions: Math.floor(100000 + random * 200000), // 100000-300000
      };
    
    case 'seo':
      return {
        top10Positions: Math.floor(30 + random * 50), // 30-80 запросов
        organicTraffic: Math.floor(180 + random * 120), // 180-300%
        searchConversions: Math.floor(150 + random * 100), // 150-250%
        timeOnSite: Math.floor(70 + random * 50), // 70-120%
      };
    
    case 'website':
      return {
        firstContentfulPaint: (0.6 + random * 0.4).toFixed(1), // 0.6-1.0 сек
        speedIndex: (0.7 + random * 0.5).toFixed(1), // 0.7-1.2 сек
        largestContentfulPaint: (0.8 + random * 0.6).toFixed(1), // 0.8-1.4 сек
        cumulativeLayoutShift: (0.1 + random * 0.2).toFixed(3), // 0.1-0.3
        performance: Math.floor(90 + random * 10), // 90-100%
      };
    
    case 'mobile':
      return {
        appLaunchTime: (0.8 + random * 0.6).toFixed(1), // 0.8-1.4 сек
        appSize: Math.floor(35 + random * 20), // 35-55 МБ
        memoryUsage: Math.floor(100 + random * 40), // 100-140 МБ
        mobilePerformance: Math.floor(92 + random * 7), // 92-99%
      };
    
    case 'design':
      return {
        brandRecognition: Math.floor(150 + random * 100), // 150-250%
        positiveReviews: Math.floor(180 + random * 80), // 180-260%
        engagement: Math.floor(120 + random * 100), // 120-220%
        designConversion: Math.floor(70 + random * 50), // 70-120%
      };
    
    case 'ai':
      return {
        accuracy: Math.floor(95 + random * 4), // 95-99%
        processingSpeed: (0.2 + random * 0.3).toFixed(1), // 0.2-0.5 сек
        timeSaved: Math.floor(60 + random * 20), // 60-80%
        satisfaction: Math.floor(90 + random * 9), // 90-99%
      };
    
    default:
      return {
        days: Math.floor(25 + random * 30), // 25-55 дней
        pages: Math.floor(50 + random * 50), // 50-100 стр
        hours: Math.floor(500 + random * 500), // 500-1000 часов
      };
  }
}

// Добавление доноров и метрик для всех кейсов
async function addDonorsAndMetrics() {
  console.log('Добавляю доноров и метрики для всех кейсов...\n');
  
  const result = await pool.query(`
    SELECT slug, title, category, donor_url, metrics
    FROM cases 
    WHERE is_published = TRUE
    ORDER BY created_at DESC
  `);
  
  let updated = 0;
  
  for (const row of result.rows) {
    const category = row.category || 'website';
    let needsUpdate = false;
    const updates = {};
    
    // Добавляем донора, если его нет
    if (!row.donor_url) {
      const availableDonors = DONOR_SITES[category] || DONOR_SITES.website;
      const randomDonor = availableDonors[Math.floor(Math.random() * availableDonors.length)];
      updates.donor_url = randomDonor;
      needsUpdate = true;
    }
    
    // Добавляем метрики, если их нет или они не релевантны
    const currentMetrics = row.metrics || {};
    const relevantMetrics = generateMetrics(category, row.slug);
    
    if (category === 'advertising') {
      // Для рекламы проверяем наличие релевантных метрик
      if (!currentMetrics.ctr && !currentMetrics.cpc && !currentMetrics.conversion && !currentMetrics.roi) {
        updates.metrics = relevantMetrics;
        needsUpdate = true;
      }
    } else if (Object.keys(currentMetrics).length === 0) {
      // Для других категорий добавляем метрики, если их нет
      updates.metrics = relevantMetrics;
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      const setClause = [];
      const values = [];
      let paramIndex = 1;
      
      if (updates.donor_url) {
        setClause.push(`donor_url = $${paramIndex++}`);
        values.push(updates.donor_url);
      }
      
      if (updates.metrics) {
        setClause.push(`metrics = $${paramIndex++}`);
        values.push(JSON.stringify(updates.metrics));
      }
      
      values.push(row.slug);
      
      await pool.query(
        `UPDATE cases SET ${setClause.join(', ')} WHERE slug = $${paramIndex}`,
        values
      );
      
      console.log(`  ✅ ${row.slug} (${row.title}):`);
      if (updates.donor_url) console.log(`     Донор: ${updates.donor_url}`);
      if (updates.metrics) console.log(`     Метрики: ${Object.keys(updates.metrics).join(', ')}`);
      updated++;
    }
  }
  
  console.log(`\n✅ Обновлено кейсов: ${updated}`);
}

// Основная функция
async function main() {
  try {
    await addDonorsAndMetrics();
    console.log('\n✅ Все доноры и метрики добавлены!');
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await pool.end();
  }
}

main();

