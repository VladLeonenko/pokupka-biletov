import { useEffect, useLayoutEffect, useRef, type ComponentType, type ReactNode } from 'react';
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
 * Soft-nav left the hydrate shell (home-only ↔ ticket-only) → full document load.
 * `*` means this shell has no matching route — always hard-nav.
 * Do NOT skip when `isReactSsrTicketsPath`: home shell has only `/`, so
 * `/ticket/:slug` would otherwise render blank forever (header+footer only).
 * Never assign the exact same href (infinite reload) — bump `_` if needed.
 */
function LeaveReactSsrShell() {
  const location = useLocation();
  const tried = useRef(false);
  useEffect(() => {
    if (tried.current) return;
    tried.current = true;
    const url = new URL(window.location.href);
    const moneyPath = isReactSsrTicketsPath(location.pathname);
    if (moneyPath) {
      // home↔ticket: clean URL so server SSR + correct hydrate kind
      url.searchParams.delete('bv_full');
      url.searchParams.delete('_');
    } else if (!url.searchParams.has('bv_full')) {
      url.searchParams.set('bv_full', '1');
    } else {
      url.searchParams.set('_', String(Date.now()));
    }
    const next = url.pathname + url.search + url.hash;
    const cur = window.location.pathname + window.location.search + window.location.hash;
    if (next === cur) {
      url.searchParams.set('_', String(Date.now()));
      window.location.replace(url.pathname + url.search + url.hash);
      return;
    }
    window.location.replace(next);
  }, [location.pathname, location.search, location.hash]);
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        minHeight: '40vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#666',
        fontFamily: 'system-ui, sans-serif',
        fontSize: 14,
      }}
    >
      Загрузка…
    </div>
  );
}

function TicketsThemeBoot() {
  /** Sync до paint — иначе Raleway из global.css переживает первый кадр. */
  if (typeof document !== 'undefined') {
    applyTicketsTheme();
  }
  useLayoutEffect(() => {
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
