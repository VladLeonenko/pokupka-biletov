/**
 * Секция с результатами проекта
 */
export function CasesResults() {
  return (
    <section className="container" style={{ margin: '4em 0' }}>
      <h3 className="grey">Результаты</h3>
      <p>
        На проект было затрачено 42 рабочих дня. Цели и задачи <br />
        заказчика выполнены в полном объеме. Мы очень гордимся<br />
        этим проектом!
      </p>
      <div className="d-flex mt-50 w-100 mobile-flex-coulmn result-stat">
        <div className="pl-50 pr-50 case-stat col-3">
          <h2 className="pb-30 days">73<br />дня</h2>
          <p className="pt-10">Время работы</p>
        </div>
        <div className="pl-50 pr-50 case-stat col-3">
          <h2 className="pb-30 days">49<br />Страниц</h2>
          <p className="pt-10">Объем работы</p>
        </div>
        <div className="pl-50 pr-50 case-stat col-3">
          <h2 className="pb-30 days">12<br />месяцев</h2>
          <p className="pt-10">Продвижения и Яндекс Директа</p>
        </div>
      </div>
    </section>
  );
}

