import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPublicCase } from '@/services/publicApi';
import styles from './HeroSection.module.css';

export function HeroSection() {
  const { slug } = useParams<{ slug?: string }>();
  
  const { data: caseData } = useQuery({
    queryKey: ['publicCase', slug],
    queryFn: () => getPublicCase(slug!),
    enabled: !!slug,
  });

  const heroData = caseData?.contentJson?.hero || {};
  const heroImage = heroData.backgroundImage || caseData?.heroImageUrl || '/images/cases/default-hero.jpg';
  const title = heroData.title || caseData?.title || 'Case Study';
  const subtitle = heroData.subtitle || '';

  return (
    <section className={styles.hero}>
      <img 
        src={heroImage} 
        alt={title} 
        className={styles.heroImage} 
      />
      <div className={styles.heroGradient} />
      {(title || subtitle) && (
        <div className={styles.heroContent}>
          {title && <h1 className={styles.heroTitle}>{title}</h1>}
          {subtitle && <p className={styles.heroSubtitle}>{subtitle}</p>}
        </div>
      )}
    </section>
  );
}
