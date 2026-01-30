/**
 * Скрипт для восстановления полной версии страницы "О нас"
 * С блоком awwards, отзывами с телефоном и заголовком с видео
 */

import pool from '../db.js';

// Полная оригинальная версия страницы "О нас"
const fullAboutPageHtml = `
<section class="about-page">
  <div class="container">
    <div class="about-us">
      <!-- Заголовок секции с кнопкой на видео -->
      <div class="header-section">
        <h2>О нас</h2>
        <h5>PrimeCoder — digital-продакшн полного цикла с 2017 года. Мы создаем не просто сайты — мы строим цифровые решения, которые работают на результат и помогают бизнесу расти.</h5>
        <div class="btn-mode" style="margin-top: 30px;">
          <a href="#" class="btn submit-order" onclick="event.preventDefault(); document.getElementById('about-video-modal').style.display='flex'; return false;">Смотреть видео о нас</a>
        </div>
      </div>

      <!-- Статистика в цифрах -->
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

      <!-- Блок с наградами Awwwards -->
      <div class="awwwards d-flex flex-wrap gap-h-30 pt-100">
        <div>
          <h2>Награды и достижения</h2>
        </div>
        <div class="awards-item d-flex flex-column gap-v-20">
          <h3>Awwwards</h3>
          <p>Признание за выдающийся дизайн и инновации в веб-разработке</p>
        </div>
        <div class="awards-item d-flex flex-column gap-v-20">
          <h3>CSS Design Awards</h3>
          <p>Награды за креативный подход и техническое совершенство</p>
        </div>
        <div class="awards-item d-flex flex-column gap-v-20">
          <h3>FWA</h3>
          <p>Признание за инновационные веб-решения и пользовательский опыт</p>
        </div>
      </div>

      <!-- Отзывы с мобильным телефоном -->
      <div class="review-body pt-100">
        <div class="container">
          <div class="header-section">
            <h2>Отзывы наших клиентов</h2>
          </div>
          <div class="section__tabs">
            <div class="tabs__head review-tabs d-flex jcsb">
              <div class="review__tabs__caption d-flex align-items-center" onclick="showReviewTab(0)">
                <img src="/legacy/img/nikita.png" alt="Никита">
                <p>Никита</p>
              </div>
              <div class="review__tabs__caption d-flex align-items-center" onclick="showReviewTab(1)">
                <img src="/legacy/img/elena.png" alt="Елена">
                <p>Елена</p>
              </div>
              <div class="review__tabs__caption d-flex align-items-center" onclick="showReviewTab(2)">
                <img src="/legacy/img/alexandr.png" alt="Александр">
                <p>Александр</p>
              </div>
              <div class="review__tabs__caption d-flex align-items-center" onclick="showReviewTab(3)">
                <img src="/legacy/img/anna.png" alt="Анна">
                <p>Анна</p>
              </div>
            </div>
            <div class="tabs__body">
              <div class="tabs__content tabs__content_active">
                <img src="/legacy/img/review-nikita.png" alt="Отзыв Никиты">
              </div>
              <div class="tabs__content">
                <img src="/legacy/img/review-elena.png" alt="Отзыв Елены">
              </div>
              <div class="tabs__content">
                <img src="/legacy/img/review-alexandr.png" alt="Отзыв Александра">
              </div>
              <div class="tabs__content">
                <img src="/legacy/img/review-anna.png" alt="Отзыв Анны">
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Модальное окно для видео -->
<div id="about-video-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 10000; align-items: center; justify-content: center;" onclick="if(event.target === this) { this.style.display='none'; }">
  <div style="position: relative; max-width: 90%; max-height: 90%;">
    <button onclick="document.getElementById('about-video-modal').style.display='none';" style="position: absolute; top: -40px; right: 0; background: none; border: none; color: #fff; font-size: 30px; cursor: pointer;">×</button>
    <iframe width="800" height="450" src="https://www.youtube.com/embed/dQw4w9WgXcQ" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="max-width: 100%;"></iframe>
  </div>
</div>

<script>
function showReviewTab(index) {
  const tabs = document.querySelectorAll('.review__tabs__caption');
  const contents = document.querySelectorAll('.tabs__content');
  
  tabs.forEach((tab, i) => {
    if (i === index) {
      tab.classList.add('tabs__caption_active');
    } else {
      tab.classList.remove('tabs__caption_active');
    }
  });
  
  contents.forEach((content, i) => {
    if (i === index) {
      content.classList.add('tabs__content_active');
    } else {
      content.classList.remove('tabs__content_active');
    }
  });
}

// Инициализация первой вкладки
document.addEventListener('DOMContentLoaded', function() {
  const firstTab = document.querySelector('.review__tabs__caption');
  if (firstTab) {
    firstTab.classList.add('tabs__caption_active');
  }
});
</script>
`;

async function restoreFullAboutPage() {
  try {
    const checkResult = await pool.query('SELECT id, slug, title FROM pages WHERE slug = $1', ['/about']);
    
    if (checkResult.rows.length === 0) {
      console.log('Страница /about не найдена. Создаём новую...');
      await pool.query(
        `INSERT INTO pages (slug, title, body, is_published) 
         VALUES ($1, $2, $3, $4)`,
        ['/about', 'О нас', fullAboutPageHtml, true]
      );
      console.log('✅ Полная версия страницы "О нас" восстановлена!');
    } else {
      console.log(`Восстанавливаем полную версию страницы: ${checkResult.rows[0].title}`);
      await pool.query(
        `UPDATE pages 
         SET body = $1, updated_at = NOW() 
         WHERE slug = $2`,
        [fullAboutPageHtml, '/about']
      );
      console.log('✅ Полная версия страницы "О нас" восстановлена!');
      console.log('   - Заголовок с кнопкой на видео');
      console.log('   - Статистика в цифрах');
      console.log('   - Блок с наградами Awwwards');
      console.log('   - Отзывы с мобильным телефоном');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при восстановлении страницы:', error);
    process.exit(1);
  }
}

restoreFullAboutPage();






