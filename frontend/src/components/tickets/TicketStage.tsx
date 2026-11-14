import type { ReactNode } from 'react';
import { LOGO_LETTER } from './ticketsLogoPaths';
import styles from './TicketStage.module.css';

const TICKET_TOP =
  'M22 5H78A12 12 0 0 1 90 17V61A9 9 0 0 0 81 70L74.8 65.5L68.6 70L62.4 74.5L56.2 70L50 65.5L43.8 70L37.6 74.5L31.4 70L25.2 65.5L19 70A9 9 0 0 0 10 61V17A12 12 0 0 1 22 5Z';
const TICKET_BOTTOM =
  'M19 70L25.2 65.5L31.4 70L37.6 74.5L43.8 70L50 65.5L56.2 70L62.4 74.5L68.6 70L74.8 65.5L81 70A9 9 0 0 0 90 79V123A12 12 0 0 1 78 135H22A12 12 0 0 1 10 123V79A9 9 0 0 0 19 70Z';
const BARCODE = [24, 27, 31, 33, 37, 41, 43, 47, 50, 54, 56, 60, 64, 66, 70, 73, 76];

function Stub({ label }: { label: string }) {
  return (
    <svg className={styles.stub} viewBox="0 0 100 140" aria-hidden>
      <path d={TICKET_BOTTOM} fill="#111" />
      {BARCODE.map((x, i) => (
        <rect key={x} x={x} y={96} width={i % 3 === 0 ? 2.2 : 1.2} height={22} fill="#ff4e18" />
      ))}
      <text x="50" y="88" textAnchor="middle" fill="#ff4e18" fontSize="7" fontWeight="700" letterSpacing="1.2">
        {label}
      </text>
      <g className={styles.stubTop}>
        <path d={TICKET_TOP} fill="#ff4e18" />
        <path d={LOGO_LETTER} fill="#111" transform="translate(18 4) scale(1.6)" />
      </g>
    </svg>
  );
}

type Props = {
  kicker: string;
  title: string;
  lead: string;
  stub?: string;
  /** Свой знак вместо билета с 404. */
  mark?: ReactNode;
  extra?: ReactNode;
  children?: ReactNode;
};

export function TicketStage({ kicker, title, lead, stub, mark, extra, children }: Props) {
  return (
    <div className={styles.page}>
      <div className={styles.band}>
        <div className={styles.copy}>
          <p className={styles.kicker}>{kicker}</p>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.lead}>{lead}</p>
          {extra}
        </div>
        {mark ? <div className={styles.mark}>{mark}</div> : stub ? <Stub label={stub} /> : null}
      </div>
      {children ? <div className={styles.sheet}>{children}</div> : null}
    </div>
  );
}
