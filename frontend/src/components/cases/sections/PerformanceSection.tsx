import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { getPublicCase } from '@/services/publicApi';
import { accentWithAlpha, pickPerformanceAccent } from '@/utils/performanceAccent';
import styles from './PerformanceSection.module.css';

gsap.registerPlugin(ScrollTrigger);

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

// Детерминированный score 85-99 из slug (одинаковый при каждом открытии кейса)
function getScoreFromSlug(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h << 5) - h + slug.charCodeAt(i) | 0;
  return 85 + (Math.abs(h) % 15);
}

function getStatusColor(status: string, accent: string): string {
  if (status === 'excellent') return accent;
  if (status === 'good') return accentWithAlpha(accent, 0.58);
  return '#6e6e6e';
}

export function PerformanceSection() {
  const { slug } = useParams<{ slug?: string }>();
  const circleRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);

  const { data: caseData } = useQuery({
    queryKey: ['publicCase', slug],
    queryFn: () => getPublicCase(slug!),
    enabled: !!slug,
  });

  const perfData = caseData?.contentJson?.performance || {};
  const palette = (caseData?.contentJson?.colors?.palette || []).filter((x: any) => x?.color);
  const accentColor = pickPerformanceAccent(palette);
  const score = perfData.score != null ? Number(perfData.score) : (slug ? getScoreFromSlug(slug) : 92);
  const clampedScore = Math.min(99, Math.max(85, score));
  const metrics = (perfData.metrics || []).filter((m: any) => m?.label || m?.value);

  useEffect(() => {
    const el = circleRef.current;
    const scoreEl = scoreRef.current;
    if (!el || !scoreEl) return;

    gsap.set(el, { '--score': 0 } as gsap.TweenTarget);
    scoreEl.textContent = '0%';

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
    });
    tl.to(el, {
      '--score': clampedScore,
      duration: 1.2,
      ease: 'power2.out',
      onUpdate: function () {
        const v = Math.round(this.progress() * clampedScore);
        if (scoreEl) scoreEl.textContent = `${v}%`;
      },
    });

    return () => {
      tl.scrollTrigger?.kill();
    };
  }, [clampedScore]);

  if (metrics.length === 0) {
    return null;
  }

  return (
    <section className={styles.performance}>
      <div className={styles.performanceContainer}>
        <h2 style={textStyles.sectionTitle}>Основные показатели</h2>

        <div className={styles.performanceContent}>
          <div className={styles.performanceScore}>
            <div className={styles.circularScore}>
              <div
                ref={circleRef}
                className={styles.circularBg}
                style={
                  {
                    '--score': 0,
                    '--accent': accentColor,
                  } as React.CSSProperties
                }
              >
                <div className={styles.circularInner}>
                  <span ref={scoreRef} style={textStyles.scoreValue}>0%</span>
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
                <div className={styles.legendDot} style={{ backgroundColor: '#6e6e6e' }} />
                <span style={textStyles.legendLabel}>Плохо</span>
              </div>
              <div className={styles.legendItem}>
                <div className={styles.legendDot} style={{ backgroundColor: accentWithAlpha(accentColor, 0.55) }} />
                <span style={textStyles.legendLabel}>Нормально</span>
              </div>
              <div className={styles.legendItem}>
                <div className={styles.legendDot} style={{ backgroundColor: accentColor }} />
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
                    style={{
                      backgroundColor: getStatusColor(metric.status || 'excellent', accentColor),
                    }}
                  />
                  <div className={styles.metricText}>
                    <p style={textStyles.metricLabel}>{metric.label || ''}</p>
                    <p style={textStyles.metricValue}>{metric.value || ''}</p>
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
