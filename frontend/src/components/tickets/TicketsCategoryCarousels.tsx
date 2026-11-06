import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { parseISO, isValid } from 'date-fns';
import {
  filterEventsClient,
  type NormalizedBiletEvent,
} from '@/services/biletPublicApi';
import { EventPosterCard } from '@/components/tickets/EventPosterCard';
import { buildEventsDirectionHref, directionRowKey } from '@/utils/eventsDirectionHref';
import styles from './TicketsCategoryCarousels.module.css';

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

function timeMs(ev: NormalizedBiletEvent): number {
  const raw = ev.isoDate?.trim();
  if (raw) {
    const d = parseISO(raw);
    if (isValid(d)) return d.getTime();
  }
  return Number.MAX_SAFE_INTEGER;
}

/** Премьеры выше, внутри — ближайшие даты. */
function sortCategoryEvents(rows: NormalizedBiletEvent[]): NormalizedBiletEvent[] {
  return [...rows].sort((a, b) => {
    if (a.isPremiere && !b.isPremiere) return -1;
    if (!a.isPremiere && b.isPremiere) return 1;
    return timeMs(a) - timeMs(b);
  });
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

/** Как AssemblingTitle на Blog magazine — буквы собираются при появлении в viewport. */
function AssemblingTitle({ text, to, id }: { text: string; to: string; id: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setOn(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const chars = useMemo(() => Array.from(text), [text]);

  return (
    <Link ref={ref} id={id} to={to} className={`${styles.titleLink}${on ? ` ${styles.titleOn}` : ''}`}>
      {chars.map((ch, i) => (
        <span
          key={`${i}-${ch}`}
          className={styles.titleChar}
          style={{ transitionDelay: `${i * 28}ms` }}
        >
          {ch === ' ' ? '\u00A0' : ch}
        </span>
      ))}
    </Link>
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
        const sorted = sortCategoryEvents(filtered).slice(0, MAX_PER_ROW);
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

  for (const dir of order) {
    const row = rowByKey.get(directionRowKey(dir));
    if (row) {
      const href = buildEventsDirectionHref(dir);
      const rowKey = directionRowKey(dir);
      const titleId = `cat-${encodeURIComponent(rowKey)}`;
      nodes.push(
        <section key={rowKey} className={styles.block} aria-labelledby={titleId}>
          <div className={styles.head}>
            <AssemblingTitle text={dir.label} to={href} id={titleId} />
            <Link className={styles.seeAll} to={href}>
              <span>Все</span>
              <CornerArrow />
            </Link>
          </div>
          <div className={styles.stripBleed}>
            <div className={styles.strip} role="list">
              {row.items.map((ev) => (
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
