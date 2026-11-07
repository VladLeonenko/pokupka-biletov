import type { NormalizedBiletEvent } from '@/services/biletPublicApi';
import { resolveEventCoverUrl } from '@/utils/ticketsPlaceholders';
import { venueSlugFromName } from '@/utils/venueSlug';

export type VenueCardModel = {
  slug: string;
  label: string;
  count: number;
  coverUrl: string;
  address: string | null;
};

/**
 * Агрегация площадок из афиши: счётчик + обложка (постер события с картинкой).
 */
export function buildVenueCardsFromEvents(events: NormalizedBiletEvent[]): VenueCardModel[] {
  const map = new Map<
    string,
    {
      label: string;
      count: number;
      coverUrl: string | null;
      address: string | null;
      coverScore: number;
    }
  >();

  for (const ev of events) {
    const name = ev.venue?.trim();
    if (!name) continue;
    const slug = venueSlugFromName(name);
    if (!slug) continue;

    const hasRealImage = Boolean((ev.imageUrl || ev.bannerUrl || '').trim());
    const cover = resolveEventCoverUrl({
      title: ev.title,
      subtitle: ev.subtitle,
      genre: ev.genre,
      categoryLabel: ev.inferredCategoryLabel,
      imageUrl: ev.imageUrl,
      bannerUrl: ev.bannerUrl,
    });
    const score = hasRealImage ? 2 : 1;
    const addr = ev.venueAddress?.trim() || null;

    const prev = map.get(slug);
    if (!prev) {
      map.set(slug, {
        label: name,
        count: 1,
        coverUrl: cover,
        address: addr,
        coverScore: score,
      });
      continue;
    }
    prev.count += 1;
    if (name.length > prev.label.length) prev.label = name;
    if (addr && !prev.address) prev.address = addr;
    if (score > prev.coverScore) {
      prev.coverUrl = cover;
      prev.coverScore = score;
    }
  }

  return [...map.entries()]
    .map(([slug, v]) => ({
      slug,
      label: v.label,
      count: v.count,
      coverUrl: v.coverUrl || '',
      address: v.address,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'ru'));
}
