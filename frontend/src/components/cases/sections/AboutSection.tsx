import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPublicCase } from '@/services/publicApi';
import styles from './AboutSection.module.css';

export function AboutSection() {
  const { slug } = useParams<{ slug?: string }>();
  
  const { data: caseData } = useQuery({
    queryKey: ['publicCase', slug],
    queryFn: () => getPublicCase(slug!),
    enabled: !!slug,
  });

  const about = caseData?.contentJson?.about || {};
  const title = about.title || 'О проекте';
  const description = about.description || caseData?.summary || '';
  const taskTitle = about.taskTitle || 'Задачи';
  const taskText = about.taskText || '';
  const solutionTitle = about.solutionTitle || 'Решение';
  const solutionText = about.solutionText || '';
  const image1 = about.image || '';
  const image2 = about.secondaryImage || '';

  if (!description && !taskText && !solutionText) {
    return null;
  }

  return (
    <section className={styles.about}>
      <div className={styles['about-container']}>
        <div className={styles['section-header']}>
          <div className={styles['section-line']} />
          <h2 className={styles['section-title']}>{title}</h2>
          <div className={styles['section-line-short']} />
        </div>

        {description && (
          <div className={styles['description-box']}>
            <p className={styles['description-text']}>{description}</p>
          </div>
        )}

        {(taskText || solutionText || image1 || image2) && (
          <div className={styles['content-wrapper']}>
            <div className={styles['text-content']}>
              {taskText && (
                <div className={styles.subsection}>
                  <h3 className={styles['subsection-title']}>{taskTitle}</h3>
                  <p className={styles['subsection-text']}>{taskText}</p>
                </div>
              )}
              {solutionText && (
                <div className={styles.subsection}>
                  <h3 className={styles['subsection-title']}>{solutionTitle}</h3>
                  <p className={styles['subsection-text']}>{solutionText}</p>
                </div>
              )}
            </div>

            {(image1 || image2) && (
              <div className={styles['images-grid']}>
                {image1 && (
                  <div className={styles['image-1']}>
                    <img src={image1} alt="Product" />
                  </div>
                )}
                {image2 && (
                  <div className={styles['image-2']}>
                    <img src={image2} alt="Interface" />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
