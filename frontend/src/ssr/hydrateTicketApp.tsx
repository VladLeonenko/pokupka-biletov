import { hydrateRoot } from 'react-dom/client';
import { QueryClient } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { createEmotionCache } from '@/ssr/createEmotionCache';
import { PublicTicketsShell, ticketRoutes } from '@/ssr/PublicTicketsShell';
import { TicketCheckoutPage } from '@/pages/public/TicketCheckoutPage';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ScrollToTop } from '@/components/common/ScrollToTop';
import { seedQueryClientFromDom } from '@/ssr/seedTicketsQueryClient';

/** Sync hydrate for `/ticket/*` — checkout page in this chunk (no second await). */
export function hydrateTicketApp(rootElement: HTMLElement) {
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
          routes={ticketRoutes(TicketCheckoutPage)}
        />
      </BrowserRouter>
    </ErrorBoundary>,
    {
      onRecoverableError: (err) => console.warn('[hydrateTicketApp] recoverable:', err),
    },
  );
}
