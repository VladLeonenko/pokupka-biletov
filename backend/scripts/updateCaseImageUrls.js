import pool from '../db.js';

async function updateCaseImageUrls() {
  console.log('Обновляю hero_image_url и gallery для всех кейсов...\n');
  
  const result = await pool.query(`
    SELECT slug, title, donor_url, hero_image_url, gallery
    FROM cases 
    WHERE is_published = TRUE
    ORDER BY created_at DESC
  `);
  
  console.log(`Найдено кейсов: ${result.rows.length}\n`);
  
  let updated = 0;
  
  for (const row of result.rows) {
    const updates = {};
    let needsUpdate = false;
    
    // Обновляем hero_image_url на путь к cover.png
    const coverUrl = `/legacy/img/cases/${row.slug}/cover.png`;
    if (!row.hero_image_url || row.hero_image_url !== coverUrl) {
      updates.hero_image_url = coverUrl;
      needsUpdate = true;
    }
    
    // Обновляем gallery на пути к gallery-1, gallery-2, gallery-3
    const gallery = [
      `/legacy/img/cases/${row.slug}/gallery-1.png`,
      `/legacy/img/cases/${row.slug}/gallery-2.png`,
      `/legacy/img/cases/${row.slug}/gallery-3.png`,
    ];
    
    const currentGallery = row.gallery || [];
    const currentGalleryUrls = Array.isArray(currentGallery) 
      ? currentGallery.map(item => typeof item === 'string' ? item : item.url)
      : [];
    
    // Проверяем, нужно ли обновить галерею
    const galleryNeedsUpdate = !currentGalleryUrls.length || 
      currentGalleryUrls[0] !== gallery[0] ||
      currentGalleryUrls.length !== gallery.length;
    
    if (galleryNeedsUpdate) {
      updates.gallery = gallery.map((url, idx) => ({
        url,
        alt: `${row.title} - скриншот ${idx + 1}`,
      }));
      needsUpdate = true;
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
        `UPDATE cases SET ${setClause.join(', ')}, updated_at = NOW() WHERE slug = $${paramIndex}`,
        values
      );
      
      updated++;
      if (updated <= 10 || updated % 50 === 0) {
        console.log(`  ✅ ${row.slug}: обновлено`);
      }
    }
  }
  
  console.log(`\n✅ Обновлено кейсов: ${updated}`);
  await pool.end();
}

updateCaseImageUrls().catch(error => {
  console.error('❌ Ошибка:', error);
  process.exit(1);
});

