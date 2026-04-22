import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchPublicTicketsVitrine } from '@/services/ticketsVitrineApi';
import { mergeTicketsVitrine } from '@/utils/ticketsVitrineDefaults';
import styles from './TicketsFooter.module.css';

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
        <div className={styles.grid}>
          <div>
            <div className={styles.brand}>{brand}</div>
            <p className={styles.muted}>{tagline}</p>
          </div>
          <div>
            <div className={styles.colTitle}>Разделы</div>
            <Link to="/">Главная</Link>
            <Link to="/events">Мероприятия</Link>
            <Link to="/account">Личный кабинет</Link>
          </div>
          <div>
            <div className={styles.colTitle}>Информация</div>
            <Link to="/contacts">Контакты</Link>
            <Link to="/faq">Частые вопросы</Link>
            <Link to="/returns">Возврат и обмен</Link>
            <Link to="/offer">Публичная оферта</Link>
            <Link to="/politic">Политика конфиденциальности</Link>
            <Link to="/cookies">Политика cookie</Link>
            <Link to="/requisites">Реквизиты</Link>
          </div>
        </div>
        <div className={styles.copy}>{copy}</div>
      </div>
    </footer>
  );
}
