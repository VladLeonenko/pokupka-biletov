/**
 * Секция с инфраструктурой
 */
export function CasesInfrastructure() {
  return (
    <>
      <section className="infrastructure container" style={{ margin: '4em 0' }}>
        <div className="d-flex flex-column gap-v-20">
          <h3 className="grey">Инфраструктура</h3>
          <p>Расположение будущего дома</p>
        </div>
        <img 
          src="/legacy/img/infrastructure.png" 
          className="mt-50" 
          alt="визуализация планировок для строительной компании"
          loading="lazy"
        />
      </section>
      <section className="infrastructure container" style={{ margin: '4em 0' }}>
        <h3 className="grey">Каталог и наполнение карточек</h3>
        <img 
          src="/legacy/img/catalog.png" 
          className="mt-50" 
          alt="каталог для строительной компании"
          loading="lazy"
        />
      </section>
    </>
  );
}

