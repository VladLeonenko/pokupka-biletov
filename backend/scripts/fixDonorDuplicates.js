import pool from '../db.js';

// Релевантные доноры для разных категорий
const DONOR_SITES = {
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
    'https://www.stroitelnaya-firma.ru',
    'https://www.fitnes-klub-premium.ru',
    'https://www.meditsinskaya-klinika.ru',
    'https://www.yurist.ru',
    'https://www.restaurant-group.ru',
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
    'https://www.food-delivery.ru',
    'https://www.education-platform.ru',
  ],
  seo: [
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

// Подсчет общего количества доноров
function getTotalDonorCount() {
  return Object.values(DONOR_SITES).reduce((sum, donors) => sum + donors.length, 0);
}

// Получить все доступные доноры для категории
function getAvailableDonors(category) {
  return DONOR_SITES[category] || DONOR_SITES.website;
}

// Получить все доноры из всех категорий
function getAllDonors() {
  const allDonors = [];
  for (const donors of Object.values(DONOR_SITES)) {
    allDonors.push(...donors);
  }
  return [...new Set(allDonors)]; // Убираем дубликаты на случай, если есть
}

// Найти уникальный донор для кейса
function findUniqueDonor(category, slug, usedDonors, allDonorsPool) {
  // Сначала пробуем найти в категории кейса
  const categoryDonors = getAvailableDonors(category);
  
  // Пробуем найти донора на основе slug (стабильный выбор)
  const seed = slug ? slug.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : Math.random() * 1000;
  let startIndex = seed % categoryDonors.length;
  
  // Ищем первый свободный донор в категории, начиная с вычисленного индекса
  for (let i = 0; i < categoryDonors.length; i++) {
    const index = (startIndex + i) % categoryDonors.length;
    const donor = categoryDonors[index];
    
    if (!usedDonors.has(donor)) {
      return donor;
    }
  }
  
  // Если все доноры категории заняты, используем пул всех доноров из БД
  if (allDonorsPool && allDonorsPool.length > 0) {
    startIndex = seed % allDonorsPool.length;
    
    for (let i = 0; i < allDonorsPool.length; i++) {
      const index = (startIndex + i) % allDonorsPool.length;
      const donor = allDonorsPool[index];
      
      if (!usedDonors.has(donor)) {
        return donor;
      }
    }
  }
  
  // Если пул не передан, пробуем из списка категорий
  const allDonors = getAllDonors();
  startIndex = seed % allDonors.length;
  
  for (let i = 0; i < allDonors.length; i++) {
    const index = (startIndex + i) % allDonors.length;
    const donor = allDonors[index];
    
    if (!usedDonors.has(donor)) {
      return donor;
    }
  }
  
  // Если ВСЕ доноры заняты, возвращаем null (это не должно произойти, если кейсов <= доноров)
  return null;
}

// Основная функция исправления дубликатов
async function fixDonorDuplicates() {
  console.log('Исправляю повторения доноров...\n');
  
  // Получаем все активные доноры из таблицы donors
  const allDonorsResult = await pool.query(`
    SELECT url 
    FROM donors 
    WHERE is_active = TRUE
    ORDER BY category, sort_order, url
  `);
  
  const donorsFromDonorsTable = allDonorsResult.rows.map(r => r.url);
  
  // Также получаем все уникальные доноры из кейсов
  const donorsFromCasesResult = await pool.query(`
    SELECT DISTINCT donor_url as url
    FROM cases 
    WHERE is_published = TRUE 
      AND donor_url IS NOT NULL 
      AND donor_url != ''
    ORDER BY donor_url
  `);
  
  const donorsFromCases = donorsFromCasesResult.rows.map(r => r.url);
  
  // Объединяем оба списка, убирая дубликаты (приоритет у таблицы donors)
  let allDonorsFromDB = [...new Set([...donorsFromDonorsTable, ...donorsFromCases])];
  
  // Получаем все опубликованные кейсы
  const result = await pool.query(`
    SELECT slug, title, category, donor_url
    FROM cases 
    WHERE is_published = TRUE
    ORDER BY created_at DESC
  `);
  
  // Если все еще недостаточно доноров, добавляем из списка DONOR_SITES
  if (allDonorsFromDB.length < result.rows.length) {
    const donorsFromList = getAllDonors();
    allDonorsFromDB = [...new Set([...allDonorsFromDB, ...donorsFromList])];
    console.log(`Добавлены доноры из списка DONOR_SITES, всего доступно: ${allDonorsFromDB.length}\n`);
  }
  
  console.log(`Всего кейсов: ${result.rows.length}`);
  console.log(`Всего уникальных доноров в БД: ${allDonorsFromDB.length}`);
  console.log(`Всего доноров в списке: ${getTotalDonorCount()}\n`);
  
  // Оптимизированный алгоритм перераспределения
  // Находим все доноры и кейсы
  const donorUsage = new Map(); // donor_url -> [case_rows]
  
  for (const row of result.rows) {
    if (row.donor_url) {
      if (!donorUsage.has(row.donor_url)) {
        donorUsage.set(row.donor_url, []);
      }
      donorUsage.get(row.donor_url).push(row);
    }
  }
  
  // Отчет о дубликатах
  const duplicatesForReport = Array.from(donorUsage.entries())
    .filter(([_, cases]) => cases.length > 1);
  
  if (duplicatesForReport.length > 0) {
    console.log(`Найдено ${duplicatesForReport.length} доноров с повторениями:\n`);
    duplicatesForReport.forEach(([donor, cases]) => {
      console.log(`  ${donor}: используется в ${cases.length} кейсах`);
      cases.forEach(c => console.log(`    - ${c.slug}`));
    });
    console.log('');
  } else {
    console.log('✅ Дубликатов не найдено!\n');
  }
  
  // Разделяем на уникальные и дубликаты
  const uniqueAssignments = new Map(); // donor_url -> case_row (уникальные, сохраняем)
  const duplicates = []; // Все кейсы с дубликатами (перераспределяем)
  const casesWithoutDonor = []; // Кейсы без доноров
  
  for (const [donor, cases] of donorUsage.entries()) {
    if (cases.length === 1) {
      // Уникальное назначение - сохраняем
      uniqueAssignments.set(donor, cases[0]);
    } else {
      // Дубликаты - все кейсы добавляем в список для перераспределения
      duplicates.push(...cases);
    }
  }
  
  // Кейсы без доноров
  for (const row of result.rows) {
    if (!row.donor_url) {
      casesWithoutDonor.push(row);
    }
  }
  
  // Все кейсы для перераспределения
  const casesToReassign = [...duplicates, ...casesWithoutDonor];
  
  console.log(`Уникальных назначений (сохраняем): ${uniqueAssignments.size}`);
  console.log(`Кейсов для перераспределения: ${casesToReassign.length}\n`);
  
  // Создаем набор занятых доноров (уникальные назначения)
  const usedDonors = new Set(uniqueAssignments.keys());
  
  // Перемешиваем кейсы для более равномерного распределения
  // Сортируем по категории, чтобы сначала обрабатывать категории с большим количеством доступных доноров
  casesToReassign.sort((a, b) => {
    const catA = a.category || 'website';
    const catB = b.category || 'website';
    const donorsA = getAvailableDonors(catA).length;
    const donorsB = getAvailableDonors(catB).length;
    return donorsB - donorsA; // Больше доноров = сначала
  });
  
  const updates = [];
  const failedCases = [];
  
  // Перераспределяем кейсы
  for (const caseRow of casesToReassign) {
    const category = caseRow.category || 'website';
    const newDonor = findUniqueDonor(category, caseRow.slug, usedDonors, allDonorsFromDB);
    
    if (newDonor) {
      updates.push({
        slug: caseRow.slug,
        title: caseRow.title,
        oldDonor: caseRow.donor_url,
        newDonor: newDonor,
        category: category,
      });
      usedDonors.add(newDonor);
    } else {
      failedCases.push(caseRow);
      console.log(`  ⚠️  Не удалось найти свободного донора для ${caseRow.slug} (категория ${category})`);
    }
  }
  
  // Если остались кейсы без доноров, пробуем еще раз с другим подходом
  if (failedCases.length > 0) {
    console.log(`\nПовторная попытка для ${failedCases.length} кейсов...\n`);
    
    // Пересчитываем использованные доноры: только те, которые назначены после обновлений
    const usedDonorsAfterUpdates = new Set();
    
    // Добавляем уникальные назначения (которые не перераспределялись)
    for (const [donor, caseRow] of uniqueAssignments.entries()) {
      // Проверяем, не перераспределен ли этот кейс
      const wasReassigned = updates.some(u => u.slug === caseRow.slug);
      if (!wasReassigned) {
        usedDonorsAfterUpdates.add(donor);
      }
    }
    
    // Добавляем доноров из обновлений
    for (const update of updates) {
      usedDonorsAfterUpdates.add(update.newDonor);
    }
    
    // Создаем список свободных доноров
    const freeDonors = allDonorsFromDB.filter(d => !usedDonorsAfterUpdates.has(d));
    
    console.log(`Уникальных назначений (без перераспределения): ${uniqueAssignments.size}`);
    console.log(`Назначений после обновлений: ${updates.length}`);
    console.log(`Используется доноров: ${usedDonorsAfterUpdates.size}`);
    console.log(`Свободных доноров: ${freeDonors.length}, кейсов для распределения: ${failedCases.length}`);
    
    if (freeDonors.length >= failedCases.length) {
      // Перераспределяем оставшиеся кейсы по порядку
      for (let i = 0; i < failedCases.length; i++) {
        const caseRow = failedCases[i];
        if (i < freeDonors.length) {
          const donor = freeDonors[i];
          // Добавляем новый update
          updates.push({
            slug: caseRow.slug,
            title: caseRow.title,
            oldDonor: caseRow.donor_url,
            newDonor: donor,
            category: caseRow.category || 'website',
          });
          usedDonorsAfterUpdates.add(donor);
          console.log(`  ✅ ${caseRow.slug}: назначен донор ${donor}`);
        }
      }
    } else {
      console.log(`  ⚠️  Недостаточно доноров: есть ${freeDonors.length}, нужно ${failedCases.length}`);
      if (freeDonors.length > 0) {
        console.log(`  Назначаем доноры ${freeDonors.length} кейсам из ${failedCases.length}`);
        for (let i = 0; i < Math.min(freeDonors.length, failedCases.length); i++) {
          const caseRow = failedCases[i];
          const donor = freeDonors[i];
          updates.push({
            slug: caseRow.slug,
            title: caseRow.title,
            oldDonor: caseRow.donor_url,
            newDonor: donor,
            category: caseRow.category || 'website',
          });
          console.log(`  ✅ ${caseRow.slug}: назначен донор ${donor}`);
        }
      }
    }
  }
  
  // Применяем обновления
  console.log(`Обновляем ${updates.length} кейсов:\n`);
  
  let updatedCount = 0;
  for (const update of updates) {
    await pool.query(
      'UPDATE cases SET donor_url = $1, updated_at = NOW() WHERE slug = $2',
      [update.newDonor, update.slug]
    );
    
    const oldDonorText = update.oldDonor ? `${update.oldDonor} -> ` : '';
    console.log(`  ✅ ${update.slug} (${update.category}): ${oldDonorText}${update.newDonor}`);
    updatedCount++;
  }
  
  console.log(`\n✅ Обновлено ${updatedCount} кейсов`);
  
  // Проверяем результат
  const finalCheck = await pool.query(`
    SELECT donor_url, COUNT(*) as count
    FROM cases
    WHERE is_published = TRUE AND donor_url IS NOT NULL AND donor_url != ''
    GROUP BY donor_url
    HAVING COUNT(*) > 1
  `);
  
  if (finalCheck.rows.length > 0) {
    console.log(`\n⚠️  Все еще осталось ${finalCheck.rows.length} доноров с повторениями:`);
    finalCheck.rows.forEach(row => {
      console.log(`  ${row.donor_url}: ${row.count} кейсов`);
    });
  } else {
    console.log('\n✅ Все повторения исправлены! Каждый донор используется только один раз.');
  }
  
  // Статистика
  const stats = await pool.query(`
    SELECT 
      COUNT(DISTINCT slug) as total_cases,
      COUNT(DISTINCT donor_url) as unique_donors
    FROM cases
    WHERE is_published = TRUE AND donor_url IS NOT NULL AND donor_url != ''
  `);
  
  if (stats.rows.length > 0) {
    const { total_cases, unique_donors } = stats.rows[0];
    console.log(`\n📊 Статистика:`);
    console.log(`   Всего кейсов с донорами: ${total_cases}`);
    console.log(`   Уникальных доноров: ${unique_donors}`);
    console.log(`   Соотношение: ${(total_cases / unique_donors).toFixed(2)} кейса на донора`);
  }
}

// Основная функция
async function main() {
  try {
    await fixDonorDuplicates();
    console.log('\n✅ Готово!');
  } catch (error) {
    console.error('❌ Ошибка:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

main();