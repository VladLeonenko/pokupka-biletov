const LS_ID = 'tickets_city_id';
const LS_LABEL = 'tickets_city_label';

function envCityId(): string {
  const v = import.meta.env.VITE_GETBILET_CITY_ID;
  return v != null && String(v).trim() !== '' ? String(v).trim() : '1';
}

/** Текущий cityId для GetBilet (localStorage → VITE → 1). */
export function getTicketsCityId(): string {
  if (typeof window === 'undefined') return envCityId();
  try {
    const s = localStorage.getItem(LS_ID);
    if (s != null && s.trim() !== '') return s.trim();
  } catch {
    /* private mode */
  }
  return envCityId();
}

/** Подпись к городу, если пользователь выбирал из списка. */
export function getTicketsCityLabel(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(LS_LABEL)?.trim() ?? '';
  } catch {
    return '';
  }
}

export function setTicketsCity(id: string, label: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_ID, id.trim());
    localStorage.setItem(LS_LABEL, label.trim());
    window.dispatchEvent(new Event('tickets-city-changed'));
  } catch {
    /* quota */
  }
}

export function resolveCityLabel(
  id: string,
  options: readonly { id: string; label: string }[],
): string {
  const hit = options.find((o) => o.id === id);
  return hit?.label ?? id;
}
