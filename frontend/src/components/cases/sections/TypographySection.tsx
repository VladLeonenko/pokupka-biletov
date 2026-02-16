import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPublicCase } from '@/services/publicApi';
import styles from './TypographySection.module.css';

export function TypographySection() {
  const { slug } = useParams<{ slug?: string }>();
  
  const { data: caseData } = useQuery({
    queryKey: ['publicCase', slug],
    queryFn: () => getPublicCase(slug!),
    enabled: !!slug,
  });

  const typography = caseData?.contentJson?.typography || {};
  const fontFamily = typography.fontFamily || 'Open Sans';
  const weights = typography.weights || ['LIGHT', 'REGULAR', 'SEMIBOLD'];
  const description = typography.description || 
    'Прямой штрих с открытыми формами и нейтральной, но дружественной внешностью.';


  // Inline стили чтобы гарантированно перебить MUI
  const titleStyle: React.CSSProperties = {
    fontFamily: "'Open Sans', sans-serif",
    fontWeight: 700,
    fontSize: '48px',
    lineHeight: 1.5,
    color: 'white',
    margin: 0,
  };

  const weightStyle: React.CSSProperties = {
    fontFamily: "'Open Sans', sans-serif",
    fontWeight: 300,
    fontSize: '48px',
    lineHeight: 1.5,
    color: 'white',
    margin: 0,
    padding: 0,
  };

  const fontNameStyle: React.CSSProperties = {
    fontFamily: "'Open Sans', sans-serif",
    fontWeight: 300,
    fontSize: '96px',
    lineHeight: 1.5,
    color: 'white',
    margin: 0,
  };

  const descriptionStyle: React.CSSProperties = {
    fontFamily: "'Open Sans', sans-serif",
    fontWeight: 300,
    fontSize: '24px',
    lineHeight: 1.5,
    color: 'white',
    margin: 0,
  };

  return (
    <section className={styles.typography}>
      <div className={styles.typographyContainer}>
        <h2 style={titleStyle}>Типография</h2>

        <div className={styles.typographyShowcase}>
          <div className={styles.fontWeights}>
            {weights.map((weight: string, index: number) => (
              <p key={index} style={weightStyle}>{weight.toUpperCase()}</p>
            ))}
          </div>

          <div className={styles.fontDescription}>
            <h3 style={fontNameStyle}>{fontFamily}</h3>
            <p style={descriptionStyle}>{description}</p>
          </div>
        </div>

      </div>
    </section>
  );
}
