import pool from '../db.js';

async function checkCaseData() {
  const result = await pool.query(`
    SELECT slug, title, hero_image_url, donor_image_url, gallery, category
    FROM cases 
    WHERE slug = 'fitnes-treker-2'
  `);
  
  if (result.rows.length === 0) {
    console.log('Кейс не найден');
    await pool.end();
    return;
  }
  
  const row = result.rows[0];
  console.log('Данные кейса:');
  console.log('slug:', row.slug);
  console.log('title:', row.title);
  console.log('hero_image_url:', row.hero_image_url);
  console.log('donor_image_url:', row.donor_image_url);
  console.log('gallery:', JSON.stringify(row.gallery, null, 2));
  console.log('category:', row.category);
  
  await pool.end();
}

checkCaseData().catch(error => {
  console.error('❌ Ошибка:', error);
  process.exit(1);
});

