import { REACT_SSR_HOME_ATTR, REACT_SSR_TICKET_ATTR } from '@/ssr/reactSsrTickets';

export function isReactSsrHydrateRoot(el: HTMLElement | null): boolean {
  if (!el) return false;
  return el.hasAttribute(REACT_SSR_HOME_ATTR) || el.hasAttribute(REACT_SSR_TICKET_ATTR);
}
