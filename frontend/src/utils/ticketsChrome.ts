import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';

/** Те же маршруты, что и `useTicketsChrome` в App.tsx — шапка/тема витрины билетов. */
export function matchesTicketsChromePath(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, '') || '/';
  if (
    [
      '/',
      '/afisha',
      '/events',
      '/events/map',
      '/search',
      '/cart',
      '/wishlist',
      '/contacts',
      '/returns',
      '/faq',
      '/politic',
      '/privacy',
      '/offer',
      '/cookies',
      '/requisites',
      '/404',
      '/case/bilet-vsem',
    ].includes(p)
  ) {
    return true;
  }
  if (p.startsWith('/account')) return true;
  if (p.startsWith('/orders/')) return true;
  if (p.startsWith('/ticket')) return true;
  if (p.startsWith('/case/')) return true;
  // /events, /events/map, /events/venues, /events/venue/:slug, /events/city|genre/:slug
  if (p === '/events' || p.startsWith('/events/')) return true;
  return false;
}

/** Страницы вне списка путей (404 на произвольном URL) могут сами включить оформление витрины. */
let forcedCount = 0;
const forcedListeners = new Set<() => void>();

function emitForced() {
  forcedListeners.forEach((l) => l());
}

export function useForceTicketsChrome(): void {
  useEffect(() => {
    forcedCount += 1;
    emitForced();
    return () => {
      forcedCount -= 1;
      emitForced();
    };
  }, []);
}

export function useTicketsChromeForced(): boolean {
  return useSyncExternalStore(
    (cb) => {
      forcedListeners.add(cb);
      return () => forcedListeners.delete(cb);
    },
    () => forcedCount > 0,
    () => false
  );
}

export function useTicketsChromePath(): boolean {
  const { pathname } = useLocation();
  return useMemo(() => matchesTicketsChromePath(pathname), [pathname]);
}
