import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ticketCheckoutHref, type NormalizedBiletEvent } from '@/services/biletPublicApi';
import { deriveBiletEventDateParts } from '@/utils/eventDateLabels';
import { posterGradientFromId } from '@/utils/ticketsPlaceholders';
import { TicketEventPosterImg } from './TicketEventPosterImg';
import styles from './NeglinkaEventRows.module.css';

/** Смена заливки при hover — разные акценты по строкам. */
const HOVER_PALETTE: { bg: string; glow: string }[] = [
  { bg: '#ff4e18', glow: 'rgba(255, 78, 24, 0.4)' },
  { bg: '#0d9488', glow: 'rgba(13, 148, 136, 0.38)' },
  { bg: '#7c3aed', glow: 'rgba(124, 58, 237, 0.38)' },
  { bg: '#c2410c', glow: 'rgba(194, 65, 12, 0.38)' },
  { bg: '#0369a1', glow: 'rgba(3, 105, 161, 0.36)' },
  { bg: '#be185d', glow: 'rgba(190, 24, 93, 0.36)' },
];

function eventTimeText(ev: NormalizedBiletEvent): string {
  const t = ev.timeLabel?.trim();
  if (t) return t;
  const dl = ev.dateLabel?.trim();
  if (dl && /^\d{1,2}:\d{2}/.test(dl)) return dl;
  return '';
}

type Props = {
  events: NormalizedBiletEvent[];
};

export function NeglinkaEventRows({ events }: Props) {
  if (events.length === 0) return null;

  return (
    <section className={styles.section} aria-labelledby="afisha-list-heading">
      <h2 id="afisha-list-heading" className={styles.visuallyHidden}>
        Афиша: спектакли и события
      </h2>
      <div className={styles.wrap}>
        {events.map((ev, i) => {
          const derived = deriveBiletEventDateParts(ev.isoDate, ev.dateLabel);
          const dateStr = ev.displayDate ?? derived.displayDate ?? '—';
          const wd = (ev.weekday ?? derived.weekday ?? '').trim();
          const timeStr =
            eventTimeText(ev) || (derived.timeLabel?.trim() ?? '');
          const to = ticketCheckoutHref(ev);
          const posterSrc = ev.imageUrl ?? ev.bannerUrl;
          const tone = HOVER_PALETTE[i % HOVER_PALETTE.length];
          const rowStyle = {
            '--hover-bg': tone.bg,
            '--hover-glow': tone.glow,
          } as CSSProperties;

          return (
            <Link key={ev.id} to={to} className={styles.row} style={rowStyle}>
              <div className={styles.colDate}>
                <span className={styles.dateBig}>{dateStr}</span>
                {wd ? <span className={styles.dateWd}>{wd}</span> : null}
              </div>

              <div className={styles.colVisual}>
                <div className={styles.circle}>
                  {posterSrc ? (
                    <TicketEventPosterImg src={posterSrc} gradientId={ev.id} className={styles.img} loading="lazy" />
                  ) : (
                    <div className={styles.img} style={{ background: posterGradientFromId(ev.id) }} />
                  )}
                </div>
              </div>

              <div className={styles.colInfo}>
                <div className={styles.metaTop}>
                  {ev.age && <span className={styles.age}>{ev.age}</span>}
                  {ev.genre && <span>{ev.genre}</span>}
                </div>
                {ev.isPremiere && <span className={styles.premiereTag}>Премьера</span>}
                <h3 className={styles.title}>{ev.title}</h3>
                {ev.subtitle?.trim() && <p className={styles.subtitle}>{ev.subtitle.trim()}</p>}
                {(ev.author || ev.director) && (
                  <div className={styles.creditsGrid}>
                    {ev.author && (
                      <div className={styles.creditCell}>
                        <span className={styles.creditLabel}>Автор</span>
                        <span className={styles.creditName}>{ev.author}</span>
                      </div>
                    )}
                    {ev.director && (
                      <div className={styles.creditCell}>
                        <span className={styles.creditLabel}>Режиссёр</span>
                        <span className={styles.creditName}>{ev.director}</span>
                      </div>
                    )}
                  </div>
                )}
                <div className={styles.timeVenueRow}>
                  {timeStr && <span className={styles.timeBig}>{timeStr}</span>}
                  {ev.venue && <span className={styles.venueName}>{ev.venue}</span>}
                </div>
              </div>

              <div className={styles.colCta}>
                <span className={styles.btn}>КУПИТЬ БИЛЕТ</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
