import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPublicCase } from '@/services/publicApi';
import styles from './ResultsSection.module.css';

export function ResultsSection() {
  const { slug } = useParams<{ slug?: string }>();
  
  const { data: caseData } = useQuery({
    queryKey: ['publicCase', slug],
    queryFn: () => getPublicCase(slug!),
    enabled: !!slug,
  });

  const resultsData = caseData?.contentJson?.results || {};
  const title = resultsData.title || 'Результат';
  const description = resultsData.description || '';
  const days = resultsData.days || '';
  const screens = resultsData.screens || '';
  const features = resultsData.features || [];

  const stats: { value: string; label: string }[] = [];
  if (days) stats.push({ value: days, label: 'дней разработки' });
  if (screens) stats.push({ value: screens, label: 'экранов/страниц' });

  if (!description && stats.length === 0 && features.length === 0) {
    return null;
  }

  return (
    <section className={styles.results}>
      <div className={styles['results-container']}>
        <div className={styles['section-header']}>
          <div className={styles['section-line-short']} />
          <h2 className={styles['section-title']}>{title}</h2>
          <div className={styles['section-line']} />
        </div>

        {description && (
          <div className={styles['description-box']}>
            <p className={styles['description-text']}>{description}</p>
          </div>
        )}

        <div className={styles['content-wrapper']}>
          {stats.length > 0 && (
            <div className={styles['stats-block']}>
              {stats.map((stat, index) => (
                <div key={index} className={styles['stat-item']}>
                  <span className={styles['stat-value']}>{stat.value}</span>
                  <span className={styles['stat-label']}>{stat.label}</span>
                </div>
              ))}
            </div>
          )}

          {features.length > 0 && (
            <div className={styles['features-block']}>
              <ul className={styles['features-list']}>
                {features.map((feature: string, index: number) => (
                  <li key={index} className={styles['feature-item']}>{feature}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
