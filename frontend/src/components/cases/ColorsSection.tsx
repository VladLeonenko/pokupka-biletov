/**
 * Секция с цветовой схемой
 */
export function ColorsSection() {
  return (
    <section className="colors" style={{ margin: '4em 0' }}>
      <div className="d-flex jcsb">
        <img 
          src="/legacy/img/colors.png" 
          className="colrs-scheme colrs-scheme-houses" 
          alt="цветовая схема для кейса по разработке сайта"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
        <div className="colors-content d-flex gap-v-50 flex-column container">
          <div className="d-flex gap-v-30 tar flex-column">
            <h3 className="grey">Цвета</h3>
            <p>
              Яркая цветовая палитра напоминает российский флаг, что добавляет патриотизма. Цвета помогли выделиться среди конкурентов и привлечь внимание клиентов.
            </p>
            <div className="mobile-colors">
              <img 
                src="/legacy/img/colors-houses.png" 
                alt="цветовая схема для сайта каталога 2023"
                loading="lazy"
              />
            </div>
          </div>
          <img 
            className="align-self-center mobile-line" 
            src="/legacy/img/line.png" 
            alt="стрелки вниз"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
}

