/**
 * Секция с планировкой
 */
export function CasesLayout() {
  return (
    <section className="layout container" style={{ margin: '4em 0' }}>
      <h3 className="grey">Планировка</h3>
      <div className="d-flex jcc gap-h-30 mt-50 mobile-image-style">
        <img 
          src="/legacy/img/layout.png" 
          alt="реализация блока с планировкой для строительной компании"
          loading="lazy"
        />
        <img 
          src="/legacy/img/layout-2.png" 
          alt="реализация блока с планировкой для строительной компании"
          loading="lazy"
        />
      </div>
    </section>
  );
}

