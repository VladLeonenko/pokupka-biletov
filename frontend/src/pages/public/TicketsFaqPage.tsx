import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import styles from './TicketsHelpPages.module.css';

const ITEMS: { q: string; a: ReactNode }[] = [
  {
    q: 'Как купить билет?',
    a: (
      <>
        <p>
          Выберите мероприятие в афише или каталоге, перейдите на страницу события, выберите сеанс и места (если доступна
          схема зала), затем оформите заказ и оплату. После успешной оплаты данные и билет приходят на указанный email.
        </p>
      </>
    ),
  },
  {
    q: 'Какими способами можно оплатить?',
    a: (
      <p>
        Доступные способы оплаты показываются на шаге оформления заказа и зависят от подключённых к сервису платёжных
        методов. Обычно это банковские карты и другие электронные способы.
      </p>
    ),
  },
  {
    q: 'Где найти билет после покупки?',
    a: (
      <p>
        Письмо с подтверждением и данными для входа отправляется на email, который вы указали при оформлении. Проверьте
        папку «Спам». Детали заказа также можно посмотреть в личном кабинете, если вы оформляли покупку авторизованным
        пользователем.
      </p>
    ),
  },
  {
    q: 'Можно ли вернуть билет или обменять?',
    a: (
      <>
        <p>
          Условия возврата и обмена задаёт организатор мероприятия и правила площадки. Общий порядок и как обратиться через
          сервис описаны на странице{' '}
          <Link to="/returns">«Возврат и обмен»</Link>.
        </p>
      </>
    ),
  },
  {
    q: 'Как вы переоформляете именные билеты?',
    a: (
      <p>
        Именной билет оформляется на данные, указанные при покупке. Переоформление (смена ФИО или другого идентификатора на
        билете) возможно только если такой порядок предусмотрен правилами организатора и площадки для конкретного
        мероприятия. Напишите в{' '}
        <Link to="/contacts#contacts-form">поддержку</Link> с номером заказа и сущностью запроса — мы уточним
        допустимость и передадим обращение организатору.
      </p>
    ),
  },
  {
    q: 'Перенос или отмена мероприятия',
    a: (
      <p>
        При отмене или существенном переносе события организатор сообщает порядок возврата или замены билета. Следите за
        официальными сообщениями и письмами на почту. При необходимости напишите в{' '}
        <Link to="/contacts#contacts-form">поддержку</Link> с номером заказа.
      </p>
    ),
  },
  {
    q: 'Обработка персональных данных',
    a: (
      <p>
        Мы обрабатываем данные, необходимые для оформления заказа и исполнения договора, в соответствии с ФЗ-152. Полный
        текст: <Link to="/privacy">политика конфиденциальности</Link>.
      </p>
    ),
  },
  {
    q: 'Технические ошибки при оплате или на сайте',
    a: (
      <p>
        Обновите страницу, проверьте блокировщик рекламы и другой софт, мешающий оплате. Если списание прошло, а билет не
        пришёл — сохраните чек и{' '}
        <Link to="/contacts#contacts-form">напишите в поддержку</Link> с указанием времени платежа и email.
      </p>
    ),
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
        description="Ответы о покупке, оплате, билетах, возврате и поддержке."
        url={currentUrl}
      />

      <main className={styles.page}>
        <header className={styles.hero}>
          <div className={styles.heroInner}>
            <span className={styles.kicker}>Справка</span>
            <h1 className={styles.title}>Частые вопросы</h1>
            <p className={styles.lead}>
              Собрали типичные ситуации по покупке и использованию билетов. Если ответа нет — напишите в поддержку.
            </p>
          </div>
        </header>

        <div className={styles.shell}>
          <p className={styles.updated}>
            Обновлено{' '}
            {new Date().toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <div className={`${styles.card} ${styles.faqList}`}>
            {ITEMS.map((item) => (
              <details key={item.q} className={styles.faqItem}>
                <summary className={styles.summary}>{item.q}</summary>
                <div className={styles.faqBody}>{item.a}</div>
              </details>
            ))}
          </div>

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
            <Link to="/privacy">конфиденциальность</Link>
          </p>
        </div>
      </main>
    </>
  );
}
