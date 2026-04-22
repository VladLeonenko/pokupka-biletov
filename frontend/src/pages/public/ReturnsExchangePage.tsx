import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import styles from './TicketsHelpPages.module.css';

export function ReturnsExchangePage() {
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  useEffect(() => {
    document.body.setAttribute('data-page', '/returns');
    return () => document.body.removeAttribute('data-page');
  }, []);

  return (
    <>
      <SeoMetaTags
        title="Возврат и обмен билетов"
        description="Порядок возврата и обмена билетов, роли организатора и площадки, как обратиться в поддержку."
        url={currentUrl}
      />

      <main className={styles.page}>
        <header className={styles.hero}>
          <div className={styles.heroInner}>
            <span className={styles.kicker}>Покупателям</span>
            <h1 className={styles.title}>Возврат и обмен билетов</h1>
            <p className={styles.lead}>
              Кратко о правовой модели и порядке действий. Точные сроки и основания всегда определяет организатор
              мероприятия и правила площадки.
            </p>
          </div>
        </header>

        <div className={styles.shell}>
          <p className={styles.updated}>
            Редакция от{' '}
            {new Date().toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <article className={styles.card}>
            <div className={styles.prose}>
              <p>
                Мы выступаем как сервис продажи билетов: оформляем заказ и передаём данные организатору. Решение о
                возврате денежных средств и возможности обмена принимает организатор (и/или площадка) в соответствии с
                законодательством РФ и условиями конкретного мероприятия.
              </p>

              <h2 className={styles.sectionTitle}>1. С чего начать</h2>
              <ul className={styles.list}>
                <li>
                  Проверьте письмо с билетом и сайт мероприятия — там часто указаны сроки и способ подачи заявления.
                </li>
                <li>
                  Если мероприятие отменено или перенесено, действуют положения о защите прав потребителей и правила
                  продавца; условия возврата могут быть расширены организатором.
                </li>
                <li>При спорной ситуации напишите нам — поможем сформировать обращение и передать его адресату.</li>
              </ul>

              <h2 className={styles.sectionTitle}>2. Электронный билет</h2>
              <p>
                После оплаты данные заказа и электронный билет направляются на указанный email. Сохраняйте письмо: оно
                подтверждает факт покупки и может понадобиться при возврате или уточнении статуса.
              </p>

              <h2 className={styles.sectionTitle}>3. Как обратиться через сервис</h2>
              <p>
                Опишите номер заказа, мероприятие и причину запроса в форме на странице контактов. Мы передаём обращение
                в поддержку и фиксируем обращение в рабочее время. На срочные вопросы удобнее ответить по телефону —
                если номер указан в контактах на сайте.
              </p>

              <h2 className={styles.sectionTitle}>4. Отказ в переносе/возврате по инициативе зрителя</h2>
              <p>
                Если мероприятие состоится в заявленные сроки, односторонний отказ от билета регулируется правилами
                организатора и договором оферты. Отдельные категории билетов могут быть невозвратными — это должно быть
                доведено до покупателя до оплаты.
              </p>

              <div className={styles.note}>
                <span className={styles.noteStrong}>Не юридическая консультация.</span> Текст носит справочный характер.
                При споре с продавцом вы вправе обратиться к организатору, в площадку или в надзорные / судебные органы с
                учётом вашей ситуации.
              </div>

              <div className={styles.ctaRow}>
                <Link className={styles.cta} to="/contacts#contacts-form">
                  Написать в поддержку
                </Link>
                <Link className={styles.ctaGhost} to="/faq">
                  Частые вопросы
                </Link>
              </div>
            </div>
          </article>

          <p className={styles.related}>
            Персональные данные:{' '}
            <Link to="/privacy">политика конфиденциальности</Link>.
          </p>
        </div>
      </main>
    </>
  );
}
