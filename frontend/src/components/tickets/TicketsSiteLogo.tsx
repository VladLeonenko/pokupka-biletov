/**
 * Логотип витрины: картинка из CMS и/или знак «билет-плашка» + словесная часть «билетвсем».
 */
import { useEffect, useState } from 'react';
import styles from './TicketsSiteLogo.module.css';
import {
  LOGO_LETTER,
  LOGO_TILE,
  LOGO_WORD_BILET,
  LOGO_WORD_VIEWBOX,
  LOGO_WORD_VSEM,
} from './ticketsLogoPaths';

/** Событие окна: заказ оплачен → знак переворачивается галочкой. */
export const LOGO_PAID_EVENT = 'biletvsem:paid';

export function celebrateLogoPaid() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(LOGO_PAID_EVENT));
}

type Props = {
  /** Для aria-label / title */
  title?: string;
  /** Подпись: «билеты на мероприятия» */
  sub?: string;
  /** URL или `/uploads/…` — если задан, показываем картинку */
  imageUrl?: string;
  /** При imageUrl: показывать title/sub рядом (по умолчанию true) */
  showTextWithImage?: boolean;
  /** Только знак, без слова. */
  markOnly?: boolean;
  /** Крупный знак с постоянной анимацией — для героя страницы. */
  hero?: boolean;
};

function Mark() {
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    let timer: number | undefined;
    const onPaid = () => {
      setPaid(false);
      window.requestAnimationFrame(() => setPaid(true));
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setPaid(false), 2600);
    };
    window.addEventListener(LOGO_PAID_EVENT, onPaid);
    return () => {
      window.removeEventListener(LOGO_PAID_EVENT, onPaid);
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <svg className={`${styles.mark} ${paid ? styles.paid : ''}`.trim()} viewBox="0 0 40 40" aria-hidden>
      <g className={styles.flip}>
        <g className={styles.front}>
          <path d={LOGO_TILE} className={styles.markBg} />
          <g className={styles.perf}>
            <line x1="5.5" y1="20" x2="8.5" y2="20" />
            <line x1="31.5" y1="20" x2="34.5" y2="20" />
          </g>
          <path d={LOGO_LETTER} className={styles.letter} />
        </g>
        <g className={styles.back}>
          <path d={LOGO_TILE} className={styles.backBg} />
          <path className={styles.check} d="M12.5 20.5l5 5 10-11" />
        </g>
      </g>
    </svg>
  );
}

function Wordmark() {
  return (
    <svg className={styles.word} viewBox={LOGO_WORD_VIEWBOX} aria-hidden>
      <path d={LOGO_WORD_BILET} className={styles.wordInk} />
      <path d={LOGO_WORD_VSEM} className={styles.wordAccent} />
    </svg>
  );
}

export function TicketsSiteLogo({
  title = 'Билет Всем',
  sub = 'билеты на мероприятия',
  imageUrl,
  showTextWithImage = true,
  markOnly = false,
  hero = false,
}: Props) {
  const rootClass = `${styles.root} ${hero ? styles.hero : ''}`.trim();

  if (markOnly) {
    return (
      <span className={rootClass} aria-label={title}>
        <Mark />
      </span>
    );
  }

  const img = imageUrl?.trim();
  const showText = !img || showTextWithImage !== false;

  if (img) {
    return (
      <span className={styles.root} aria-label={`${title} — ${sub}`}>
        <span className={styles.imgWrap}>
          <img className={styles.logoImg} src={img} alt="" decoding="async" />
        </span>
        {showText ? (
          <span className={styles.text}>
            <span className={styles.title}>{title}</span>
            <span className={styles.sub}>{sub}</span>
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <span className={rootClass} aria-label={`${title} — ${sub}`}>
      <Mark />
      <span className={styles.text}>
        <Wordmark />
        <span className={styles.sub}>{sub}</span>
      </span>
    </span>
  );
}
