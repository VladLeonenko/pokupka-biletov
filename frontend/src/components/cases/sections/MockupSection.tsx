import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPublicCase } from '@/services/publicApi';
import styles from './MockupSection.module.css';

export function MockupSection() {
  const { slug } = useParams<{ slug?: string }>();
  
  const { data: caseData } = useQuery({
    queryKey: ['publicCase', slug],
    queryFn: () => getPublicCase(slug!),
    enabled: !!slug,
  });

  const mockupImage = caseData?.contentJson?.mockup?.image || caseData?.heroImageUrl || '';

  if (!mockupImage) {
    return null;
  }

  return (
    <section className={styles.mockup}>
      <div className={styles['mockup-container']}>
        <img src={mockupImage} alt="Project Mockup" className={styles['mockup-image']} />
      </div>
    </section>
  );
}
