import pool from '../db.js';

/**
 * Добавляет кейс "Московский медицинский центр диагностики и лечения"
 * на основе дизайна из Figma
 */

const caseData = {
  slug: 'moskovskiy-meditsinskiy-tsentr',
  title: 'Московский медицинский центр диагностики и лечения',
  summary: 'Разработка дизайна и сайта для Московского медицинского центра диагностики и лечения с личным кабинетом и синхронизацией с БИТ. Управление медицинским центром. Запись на прием к врачу, результаты анализов и онлайн консультации.',
  category: 'website',
  tools: ['1С-Битрикс', 'HTML', 'CSS', 'Figma', 'Adobe Photoshop', 'Adobe After Effects'],
  heroImageUrl: '/legacy/img/cases-medical/hero.png',
  contentHtml: `
    <h2>Задачи</h2>
    <p>Разработка дизайна и сайта для Московского медицинского центра диагностики и лечения с личным кабинетом и синхронизацией с БИТ. Управление медицинским центром. Запись на прием к врачу, результаты анализов и онлайн консультации. Соответствие всем требованиям ЕГИСЗ и безопасности данных.</p>
    
    <h2>Решение</h2>
    <p>Создан уникальный дизайн с фирменным стилем компании. Благодаря цветовому решению клиника выделяется среди конкурентов и вызывает доверие. Сайт разработан на CMS 1С-Битрикс.</p>
  `,
  contentJson: {
    tasks: {
      text: 'Разработка дизайна и сайта для Московского медицинского центра диагностики и лечения с личным кабинетом и синхронизацией с БИТ. Управление медицинским центром. Запись на прием к врачу, результаты анализов и онлайн консультации. Соответствие всем требованиям ЕГИСЗ и безопасности данных.'
    },
    solution: {
      text: 'Создан уникальный дизайн с фирменным стилем компании. Благодаря цветовому решению клиника выделяется среди конкурентов и вызывает доверие. Сайт разработан на CMS 1С-Битрикс.'
    },
    colors: {
      image: '/legacy/img/cases-medical/colors.png'
    },
    typography: {
      image: '/legacy/img/cases-medical/typography.png'
    }
  },
  gallery: [
    '/legacy/img/cases-medical/metrics-laptop.png',
    '/legacy/img/cases-medical/calendar.png',
    '/legacy/img/cases-medical/adaptive.png'
  ],
  metrics: {
    days: 37,
    pages: 75,
    hours: 740,
    performance: 90,
    firstContentfulPaint: '0,8',
    speedIndex: '0,8',
    largestContentfulPaint: '0,8',
    cumulativeLayoutShift: '0,879'
  },
  isPublished: true,
  templateType: 'medical' // Используется для определения полного шаблона в CasePage.tsx
};

async function addMedicalCenterCase() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Проверяем, существует ли уже кейс
    const existing = await client.query(
      'SELECT slug FROM cases WHERE slug = $1',
      [caseData.slug]
    );
    
    if (existing.rows.length > 0) {
      console.log(`⚠️  Кейс с slug "${caseData.slug}" уже существует. Обновляем...`);
      
      await client.query(
        `UPDATE cases SET
          title = $1,
          summary = $2,
          category = $3,
          tools = $4,
          hero_image_url = $5,
          content_html = $6,
          content_json = $7,
          gallery = $8,
          metrics = $9,
          template_type = $10,
          is_published = $11,
          updated_at = NOW()
        WHERE slug = $12`,
        [
          caseData.title,
          caseData.summary,
          caseData.category,
          caseData.tools,
          caseData.heroImageUrl,
          caseData.contentHtml,
          JSON.stringify(caseData.contentJson),
          JSON.stringify(caseData.gallery),
          JSON.stringify(caseData.metrics),
          caseData.templateType,
          caseData.isPublished,
          caseData.slug
        ]
      );
      
      console.log(`✅ Кейс "${caseData.title}" обновлен`);
    } else {
      await client.query(
        `INSERT INTO cases (
          slug, title, summary, category, tools, hero_image_url,
          content_html, content_json, gallery, metrics, template_type,
          is_published, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())`,
        [
          caseData.slug,
          caseData.title,
          caseData.summary,
          caseData.category,
          caseData.tools,
          caseData.heroImageUrl,
          caseData.contentHtml,
          JSON.stringify(caseData.contentJson),
          JSON.stringify(caseData.gallery),
          JSON.stringify(caseData.metrics),
          caseData.templateType,
          caseData.isPublished
        ]
      );
      
      console.log(`✅ Кейс "${caseData.title}" добавлен`);
    }
    
    await client.query('COMMIT');
    console.log('\n🎉 Готово!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Ошибка:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addMedicalCenterCase()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Критическая ошибка:', error);
    process.exit(1);
  });

