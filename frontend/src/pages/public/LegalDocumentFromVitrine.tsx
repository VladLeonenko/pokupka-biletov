import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { fetchPublicTicketsVitrine } from '@/services/ticketsVitrineApi';
import { mergeTicketsVitrine } from '@/utils/ticketsVitrineDefaults';
import type { TicketsVitrineContent } from '@/types/ticketsVitrine';
import shell from './TicketsHelpPages.module.css';
import cms from './PrivacyPolicyPage.module.css';

type LegalFieldKey = 'privacyHtml' | 'publicOfferHtml' | 'cookiesPolicyHtml' | 'requisitesHtml';

type Props = {
  field: LegalFieldKey;
  h1: string;
  title: string;
  description: string;
  /** Подзаголовок в hero (если не задан — берётся description) */
  lead?: string;
  /** Текст, если в админке пусто */
  emptyHint: string;
  dataPage: string;
};

export function LegalDocumentFromVitrine({ field, h1, title, description, lead, emptyHint, dataPage }: Props) {
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

  const leadText = (lead ?? description).trim();

  return (
    <>
      <SeoMetaTags title={title} description={description} url={currentUrl} />
      <main className={shell.page}>
        <header className={shell.hero}>
          <div className={shell.heroInner}>
            <span className={shell.kicker}>Документы</span>
            <h1 className={shell.title}>{h1}</h1>
            <p className={shell.lead}>{leadText}</p>
          </div>
        </header>

        <div className={shell.shell}>
          <p className={shell.updated}>
            Дата публикации / обновления:{' '}
            {new Date().toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <article className={shell.card}>
            {html ? (
              <div className={cms.prose} dangerouslySetInnerHTML={{ __html: html }} />
            ) : (
              <div className={shell.emptyDoc}>
                <p>{emptyHint}</p>
              </div>
            )}
          </article>
        </div>
      </main>
    </>
  );
}
