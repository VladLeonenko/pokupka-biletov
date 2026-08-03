import { useCallback, useSyncExternalStore } from 'react';
import { ticketCheckoutHref, type NormalizedBiletEvent } from '@/services/biletPublicApi';

const KEY = 'tickets:favorites-v1';
const EMPTY: TicketFavoriteItem[] = [];

export type TicketFavoriteItem = {
  id: string;
  repertoireId?: string;
  title: string;
  href: string;
  imageUrl?: string | null;
  venue?: string | null;
  savedAt: number;
};

function parseFavorites(raw: string | null): TicketFavoriteItem[] {
  if (!raw) return EMPTY;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return EMPTY;
    const items = parsed.filter(
      (x): x is TicketFavoriteItem =>
        Boolean(x && typeof x === 'object' && typeof (x as TicketFavoriteItem).id === 'string'),
    );
    return items.length === 0 ? EMPTY : items;
  } catch {
    return EMPTY;
  }
}

function readFavorites(): TicketFavoriteItem[] {
  if (typeof window === 'undefined') return EMPTY;
  return parseFavorites(localStorage.getItem(KEY));
}

/** Стабильная ссылка для useSyncExternalStore — иначе Maximum update depth. */
let cached: TicketFavoriteItem[] = typeof window !== 'undefined' ? readFavorites() : EMPTY;
let cachedRaw: string | null =
  typeof window !== 'undefined' ? localStorage.getItem(KEY) : null;

function writeFavorites(items: TicketFavoriteItem[]) {
  const next = items.slice(0, 80);
  const json = JSON.stringify(next);
  try {
    localStorage.setItem(KEY, json);
  } catch {
    /* quota */
  }
  cached = next.length === 0 ? EMPTY : next;
  cachedRaw = json;
  window.dispatchEvent(new Event('tickets-favorites-changed'));
}

function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) {
      cachedRaw = null;
      cb();
    }
  };
  const onCustom = () => cb();
  window.addEventListener('storage', onStorage);
  window.addEventListener('tickets-favorites-changed', onCustom);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('tickets-favorites-changed', onCustom);
  };
}

function getSnapshot(): TicketFavoriteItem[] {
  if (typeof window === 'undefined') return EMPTY;
  const raw = localStorage.getItem(KEY);
  if (raw === cachedRaw) return cached;
  cachedRaw = raw;
  cached = parseFavorites(raw);
  return cached;
}

function getServerSnapshot(): TicketFavoriteItem[] {
  return EMPTY;
}

export function favoriteIdFromEvent(event: NormalizedBiletEvent): string {
  return (event.repertoireId || event.id || '').trim();
}

export function eventToFavorite(event: NormalizedBiletEvent): TicketFavoriteItem | null {
  const id = favoriteIdFromEvent(event);
  if (!id) return null;
  return {
    id,
    repertoireId: event.repertoireId,
    title: event.title,
    href: ticketCheckoutHref(event),
    imageUrl: event.imageUrl || event.bannerUrl || null,
    venue: event.venue || null,
    savedAt: Date.now(),
  };
}

export function useTicketFavorites() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const isFavorite = useCallback(
    (id: string) => items.some((x) => x.id === id),
    [items],
  );

  const toggleFavorite = useCallback((item: TicketFavoriteItem) => {
    const prev = readFavorites();
    const exists = prev.some((x) => x.id === item.id);
    const next = exists ? prev.filter((x) => x.id !== item.id) : [item, ...prev.filter((x) => x.id !== item.id)];
    writeFavorites(next);
  }, []);

  const toggleEvent = useCallback((event: NormalizedBiletEvent) => {
    const item = eventToFavorite(event);
    if (!item) return;
    toggleFavorite(item);
  }, [toggleFavorite]);

  const removeFavorite = useCallback((id: string) => {
    writeFavorites(readFavorites().filter((x) => x.id !== id));
  }, []);

  return { items, isFavorite, toggleFavorite, toggleEvent, removeFavorite };
}
