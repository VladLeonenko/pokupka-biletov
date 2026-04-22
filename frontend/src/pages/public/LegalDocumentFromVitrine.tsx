import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { fetchPublicTicketsVitrine } from '@/services/ticketsVitrineApi';
import { mergeTicketsVitrine } from '@/utils/ticketsVitrineDefaults';
import type { TicketsVitrineContent } from '@/types/ticketsVitrine';
import styles from './PrivacyPolicyPage.module.css';

type LegalFieldKey = 'privacyHtml' | 'publicOfferHtml' | 'cookiesPolicyHtml' | 'requisitesHtml';

type Props = {
  field: LegalFieldKey;
  h1: string;
  title: string;
  description: string;
  /** Текст, если в админке пусто */
  emptyHint: string;
  dataPage: string;
};

export function LegalDocumentFromVitrine({ field, h1, title, description, emptyHint, dataPage }: Props) {
  const { data: vitrineRes } = useQuery({
    queryKey: ['tickets-vitrine'],
    queryFn: fetchPublicTicketsVitrine,
    staleTime: 120_000,
  });

  const vitrine = useMemo(() => mergeTicketsVitrine(vitrineRes?.content), [vitrineRes]);
  const raw = (vitrine as TicketsVitrineContent)[field];
  const html = typeof raw === 'string' ? raw.trim() : '';

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  useEffect(() => {
    document.body.setAttribute('data-page', dataPage);
    return () => document.body.removeAttribute('data-page');
  }, [dataPage]);

  return (
    <>
      <SeoMetaTags title={title} description={description} url={currentUrl} />
      <main className={styles.main}>
        <div className={styles.inner}>
          <h1 className={styles.h1}>{h1}</h1>
          <p className={styles.meta}>
            Дата последнего обновления:{' '}
            {new Date().toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          {html ? (
            <article className={styles.prose} dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <div className={styles.fallback}>
              <p>{emptyHint}</p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
