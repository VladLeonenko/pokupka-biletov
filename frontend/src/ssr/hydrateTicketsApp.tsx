import { hydrateRoot } from 'react-dom/client';
import { QueryClient } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { createEmotionCache } from '@/ssr/createEmotionCache';
import { PublicTicketsShell } from '@/ssr/PublicTicketsShell';
import { PRELOADED_TICKETS_STATE_ID } from '@/ssr/reactSsrTickets';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ScrollToTop } from '@/components/common/ScrollToTop';

type Preloaded = {
  kind: 'home' | 'ticket';
  querySeed?: {
    resolveSlug?: { slug: string; data: unknown };
    repertoirePage?: { repertoireId: string; data: unknown };
    home?: { cityId: string; data: unknown };
    vitrine?: unknown;
  } | null;
};

function readPreloaded(): Preloaded | null {
  const el = document.getElementById(PRELOADED_TICKETS_STATE_ID);
  if (!el?.textContent) return null;
  try {
    return JSON.parse(el.textContent) as Preloaded;
  } catch {
    return null;
  }
}

function seedQueryClient(qc: QueryClient, seed: Preloaded['querySeed']) {
  if (!seed) return;
  if (seed.resolveSlug?.slug) {
    qc.setQueryData(['bilet-resolve-slug', seed.resolveSlug.slug], seed.resolveSlug.data);
  }
  if (seed.repertoirePage?.repertoireId) {
    qc.setQueryData(
      ['bilet-repertoire-page', seed.repertoirePage.repertoireId, 'markup-v2'],
      seed.repertoirePage.data,
    );
  }
  if (seed.home) {
    qc.setQueryData(['bilet-home-public', seed.home.cityId], seed.home.data);
  }
  if (seed.vitrine != null) {
    qc.setQueryData(['tickets-vitrine'], seed.vitrine);
  }
}

/** hydrateRoot path for React-SSR ticket/home — must mirror server PublicTicketsShell. */
export function hydrateTicketsApp(rootElement: HTMLElement) {
  const preloaded = readPreloaded();
  const cache = createEmotionCache();
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60_000, refetchOnWindowFocus: false },
    },
  });
  seedQueryClient(queryClient, preloaded?.querySeed);

  hydrateRoot(
    rootElement,
    <ErrorBoundary>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <ScrollToTop />
        <PublicTicketsShell emotionCache={cache} queryClient={queryClient} />
      </BrowserRouter>
    </ErrorBoundary>,
    {
      onRecoverableError: (err) => {
        console.warn('[hydrateTicketsApp] recoverable:', err);
      },
    },
  );
}
