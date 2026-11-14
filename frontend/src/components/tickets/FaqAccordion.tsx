import { useState, type ReactNode } from 'react';
import styles from './FaqAccordion.module.css';

export type FaqAccordionItem = { q: string; a: ReactNode };

type Props = {
  items: FaqAccordionItem[];
  /** Индекс открытого пункта. null — все закрыты. */
  defaultOpen?: number | null;
};

export function FaqAccordion({ items, defaultOpen = 0 }: Props) {
  const [open, setOpen] = useState<number | null>(defaultOpen);

  return (
    <div className={styles.list}>
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q} className={styles.row}>
            <button
              type="button"
              className={styles.question}
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : i)}
            >
              <span>{item.q}</span>
              <span className={isOpen ? styles.dotOn : styles.dot} aria-hidden />
            </button>
            <div className={isOpen ? styles.answerOpen : styles.answer}>
              <div className={styles.answerInner}>{item.a}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
