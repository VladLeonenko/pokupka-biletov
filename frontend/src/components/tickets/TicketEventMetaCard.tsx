import { Paper } from '@mui/material';
import styles from './TicketEventMetaCard.module.css';

type Row = { label: string; value: string };

export function TicketEventMetaCard({ rows }: { rows: Row[] }) {
  if (!rows.length) return null;
  return (
    <Paper
      component="section"
      elevation={0}
      className={styles.wrap}
      aria-label="Сведения о событии"
    >
      <dl className={styles.dl}>
        {rows.map((r) => (
          <div key={`${r.label}-${r.value.slice(0, 24)}`} className={styles.row}>
            <dt className={styles.dt}>{r.label}</dt>
            <dd className={styles.dd}>{r.value}</dd>
          </div>
        ))}
      </dl>
    </Paper>
  );
}
