/**
 * Секция "О компании" на странице /about
 */
export function AboutSection() {
  return (
    <section className="about">
      <div className="about-text d-flex flex-column gap-v-20">
        <h1>о компании</h1>
        <p>
          История PrimeCoder началась с разработки небольших веб-проектов. Со временем мы выросли в полноценную digital-студию с сильной командой профессионалов. Постоянно развиваемся, изучаем новые технологии и совершенствуем навыки. Сегодня мы создаём комплексные digital-решения и предоставляем качественные веб-услуги для бизнеса любого масштаба.
        </p>
        <a href="" className="d-flex align-items-center gap-h-20">
          Смотреть презентационное видео{' '}
          <img src="/legacy/img/play-video-button.png" alt="Презентационное видео Primecoder" loading="lazy" />
        </a>
      </div>
      <img src="/legacy/img/yellow-bg-sphere.png" alt="Создание сайта под ключ" className="yellow-bg-sphere" loading="lazy" />
    </section>
  );
}

