import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

/** Те же маршруты, что и `useTicketsChrome` в App.tsx — шапка/тема витрины билетов. */
export function matchesTicketsChromePath(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, '') || '/';
  if (
    [
      '/',
      '/afisha',
      '/events',
      '/search',
      '/cart',
      '/wishlist',
      '/contacts',
      '/returns',
      '/faq',
      '/politic',
      '/privacy',
    ].includes(p)
  ) {
    return true;
  }
  if (p.startsWith('/account')) return true;
  if (p.startsWith('/orders/')) return true;
  if (p.startsWith('/ticket')) return true;
  return false;
}

export function useTicketsChromePath(): boolean {
  const { pathname } = useLocation();
  return useMemo(() => matchesTicketsChromePath(pathname), [pathname]);
}
