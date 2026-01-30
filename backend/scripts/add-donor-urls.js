import pool from '../db.js';

// Маппинг slug кейсов на ссылки сайтов-доноров
// Заполните этот объект реальными ссылками на сайты-доноры
const donorUrls = {
  // Пример структуры:
  // 'boutique-fashion-store': 'https://example-boutique.com',
  // 'handmade-marketplace': 'https://example-marketplace.com',
  // ... добавьте ссылки для всех кейсов
};

async function updateDonorUrls() {
  try {
    console.log('Обновляем ссылки на сайты-доноры...\n');
    
    let updated = 0;
    let skipped = 0;
    
    for (const [slug, url] of Object.entries(donorUrls)) {
      if (!url) {
        console.log(`⏭️  Пропущен ${slug} - нет ссылки`);
        skipped++;
        continue;
      }
      
      const result = await pool.query(
        'UPDATE cases SET donor_url = $1, updated_at = NOW() WHERE slug = $2 RETURNING title',
        [url, slug]
      );
      
      if (result.rows.length > 0) {
        console.log(`✅ Обновлен ${slug}: ${result.rows[0].title} -> ${url}`);
        updated++;
      } else {
        console.log(`⚠️  Кейс ${slug} не найден`);
        skipped++;
      }
    }
    
    console.log(`\n🎉 Обновлено: ${updated}, Пропущено: ${skipped}`);
    
    // Показываем все кейсы без ссылок на доноров
    const casesWithoutDonor = await pool.query(
      "SELECT slug, title FROM cases WHERE (donor_url IS NULL OR donor_url = '') AND is_published = TRUE ORDER BY title"
    );
    
    if (casesWithoutDonor.rows.length > 0) {
      console.log(`\n📋 Кейсы без ссылок на доноров (${casesWithoutDonor.rows.length}):`);
      casesWithoutDonor.rows.forEach((caseItem) => {
        console.log(`   - ${caseItem.slug}: ${caseItem.title}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error(error);
    process.exit(1);
  }
}

updateDonorUrls();

