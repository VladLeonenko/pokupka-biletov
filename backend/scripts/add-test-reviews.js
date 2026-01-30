import pool from '../db.js';

const testReviews = [
  {
    author: 'Алексей Смирнов',
    email: 'alex@example.com',
    rating: 5,
    text: 'Великолепная работа! Команда PrimeCoder разработала для нас корпоративный сайт с нуля. Результат превзошел все ожидания - современный дизайн, быстрая работа, отличная SEO-оптимизация. Особенно порадовала оперативность и профессионализм на всех этапах проекта.',
    service_type: 'web-development',
    is_verified: true,
    is_moderated: true,
    is_published: true,
    helpful_count: 15,
  },
  {
    author: 'Мария Петрова',
    email: 'maria@example.com',
    rating: 5,
    text: 'Обратились в PrimeCoder для редизайна мобильного приложения. Команда не просто выполнила задачу, а предложила множество улучшений, которые значительно повысили конверсию. Работали четко по срокам, всегда на связи. Рекомендую!',
    service_type: 'mobile-development',
    is_verified: true,
    is_moderated: true,
    is_published: true,
    helpful_count: 12,
    response_text: 'Спасибо за такой подробный отзыв, Мария! Было приятно работать над вашим проектом. Рады, что результат оправдал ожидания. Всегда готовы помочь с новыми задачами!',
    response_author: 'PrimeCoder',
    response_date: new Date(),
  },
  {
    author: 'Дмитрий Иванов',
    email: 'dmitry@example.com',
    rating: 4,
    text: 'Заказывали разработку интернет-магазина. В целом очень доволен - функционал богатый, все работает стабильно. Единственное пожелание - хотелось бы больше готовых шаблонов для товарных категорий. Но это мелочь, общее впечатление отличное!',
    service_type: 'web-development',
    is_verified: true,
    is_moderated: true,
    is_published: true,
    helpful_count: 8,
  },
  {
    author: 'Елена Сидорова',
    email: 'elena@example.com',
    rating: 5,
    text: 'Обратились за комплексным SEO-продвижением сайта. За 3 месяца вывели 80% ключевых запросов в ТОП-10. Трафик вырос в 4 раза! Очень довольна результатом и прозрачностью отчетности. Команда знает свое дело!',
    service_type: 'seo',
    is_verified: true,
    is_moderated: true,
    is_published: true,
    helpful_count: 20,
    response_text: 'Благодарим за доверие, Елена! Мы гордимся такими результатами. Продолжаем работать над дальнейшим ростом позиций вашего сайта!',
    response_author: 'PrimeCoder',
    response_date: new Date(),
  },
  {
    author: 'Сергей Волков',
    email: 'sergey@example.com',
    rating: 5,
    text: 'Нужен был брендбук и фирменный стиль для стартапа. PrimeCoder создали потрясающий дизайн, который полностью отражает нашу философию. Все документы оформлены профессионально, получили много комплиментов от партнеров. Спасибо!',
    service_type: 'design',
    is_verified: true,
    is_moderated: true,
    is_published: true,
    helpful_count: 7,
  },
  {
    author: 'Ольга Коз лова',
    email: 'olga@example.com',
    rating: 4,
    text: 'Хороший уровень поддержки сайта. Все заявки обрабатываются быстро, проблемы решаются оперативно. Иногда бывают небольшие задержки в нерабочее время, но это понятно. В целом очень довольна сервисом!',
    service_type: 'support',
    is_verified: false,
    is_moderated: true,
    is_published: true,
    helpful_count: 5,
  },
  {
    author: 'Игорь Новиков',
    rating: 5,
    text: 'Разработали для нас систему управления складом с интеграцией 1С. Сложный проект, много нюансов, но команда справилась на отлично! Система работает стабильно, все процессы автоматизированы. Экономия времени колоссальная!',
    service_type: 'web-development',
    is_verified: true,
    is_moderated: true,
    is_published: true,
    helpful_count: 18,
  },
  {
    author: 'Анна Морозова',
    email: 'anna@example.com',
    rating: 5,
    text: 'Заказывали мобильное приложение для iOS и Android. Получили современный продукт с интуитивным интерфейсом. Приложение работает быстро и без багов. Клиенты довольны, установок больше, чем ожидали. Рекомендую PrimeCoder!',
    service_type: 'mobile-development',
    is_verified: true,
    is_moderated: true,
    is_published: true,
    helpful_count: 14,
    response_text: 'Спасибо, Анна! Радуемся вашему успеху. Отличные показатели установок - это результат качественного продукта и вашей активной маркетинговой стратегии!',
    response_author: 'PrimeCoder',
    response_date: new Date(),
  },
];

async function addTestReviews() {
  try {
    console.log('Добавление тестовых отзывов...');

    for (const review of testReviews) {
      await pool.query(
        `INSERT INTO brand_reviews 
          (brand_name, author, email, rating, text, service_type, is_verified, is_moderated, is_published, helpful_count, response_text, response_author, response_date, source) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          'PrimeCoder',
          review.author,
          review.email || null,
          review.rating,
          review.text,
          review.service_type,
          review.is_verified,
          review.is_moderated,
          review.is_published,
          review.helpful_count,
          review.response_text || null,
          review.response_author || null,
          review.response_date || null,
          'Сайт',
        ]
      );
      console.log(`✅ Добавлен отзыв от ${review.author}`);
    }

    console.log('\n✨ Все тестовые отзывы успешно добавлены!');
    process.exit(0);
  } catch (err) {
    console.error('Ошибка при добавлении отзывов:', err);
    process.exit(1);
  }
}

addTestReviews();

