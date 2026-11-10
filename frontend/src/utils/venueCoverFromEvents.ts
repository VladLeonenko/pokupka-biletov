import type { NormalizedBiletEvent } from '@/services/biletPublicApi';
import { resolveVenueCoverUrl } from '@/data/venueBuildingCovers';
import { venueSlugFromName } from '@/utils/venueSlug';

export type VenueCardModel = {
  slug: string;
  label: string;
  count: number;
  coverUrl: string;
  address: string | null;
};

/**
 * Агрегация площадок из афиши: счётчик + обложка здания.
 * Постеры/баннеры событий НЕ используем — иначе на карточке театра чужая афиша.
 */
export function buildVenueCardsFromEvents(events: NormalizedBiletEvent[]): VenueCardModel[] {
  const map = new Map<
    string,
    {
      label: string;
      count: number;
      address: string | null;
    }
  >();

  for (const ev of events) {
    const name = ev.venue?.trim();
    if (!name) continue;
    const slug = venueSlugFromName(name);
    if (!slug) continue;

    const addr = ev.venueAddress?.trim() || null;
    const prev = map.get(slug);
    if (!prev) {
      map.set(slug, { label: name, count: 1, address: addr });
      continue;
    }
    prev.count += 1;
    if (name.length > prev.label.length) prev.label = name;
    if (addr && !prev.address) prev.address = addr;
  }

  return [...map.entries()]
    .map(([slug, v]) => ({
      slug,
      label: v.label,
      count: v.count,
      coverUrl: resolveVenueCoverUrl(slug),
      address: v.address,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'ru'));
}
