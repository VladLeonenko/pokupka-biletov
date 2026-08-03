import { useEffect, useState } from 'react';
import {
  formatHoldCountdown,
  isTicketHoldActive,
  ticketHoldRemainingMs,
  type TicketSeatHoldState,
} from '@/utils/ticketSeatHold';
import styles from './TicketHoldTimer.module.css';

type Props = {
  hold: TicketSeatHoldState | null;
  onExpired?: () => void;
  variant?: 'bar' | 'dialog';
};

export function TicketHoldTimer({ hold, onExpired, variant = 'bar' }: Props) {
  const [remainingMs, setRemainingMs] = useState(() => ticketHoldRemainingMs(hold));

  useEffect(() => {
    if (!hold) {
      setRemainingMs(0);
      return;
    }
    const tick = () => {
      const ms = ticketHoldRemainingMs(hold);
      setRemainingMs(ms);
      if (ms <= 0 && onExpired) onExpired();
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [hold, onExpired]);

  if (!hold || !isTicketHoldActive(hold)) {
    if (variant === 'dialog') {
      return (
        <div className={`${styles.root} ${styles.expired}`} role="alert">
          Время брони истекло — выберите места заново
        </div>
      );
    }
    return null;
  }

  const urgent = remainingMs <= 2 * 60 * 1000;

  return (
    <div
      className={`${styles.root} ${variant === 'dialog' ? styles.dialog : styles.bar} ${urgent ? styles.urgent : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className={styles.label}>Места сохранены для оплаты</span>
      <span className={styles.time}>{formatHoldCountdown(remainingMs)}</span>
    </div>
  );
}
