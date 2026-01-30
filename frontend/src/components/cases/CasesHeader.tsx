/**
 * Заголовок страницы кейса
 */
export function CasesHeader() {
  return (
    <section className="cases-header" style={{ margin: '4em 0' }}>
      <div className="cases-bg">
        <div className="container">
          <div className="cases-header-content d-flex gap-v-10 flex-column pt-50">
            <div className="d-flex jcsb">
              <p>Кейс по разработке сайта cтроительство домов из полистиролбетона</p>
              <p>2021</p>
            </div>
            <h1 className="tac">Дома России</h1>
            <img 
              className="align-self-center" 
              src="/legacy/img/tablet-houses-case.png" 
              alt="кейс по разработке сайта для строительной компании"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

