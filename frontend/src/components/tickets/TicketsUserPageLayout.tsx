import type { ReactNode } from 'react';
import styles from './TicketsUserPageLayout.module.css';

type Props = {
  overline: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function TicketsUserPageLayout({ overline, title, subtitle, children }: Props) {
  return (
    <main className={styles.main}>
      <div className={styles.inner}>
        <header className={styles.head}>
          <p className={styles.overline}>{overline}</p>
          <h1 className={styles.title}>{title}</h1>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        </header>
        {children}
      </div>
    </main>
  );
}

export const ticketsUser = styles;
