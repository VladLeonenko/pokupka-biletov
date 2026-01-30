/**
 * Секция с контактной информацией на странице /contacts
 */
export function ContactsInfoSection() {
  return (
    <div className="contacts-body">
      <h1>Контакты PrimeCoder</h1>
      <div className="contacts d-flex flex-wrap mt-150 jcsb">
        <div className="work-hours">
          <h5>График работы</h5>
          <p>Пн-Пт с 9:00 по 22:00</p>
        </div>
        <div className="email">
          <h5>Почта</h5>
          <a href="mailto:info@primecoder.ru">info@primecoder.ru</a>
        </div>
        <div className="adres">
          <h5>Адрес</h5>
          <p>
            Москва, ул. Земляной<br />
            Вал, 50Ас5
          </p>
        </div>
        <div className="tel">
          <h5>Телефон</h5>
          <a href="tel:84951476577">+7 (495)-147-65-77</a>
        </div>
      </div>
    </div>
  );
}

