import pool from '../db.js';

// Список популярных сайтов, которые не должны быть донорами
const POPULAR_SITES = [
  'vk.com',
  'avito.ru',
  'market.yandex.ru',
  'yandex.ru',
  'google.com',
  'facebook.com',
  'instagram.com',
  'ok.ru',
  'mail.ru',
  'rambler.ru',
  'ozon.ru',
  'wildberries.ru',
  'aliexpress.ru',
  'amazon.com',
  'ebay.com',
];

// Релевантные .ru сайты для разных категорий
const DONOR_SITES = {
  advertising: [
    'https://www.mediametrics.ru',
    'https://www.advmaker.ru',
    'https://www.advertology.ru',
    'https://www.mediascope.net',
    'https://www.kommersant.ru',
    'https://www.rbc.ru',
    'https://www.vedomosti.ru',
    'https://www.forbes.ru',
  ],
  website: [
    'https://www.tinkoff.ru',
    'https://www.sberbank.ru',
    'https://www.alfabank.ru',
    'https://www.raiffeisen.ru',
    'https://www.qiwi.com',
    'https://www.yandex.ru',
    'https://www.mail.ru',
    'https://www.rambler.ru',
  ],
  mobile: [
    'https://www.tinkoff.ru',
    'https://www.sberbank.ru',
    'https://www.delivery-club.ru',
    'https://www.yandex.ru',
  ],
  seo: [
    'https://www.seonews.ru',
    'https://www.webmaster.yandex.ru',
    'https://www.searchengines.ru',
  ],
  design: [
    'https://www.behance.net',
    'https://www.dribbble.com',
    'https://www.design.ru',
  ],
  ai: [
    'https://www.habr.com',
    'https://www.vc.ru',
    'https://www.techcrunch.com',
  ],
};

// Исправление кейса про рекламу в ВК
async function fixVKAdsCase() {
  console.log('Исправляю кейс про рекламу в ВК...');
  
  // Обновляем категорию, donor_url и метрики
  await pool.query(`
    UPDATE cases 
    SET 
      category = 'advertising',
      donor_url = 'https://vk.com/club12345678',
      metrics = jsonb_build_object(
        'ctr', '4.8',
        'cpc', '38',
        'conversion', '15',
        'roi', '420',
        'reach', '320',
        'engagement', '280',
        'clicks', '12500',
        'impressions', '260000'
      )
    WHERE slug = 'advertising-vk-ads'
  `);
  
  console.log('✅ Кейс про рекламу в ВК исправлен');
}

// Проверка и исправление доноров
async function fixDonorUrls() {
  console.log('\nПроверяю и исправляю доноры...');
  
  const result = await pool.query(`
    SELECT slug, title, category, donor_url 
    FROM cases 
    WHERE donor_url IS NOT NULL 
    ORDER BY created_at DESC
  `);
  
  let fixed = 0;
  
  for (const row of result.rows) {
    const donorUrl = row.donor_url;
    if (!donorUrl) continue;
    
    // Проверяем, не является ли донор популярным сайтом
    const isPopular = POPULAR_SITES.some(site => donorUrl.includes(site));
    
    // Проверяем, что это .ru домен (или допустимый .com/.net для дизайна)
    const isRuDomain = donorUrl.includes('.ru') || 
                       (row.category === 'design' && (donorUrl.includes('behance.net') || donorUrl.includes('dribbble.com')));
    
    if (isPopular || !isRuDomain) {
      // Выбираем релевантный донор
      const category = row.category || 'website';
      const availableDonors = DONOR_SITES[category] || DONOR_SITES.website;
      const randomDonor = availableDonors[Math.floor(Math.random() * availableDonors.length)];
      
      await pool.query(
        'UPDATE cases SET donor_url = $1 WHERE slug = $2',
        [randomDonor, row.slug]
      );
      
      console.log(`  ✅ ${row.slug}: ${donorUrl} → ${randomDonor}`);
      fixed++;
    }
  }
  
  console.log(`\n✅ Исправлено доноров: ${fixed}`);
}

// Проверка релевантности блоков для всех кейсов
async function checkCasesRelevance() {
  console.log('\nПроверяю релевантность блоков для всех кейсов...');
  
  const result = await pool.query(`
    SELECT slug, title, category, content_json, metrics
    FROM cases 
    WHERE is_published = TRUE
    ORDER BY created_at DESC
  `);
  
  for (const row of result.rows) {
    const category = row.category;
    const issues = [];
    
    // Проверяем метрики для рекламы
    if (category === 'advertising') {
      const metrics = row.metrics || {};
      const hasRelevantMetrics = metrics.ctr || metrics.cpc || metrics.conversion || metrics.roi;
      
      if (!hasRelevantMetrics) {
        issues.push('Метрики не релевантны рекламе (нужны: CTR, CPC, Конверсия, ROI)');
      }
    }
    
    if (issues.length > 0) {
      console.log(`  ⚠️  ${row.slug} (${row.title}):`);
      issues.forEach(issue => console.log(`     - ${issue}`));
    }
  }
  
  console.log('\n✅ Проверка завершена');
}

// Основная функция
async function main() {
  try {
    await fixVKAdsCase();
    await fixDonorUrls();
    await checkCasesRelevance();
    
    console.log('\n✅ Все исправления применены!');
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await pool.end();
  }
}

main();

