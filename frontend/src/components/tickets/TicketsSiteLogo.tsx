/**
 * Логотип витрины: картинка из CMS и/или знак «билет» + словесная часть.
 */
import styles from './TicketsSiteLogo.module.css';

type Props = {
  /** Краткое слово: «Афиша» */
  title?: string;
  /** Подпись: «билеты на мероприятия» */
  sub?: string;
  /** URL или `/uploads/…` — если задан, показываем картинку */
  imageUrl?: string;
  /** При imageUrl: показывать title/sub рядом (по умолчанию true) */
  showTextWithImage?: boolean;
};

function Mark() {
  return (
    <svg className={styles.mark} viewBox="0 0 40 40" aria-hidden>
      <rect width="40" height="40" rx="9" className={styles.markBg} />
      <rect x="9" y="13" width="22" height="14" rx="3" className={styles.markTicket} />
      <rect x="17" y="16" width="6" height="8" rx="1.2" className={styles.markTear} />
    </svg>
  );
}

export function TicketsSiteLogo({
  title = 'Афиша',
  sub = 'билеты на мероприятия',
  imageUrl,
  showTextWithImage = true,
}: Props) {
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
    <span className={styles.root} aria-label={`${title} — ${sub}`}>
      <Mark />
      <span className={styles.text}>
        <span className={styles.title}>{title}</span>
        <span className={styles.sub}>{sub}</span>
      </span>
    </span>
  );
}
