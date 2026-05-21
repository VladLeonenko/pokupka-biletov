import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { OPERATOR } from '@/utils/operatorLegalInfo';
import styles from './TicketsHelpPages.module.css';

type FaqSection = { title: string; items: { q: string; a: ReactNode }[] };

const SECTIONS: FaqSection[] = [
  {
    title: 'Покупка билета',
    items: [
      {
        q: 'Как купить билет?',
        a: (
          <p>
            Выберите мероприятие в афише или каталоге, откройте страницу события, выберите сеанс и места (если
            доступна схема зала), заполните контактные данные и оплатите заказ. После успешной оплаты подтверждение и
            билет приходят на указанный e-mail.
          </p>
        ),
      },
      {
        q: 'Какими способами можно оплатить?',
        a: (
          <p>
            Доступные способы оплаты показываются на шаге оформления заказа. Обычно это банковские карты и другие
            электронные способы через подключённого платёжного провайдера. Все платежи проходят по защищённому каналу.
          </p>
        ),
      },
      {
        q: 'Когда я получу билет?',
        a: (
          <p>
            Электронный билет или подтверждение заказа направляются на e-mail после успешной оплаты. В большинстве
            случаев — в течение нескольких минут, иногда до 24 часов — в зависимости от организатора и типа
            мероприятия. Проверьте папку «Спам».
          </p>
        ),
      },
      {
        q: 'Электронный билет не пришёл на почту, что делать?',
        a: (
          <p>
            Проверьте «Спам» и «Промоакции», поищите письмо по названию мероприятия. Если не нашли — напишите на{' '}
            <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a> или позвоните{' '}
            <a href={`tel:${OPERATOR.phoneTel}`}>{OPERATOR.phone}</a>, указав e-mail и время оплаты.
          </p>
        ),
      },
    ],
  },
  {
    title: 'Электронный билет',
    items: [
      {
        q: 'Как работает электронный билет?',
        a: (
          <p>
            Электронный билет можно предъявить на входе с экрана телефона или планшета. На всякий случай сохраните
            письмо или распечатайте билет. Не публикуйте билет в открытом доступе — им могут воспользоваться
            мошенники.
          </p>
        ),
      },
      {
        q: 'Где найти билет после покупки?',
        a: (
          <p>
            Письмо с подтверждением отправляется на e-mail, указанный при оформлении. Детали заказа также доступны в{' '}
            <Link to="/account">личном кабинете</Link>, если вы оформляли покупку авторизованным пользователем.
          </p>
        ),
      },
      {
        q: 'Как переоформить именной билет?',
        a: (
          <p>
            Переоформление (смена ФИО) возможно только если это предусмотрено правилами организатора для конкретного
            мероприятия. Напишите в <Link to="/contacts#contacts-form">поддержку</Link> с номером заказа — мы уточним
            допустимость и передадим обращение организатору.
          </p>
        ),
      },
    ],
  },
  {
    title: 'Возврат и перенос',
    items: [
      {
        q: 'Как вернуть билет?',
        a: (
          <p>
            Условия возврата зависят от организатора и типа мероприятия. Общий порядок и сроки по закону о культуре
            описаны на странице <Link to="/returns">«Возврат и обмен»</Link>. Заявление можно подать через{' '}
            <Link to="/contacts#contacts-form">контакты</Link> или на {OPERATOR.email}.
          </p>
        ),
      },
      {
        q: 'Что делать, если мероприятие отменяется или переносится?',
        a: (
          <p>
            При отмене, как правило, оформляется полный возврат. При переносе организатор сообщает порядок: сохранение
            билета на новую дату или возврат по заявлению. Следите за письмами на почту и официальными сообщениями.
            При необходимости напишите в <Link to="/contacts#contacts-form">поддержку</Link> с номером заказа.
          </p>
        ),
      },
      {
        q: 'Можно ли вернуть билет, если передумал идти?',
        a: (
          <p>
            Если мероприятие состоится в заявленные сроки, возврат по личной инициативе регулируется ст. 52.1 закона о
            культуре (для ряда зрелищных мероприятий) и правилами организатора. Чем раньше подадите заявление — тем
            больше сумма возврата. Подробности — на странице <Link to="/returns">«Возврат и обмен»</Link>.
          </p>
        ),
      },
    ],
  },
  {
    title: 'Сервис и данные',
    items: [
      {
        q: 'Кто оказывает услугу и где реквизиты?',
        a: (
          <p>
            Оператор сервиса — {OPERATOR.shortName}, ИНН {OPERATOR.inn}. Реквизиты и юридическая информация:{' '}
            <Link to="/requisites">страница реквизитов</Link>, <Link to="/offer">публичная оферта</Link>.
          </p>
        ),
      },
      {
        q: 'Обработка персональных данных',
        a: (
          <p>
            Мы обрабатываем данные, необходимые для оформления заказа, в соответствии с ФЗ-152. Полный текст:{' '}
            <Link to="/privacy">политика конфиденциальности</Link>.
          </p>
        ),
      },
      {
        q: 'Технические ошибки при оплате или на сайте',
        a: (
          <p>
            Обновите страницу, проверьте блокировщик рекламы. Если списание прошло, а билет не пришёл — сохраните чек и{' '}
            <Link to="/contacts#contacts-form">напишите в поддержку</Link> с указанием времени платежа и e-mail.
          </p>
        ),
      },
    ],
  },
];

export function TicketsFaqPage() {
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  useEffect(() => {
    document.body.setAttribute('data-page', '/faq');
    return () => document.body.removeAttribute('data-page');
  }, []);

  return (
    <>
      <SeoMetaTags
        title="Частые вопросы — покупка билетов"
        description="Ответы о покупке, оплате, электронных билетах, возврате и поддержке."
        url={currentUrl}
      />

      <main className={styles.page}>
        <header className={styles.hero}>
          <div className={styles.heroInner}>
            <span className={styles.kicker}>Справка</span>
            <h1 className={styles.title}>Частые вопросы</h1>
            <p className={styles.lead}>
              {OPERATOR.brand} — сервис покупки билетов на концерты, театр и спорт. Не нашли ответ — напишите в
              поддержку.
            </p>
          </div>
        </header>

        <div className={styles.shell}>
          <p className={styles.updated}>
            Обновлено{' '}
            {new Date().toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          {SECTIONS.map((section) => (
            <section key={section.title} className={styles.faqSection}>
              <h2 className={styles.faqCategory}>{section.title}</h2>
              <div className={`${styles.card} ${styles.faqList}`}>
                {section.items.map((item) => (
                  <details key={item.q} className={styles.faqItem}>
                    <summary className={styles.summary}>{item.q}</summary>
                    <div className={styles.faqBody}>{item.a}</div>
                  </details>
                ))}
              </div>
            </section>
          ))}

          <div className={styles.ctaRow} style={{ marginTop: 8 }}>
            <Link className={styles.cta} to="/contacts#contacts-form">
              Задать другой вопрос
            </Link>
            <Link className={styles.ctaGhost} to="/returns">
              Возврат и обмен
            </Link>
          </div>

          <p className={styles.related}>
            Юридические документы:{' '}
            <Link to="/privacy">конфиденциальность</Link>, <Link to="/offer">оферта</Link>,{' '}
            <Link to="/requisites">реквизиты</Link>.
          </p>
        </div>
      </main>
    </>
  );
}
