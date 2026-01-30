import db from '../db.js';

/**
 * Миграция данных команды из карусели "team" в таблицу team_members
 */
async function migrateTeamToTeamMembers() {
  try {
    await db.query('BEGIN');

    // Получаем карусель "team"
    const carouselResult = await db.query('SELECT id FROM carousels WHERE slug = $1', ['team']);
    
    if (carouselResult.rows.length === 0) {
      console.log('❌ Карусель "team" не найдена! Сначала запустите npm run migrate:team');
      await db.query('ROLLBACK');
      await db.end();
      return;
    }

    const carouselId = carouselResult.rows[0].id;
    console.log(`✅ Найдена карусель "team" с ID: ${carouselId}`);

    // Получаем все слайды из карусели
    const slidesResult = await db.query(
      'SELECT id, image_url, caption_html, sort_order, is_active FROM carousel_slides WHERE carousel_id = $1 ORDER BY sort_order',
      [carouselId]
    );

    console.log(`📋 Найдено слайдов: ${slidesResult.rows.length}`);

    if (slidesResult.rows.length === 0) {
      console.log('⚠️  В карусели "team" нет слайдов. Сначала заполните карусель.');
      await db.query('ROLLBACK');
      await db.end();
      return;
    }

    // Проверяем, есть ли уже записи в team_members
    const existingMembersResult = await db.query('SELECT COUNT(*) as count FROM team_members');
    const existingCount = parseInt(existingMembersResult.rows[0].count);
    
    if (existingCount > 0) {
      console.log(`⚠️  В таблице team_members уже есть ${existingCount} записей.`);
      console.log('   Будут добавлены только новые сотрудники (по имени).');
    }

    let addedCount = 0;
    let skippedCount = 0;

    // Обрабатываем каждый слайд
    for (const slide of slidesResult.rows) {
      // Парсим HTML для извлечения имени и должности
      const captionHtml = slide.caption_html || '';
      
      // Используем регулярные выражения для извлечения данных из HTML
      // Формат: <div><strong>Имя</strong><p>Должность</p></div>
      const nameMatch = captionHtml.match(/<strong[^>]*>([^<]+)<\/strong>/i);
      const positionMatch = captionHtml.match(/<p[^>]*>([^<]+)<\/p>/i);
      
      const name = nameMatch ? nameMatch[1].trim() : '';
      const role = positionMatch ? positionMatch[1].trim() : '';

      if (!name) {
        console.log(`⚠️  Пропущен слайд #${slide.sort_order}: не удалось извлечь имя из HTML`);
        skippedCount++;
        continue;
      }

      // Проверяем, существует ли уже сотрудник с таким именем
      const existingMemberResult = await db.query(
        'SELECT id FROM team_members WHERE name = $1',
        [name]
      );

      if (existingMemberResult.rows.length > 0) {
        console.log(`⏭️  Пропущен: ${name} (уже существует)`);
        skippedCount++;
        continue;
      }

      // Добавляем сотрудника в таблицу team_members
      await db.query(
        `INSERT INTO team_members (name, role, image_url, is_active, sort_order)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          name,
          role || 'Сотрудник',
          slide.image_url || null,
          slide.is_active !== false,
          slide.sort_order || 0,
        ]
      );

      console.log(`✅ Добавлен: ${name} - ${role || 'Сотрудник'}`);
      addedCount++;
    }

    await db.query('COMMIT');
    console.log(`\n✅ Миграция завершена!`);
    console.log(`   Добавлено: ${addedCount}`);
    console.log(`   Пропущено: ${skippedCount}`);
    console.log(`\n   Теперь сотрудники доступны в разделе "Команда" админ панели: /admin/team`);

  } catch (error) {
    await db.query('ROLLBACK');
    console.error('❌ Ошибка при миграции:', error);
    process.exit(1);
  } finally {
    await db.end();
  }
}

migrateTeamToTeamMembers();

