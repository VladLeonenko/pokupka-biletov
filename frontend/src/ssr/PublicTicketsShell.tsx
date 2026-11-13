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
 * Оболочка главной знает только `/`, оболочка билета — только `/ticket/*`.
 * Иначе `/ticket/:slug` с главной рисуется пустым (шапка и подвал).
 * Same URL: reload(). Нельзя дописывать ?_= — оно остаётся в адресной строке.
 */
function LeaveReactSsrShell() {
  const location = useLocation();
  const tried = useRef(false);
  useEffect(() => {
    if (tried.current) return;
    tried.current = true;
    const url = new URL(window.location.href);
    url.searchParams.delete('bv_full');
    url.searchParams.delete('_');
    const next = url.pathname + url.search + url.hash;
    const cur = window.location.pathname + window.location.search + window.location.hash;
    if (next === cur) {
      window.location.reload();
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
