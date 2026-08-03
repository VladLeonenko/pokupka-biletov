import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { ticketCheckoutHref, type NormalizedBiletEvent } from '@/services/biletPublicApi';

const KEY = 'tickets:favorites-v1';

export type TicketFavoriteItem = {
  id: string;
  repertoireId?: string;
  title: string;
  href: string;
  imageUrl?: string | null;
  venue?: string | null;
  savedAt: number;
};

function readFavorites(): TicketFavoriteItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is TicketFavoriteItem =>
        Boolean(x && typeof x === 'object' && typeof (x as TicketFavoriteItem).id === 'string'),
    );
  } catch {
    return [];
  }
}

function writeFavorites(items: TicketFavoriteItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items.slice(0, 80)));
  } catch {
    /* quota */
  }
  window.dispatchEvent(new Event('tickets-favorites-changed'));
}

let cached = typeof window !== 'undefined' ? readFavorites() : [];

function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) cb();
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
  cached = readFavorites();
  return cached;
}

function getServerSnapshot(): TicketFavoriteItem[] {
  return [];
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
  const [, bump] = useState(0);

  useEffect(() => {
    cached = readFavorites();
    bump((n) => n + 1);
  }, []);

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
