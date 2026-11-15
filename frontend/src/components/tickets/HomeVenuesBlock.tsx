import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { NormalizedBiletEvent } from '@/services/biletPublicApi';
import { buildVenueCardsFromEvents } from '@/utils/venueCoverFromEvents';
import { VENUE_COVER_FALLBACK } from '@/data/venueBuildingCovers';
import styles from './HomeVenuesBlock.module.css';

type Props = {
  events: NormalizedBiletEvent[];
};

export function HomeVenuesBlock({ events }: Props) {
  const all = useMemo(() => buildVenueCardsFromEvents(events), [events]);

  if (all.length === 0) return null;

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
          Все площадки ({all.length}) →
        </Link>
      </div>
      <div className={styles.stripBleed}>
        <ul className={styles.strip}>
          {all.map((v) => (
            <li key={v.slug} className={styles.slot}>
              <Link className={styles.card} to={`/events/venue/${v.slug}`}>
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
                <span className={styles.fade} aria-hidden />
                <span className={styles.body}>
                  <span className={styles.name}>{v.label}</span>
                  {v.address ? <span className={styles.desc}>{v.address}</span> : null}
                  <span className={styles.meta}>{v.count} в афише</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
