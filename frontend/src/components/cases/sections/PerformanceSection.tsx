import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPublicCase } from '@/services/publicApi';
import styles from './PerformanceSection.module.css';

const textStyles = {
  sectionTitle: {
    fontFamily: "'Open Sans', sans-serif",
    fontWeight: 700,
    fontSize: '48px',
    lineHeight: 1,
    color: 'white',
    margin: 0,
  },
  scoreValue: {
    fontFamily: "'Open Sans', sans-serif",
    fontWeight: 400,
    fontSize: '45px',
    lineHeight: 1,
    color: 'white',
  },
  performanceTitle: {
    fontFamily: "'Open Sans', sans-serif",
    fontWeight: 400,
    fontSize: '35px',
    lineHeight: 1,
    color: 'white',
    margin: 0,
  },
  performanceSubtitle: {
    fontFamily: "'Open Sans', sans-serif",
    fontWeight: 300,
    fontSize: '16px',
    lineHeight: 1.5,
    color: 'white',
    margin: 0,
  },
  legendLabel: {
    fontFamily: "'Open Sans', sans-serif",
    fontWeight: 400,
    fontSize: '16px',
    lineHeight: 1.5,
    color: '#aeaeae',
  },
  metricLabel: {
    fontFamily: "'Open Sans', sans-serif",
    fontWeight: 300,
    fontSize: '20px',
    lineHeight: 1.5,
    color: 'white',
    margin: 0,
  },
  metricValue: {
    fontFamily: "'Open Sans', sans-serif",
    fontWeight: 400,
    fontSize: '35px',
    lineHeight: 1,
    color: 'white',
    margin: 0,
  },
};

const defaultMetrics = [
  { label: 'Первая отрисовка контента', value: '0,8 сек', status: 'excellent' },
  { label: 'Индекс скорости', value: '0,8 сек', status: 'good' },
  { label: 'Отрисовка крупного контента', value: '0,8 сек', status: 'poor' },
  { label: 'Смещение макета', value: '0,879', status: 'excellent' },
];

const getStatusColor = (status: string) => {
  if (status === 'excellent') return '#FD9C12';
  if (status === 'good') return 'rgba(253, 156, 18, 0.5)';
  return '#434343';
};

export function PerformanceSection() {
  const { slug } = useParams<{ slug?: string }>();
  
  const { data: caseData } = useQuery({
    queryKey: ['publicCase', slug],
    queryFn: () => getPublicCase(slug!),
    enabled: !!slug,
  });

  const perfData = caseData?.contentJson?.performance || {};
  const score = perfData.score || 93;
  const metrics = perfData.metrics || defaultMetrics;

  return (
    <section className={styles.performance}>
      <div className={styles.performanceContainer}>
        <h2 style={textStyles.sectionTitle}>Основные показатели</h2>

        <div className={styles.performanceContent}>
          <div className={styles.performanceScore}>
            <div className={styles.circularScore}>
              <div className={styles.circularBg} style={{ '--score': score } as React.CSSProperties}>
                <div className={styles.circularInner}>
                  <span style={textStyles.scoreValue}>{score}%</span>
                </div>
              </div>
            </div>

            <div className={styles.performanceDescription}>
              <h3 style={textStyles.performanceTitle}>Производительность</h3>
              <p style={textStyles.performanceSubtitle}>
                Значения приблизительные. Уровень производительности рассчитывается на основании показателей.
              </p>
            </div>

            <div className={styles.performanceLegend}>
              <div className={styles.legendItem}>
                <div className={styles.legendDot} style={{ backgroundColor: '#434343' }} />
                <span style={textStyles.legendLabel}>Плохо</span>
              </div>
              <div className={styles.legendItem}>
                <div className={styles.legendDot} style={{ backgroundColor: 'rgba(253, 156, 18, 0.5)' }} />
                <span style={textStyles.legendLabel}>Нормально</span>
              </div>
              <div className={styles.legendItem}>
                <div className={styles.legendDot} style={{ backgroundColor: '#FD9C12' }} />
                <span style={textStyles.legendLabel}>Идеально</span>
              </div>
            </div>
          </div>

          <div className={styles.metricsList}>
            {metrics.map((metric: any, index: number) => (
              <div key={index} className={styles.metricItem}>
                <div className={styles.metricContent}>
                  <div 
                    className={styles.metricIndicator} 
                    style={{ backgroundColor: getStatusColor(metric.status) }} 
                  />
                  <div className={styles.metricText}>
                    <p style={textStyles.metricLabel}>{metric.label}</p>
                    <p style={textStyles.metricValue}>{metric.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
