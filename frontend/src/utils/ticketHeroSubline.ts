/** Совпадает с backend/services/eventTitleNarrative.js — старый промпт AI. */
export const LEGACY_HERO_SUBLINE_SCHEDULE_HINT = 'Даты и время — в расписании ниже';

export const HERO_SUBLINE_VENUE_FALLBACK =
  'Площадка (театр, стадион, арена) — в блоке сеансов ниже.';

/**
 * Подстрочник страницы билета: убираем устаревшую отсылку к датам «в расписании»,
 * показываем площадку из офферов или нейтральный текст про место проведения.
 */
export function resolveHeroSublineForTicketPage(
  heroSubline: string | null | undefined,
  venueFromOffers: string | null | undefined,
): string | null {
  const raw = heroSubline?.trim() || '';
  if (!raw) return null;

  if (!raw.includes(LEGACY_HERO_SUBLINE_SCHEDULE_HINT)) return raw;

  const rest = raw
    .replace(LEGACY_HERO_SUBLINE_SCHEDULE_HINT, '')
    .replace(/^[\s·]+|[\s·]+$/g, '')
    .trim();
  const v = venueFromOffers?.trim() || '';
  if (v) {
    if (rest && !v.includes(rest) && !rest.includes(v)) return `${v} · ${rest}`;
    return v;
  }
  if (rest) return rest;
  return HERO_SUBLINE_VENUE_FALLBACK;
}

/** Убирает хвост « · .» и лишние разделители в подстрочнике даты. */
export function cleanHeroSublineArtifacts(line: string | null | undefined): string | null {
  if (!line?.trim()) return null;
  let t = line.trim().replace(/\s*·\s*\.\s*$/u, '').replace(/\s*·\s*$/u, '').trim();
  return t || null;
}

/**
 * Если площадку показываем отдельной строкой под заголовком — убираем её дублирование из подстрочника даты.
 */
export function heroSublineWithoutDuplicateVenue(
  subline: string | null | undefined,
  venueLine: string | null | undefined,
): string | null {
  const base = cleanHeroSublineArtifacts(subline);
  if (!base) return null;
  const v = venueLine?.trim();
  if (!v) return base;
  if (base === v) return null;
  const suffix = ` · ${v}`;
  if (base.endsWith(suffix)) {
    const cut = base.slice(0, -suffix.length).trim().replace(/\s*·\s*$/u, '').trim();
    return cut || null;
  }
  return base;
}
