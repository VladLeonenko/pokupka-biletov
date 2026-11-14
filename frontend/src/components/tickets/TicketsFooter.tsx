import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchPublicTicketsVitrine } from '@/services/ticketsVitrineApi';
import { mergeTicketsVitrine } from '@/utils/ticketsVitrineDefaults';
import styles from './TicketsFooter.module.css';

const TILES = [
  { to: '/events', kicker: 'Смотреть', title: 'Афиша', primary: true },
  { to: '/account', kicker: 'Заказы', title: 'Кабинет', primary: false },
  { to: '/faq', kicker: 'Справка', title: 'Вопросы', primary: false },
  { to: '/contacts', kicker: 'Написать', title: 'Контакты', primary: false },
] as const;

const FINE = [
  { to: '/returns', label: 'Возврат' },
  { to: '/offer', label: 'Оферта' },
  { to: '/politic', label: 'Конфиденциальность' },
  { to: '/cookies', label: 'Cookie' },
  { to: '/requisites', label: 'Реквизиты' },
] as const;

export function TicketsFooter() {
  const { data: vitrineRes } = useQuery({
    queryKey: ['tickets-vitrine'],
    queryFn: fetchPublicTicketsVitrine,
    staleTime: 120_000,
  });

  const vitrine = useMemo(() => mergeTicketsVitrine(vitrineRes?.content), [vitrineRes]);
  const brand = vitrine.footer?.brand ?? 'Афиша';
  const tagline = vitrine.footer?.tagline ?? 'Подбор и покупка билетов на концерты, театр и спорт.';
  const copy =
    vitrine.footer?.copy?.trim() ||
    `© ${new Date().getFullYear()} Покупка билетов`;

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.ticket}>
          <div className={styles.top}>
            <Link to="/" className={styles.brandBlock}>
              <span className={styles.brand}>{brand}</span>
              <span className={styles.muted}>{tagline}</span>
            </Link>
            <nav className={styles.tiles} aria-label="Разделы">
              {TILES.map((tile) => (
                <Link
                  key={tile.to}
                  to={tile.to}
                  className={tile.primary ? styles.tilePrimary : styles.tile}
                >
                  <span className={styles.tileKicker}>{tile.kicker}</span>
                  <span className={styles.tileTitle}>{tile.title}</span>
                </Link>
              ))}
            </nav>
          </div>

          <div className={styles.rip} aria-hidden>
            <span className={styles.dash} />
          </div>

          <div className={styles.stub}>
            <nav className={styles.fine} aria-label="Документы">
              {FINE.map((item) => (
                <Link key={item.to} to={item.to}>
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className={styles.bottom}>
              <div className={styles.copy}>{copy}</div>
              <a
                className={styles.devBadge}
                href="https://prime-coder.ru"
                target="_blank"
                rel="noopener"
              >
                <span className={styles.devBadgeMark} aria-hidden>
                  PC
                </span>
                <span className={styles.devBadgeText}>
                  Сайт разработан студией <span className={styles.devBadgeBrand}>PrimeCoder</span>
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
