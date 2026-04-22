import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

/** Совпадает с логикой `useTicketsChrome` в App.tsx — витрина билетов (светлая тема) */
export function useTicketsChrome(): boolean {
  const location = useLocation();
  const normalizedPath = location.pathname.replace(/\/+$/, '') || '/';

  return useMemo(() => {
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
      ].includes(normalizedPath)
    )
      return true;
    if (normalizedPath.startsWith('/account')) return true;
    if (normalizedPath.startsWith('/orders/')) return true;
    if (normalizedPath.startsWith('/ticket')) return true;
    return false;
  }, [normalizedPath]);
}
