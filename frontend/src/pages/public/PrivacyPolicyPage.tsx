import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { fetchPublicTicketsVitrine } from '@/services/ticketsVitrineApi';
import { mergeTicketsVitrine } from '@/utils/ticketsVitrineDefaults';
import styles from './PrivacyPolicyPage.module.css';

export function PrivacyPolicyPage() {
  const { data: vitrineRes } = useQuery({
    queryKey: ['tickets-vitrine'],
    queryFn: fetchPublicTicketsVitrine,
    staleTime: 120_000,
  });

  const vitrine = useMemo(() => mergeTicketsVitrine(vitrineRes?.content), [vitrineRes]);
  const html = vitrine.privacyHtml?.trim();

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <>
      <SeoMetaTags
        title="Политика конфиденциальности"
        description="Обработка персональных данных при использовании сервиса покупки билетов."
        url={currentUrl}
      />
      <main className={styles.main}>
        <div className={styles.inner}>
          <h1 className={styles.h1}>Политика конфиденциальности</h1>
          <p className={styles.meta}>
            Дата последнего обновления:{' '}
            {new Date().toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          {html ? (
            <article className={styles.prose} dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <div className={styles.fallback}>
              <p>
                Текст политики можно задать в админ-панели: раздел «Витрина билетов» → поле HTML политики
                конфиденциальности.
              </p>
              <p>
                Оператор обрабатывает персональные данные в соответствии с ФЗ-152. Используя сайт, вы соглашаетесь с
                условиями обработки данных, описанными в полной версии документа (добавьте её в админке).
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
