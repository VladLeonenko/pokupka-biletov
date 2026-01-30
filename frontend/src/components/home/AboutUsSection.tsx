/**
 * Секция "О нас"
 */
export function AboutUsSection() {
  return (
    <div className="container">
      <section className="about-us d-flex flex-column jcc">
        <div className="header-section">
          <h2>О нас</h2>
          <h5>PrimeCoder — digital-продакшн полного цикла с собственной продуктовой аналитикой, веб-дизайном и веб-разработкой.</h5>
        </div>
      <div className="about-us-body d-flex jcsb">
        <div className="about-item d-flex flex-row align-items-center gap-h-5 jcs">
          <p>75</p>
          <span>/</span>
          <h3>Успешных <br />кейсов</h3>
        </div>
        <div className="about-item d-flex flex-row align-items-center gap-h-5 jcs">
          <p>35</p>
          <span>/</span>
          <h3>Наград</h3>
        </div>
        <div className="about-item d-flex flex-row align-items-center gap-h-5 jcs">
          <p>6</p>
          <span>/</span>
          <h3>Лет <br />опыта</h3>
        </div>
      </div>
        <div className="btn-mode d-flex jcc pt-45">
          <a href="/about" className="btn-outline-white">Узнать больше</a>
        </div>
      </section>
    </div>
  );
}

