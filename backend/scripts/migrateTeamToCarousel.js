import db from '../db.js';

/**
 * Миграция данных команды из компонента TeamSection.tsx в карусель "team"
 */
async function migrateTeamToCarousel() {
  try {
    await db.query('BEGIN');

    // Данные команды из TeamSection.tsx
    const teamMembers = [
      {
        name: 'Владислав Леоненко',
        position: 'Руководитель',
        image: '/legacy/img/leonenko-vladislav.jpg',
        alt: 'Руководитель компании Primecoder Леоненко Владислав',
      },
      {
        name: 'Павел Гришко',
        position: 'Front-end разработчик',
        image: '/legacy/img/pavel.jpeg',
        alt: 'Front-end разработчик Primecoder Павел Гришко',
      },
      {
        name: 'Светлана Пчелинцева',
        position: 'Маркетолог',
        image: '/legacy/img/svetlana.jpg',
        alt: 'Маркетолог Primecoder Светлана Пчелинцева',
      },
      {
        name: 'Сергей Королёв',
        position: 'Главный дизайнер',
        image: '/legacy/img/sergey.jpeg',
        alt: 'Главный дизайнер Primecoder Сергей Королёв',
      },
      {
        name: 'Анна Сёмушкина',
        position: 'Дизайнер',
        image: '/legacy/img/anna.jpeg',
        alt: 'Дизайнер Primecoder Анна Сёмушкина',
      },
      {
        name: 'Миннуллин Ильшат',
        position: 'Backend-разработчик',
        image: '/legacy/img/ilshat.jpeg',
        alt: 'Backend-разработчик Primecoder Миннуллин Ильшат',
      },
    ];

    // Проверяем существование карусели "team"
    const carouselResult = await db.query('SELECT id FROM carousels WHERE slug = $1', ['team']);
    
    let carouselId;
    if (carouselResult.rows.length === 0) {
      // Создаем карусель, если её нет
      const createResult = await db.query(
        'INSERT INTO carousels (slug, title) VALUES ($1, $2) RETURNING id',
        ['team', 'Команда']
      );
      carouselId = createResult.rows[0].id;
      console.log(`✅ Создана карусель "team" с ID: ${carouselId}`);
    } else {
      carouselId = carouselResult.rows[0].id;
      // Удаляем старые слайды
      await db.query('DELETE FROM carousel_slides WHERE carousel_id = $1', [carouselId]);
      console.log(`✅ Найдена карусель "team" с ID: ${carouselId}, удалены старые слайды`);
    }

    // Добавляем слайды с данными команды
    for (let i = 0; i < teamMembers.length; i++) {
      const member = teamMembers[i];
      // Формируем HTML для caption_html (имя и должность)
      const captionHtml = `<div style="text-align: center;"><strong style="display: block; font-weight: 600; margin-bottom: 5px; font-size: 18px;">${member.name}</strong><p style="margin: 0; color: rgba(255, 255, 255, 0.7); font-size: 14px;">${member.position}</p></div>`;
      
      await db.query(
        `INSERT INTO carousel_slides 
         (carousel_id, kind, image_url, caption_html, sort_order, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          carouselId,
          'image',
          member.image,
          captionHtml,
          i,
          true,
        ]
      );
    }

    await db.query('COMMIT');
    console.log(`✅ Добавлено ${teamMembers.length} слайдов команды в карусель "team"`);
    console.log('\n✅ Миграция данных команды завершена!');
    console.log('   Теперь команду можно редактировать в админ-панели: /admin/carousels');

  } catch (error) {
    await db.query('ROLLBACK');
    console.error('❌ Ошибка при миграции данных команды:', error);
    process.exit(1);
  } finally {
    await db.end();
  }
}

migrateTeamToCarousel();

