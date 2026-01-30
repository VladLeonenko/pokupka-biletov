/**
 * Секция с типографией
 */
export function TypographyBlock() {
  return (
    <section className="typography-block" style={{ margin: '4em 0' }}>
      <div className="container">
        <h3 className="grey">Типография</h3>
        <div className="d-flex mt-50 gap-h-100 align-items-center">
          <img 
            className="houses-typography" 
            src="/legacy/img/typography.png" 
            alt="шрифт для кейса по разработке сайта"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
          <div className="typography">
            <p className="blue-txt">Steppe</p>
            <p className="pink-txt">Regular</p>
            <p>Современные шрифты отлично вписались в концепцию сайта.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

