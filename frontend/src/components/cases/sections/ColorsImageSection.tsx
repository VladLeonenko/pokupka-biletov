import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPublicCase } from '@/services/publicApi';
import { resolveImageUrl } from '@/utils/resolveImageUrl';
import styles from './ColorsImageSection.module.css';

export function ColorsImageSection() {
  const { slug } = useParams<{ slug?: string }>();

  const { data: caseData } = useQuery({
    queryKey: ['publicCase', slug],
    queryFn: () => getPublicCase(slug!),
    enabled: !!slug,
  });

  const colorsImage = caseData?.contentJson?.colors?.image;

  return (
    <section className={styles.colors}>
      <div className={styles['colors-container']}>
        <h2 className={styles['colors-title']}>Цветовая схема</h2>
        {colorsImage ? (
          <img
            src={resolveImageUrl(colorsImage)}
            alt="Цветовая схема проекта"
            className={styles['colors-image']}
          />
        ) : (
          <p className={styles['colors-placeholder']}>Загрузите изображение цветовой схемы в редакторе кейса (вкладка Madeo Template → Colors Section)</p>
        )}
      </div>
    </section>
  );
}
