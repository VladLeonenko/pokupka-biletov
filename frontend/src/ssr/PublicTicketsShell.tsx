import { useEffect, useRef, type ComponentType, type ReactNode } from 'react';
import { CacheProvider, type EmotionCache } from '@emotion/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from '@/auth/AuthProvider';
import { ToastProvider } from '@/components/common/ToastProvider';
import { CookieConsentProvider } from '@/components/privacy/CookieConsentProvider';
import { TicketsHeader } from '@/components/tickets/TicketsHeader';
import { TicketsFooter } from '@/components/tickets/TicketsFooter';
import { TicketCartProvider } from '@/context/TicketCartContext';
import { TicketCartStickyBar } from '@/components/tickets/TicketCartStickyBar';
import { ThemeModeProvider } from '@/theme/ThemeModeProvider';
import { isReactSsrTicketsPath } from '@/ssr/reactSsrTickets';
import { applyTicketsTheme } from '@/utils/ticketsTheme';
import '@/styles/tickets-theme.css';

type Props = {
  emotionCache: EmotionCache;
  queryClient: QueryClient;
  /** Only the page(s) needed for this SSR/hydrate kind — keep home free of TicketCheckout. */
  routes: ReactNode;
};

/**
 * Soft-nav left the hydrate shell → full document load into createRoot App.
 * Never assign the exact same href (infinite reload).
 */
function LeaveReactSsrShell() {
  const location = useLocation();
  const tried = useRef(false);
  useEffect(() => {
    if (tried.current) return;
    if (isReactSsrTicketsPath(location.pathname)) return;
    tried.current = true;
    const url = new URL(window.location.href);
    if (!url.searchParams.has('bv_full')) {
      url.searchParams.set('bv_full', '1');
    } else {
      url.searchParams.set('_', String(Date.now()));
    }
    window.location.replace(url.pathname + url.search + url.hash);
  }, [location.pathname, location.search, location.hash]);
  return null;
}

function TicketsThemeBoot() {
  useEffect(() => {
    applyTicketsTheme();
  }, []);
  return null;
}

/** Shared chrome; page routes injected per kind (home vs ticket). */
export function PublicTicketsShell({ emotionCache, queryClient, routes }: Props) {
  return (
    <CacheProvider value={emotionCache}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeModeProvider>
            <TicketCartProvider>
              <ToastProvider>
                <TicketsThemeBoot />
                <TicketsHeader />
                <Routes>
                  {routes}
                  <Route path="*" element={<LeaveReactSsrShell />} />
                </Routes>
                <TicketsFooter />
                <TicketCartStickyBar />
                <CookieConsentProvider />
              </ToastProvider>
            </TicketCartProvider>
          </ThemeModeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </CacheProvider>
  );
}

export function homeRoutes(HomePage: ComponentType) {
  return <Route path="/" element={<HomePage />} />;
}

export function ticketRoutes(TicketCheckoutPage: ComponentType) {
  return (
    <>
      <Route path="/ticket/:eventSlug" element={<TicketCheckoutPage />} />
      <Route path="/ticket/:repertoireId/:slug" element={<TicketCheckoutPage />} />
      <Route path="/ticket/:repertoireId" element={<TicketCheckoutPage />} />
    </>
  );
}
