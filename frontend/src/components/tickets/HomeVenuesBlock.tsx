import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { NormalizedBiletEvent } from '@/services/biletPublicApi';
import { venueSlugFromName } from '@/utils/venueSlug';
import styles from './HomeVenuesBlock.module.css';

const TOP_N = 12;

type Props = {
  events: NormalizedBiletEvent[];
};

export function HomeVenuesBlock({ events }: Props) {
  const { top, totalUnique } = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>();
    for (const ev of events) {
      const name = ev.venue?.trim();
      if (!name) continue;
      const slug = venueSlugFromName(name);
      if (!slug) continue;
      const prev = counts.get(slug);
      if (prev) {
        prev.count += 1;
        if (name.length > prev.label.length) prev.label = name;
      } else {
        counts.set(slug, { label: name, count: 1 });
      }
    }
    const sorted = [...counts.entries()]
      .map(([slug, v]) => ({ slug, label: v.label, count: v.count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'ru'));
    return { top: sorted.slice(0, TOP_N), totalUnique: sorted.length };
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
              <span className={styles.name}>{v.label}</span>
              <span className={styles.meta}>{v.count} в афише</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
