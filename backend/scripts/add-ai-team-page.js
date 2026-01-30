import pool from '../db.js';

async function addAiTeamPage() {
  const client = await pool.connect();
  try {
    console.log('🔍 Проверка страницы /ai-team...');

    // Проверяем, существует ли уже страница
    const existing = await client.query('SELECT * FROM pages WHERE slug = $1', ['/ai-team']);
    
    if (existing.rows.length > 0) {
      console.log('✅ Страница /ai-team уже существует в базе.');
      console.log(`   ID: ${existing.rows[0].id}`);
      console.log(`   Название: ${existing.rows[0].title}`);
      console.log(`   Опубликована: ${existing.rows[0].is_published ? 'Да' : 'Нет'}`);
      return;
    }

    console.log('📝 Создание страницы /ai-team...');

    const result = await client.query(
      `INSERT INTO pages (slug, title, body, seo_title, seo_description, is_published, robots_index, robots_follow)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        '/ai-team',
        'Аутсорсинг AI-команды',
        '<p>Страница аутсорсинга AI-команды. Контент управляется через React-компонент PublicHomePageAI.</p>',
        'Аутсорсинг AI-команды | Primecoder',
        'Усильте вашу команду или полностью замените отделы с помощью профессиональной AI-команды. Экономия до 50% по сравнению с наймом сотрудников.',
        true, // is_published
        true, // robots_index
        true, // robots_follow
      ]
    );

    const page = result.rows[0];
    console.log('✅ Страница успешно создана!');
    console.log(`   ID: ${page.id}`);
    console.log(`   Slug: ${page.slug}`);
    console.log(`   Название: ${page.title}`);
    console.log(`   Опубликована: ${page.is_published ? 'Да' : 'Нет'}`);

  } catch (error) {
    console.error('❌ Ошибка при создании страницы:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

addAiTeamPage()
  .then(() => {
    console.log('\n✅ Готово!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Критическая ошибка:', error);
    process.exit(1);
  });


