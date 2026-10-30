import { hydrateRoot } from 'react-dom/client';
import { QueryClient } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { createEmotionCache } from '@/ssr/createEmotionCache';
import { PublicTicketsShell, homeRoutes } from '@/ssr/PublicTicketsShell';
import { HomePage } from '@/pages/public/HomePage';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ScrollToTop } from '@/components/common/ScrollToTop';
import { seedQueryClientFromDom } from '@/ssr/seedTicketsQueryClient';

/** Sync hydrate for `/` — HomePage is in this chunk (no second await). */
export function hydrateHomeApp(rootElement: HTMLElement) {
  const cache = createEmotionCache();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } },
  });
  seedQueryClientFromDom(queryClient);

  hydrateRoot(
    rootElement,
    <ErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ScrollToTop />
        <PublicTicketsShell
          emotionCache={cache}
          queryClient={queryClient}
          routes={homeRoutes(HomePage)}
        />
      </BrowserRouter>
    </ErrorBoundary>,
    {
      onRecoverableError: (err) => console.warn('[hydrateHomeApp] recoverable:', err),
    },
  );
}
