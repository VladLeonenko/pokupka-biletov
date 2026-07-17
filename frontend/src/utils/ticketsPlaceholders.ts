import { classifyEventTitle, type ClassifyContext } from '@/utils/eventTitleHeuristics';

/** Детерминированный фон-постер без внешних URL (крайний fallback). */
export function posterGradientFromId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) {
    h = (h + id.charCodeAt(i) * 17) % 360;
  }
  const h2 = (h + 48) % 360;
  return `linear-gradient(165deg, hsl(${h} 32% 22%) 0%, hsl(${h2} 28% 14%) 45%, hsl(${(h + 120) % 360} 22% 12%) 100%)`;
}

export type EventPlaceholderKey =
  | 'theater'
  | 'ballet'
  | 'concert'
  | 'comedy'
  | 'football'
  | 'sport'
  | 'kids'
  | 'default'
  | 'culture'
  | 'show'
  | 'gala';

const PLACEHOLDER_FILES: Record<EventPlaceholderKey, string> = {
  theater: '/placeholders/theater.jpg',
  ballet: '/placeholders/ballet.jpg',
  concert: '/placeholders/concert.jpg',
  comedy: '/placeholders/comedy.jpg',
  football: '/placeholders/football.jpg',
  sport: '/placeholders/sport.jpg',
  kids: '/placeholders/kids.jpg',
  default: '/placeholders/default.jpg',
  culture: '/placeholders/culture.jpg',
  show: '/placeholders/show.jpg',
  gala: '/placeholders/gala.jpg',
};

export function eventPlaceholderUrl(key: EventPlaceholderKey): string {
  return PLACEHOLDER_FILES[key] ?? PLACEHOLDER_FILES.default;
}

/** Тонкая раскладка kind/лейбла → ключ заглушки. */
export function resolveEventPlaceholderKey(
  title: string,
  ctx?: ClassifyContext & { categoryLabel?: string | null },
): EventPlaceholderKey {
  const { kind, categoryLabel: inferred } = classifyEventTitle(title, ctx);
  const label = (ctx?.categoryLabel || inferred || '').trim().toLowerCase();
  const corpus = `${title}\n${ctx?.subtitle || ''}\n${ctx?.genre || ''}\n${label}`.toLowerCase();

  if (kind === 'kids' || /детск|сказк|кукол|семейн/.test(corpus)) return 'kids';
  if (kind === 'football' || /футбол/.test(label)) return 'football';
  if (kind === 'sport') return 'sport';

  if (/стендап|stand[\s-]?up|comedy\s*club|юмор/.test(corpus)) return 'comedy';
  if (/мюзикл|шоу\b|оперетт/.test(corpus) || label === 'мюзикл') return 'show';
  if (/балет|опера\b|ballet|opera/.test(corpus) || label === 'балет' || label === 'опера') {
    return 'ballet';
  }
  if (/гала|премьер|black\s*tie|red\s*carpet/.test(corpus)) return 'gala';
  if (/музей|выставк|экскурс|галере|art\s*&?\s*culture|культур/.test(corpus)) return 'culture';
  if (kind === 'concert' || label === 'концерт') return 'concert';
  if (kind === 'theater' || label === 'театр') return 'theater';
  if (/цирк/.test(corpus)) return 'kids';

  return 'default';
}

export type EventCoverInput = {
  title?: string | null;
  subtitle?: string | null;
  genre?: string | null;
  categoryLabel?: string | null;
  imageUrl?: string | null;
  bannerUrl?: string | null;
};

/** Реальная обложка или заглушка по типу события. */
export function resolveEventCoverUrl(ev: EventCoverInput): string {
  const real = (ev.imageUrl || ev.bannerUrl || '').trim();
  if (real) return real;
  const key = resolveEventPlaceholderKey(ev.title || '', {
    subtitle: ev.subtitle || undefined,
    genre: ev.genre || undefined,
    categoryLabel: ev.categoryLabel || undefined,
  });
  return eventPlaceholderUrl(key);
}

/** Заглушка для события (без учёта imageUrl) — для onError после битой CDN-картинки. */
export function eventCategoryPlaceholderUrl(ev: EventCoverInput): string {
  return eventPlaceholderUrl(
    resolveEventPlaceholderKey(ev.title || '', {
      subtitle: ev.subtitle || undefined,
      genre: ev.genre || undefined,
      categoryLabel: ev.categoryLabel || undefined,
    }),
  );
}
