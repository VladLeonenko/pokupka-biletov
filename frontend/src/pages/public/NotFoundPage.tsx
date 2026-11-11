import { Link } from 'react-router-dom';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { SITE_BRAND, getSiteBaseUrl } from '@/config/site';
import styles from './NotFoundPage.module.css';

const NAV_LINKS = [
  { to: '/', label: 'Афиша' },
  { to: '/events', label: 'Мероприятия' },
  { to: '/events/map', label: 'Карта недели' },
  { to: '/contacts', label: 'Контакты' },
  { to: '/faq', label: 'FAQ' },
  { to: '/returns', label: 'Возврат' },
];

export function NotFoundPage() {
  const origin = getSiteBaseUrl();

  return (
    <>
      <SeoMetaTags
        title={`Страница не найдена | ${SITE_BRAND}`}
        description="Такой страницы нет. Откройте афишу или поиск мероприятий — билеты на концерты, театр и спорт."
        url={typeof window !== 'undefined' ? `${window.location.origin}/404` : `${origin}/404`}
        noindex
      />
      <main className={styles.page} data-page="404">
        <div className={styles.panel}>
          <p className={styles.kicker}>{SITE_BRAND}</p>
          <p className={styles.code} aria-hidden="true">
            404
          </p>
          <h1 className={styles.title}>Такой страницы нет</h1>
          <p className={styles.lead}>
            Ссылка устарела или адрес набран с ошибкой. Афиша на месте — можно сразу выбрать
            мероприятие.
          </p>
          <div className={styles.actions}>
            <Link className={styles.ctaPrimary} to="/">
              На главную
            </Link>
            <Link className={styles.ctaGhost} to="/events">
              Смотреть афишу
            </Link>
          </div>
          <ul className={styles.nav}>
            {NAV_LINKS.map(({ to, label }) => (
              <li key={to}>
                <Link to={to}>{label}</Link>
              </li>
            ))}
          </ul>
          <p className={styles.brand}>{SITE_BRAND}</p>
        </div>
      </main>
    </>
  );
}
