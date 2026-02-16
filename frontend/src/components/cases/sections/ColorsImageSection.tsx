import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPublicCase } from '@/services/publicApi';
import styles from './ColorsImageSection.module.css';

const OPACITY_LEVELS = [0.05, 0.1, 0.2, 0.4, 0.6, 1];

export function ColorsImageSection() {
  const { slug } = useParams<{ slug?: string }>();

  const { data: caseData } = useQuery({
    queryKey: ['publicCase', slug],
    queryFn: () => getPublicCase(slug!),
    enabled: !!slug,
  });

  const palette = (caseData?.contentJson?.colors?.palette || []).filter((x: any) => x?.color);

  if (palette.length === 0) {
    return null;
  }

  return (
    <section className={styles.colors}>
      <div className={styles['colors-container']}>
        <h2 className={styles['colors-title']}>Цветовая схема</h2>
        <div className={styles.colorPalette}>
          {palette.map((item: { color?: string }, colIndex: number) => (
            <div key={colIndex} className={styles.colorColumn}>
              {OPACITY_LEVELS.map((opacity, rowIndex) => (
                <div
                  key={rowIndex}
                  className={styles.colorSwatch}
                  style={{ backgroundColor: item.color, opacity }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
