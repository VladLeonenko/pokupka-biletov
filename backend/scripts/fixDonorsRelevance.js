import pool from '../db.js';

// Релевантные доноры для разных категорий
// Не топ-3 выдачи, но и не обязательно региональные
const DONOR_SITES = {
  advertising: [
    // Компании, которым мы помогли с рекламой (не топ-3)
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
    'https://www.stroitelnaya-firma.ru',
    'https://www.fitnes-klub-premium.ru',
    'https://www.meditsinskaya-klinika.ru',
    'https://www.yurist.ru',
    'https://www.restaurant-group.ru',
  ],
  design: [
    // Компании, которым мы помогли с дизайном (не топ-3)
    'https://www.startup-tech.ru',
    'https://www.eco-brand.ru',
    'https://www.fitness-brand.ru',
    'https://www.restaurant-chain.ru',
    'https://www.financial-service.ru',
    'https://www.tech-startup.ru',
    'https://www.premium-boutique.ru',
    'https://www.creative-agency.ru',
    'https://www.food-delivery.ru',
    'https://www.education-platform.ru',
  ],
  seo: [
    // Компании, которым мы помогли с SEO (не топ-3)
    'https://www.real-estate-agency.ru',
    'https://www.education-online.ru',
    'https://www.medical-clinic-seo.ru',
    'https://www.saas-startup.ru',
    'https://www.ecommerce-store.ru',
    'https://www.local-business.ru',
    'https://www.veterinary-clinic.ru',
    'https://www.production-company.ru',
    'https://www.autosalon-seo.ru',
    'https://www.beauty-salon-seo.ru',
    'https://www.logistics-company.ru',
  ],
  website: [
    // Менее известные сайты из разных популярных ниш (не топ-3, не банки)
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
    // Мобильные приложения (не топ-3)
    'https://www.dostavka-edy-mobile.ru',
    'https://www.fitness-app.ru',
    'https://www.meditsina-online.ru',
    'https://www.obuchenie-mobile.ru',
  ],
  ai: [
    // AI проекты (не топ-3)
    'https://www.ai-assistant-business.ru',
    'https://www.smart-analytics-company.ru',
    'https://www.automation-solutions.ru',
  ],
  marketing: [
    // Маркетинговые агентства и сервисы (не топ-3)
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

// Найти уникальный донор для кейса (проверяет, не используется ли уже другим кейсом)
async function findUniqueRelevantDonor(category, title, slug, currentDonorUrl) {
  const availableDonors = DONOR_SITES[category] || DONOR_SITES.website;
  
  // Получаем все доноры, которые уже используются другими кейсами
  const usedDonorsResult = await pool.query(`
    SELECT DISTINCT donor_url 
    FROM cases 
    WHERE is_published = TRUE 
      AND donor_url IS NOT NULL 
      AND donor_url != ''
      AND slug != $1
  `, [slug]);
  
  const usedDonors = new Set(usedDonorsResult.rows.map(r => r.donor_url));
  
  // Если текущий донор не используется другими кейсами, можем его оставить
  if (currentDonorUrl && !usedDonors.has(currentDonorUrl)) {
    // Проверяем, что донор релевантен категории
    if (availableDonors.includes(currentDonorUrl)) {
      return currentDonorUrl;
    }
  }
  
  // Используем slug для стабильного выбора донора
  const seed = slug ? slug.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : Math.random() * 1000;
  let startIndex = seed % availableDonors.length;
  
  // Ищем первый свободный донор, начиная с вычисленного индекса
  for (let i = 0; i < availableDonors.length; i++) {
    const index = (startIndex + i) % availableDonors.length;
    const donor = availableDonors[index];
    
    if (!usedDonors.has(donor)) {
      return donor;
    }
  }
  
  // Если все доноры категории заняты, возвращаем первый (это не должно произойти)
  console.log(`  ⚠️  Все доноры категории ${category} заняты для кейса ${slug}`);
  return availableDonors[0];
}

// Обновление доноров для всех кейсов
async function fixDonorsRelevance() {
  console.log('Исправляю доноров для всех кейсов...\n');
  
  const result = await pool.query(`
    SELECT slug, title, category, donor_url
    FROM cases 
    WHERE is_published = TRUE
    ORDER BY created_at DESC
  `);
  
  let updated = 0;
  
  for (const row of result.rows) {
    const category = row.category || 'website';
    const relevantDonor = await findUniqueRelevantDonor(category, row.title, row.slug, row.donor_url);
    
    // Обновляем донора, если он не релевантен или используется другим кейсом
    if (!row.donor_url || row.donor_url !== relevantDonor) {
      await pool.query(
        'UPDATE cases SET donor_url = $1 WHERE slug = $2',
        [relevantDonor, row.slug]
      );
      
      const changeText = row.donor_url ? `${row.donor_url} -> ` : '';
      console.log(`  ✅ ${row.slug} (${row.title}): ${changeText}${relevantDonor}`);
      updated++;
    }
  }
  
  console.log(`\n✅ Обновлено доноров: ${updated}`);
  
  // Проверяем результат на повторения
  const duplicatesCheck = await pool.query(`
    SELECT donor_url, COUNT(*) as count
    FROM cases
    WHERE is_published = TRUE AND donor_url IS NOT NULL AND donor_url != ''
    GROUP BY donor_url
    HAVING COUNT(*) > 1
  `);
  
  if (duplicatesCheck.rows.length > 0) {
    console.log(`\n⚠️  Обнаружено ${duplicatesCheck.rows.length} доноров с повторениями`);
    console.log('Рекомендуется запустить fixDonorDuplicates.js для полного исправления');
  } else {
    console.log('\n✅ Все доноры уникальны!');
  }
}

// Основная функция
async function main() {
  try {
    await fixDonorsRelevance();
    console.log('\n✅ Все доноры исправлены!');
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await pool.end();
  }
}

main();

