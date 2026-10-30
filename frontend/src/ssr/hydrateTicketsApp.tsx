import { REACT_SSR_TICKET_ATTR } from '@/ssr/reactSsrTickets';

/**
 * One dynamic import per kind — page module is INSIDE that chunk so hydrateRoot
 * runs synchronously after the chunk loads (avoids CLS from late second await).
 */
export function hydrateTicketsApp(rootElement: HTMLElement) {
  if (rootElement.hasAttribute(REACT_SSR_TICKET_ATTR)) {
    void import('./hydrateTicketApp').then(({ hydrateTicketApp }) => {
      hydrateTicketApp(rootElement);
    });
    return;
  }
  void import('./hydrateHomeApp').then(({ hydrateHomeApp }) => {
    hydrateHomeApp(rootElement);
  });
}
