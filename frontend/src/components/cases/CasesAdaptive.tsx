/**
 * Секция с адаптивностью для мобильных устройств
 */
export function CasesAdaptive() {
  return (
    <section className="container" style={{ margin: '4em 0' }}>
      <div className="d-flex flex-column gap-v-20">
        <h3 className="grey">Адаптивы для сайта</h3>
        <p>Пользователям доступны все функции на телефонах и планшетах.</p>
      </div>
      <div className="d-flex jcc gap-h-145 mt-50 mobile-image-style">
        <img 
          src="/legacy/img/house-case-mobile.png" 
          alt="мобильная версия сайта строительной компании"
          loading="lazy"
        />
        <img 
          src="/legacy/img/house-case-mobile-2.png" 
          alt="мобильная версия сайта строительной компании"
          loading="lazy"
        />
      </div>
    </section>
  );
}

