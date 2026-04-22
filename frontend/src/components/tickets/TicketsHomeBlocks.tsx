import { Link } from 'react-router-dom';
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import HeadsetMicOutlinedIcon from '@mui/icons-material/HeadsetMicOutlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import type { NormalizedBiletEvent } from '@/services/biletPublicApi';
import { EventPosterCard } from './EventPosterCard';
import styles from './TicketsHomeBlocks.module.css';

const TRUST = [
  {
    icon: <CreditCardOutlinedIcon sx={{ fontSize: 28 }} />,
    title: 'Оплата онлайн',
    text: 'Банковские карты и популярные способы оплаты.',
  },
  {
    icon: <EmailOutlinedIcon sx={{ fontSize: 28 }} />,
    title: 'Билет на почту',
    text: 'Электронный билет и доступ в личном кабинете.',
  },
  {
    icon: <HeadsetMicOutlinedIcon sx={{ fontSize: 28 }} />,
    title: 'Поддержка',
    text: 'Помощь с заказом и входом на мероприятие.',
  },
  {
    icon: <VerifiedUserOutlinedIcon sx={{ fontSize: 28 }} />,
    title: 'Безопасная сделка',
    text: 'Оформление через проверенный платёжный поток.',
  },
];

const STEPS = [
  { n: '01', title: 'Выберите событие', text: 'Фильтры по дате, площадке и жанру в каталоге.' },
  { n: '02', title: 'Места и оплата', text: 'Выбор места или зоны и оплата картой.' },
  { n: '03', title: 'Билет у вас', text: 'Письмо на e-mail и раздел «Мои заказы».' },
];

const FAQ = [
  {
    q: 'Как получить билет после оплаты?',
    a: 'После успешной оплаты билет обычно приходит на указанный e-mail. Дублировать можно в личном кабинете в разделе заказов.',
  },
  {
    q: 'Можно ли вернуть билет?',
    a: 'Условия возврата и обмена задаёт организатор и площадка. Уточняйте в описании события или в поддержке.',
  },
  {
    q: 'Нужна ли регистрация?',
    a: 'Для оформления заказа достаточно указать контакты; личный кабинет удобен, чтобы хранить все билеты в одном месте.',
  },
];

export function TicketsTrustStrip() {
  return (
    <section className={styles.trust} aria-labelledby="trust-heading">
      <div className={styles.trustInner}>
        <h2 id="trust-heading" className={styles.visuallyHidden}>
          Преимущества сервиса
        </h2>
        <ul className={styles.trustGrid}>
          {TRUST.map((t) => (
            <li key={t.title} className={styles.trustCard}>
              <div className={styles.trustIcon} aria-hidden>
                {t.icon}
              </div>
              <div>
                <h3 className={styles.trustTitle}>{t.title}</h3>
                <p className={styles.trustText}>{t.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

type Props = {
  events: NormalizedBiletEvent[];
};

/** Блоки после основной афишы: как купить, ещё события, FAQ, CTA */
export function TicketsHomeExtras({ events }: Props) {
  /** Следующие позиции после блока из 12 на главной. */
  const more = events.length > 12 ? events.slice(12, 16) : [];

  return (
    <>
      <section className={styles.how} aria-labelledby="how-heading">
        <div className={styles.sectionHead}>
          <p className={styles.overline}>Простой сценарий</p>
          <h2 id="how-heading" className={styles.h2}>
            Как купить билет
          </h2>
        </div>
        <ol className={styles.steps}>
          {STEPS.map((s) => (
            <li key={s.n} className={styles.step}>
              <span className={styles.stepNum}>{s.n}</span>
              <div>
                <h3 className={styles.stepTitle}>{s.title}</h3>
                <p className={styles.stepText}>{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {more.length > 0 && (
        <section className={styles.more} aria-labelledby="more-heading">
          <div className={styles.moreHead}>
            <div>
              <p className={styles.overline}>Подборка</p>
              <h2 id="more-heading" className={styles.h2}>
                Ещё в афише
              </h2>
            </div>
            <Link to="/events" className={styles.moreLink}>
              Весь каталог →
            </Link>
          </div>
          <div className={styles.moreGrid}>
            {more.map((ev) => (
              <EventPosterCard key={ev.id} event={ev} variant="compact" />
            ))}
          </div>
        </section>
      )}

      <section className={styles.faq} aria-labelledby="faq-heading">
        <div className={styles.faqWrap}>
          <div className={styles.sectionHead}>
            <p className={styles.overline}>Ответы</p>
            <h2 id="faq-heading" className={styles.h2}>
              Частые вопросы
            </h2>
          </div>
          <div className={styles.faqList}>
            {FAQ.map((item) => (
              <details key={item.q} className={styles.details}>
                <summary className={styles.summary}>{item.q}</summary>
                <p className={styles.answer}>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.cta} aria-labelledby="cta-heading">
        <div className={styles.ctaInner}>
          <div>
            <h2 id="cta-heading" className={styles.ctaTitle}>
              Не нашли нужное событие?
            </h2>
            <p className={styles.ctaText}>
              Откройте полный каталог с поиском по названию и площадке — или напишите нам.
            </p>
          </div>
          <div className={styles.ctaBtns}>
            <Link to="/events" className={styles.ctaPrimary}>
              Каталог мероприятий
            </Link>
            <Link to="/contacts" className={styles.ctaGhost}>
              Контакты
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
