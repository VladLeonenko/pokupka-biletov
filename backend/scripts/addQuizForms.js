import pool from '../db.js';

async function addQuizForms() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Quiz form from homepage (index.html) and zakazat-sayt.html
    await client.query(
      `INSERT INTO forms (form_id, form_name, page_path, fields) VALUES
        ($1, $2, $3, $4::jsonb)
        ON CONFLICT (form_id) DO UPDATE SET form_name = EXCLUDED.form_name, page_path = EXCLUDED.page_path, fields = EXCLUDED.fields, updated_at = NOW()`,
      [
        'quiz-form',
        'Форма калькулятора стоимости (Quiz)',
        '/',
        JSON.stringify([
          // Step 1: Goals
          { name: 'seo', label: 'Продвижение', type: 'checkbox', required: false },
          { name: 'web-site', label: 'Разработка сайта', type: 'checkbox', required: false },
          { name: 'mobile-app', label: 'Мобильное приложение', type: 'checkbox', required: false },
          { name: 'design', label: 'Дизайн', type: 'checkbox', required: false },
          // Step 2: Activity type
          { name: 'ecommerce', label: 'Продажа товаров', type: 'checkbox', required: false },
          { name: 'services', label: 'Оказание услуг', type: 'checkbox', required: false },
          { name: 'production', label: 'Производство', type: 'checkbox', required: false },
          { name: 'finance', label: 'Финансы', type: 'checkbox', required: false },
          { name: 'consulting', label: 'Консалтинг', type: 'checkbox', required: false },
          { name: 'other', label: 'Другое', type: 'checkbox', required: false },
          // Step 3: Additional services
          { name: 'direct', label: 'Яндекс Директ', type: 'checkbox', required: false },
          { name: 'filling', label: 'Наполнение сайта', type: 'checkbox', required: false },
          { name: 'crm', label: 'Интеграция с CRM', type: 'checkbox', required: false },
          { name: 'smm', label: 'SMM', type: 'checkbox', required: false },
          { name: 'target', label: 'Таргетированная реклама', type: 'checkbox', required: false },
          { name: 'marketing', label: 'Маркетинг-стратегия', type: 'checkbox', required: false },
          { name: 'seo', label: 'SEO-продвижение', type: 'checkbox', required: false },
          { name: 'photo', label: 'Фото/Видео контент', type: 'checkbox', required: false },
          // Step 4: Promocode
          { name: 'promocode', label: 'Промокод', type: 'text', required: false },
          // Step 5: Contacts
          { name: 'quiz-name', label: 'Имя', type: 'text', required: true },
          { name: 'quiz-tel', label: 'Телефон', type: 'tel', required: true },
          { name: 'quiz-email', label: 'Email', type: 'email', required: true },
        ])
      ]
    );

    // New client form from new-client.html
    await client.query(
      `INSERT INTO forms (form_id, form_name, page_path, fields) VALUES
        ($1, $2, $3, $4::jsonb)
        ON CONFLICT (form_id) DO UPDATE SET form_name = EXCLUDED.form_name, page_path = EXCLUDED.page_path, fields = EXCLUDED.fields, updated_at = NOW()`,
      [
        'new-client-form',
        'Форма анкеты "Стать клиентом"',
        '/new-client',
        JSON.stringify([
          { name: 'company', label: 'Чем Вы занимаетесь?', type: 'text', required: true },
          { name: 'difficulties', label: 'С какими трудностями вы столкнулись?', type: 'text', required: true },
          { name: 'task', label: 'Какую задачу вы перед собой ставите?', type: 'text', required: true },
          { name: 'expectations', label: 'Ваши ожидания', type: 'text', required: true },
          { name: 'money', label: 'Какой бюджет вы готовы потратить?', type: 'text', required: true },
          { name: 'name', label: 'Имя', type: 'text', required: true },
          { name: 'tel', label: 'Телефон', type: 'tel', required: true },
          { name: 'email', label: 'Электронная почта', type: 'email', required: true },
          { name: 'commit', label: 'Комментарий', type: 'text', required: true },
        ])
      ]
    );

    await client.query('COMMIT');
    console.log('Quiz forms added successfully');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error adding quiz forms:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

addQuizForms();



