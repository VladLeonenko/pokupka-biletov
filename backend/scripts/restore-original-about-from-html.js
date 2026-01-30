/**
 * Скрипт для восстановления оригинальной версии страницы "О нас" из HTML
 */

import pool from '../db.js';

// Оригинальный контент страницы (только body, без header и footer)
const originalAboutPageHtml = `
    <div class="container">
        <section class="about">
            <div class="about-text d-flex flex-column gap-v-20">
                <h1>о компании</h1>
                <p>
                    История компании PrimeCoder началась с разработки небольших сайтов. Со временем мы стали развиваться, расширять команду, совершенствовать свои навыки, и продолжаем это делать постоянно. На сегодняшний день опытные специалисты предоставляют готовые комплексные решения и качественные веб-услуги для любого бизнеса.
                </p>
                <a href="" class="d-flex align-items-center gap-h-20">Смотреть презантационное видео <img src="/legacy/img/play-video-button.png" alt="Презентационное видео Primecoder"></a>
            </div>
            <img src="/legacy/img/yellow-bg-sphere.png" alt="Создание сайта под ключ" class="yellow-bg-sphere">  
        
        </section>
        <section class="advantages-about jcsb">
            <div class="advantages-item col-3">
                <h5>Большой опыт</h5>
                <p>Веб-студия PrimeCoder работает с 2017 года. За это время мы выпустили в продакшн более 100 проектов, которые приносят доход своим владельцам. Постоянно расширяемся, развиваемся, совершенствуем свои веб-навыки. Наша команда — это профессионалы с большим опытом в IT и Digital. Мы — программисты, маркетологи, дизайнеры, редакторы и специалисты по SEO.</p>
            </div>
            <div class="advantages-item col-3">
                <h5>Современные технологии</h5>
                <p>Предлагаем полный комплекс digital-услуг для любой сферы бизнеса. В работе используем только современные, проверенные и высокотехнологичные инструменты. Следим за последними трендами, всегда в курсе любых изменений и новинок в IT мире.</p>
            </div>
            <div class="advantages-item col-3">
                <h5>Project менеджер</h5>
                <p>Персональный менеджер в кротчайшие сроки индивидуально рассчитает стоимость проекта и отправит промо-материалы. На протяжении всего сотрудничества он всегда на связи, отвечает на вопросы, контролирует процессы на каждом этапе работ, следит за четким исполнением договора и сроками сдачи проекта в релиз. Каждую неделю вы получаете отчеты о проделанной работе.</p>
            </div>
            <div class="advantages-item col-3">
                <h5>Удобная оплата</h5>
                <p>Общую стоимость проекта разбиваем на несколько платежей за определенные этапы разработки. Таким образом, вы не сливаете большой бюджет, знаете на каком этапе находится ваш проект и отслеживаете исполнение всех работ. </p>
            </div>
            <div class="advantages-item col-3">
                <h5>Гарантия</h5>
                <p>Мы уверены в нашей квалификации, опыте и профессионализме. Понимаем, что у вас такой веры нет, поэтому предоставляем гарантию от одного года на все свои продукты. Вы можете обращаться к нам по любым вопросам готового проекта.</p>
            </div>
            <div class="advantages-item col-3">
                <h5>Договор</h5>
                <p>Перед началом сотрудничества обязательно обговариваем все нюансы не на словах, а в договоре. Четко прописываем сроки, этапы работ, обязательства сторон, фиксируем стоимость. Оплата остается неизменной на протяжении всего действия договора.</p>
            </div>
        </section>
        <section>
            <h2>Команда</h2>
            <p>Знакомьтесь, это PrimeCoder team! Мы молодые, но опытные, амбициозные и целеустремленные специалисты в своих областях. Каждый из нас с радостью реализует ваши идеи в прибыльные проекты!</p>
        
            <div class="owl-carousel owl-theme team mt-50">
                <div class="item d-flex flex-column">
                    <img src="/legacy/img/leonenko-vladislav.jpg" alt="Руководитель компании Primecoder Леоненко Владислав">
                    <span>
                        Владислав Леоненко
                    </span>
                    <p>Руководитель</p>
                </div>
                <div class="item d-flex flex-column">
                    <img src="/legacy/img/pavel.jpeg" alt="Front-end разработчик Primecoder Павел Гришко">
                    <span>
                        Павел Гришко
                    </span>
                    <p>Front-end разработчик</p>
                </div>
                <div class="item d-flex flex-column">
                    <img src="/legacy/img/svetlana.jpg" alt="Маркетолог Primecoder Светлана Пчелинцева">
                    <span>
                        Светлана Пчелинцева
                    </span>
                    <p>Маркетолог</p>
                </div>
                <div class="item d-flex flex-column">
                    <img src="/legacy/img/sergey.jpeg" alt="Главный дизайнер Primecoder Сергей Королёв">
                    <span>
                        Сергей Королёв
                    </span>
                    <p>Главный дизайнер</p>
                </div>
                <div class="item d-flex flex-column">
                    <img src="/legacy/img/anna.jpeg" alt="Дизайнер Primecoder Анна Сёмушкина">
                    <span>
                        Анна Сёмушкина
                    </span>
                    <p>Дизайнер</p>
                </div>
                <div class="item d-flex flex-column">
                    <img src="/legacy/img/ilshat.jpeg" alt="Backend-разработчик Primecoder Миннуллин Ильшат">
                    <span>
                        Миннуллин Ильшат
                    </span>
                    <p>Backend-разработчик</p>
                </div>
                
              </div>
        </section>
        <section class="awwwards d-flex flex-column ">
            <h2>Лучшие работы и награды</h2>
            <div class="awards-item d-flex jcsb w-100">
                <div class="d-flex gap-h-50 align-items-center awards-name">
                    <h3>awwwards</h3>
                    <p>Разработка сайта розничной торговли</p>
                </div>
                <div class="d-flex gap-h-50 align-items-center awards-date">
                    <p>2020</p>
                    <a href="/portfolio"><img src="/legacy/img/yellow-arrow-btn.png" alt="Перейти к портфолио Primecoder"></a>
                </div>
            </div>
            <div class="awards-item d-flex jcsb w-100">
                <div class="d-flex gap-h-50 align-items-center awards-name">
                    <h3>awwwards</h3>
                    <p>Дизайн интернет-магазина</p>
                </div>
                <div class="d-flex gap-h-50 align-items-center awards-date">
                    <p>2021</p>
                    <a href="/portfolio"><img src="/legacy/img/yellow-arrow-btn.png" alt="Перейти к портфолио Primecoder"></a>
                </div>
            </div>
            <div class="awards-item d-flex jcsb w-100">
                <div class="d-flex gap-h-50 align-items-center awards-name">
                    <h3>awwwards</h3>
                    <p>веб-дизайн мобильного приложения</p>
                </div>
                <div class="d-flex gap-h-50 align-items-center awards-date">
                    <p>2022</p>
                    <a href="/portfolio"><img src="/legacy/img/yellow-arrow-btn.png" alt="Перейти к портфолио Primecoder"></a>
                </div>
            </div>
            <div class="awards-item d-flex jcsb w-100">
                <div class="d-flex gap-h-50 align-items-center awards-name">
                    <h3>awwwards</h3>
                    <p>Онлайн площадка для SMM</p>
                </div>
                <div class="d-flex gap-h-50 align-items-center awards-date">
                    <p>2022</p>
                    <a href="/portfolio"><img src="/legacy/img/yellow-arrow-btn.png" alt="Перейти к портфолио Primecoder"></a>
                </div>
            </div>
            <div class="awards-item d-flex jcsb w-100">
                <div class="d-flex gap-h-50 align-items-center awards-name">
                    <h3>awwwards</h3>
                    <p>Сайт квиз</p>
                </div>
                <div class="d-flex gap-h-50 align-items-center awards-date">
                    <p>2023</p>
                    <a href="/portfolio"><img src="/legacy/img/yellow-arrow-btn.png" alt="Перейти к портфолио Primecoder"></a>
                </div>
            </div>
        </section>
        <section class="reviews">
            <div class="header-section pb-50">
                <div class="container">
                  <h2>ОТЗЫВЫ</h2>
                </div>
            </div>
            <div class="container">
                <div id="reviews-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 30px; margin-top: 50px;">
                    <div style="text-align: center; color: #D0D0D0; grid-column: 1 / -1;">Загрузка отзывов...</div>
                </div>
                <div style="text-align: center; margin-top: 40px;">
                    <a href="/rewievs" class="btn submit-order">Все отзывы</a>
                </div>
            </div>
        </section>

<script>
(function() {
  // Загружаем отзывы с API
  const apiBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:3000' 
    : '';
  const container = document.getElementById('reviews-container');
  
  if (!container) return;
  
  fetch(apiBase + '/api/reviews/public?limit=6&sort=rating_desc')
    .then(res => res.json())
    .then(data => {
      const reviews = data.reviews || [];
      
      if (reviews.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #D0D0D0; grid-column: 1 / -1;">Отзывов пока нет</div>';
        return;
      }
      
      container.innerHTML = reviews.map(review => {
        const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
        const date = new Date(review.created_at).toLocaleDateString('ru-RU', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        const verifiedBadge = review.is_verified 
          ? '<span style="color: #4CAF50; font-size: 12px; margin-left: 10px;">✓ Проверен</span>' 
          : '';
        
        return \`
          <div style="background: #1D1D1D; padding: 30px; border-radius: 8px; display: flex; flex-direction: column; gap: 15px; border: 1px solid rgba(255,255,255,0.1); transition: all 0.3s;">
            <div style="display: flex; justify-content: space-between; align-items: start;">
              <div style="flex: 1;">
                <h4 style="font-weight: 500; font-size: 18px; color: #fff; margin: 0 0 5px 0;">\${review.author || 'Аноним'}\${verifiedBadge}</h4>
                <div style="color: #FFBB00; font-size: 16px; margin-top: 5px;">\${stars}</div>
              </div>
            </div>
            <p style="font-weight: 400; font-size: 14px; line-height: 150%; color: #D0D0D0; margin: 0; flex: 1;">
              \${review.text}
            </p>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 15px; border-top: 1px solid #434343;">
              <span style="font-size: 12px; color: #A1A1A1;">\${date}</span>
              \${review.service_type ? '<span style="font-size: 12px; color: #A1A1A1;">' + review.service_type + '</span>' : ''}
            </div>
            \${review.response_text ? \`
              <div style="margin-top: 15px; padding: 15px; background: rgba(255,187,0,0.05); border-left: 4px solid #FFBB00; border-radius: 4px;">
                <div style="font-size: 12px; color: #FFBB00; font-weight: 600; margin-bottom: 5px;">Ответ от \${review.response_author || 'PrimeCoder'}</div>
                <div style="font-size: 13px; color: rgba(255,255,255,0.7); line-height: 150%;">\${review.response_text}</div>
              </div>
            \` : ''}
          </div>
        \`;
      }).join('');
    })
    .catch(err => {
      console.error('Ошибка загрузки отзывов:', err);
      container.innerHTML = '<div style="text-align: center; color: #D0D0D0; grid-column: 1 / -1;">Не удалось загрузить отзывы</div>';
    });
})();
</script>
    </div>
    <img src="/legacy/img/gray-bg.png" alt="Отзывы о компании PrimeCoder" class="grey-bg">
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
      console.log('✅ Оригинальная версия страницы "О нас" восстановлена!');
    } else {
      console.log(`Восстанавливаем оригинальную версию страницы: ${checkResult.rows[0].title}`);
      await pool.query(
        `UPDATE pages 
         SET body = $1, updated_at = NOW() 
         WHERE slug = $2`,
        [originalAboutPageHtml, '/about']
      );
      console.log('✅ Оригинальная версия страницы "О нас" восстановлена!');
      console.log('   - Секция "о компании" с кнопкой на видео');
      console.log('   - Секция преимуществ (6 блоков)');
      console.log('   - Секция "Команда" с каруселью');
      console.log('   - Секция "awwwards" с наградами');
      console.log('   - Секция "Отзывы" с актуальными отзывами из API');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при восстановлении страницы:', error);
    process.exit(1);
  }
}

restoreOriginalAboutPage();
