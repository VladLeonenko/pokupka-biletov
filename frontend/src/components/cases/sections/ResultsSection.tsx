import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPublicCase } from '@/services/publicApi';
import styles from './ResultsSection.module.css';

/** Значения-плейсхолдеры — не показываем блоки «дней / экранов», чтобы не выглядело как ошибка верстки */
const STAT_PLACEHOLDERS = new Set(
  [
    'n/a',
    'n/a.',
    'na',
    'n.a.',
    'n\\a',
    'ongoing',
    'tbd',
    'todo',
    'none',
    'null',
    'undefined',
    '...',
    '..',
    '-',
    '—',
    '–',
    'нет',
    'не применимо',
    'н/д',
    'н\\д',
  ].map((s) => s.toLowerCase())
);

function isShowableStatValue(raw: unknown): boolean {
  if (raw == null) return false;
  const s = String(raw).trim();
  if (!s) return false;
  const lower = s.toLowerCase().replace(/\s+/g, ' ');
  if (STAT_PLACEHOLDERS.has(lower)) return false;
  if (/^[\s\-–—.]+$/u.test(s)) return false;
  if (/^\.{2,}$/u.test(s)) return false;
  return true;
}

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
  const features = (resultsData.features || []).filter(
    (f: unknown) => typeof f === 'string' && f.trim().length > 0
  );

  const stats: { value: string; label: string }[] = [];
  if (isShowableStatValue(days)) stats.push({ value: String(days).trim(), label: 'дней разработки' });
  if (isShowableStatValue(screens)) stats.push({ value: String(screens).trim(), label: 'экранов/страниц' });

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
