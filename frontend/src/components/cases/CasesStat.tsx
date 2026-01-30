/**
 * Секция со статистикой производительности
 */
export function CasesStat() {
  return (
    <section className="stat container" style={{ margin: '4em 0' }}>
      <h3 className="grey">Основные показатели</h3>
      <div className="d-flex mt-50 gap-h-70 mobile-flex-coulmn m-g-50">
        <div className="grafic d-flex align-items-center flex-column gap-v-30">
          <img 
            src="/legacy/img/grafic.png" 
            alt="график производительности сайта строительной компании"
            loading="lazy"
          />
          <h4>Производительность</h4>
          <p>Значения приблизительные и могут изменяться. Уровень производительности рассчитывается на момент сдачи проекта.</p>
          <div className="d-flex jcsb w-100">
            <div className="d-flex align-items-center gap-h-10">
              <div className="circle-bad"></div>
              <h5>Плохо</h5>
            </div>
            <div className="d-flex align-items-center gap-h-10">
              <div className="circle-normal"></div>
              <h5>Нормально</h5>
            </div>
            <div className="d-flex align-items-center gap-h-10">
              <div className="circle-good"></div>
              <h5>Идеально</h5>
            </div>
          </div>
        </div>
        <div className="statistic d-flex flex-column gap-v-30">
          <div className="bb">
            <div className="d-flex gap-h-10">
              <div className="circle-good"></div>
              <div className="result pb-10">
                <h5>Первая отрисовка контента</h5>
                <p>0,9 сек</p>
              </div>
            </div>
          </div>
          <div className="bb">
            <div className="d-flex gap-h-10">
              <div className="circle-good"></div>
              <div className="result pb-10">
                <h5>Индекс скорости</h5>
                <p>1,6 сек</p>
              </div>
            </div>
          </div>
          <div className="bb">
            <div className="d-flex gap-h-10">
              <div className="circle-good"></div>
              <div className="result pb-10">
                <h5>Отрисовка самого крупного контента</h5>
                <p>1,3 сек</p>
              </div>
            </div>
          </div>
          <div className="bb">
            <div className="d-flex gap-h-10">
              <div className="circle-good"></div>
              <div className="result pb-10">
                <h5>Совокупное смещение макета</h5>
                <p>0,005 сек</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

