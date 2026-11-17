import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  filterEventsClient,
  ticketCheckoutHref,
  type NormalizedBiletEvent,
} from '@/services/biletPublicApi';
import { EventPosterCard } from '@/components/tickets/EventPosterCard';
import { buildEventsDirectionHref, directionRowKey } from '@/utils/eventsDirectionHref';
import { pinVenueAfishaEvents } from '@/utils/venueAfishaPin';
import { sortEventsByTheaterDemand, theaterDemandScore } from '@/utils/eventDemandRank';
import { resolveEventHeroUrl } from '@/utils/ticketsPlaceholders';
import { TicketEventPosterImg } from '@/components/tickets/TicketEventPosterImg';
import styles from './TicketsCategoryCarousels.module.css';

function venueCanonForDirection(dir: CategoryDirection): string | null {
  const label = dir.label.trim().toLowerCase();
  const q = (dir.q || '').trim().toLowerCase();
  if (label === 'большой театр' || q.includes('большой театр') || q.includes('bolshoy-teatr')) {
    return 'bolshoy-teatr';
  }
  if (label.includes('мхт') || q.includes('мхт') || q.includes('mht-im-chehova')) {
    return 'mht-im-chehova';
  }
  return null;
}

const MAX_PER_ROW = 10;

export type CategoryDirection = { label: string; q?: string; genre?: string };

type Props = {
  directions: CategoryDirection[];
  events: NormalizedBiletEvent[];
  sportEvents?: NormalizedBiletEvent[];
  listLoading: boolean;
  /** Вставить блок сразу после рубрики с этим label (напр. «Детям») */
  insertAfterLabel?: string;
  insertAfterSlot?: ReactNode;
};

/** Wordstat + оценки. Ближайшая дата только при равном спросе. */
function sortCategoryEvents(rows: NormalizedBiletEvent[]): NormalizedBiletEvent[] {
  return sortEventsByTheaterDemand(rows);
}

function hottest(items: NormalizedBiletEvent[]): NormalizedBiletEvent | null {
  let best: NormalizedBiletEvent | null = null;
  let bestScore = -1;
  for (const ev of items) {
    const score = theaterDemandScore(ev);
    if (!best || score > bestScore) {
      best = ev;
      bestScore = score;
    }
  }
  return best;
}

function leadText(ev: NormalizedBiletEvent): string {
  const text = ev.heroDescription?.trim() || ev.subtitle?.trim() || '';
  if (!text) return '';
  return text.length > 240 ? `${text.slice(0, 237).trim()}…` : text;
}

function leadMeta(ev: NormalizedBiletEvent): string {
  const when = [ev.displayDate, ev.timeLabel].filter(Boolean).join(' · ') || ev.dateLabel || '';
  return [ev.venue, when].filter(Boolean).join(' · ');
}

function leadPitch(score: number): string {
  if (score >= 800) return 'Сейчас разбирают быстрее всего. Ряд ещё можно выбрать на схеме.';
  if (score >= 150) return 'Высокий спрос. Схема зала открыта — место фиксируется сразу.';
  return 'Места на схеме зала. Оплата на сайте, билет придёт на почту.';
}

function LeadCard({ event }: { event: NormalizedBiletEvent }) {
  const score = theaterDemandScore(event);
  const text = leadText(event);
  const meta = leadMeta(event);
  return (
    <Link className={styles.lead} to={ticketCheckoutHref(event)}>
      <TicketEventPosterImg
        src={resolveEventHeroUrl(event)}
        gradientId={event.id}
        className={styles.leadImg}
        role="card"
        sizes="(min-width: 1024px) 48vw, 96vw"
        alt=""
        loading="lazy"
        decoding="async"
        width={1280}
        height={720}
      />
      <span className={styles.leadShade} />
      <span className={styles.leadCopy}>
        <span className={styles.leadKicker}>{score >= 150 ? 'Сейчас разбирают' : 'В афише'}</span>
        <strong>{event.title}</strong>
        {meta ? <span className={styles.leadMeta}>{meta}</span> : null}
        {text ? <em>{text}</em> : null}
        <span className={styles.leadPitch}>{leadPitch(score)}</span>
        <span className={styles.leadCta}>Выбрать места</span>
      </span>
    </Link>
  );
}

function isSportDirection(dir: CategoryDirection): boolean {
  return dir.genre?.trim().toLowerCase() === 'спорт' || dir.label.trim().toLowerCase() === 'спорт';
}

