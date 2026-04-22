import { useEffect, useState } from 'react';
import { getTicketsCityId } from '@/utils/ticketsCity';

/**
 * Реагирует на смену города (localStorage / событие из другого компонента / другая вкладка).
 */
export function useTicketsCityId(): string {
  const [id, setId] = useState(() => getTicketsCityId());

  useEffect(() => {
    const sync = () => setId(getTicketsCityId());
    window.addEventListener('tickets-city-changed', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('tickets-city-changed', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return id;
}
