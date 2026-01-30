import pool from '../db.js';

// Функция для генерации URL галереи на основе donor_url
// Предполагаем, что скриншоты будут храниться в структуре: /legacy/img/cases/{slug}/gallery-{index}.png
function generateGalleryUrls(slug, donorUrl, count = 3) {
  if (!donorUrl) return [];
  
  const gallery = [];
  // Генерируем URL для скриншотов разных частей сайта
  // В реальности эти скриншоты нужно будет создать вручную или через сервис скриншотов
  for (let i = 1; i <= count; i++) {
    gallery.push({
      url: `/legacy/img/cases/${slug}/gallery-${i}.png`,
      alt: `Скриншот ${i} сайта ${donorUrl}`,
    });
  }
  
  return gallery;
}

// Функция для генерации URL обложки на основе donor_url
function generateCoverUrl(slug, donorUrl) {
  if (!donorUrl) return null;
  
  // Обложка будет храниться в структуре: /legacy/img/cases/{slug}/cover.png
  return `/legacy/img/cases/${slug}/cover.png`;
}

// Генерация галереи и обложек для всех кейсов
async function generateGalleryAndCovers() {
  console.log('Генерирую URL для галереи и обложек...\n');
  
  const result = await pool.query(`
    SELECT slug, title, category, donor_url, hero_image_url, gallery
    FROM cases 
    WHERE is_published = TRUE
    ORDER BY created_at DESC
  `);
  
  let updated = 0;
  
  for (const row of result.rows) {
    const updates = {};
    let needsUpdate = false;
    
    // Генерируем обложку для всех кейсов с донором
    if (row.donor_url) {
      const coverUrl = generateCoverUrl(row.slug, row.donor_url);
      // Обновляем, если hero_image_url пустой или не соответствует пути к cover.png
      if (coverUrl && (!row.hero_image_url || !row.hero_image_url.includes(`/cases/${row.slug}/cover.png`))) {
        updates.hero_image_url = coverUrl;
        needsUpdate = true;
      }
    }
    
    // Генерируем галерею для всех кейсов с донором
    if (row.donor_url) {
      const gallery = generateGalleryUrls(row.slug, row.donor_url, 3);
      const currentGallery = row.gallery || [];
      // Проверяем, нужно ли обновить галерею
      if (!currentGallery || currentGallery.length === 0 || 
          (currentGallery.length > 0 && typeof currentGallery[0] === 'string' && !currentGallery[0].includes('/cases/'))) {
        updates.gallery = gallery;
        needsUpdate = true;
      }
    }
    
    if (needsUpdate) {
      const setClause = [];
      const values = [];
      let paramIndex = 1;
      
      if (updates.hero_image_url) {
        setClause.push(`hero_image_url = $${paramIndex++}`);
        values.push(updates.hero_image_url);
      }
      
      if (updates.gallery) {
        setClause.push(`gallery = $${paramIndex++}`);
        values.push(JSON.stringify(updates.gallery));
      }
      
      values.push(row.slug);
      
      await pool.query(
        `UPDATE cases SET ${setClause.join(', ')} WHERE slug = $${paramIndex}`,
        values
      );
      
      console.log(`  ✅ ${row.slug} (${row.title}):`);
      if (updates.hero_image_url) console.log(`     Обложка: ${updates.hero_image_url}`);
      if (updates.gallery) console.log(`     Галерея: ${updates.gallery.length} изображений`);
      updated++;
    }
  }
  
  console.log(`\n✅ Обновлено кейсов: ${updated}`);
  console.log('\n📝 Примечание:');
  console.log('   - Обложки нужно создать вручную или через сервис скриншотов');
  console.log('   - Галерея должна содержать скриншоты разных частей сайта донора:');
  console.log('     * Главная страница');
  console.log('     * Каталог/услуги');
  console.log('     * Контакты/форма обратной связи');
  console.log('   - Путь для изображений: /legacy/img/cases/{slug}/cover.png и gallery-{1-3}.png');
}

// Основная функция
async function main() {
  try {
    await generateGalleryAndCovers();
    console.log('\n✅ Все URL для галереи и обложек сгенерированы!');
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await pool.end();
  }
}

main();

