/**
 * Секция с инструментами
 */
export function CasesTools() {
  return (
    <section className="tools container" style={{ margin: '4em 0' }}>
      <h3 className="grey">Инструменты</h3>
      <div className="d-flex gap-h-100">
        <div className="tools-content d-flex mt-50 flex-column gap-v-30">
          <p>
            WordPress/HTML/CSS/JS/PHP/MySQL<br />
            Графические редакторы: Figma, Adobe Photoshop, Adobe after effects
          </p>
          <p>
            Понравился проект и хотите что-то подобное? Воспользуйтесь калькулятором стоимости и узнайте цену своего проекта.
          </p>
          <a href="tel:+79999849107" className="pink-btn">Узнать стоимость</a>
        </div>
        <div className="tools-icons d-flex gap-30">
          <img 
            src="/legacy/img/photoshop.png" 
            alt="photoshop инструмент для разработки сайта"
            loading="lazy"
          />
          <img 
            src="/legacy/img/wordpress.png" 
            alt="wordpress инструмент для разработки сайта"
            loading="lazy"
          />
          <img 
            src="/legacy/img/figma.png" 
            alt="figma инструмент для разработки сайта"
            loading="lazy"
          />
          <img 
            src="/legacy/img/javascript.png" 
            alt="javascript инструмент для разработки сайта"
            loading="lazy"
          />
          <img 
            src="/legacy/img/illustrator.png" 
            alt="illustrator инструмент для разработки сайта"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
}

