import { Link } from 'react-router-dom';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { ticketCheckoutHref, type NormalizedBiletEvent } from '@/services/biletPublicApi';
import { formatEventPosterDateBadge } from '@/utils/eventDateLabels';
import {
  eventCategoryPlaceholderUrl,
  resolveEventCoverUrl,
} from '@/utils/ticketsPlaceholders';
import { venueFromApiOnly } from '@/utils/venueHint';
import { favoriteIdFromEvent, useTicketFavorites } from '@/hooks/useTicketFavorites';
import { TicketEventPosterImg } from './TicketEventPosterImg';
import styles from './EventPosterCard.module.css';

type Props = {
  event: NormalizedBiletEvent;
  variant?: 'poster' | 'compact';
};

/** Подпись API «Разное» и т.п. заменяем на эвристическую категорию */
function displayGenreLine(ev: NormalizedBiletEvent): string | null {
  const raw = ev.genre?.trim();
  const inf = ev.inferredCategoryLabel?.trim();
  const junk = (s: string) => /^разное$/i.test(s) || s.length > 96;
  if (inf === 'Цирк') return inf;
  if (raw && !junk(raw)) return raw;
  if (inf) return inf;
  if (raw) return raw;
  return null;
}

/** Убираем повторяющиеся фрагменты (без учёта регистра). */
function dedupeParts(parts: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const k = p.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out;
}

/** Строка даты/время сеанса (без площадки — она отдельной строкой). */
function buildScheduleLine(ev: NormalizedBiletEvent): string | null {
  const sched = dedupeParts(
    [ev.weekday, ev.displayDate, ev.timeLabel]
      .map((s) => (typeof s === 'string' ? s.trim() : ''))
      .filter(Boolean),
  );
  if (sched.length === 0) return null;
  return sched.join(' · ');
}

export function EventPosterCard({ event, variant = 'poster' }: Props) {
  const to = ticketCheckoutHref(event);
  const { isFavorite, toggleEvent } = useTicketFavorites();
  const favId = favoriteIdFromEvent(event);
  const liked = favId ? isFavorite(favId) : false;
  const coverInput = {
    title: event.title,
    subtitle: event.subtitle,
    genre: event.genre,
    categoryLabel: event.inferredCategoryLabel,
    imageUrl: event.imageUrl,
    bannerUrl: event.bannerUrl,
  };
  const posterSrc = resolveEventCoverUrl(coverInput);
  const placeholderSrc = eventCategoryPlaceholderUrl(coverInput);
  const posterBadge = formatEventPosterDateBadge({
    displayDate: event.displayDate,
    timeLabel: event.timeLabel,
    weekday: event.weekday,
    dateLabel: event.dateLabel,
  });
  const venueLine = venueFromApiOnly(event.venue);
  const venueAddrLine = venueFromApiOnly(event.venueAddress);
  const scheduleLine = buildScheduleLine(event);

  const genreLine = displayGenreLine(event);

  return (
    <div className={`${styles.wrap} ${variant === 'compact' ? styles.compact : ''}`}>
      {favId ? (
        <button
          type="button"
          className={`${styles.favBtn} ${liked ? styles.favBtnActive : ''}`}
          aria-label={liked ? 'Убрать из избранного' : 'В избранное'}
          aria-pressed={liked}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleEvent(event);
          }}
        >
          {liked ? <FavoriteIcon sx={{ fontSize: 18 }} /> : <FavoriteBorderIcon sx={{ fontSize: 18 }} />}
        </button>
      ) : null}
      <Link to={to} className={styles.cardLink}>
        <div className={styles.imageWrap}>
          <TicketEventPosterImg
            src={posterSrc}
            fallbackSrc={placeholderSrc}
            gradientId={event.id}
            className={styles.img}
            loading="lazy"
            decoding="async"
            sizes="(max-width: 600px) 50vw, (max-width: 1100px) 33vw, 240px"
          />
          <div className={styles.shade} />
          <div className={styles.badges}>
            {posterBadge && <span className={styles.badgeDate}>{posterBadge}</span>}
            {event.age && <span className={styles.badgeAge}>{event.age}</span>}
          </div>
          {event.isPremiere && <span className={styles.ribbon}>Премьера</span>}
          <div className={styles.hoverPanel}>
            <span className={styles.buy}>Купить билет</span>
          </div>
        </div>
        <div className={styles.body}>
          {genreLine && <span className={styles.genre}>{genreLine}</span>}
          <h3 className={styles.title}>{event.title}</h3>
          {event.subtitle?.trim() ? (
            <p className={styles.subtitle}>{event.subtitle.trim()}</p>
          ) : null}
          {venueLine || venueAddrLine ? (
            <p className={styles.venueBlock}>
              {venueLine ? <span className={styles.venueName}>{venueLine}</span> : null}
              {venueAddrLine ? <span className={styles.venueAddress}>{venueAddrLine}</span> : null}
            </p>
          ) : null}
          {scheduleLine ? <p className={styles.whenWhere}>{scheduleLine}</p> : null}
          {(event.author || event.director) && (
            <div className={styles.credits}>
              {event.author && <span>Автор — {event.author}</span>}
              {event.director && <span>Режиссёр — {event.director}</span>}
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}
