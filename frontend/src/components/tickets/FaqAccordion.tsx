import { useEffect, useRef, useState, type ReactNode } from 'react';
import styles from './FaqAccordion.module.css';

export type FaqAccordionItem = { q: string; a: ReactNode };

type Props = {
  items: FaqAccordionItem[];
};

function FaqRow({ item }: { item: FaqAccordionItem }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useRef(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setOpen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || seen.current) return;
        seen.current = true;
        setOpen(true);
        io.disconnect();
      },
      { threshold: 0.45, rootMargin: '0px 0px -10% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={styles.row}>
      <button
        type="button"
        className={styles.question}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span>{item.q}</span>
        <span className={open ? styles.dotOn : styles.dot} aria-hidden />
      </button>
      <div className={open ? styles.answerOpen : styles.answer}>
        <div className={styles.answerInner}>{item.a}</div>
      </div>
    </div>
  );
}

export function FaqAccordion({ items }: Props) {
  return (
    <div className={styles.list}>
      {items.map((item) => (
        <FaqRow key={item.q} item={item} />
      ))}
    </div>
  );
}
