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

  return (
    <section className={styles.hero}>
      <img 
        src={heroImage} 
        alt={title} 
        className={styles.heroImage} 
      />
    </section>
  );
}
