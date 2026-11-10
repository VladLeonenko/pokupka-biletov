import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { NormalizedBiletEvent } from '@/services/biletPublicApi';
import { buildVenueCardsFromEvents } from '@/utils/venueCoverFromEvents';
import { VENUE_COVER_FALLBACK } from '@/data/venueBuildingCovers';
import styles from './HomeVenuesBlock.module.css';

const TOP_N = 12;

type Props = {
  events: NormalizedBiletEvent[];
};

export function HomeVenuesBlock({ events }: Props) {
  const { top, totalUnique } = useMemo(() => {
    const all = buildVenueCardsFromEvents(events);
    return { top: all.slice(0, TOP_N), totalUnique: all.length };
  }, [events]);

  if (top.length === 0) return null;

  return (
    <section className={styles.section} aria-labelledby="home-venues-title">
      <div className={styles.head}>
        <div>
          <p className={styles.overline}>Площадки</p>
          <h2 id="home-venues-title" className={styles.h2}>
            Театры и залы
          </h2>
        </div>
        <Link to="/events/venues" className={styles.allLink}>
          Все площадки{totalUnique > TOP_N ? ` (${totalUnique})` : ''} →
        </Link>
      </div>
      <ul className={styles.grid}>
        {top.map((v) => (
          <li key={v.slug}>
            <Link className={styles.card} to={`/events/venue/${v.slug}`}>
              <div className={styles.media}>
                <img
                  src={v.coverUrl || VENUE_COVER_FALLBACK}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className={styles.img}
                  onError={(e) => {
                    const el = e.currentTarget;
                    if (!el.src.endsWith(VENUE_COVER_FALLBACK)) el.src = VENUE_COVER_FALLBACK;
                  }}
                />
              </div>
              <div className={styles.body}>
                <span className={styles.name}>{v.label}</span>
                <span className={styles.meta}>{v.count} в афише</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
