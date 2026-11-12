import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { matchesTicketsChromePath, useTicketsChromeForced } from '@/utils/ticketsChrome';

/** Совпадает с логикой `useTicketsChrome` в App.tsx — витрина билетов (светлая тема) */
export function useTicketsChrome(): boolean {
  const { pathname } = useLocation();
  const forced = useTicketsChromeForced();
  const byPath = useMemo(() => matchesTicketsChromePath(pathname), [pathname]);
  return byPath || forced;
}
