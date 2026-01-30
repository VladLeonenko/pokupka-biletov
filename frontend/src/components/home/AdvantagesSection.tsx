/**
 * Секция преимуществ "Что вы получаете"
 */
export function AdvantagesSection() {
  return (
    <div className="container">
      <section className="advantages d-flex gap-v-50 flex-column">
        <div className="header-section">
          <h2>Что вы получаете</h2>
        </div>
      <div className="d-flex gap-h-30 advantages-content">
        <div className="advantages-card advantages-card-1">
          <img src="/legacy/img/uniq-adv.png" alt="primecoder uniq products" />
          <div className="advantages-body">
            <h3>Уникальный продукт</h3>
            <p>С нуля создадим 100% индивидуальный и конкурентный веб-проект, который будет выделяться среди конкурентов, привлекать новых клиентов и приносить вам доход.</p>
          </div>
        </div>
        <div className="advantages-card advantages-card-2">
          <img src="/legacy/img/coast-adv.png" alt="primecoder coast advantage" />
          <div className="advantages-body">
            <h3>Стоимость и качество</h3>
            <p>Пакетное решение на все наши услуги. Вы сами выбираете сколько стоит сайт, мобильное приложение или продвижение из предложенного прайса.</p>
          </div>
        </div>
        <div className="advantages-card advantages-card-3">
          <img src="/legacy/img/complex-adv.png" alt="primecoder complex advantage" />
          <div className="advantages-body">
            <h3>Комплексный подход</h3>
            <p>Проводим аналитику и изучаем особенности вашего бизнеса. Предлагаем рабочие инструменты для достижения целей и начинаем поэтапную разработку.</p>
          </div>
        </div>
      </div>
        <div className="btn-mode d-flex jcc">
          <a href="#quizForm" className="btn">Узнать стоимость</a>
        </div>
      </section>
    </div>
  );
}

