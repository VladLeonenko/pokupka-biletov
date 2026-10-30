/** React SSR + hydrateRoot allowlist — money ticket URLs. */

export const PRELOADED_TICKETS_STATE_ID = '__BV_PRELOADED_TICKETS__';
export const REACT_SSR_HOME_ATTR = 'data-react-ssr-home';
export const REACT_SSR_TICKET_ATTR = 'data-react-ssr-ticket';

export type ReactSsrKind = 'home' | 'ticket';

export function reactSsrKindFromPath(pathname: string): ReactSsrKind | null {
  const p = pathname.replace(/\/+$/, '') || '/';
  if (p === '/') return 'home';
  if (p.startsWith('/ticket/')) return 'ticket';
  return null;
}

export function isReactSsrTicketsPath(pathname: string): boolean {
  return reactSsrKindFromPath(pathname) != null;
}

export function ticketSlugFromPath(pathname: string): string {
  const m = pathname.match(/^\/ticket\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}