function CornerArrow({ size = 18 }: { size?: number }) {
  return (
    <svg
      className={styles.cornerArrow}
      viewBox="8 8 16 16"
      width={size}
      height={size}
      aria-hidden
    >
      <path
        d="M10 10 L22 22 M14 22 H22 V14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

function SectionTitle({ text, to, id }: { text: string; to: string; id: string }) {
  return (
    <div className={styles.titleBlock}>
      <p className={styles.kicker}>Подборка</p>
      <Link id={id} to={to} className={styles.titleLink}>
        {text}
      </Link>
    </div>
  );
}

export function TicketsCategoryCarousels({
  directions,
  events,
  sportEvents,
  listLoading,
  insertAfterLabel,
  insertAfterSlot,
}: Props) {
  const rows = useMemo(() => {
    return directions
      .map((d) => {
        const genre = d.genre?.trim();
        const q = d.q?.trim();
        if (!genre && !q) return { dir: d, items: [] as NormalizedBiletEvent[] };
        const source = isSportDirection(d) && sportEvents ? sportEvents : events;
        const filtered = filterEventsClient(source, genre ? { genre } : { q: q! });
        const venueCanon = venueCanonForDirection(d);
        const ordered = venueCanon
          ? pinVenueAfishaEvents(venueCanon, sortCategoryEvents(filtered))
          : sortCategoryEvents(filtered);
        const sorted = ordered.slice(0, MAX_PER_ROW);
        return { dir: d, items: sorted };
      })
      .filter((r) => r.items.length > 0);
  }, [directions, events, sportEvents]);

  const afterKey = insertAfterLabel?.trim().toLowerCase() || '';

  if (listLoading) {
    return (
      <>
        {directions.slice(0, 3).map((d, i) => (
          <section key={`sk-${directionRowKey(d)}-${i}`} className={styles.block} aria-busy="true">
            <div className={styles.skelTitle} />
            <div className={styles.skeletonStrip}>
              {[0, 1, 2, 3].map((j) => (
                <div key={j} className={styles.skelCard} />
              ))}
            </div>
          </section>
        ))}
      </>
    );
  }

  if (rows.length === 0 && !insertAfterSlot) return null;

  const rowByKey = new Map(rows.map((r) => [directionRowKey(r.dir), r]));
  const order = directions.length > 0 ? directions : rows.map((r) => r.dir);
  const nodes: ReactNode[] = [];
  let inserted = false;
  let sectionIndex = 0;

  for (const dir of order) {
    const row = rowByKey.get(directionRowKey(dir));
    if (row) {
      const href = buildEventsDirectionHref(dir);
      const rowKey = directionRowKey(dir);
      const titleId = `cat-${encodeURIComponent(rowKey)}`;
      const fresh = sectionIndex % 2 === 0;
      sectionIndex += 1;
      const lead = fresh ? hottest(row.items) : null;
      const rest = lead ? row.items.filter((ev) => ev !== lead) : row.items;
      nodes.push(
        <section key={rowKey} className={styles.block} aria-labelledby={titleId}>
          <div className={styles.head}>
            <SectionTitle text={dir.label} to={href} id={titleId} />
            <Link className={styles.seeAll} to={href}>
              <span>Все</span>
              <CornerArrow />
            </Link>
          </div>
          <div className={styles.stripBleed}>
            <div className={styles.strip} role="list">
              {lead ? (
                <div className={styles.leadSlot} role="listitem">
                  <LeadCard event={lead} />
                </div>
              ) : null}
              {rest.map((ev) => (
                <div key={ev.id} className={styles.cardSlot} role="listitem">
                  <EventPosterCard event={ev} variant="compact" />
                </div>
              ))}
            </div>
          </div>
        </section>,
      );
    }

    if (!inserted && afterKey && dir.label.trim().toLowerCase() === afterKey && insertAfterSlot) {
      nodes.push(<div key="insert-after-rubric">{insertAfterSlot}</div>);
      inserted = true;
    }
  }

  if (!inserted && insertAfterSlot) {
    nodes.push(<div key="insert-after-rubric-fallback">{insertAfterSlot}</div>);
  }

  return <>{nodes}</>;
}

/** «Ещё в афише» — тот же блок, что Театр / Детям: первый кадр крупный, дальше карточки. */
export function AfishaMoreRow({ events }: { events: NormalizedBiletEvent[] }) {
  if (events.length === 0) return null;
  const ranked = sortCategoryEvents(events);
  const lead = hottest(ranked);
  const rest = lead ? ranked.filter((ev) => ev !== lead) : ranked;
  const titleId = 'more-heading';
  return (
    <section className={styles.block} aria-labelledby={titleId}>
      <div className={styles.head}>
        <SectionTitle text="Ещё в афише" to="/events" id={titleId} />
        <Link className={styles.seeAll} to="/events">
          <span>Все</span>
          <CornerArrow />
        </Link>
      </div>
      <div className={styles.stripBleed}>
        <div className={styles.strip} role="list">
          {lead ? (
            <div className={styles.leadSlot} role="listitem">
              <LeadCard event={lead} />
            </div>
          ) : null}
          {rest.map((ev) => (
            <div key={ev.id} className={styles.cardSlot} role="listitem">
              <EventPosterCard event={ev} variant="compact" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
