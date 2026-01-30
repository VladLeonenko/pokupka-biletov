/**
 * Скрипт для восстановления оригинальной версии страницы "О нас"
 * Версия до всех изменений в этом чате
 */

import pool from '../db.js';

// Оригинальная версия страницы "О нас" - простая структура без дополнительных блоков
const originalAboutPageHtml = `
<section class="about-page">
  <div class="container">
    <div class="about-us">
      <div class="header-section">
        <h2>О нас</h2>
        <h5>PrimeCoder — digital-продакшн полного цикла с 2017 года. Мы создаем не просто сайты — мы строим цифровые решения, которые работают на результат и помогают бизнесу расти.</h5>
      </div>

      <div class="about-us-body d-flex jcsb gap-h-30 pt-50">
        <div class="about-item d-flex flex-column align-items-center">
          <p><span>100+</span></p>
          <h5>Реализованных проектов</h5>
        </div>
        <div class="about-item d-flex flex-column align-items-center">
          <p><span>15+</span></p>
          <h5>Опытных специалистов</h5>
        </div>
        <div class="about-item d-flex flex-column align-items-center">
          <p><span>7+</span></p>
          <h5>Лет на рынке</h5>
        </div>
        <div class="about-item d-flex flex-column align-items-center">
          <p><span>35+</span></p>
          <h5>Наград и достижений</h5>
        </div>
      </div>
    </div>
  </div>
</section>
`;

async function restoreOriginalAboutPage() {
  try {
    const checkResult = await pool.query('SELECT id, slug, title FROM pages WHERE slug = $1', ['/about']);
    
    if (checkResult.rows.length === 0) {
      console.log('Страница /about не найдена. Создаём новую...');
      await pool.query(
        `INSERT INTO pages (slug, title, body, is_published) 
         VALUES ($1, $2, $3, $4)`,
        ['/about', 'О нас', originalAboutPageHtml, true]
      );
      console.log('✅ Страница "О нас" восстановлена!');
    } else {
      console.log(`Восстанавливаем оригинальную версию страницы: ${checkResult.rows[0].title}`);
      await pool.query(
        `UPDATE pages 
         SET body = $1, updated_at = NOW() 
         WHERE slug = $2`,
        [originalAboutPageHtml, '/about']
      );
      console.log('✅ Страница "О нас" восстановлена до оригинальной версии (до всех изменений)!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при восстановлении страницы:', error);
    process.exit(1);
  }
}

restoreOriginalAboutPage();






