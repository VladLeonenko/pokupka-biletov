/**
 * Сортировка афиши по востребованности (Wordstat / HOT-семантика РК).
 * score ≈ пиковый count фразы «… билеты» (MSK), не клики/оплаты.
 */

export type DemandRankableEvent = {
  id?: string;
  title?: string | null;
  venue?: string | null;
  repertoireId?: string | null;
  ratingScore?: number | null;
  isPremiere?: boolean | null;
  isoDate?: string | null;
};

type DemandRule = {
  /** Пиковый Wordstat count (или оценка из ads SEED). */
  score: number;
  title: RegExp;
  venue?: RegExp;
  /** repertoireId / slug keys */
  ids?: string[];
};

/** HOT theater/ballet/musical — от семантики 2026-11 + ads 75k. */
const THEATER_DEMAND_RULES: DemandRule[] = [
  // Большой / балет
  {
    score: 3116,
    title: /мастер\s+и\s+маргарит/i,
    venue: /большо/i,
  },
  {
    score: 2422,
    title: /щелкунчик|новогодн\w*\s+балет\s+чайковского/i,
    venue: /большо/i,
  },
  {
    score: 900,
    title: /щелкунчик/i,
  },
  {
    score: 531,
    title: /евгений\s+онегин|\bонегин\b/i,
    venue: /большо/i,
  },
  {
    score: 359,
    title: /\bчайк/i,
    venue: /большо/i,
  },
  {
    score: 316,
    title: /иван\s+грозн/i,
    venue: /большо/i,
  },
  {
    score: 167,
    title: /турандот/i,
  },
  {
    score: 112,
    title: /баядерка/i,
  },
  {
    score: 90,
    title: /дочь\s+фараона/i,
  },
  {
    score: 80,
    title: /коппели/i,
  },
  {
    score: 70,
    title: /петрушка|шехеразада|жар-?птица/i,
  },
  {
    score: 53,
    title: /чиполлино/i,
  },
  {
    score: 60,
    title: /кармен/i,
    venue: /большо/i,
  },
  {
    score: 50,
    title: /риголетто/i,
  },
  {
    score: 45,
    title: /ромео/i,
    venue: /большо/i,
  },
  // МХТ / драма
  {
    score: 1470,
    title: /кабала\s+святош/i,
    ids: ['kabala-svyatosh', '686cd69c58f79d0030278b9d'],
  },
  {
    score: 196,
    title: /дядя\s+ваня/i,
    venue: /мхт|чехов/i,
  },
  {
    score: 160,
    title: /дядя\s+ваня/i,
    venue: /вахтангов/i,
  },
  {
    score: 99,
    title: /\bгамлет\b/i,
    venue: /мхт|чехов/i,
    ids: ['gamlet', '6735c3a8569a15f2087ba5ee'],
  },
  {
    score: 80,
    title: /\bвий\b/i,
    venue: /мхт|чехов/i,
  },
  {
    score: 70,
    title: /дон\s+кихот/i,
    venue: /мхт|чехов/i,
  },
  // Мюзиклы / прочее
  {
    score: 1232,
    title: /челентано/i,
  },
  {
    score: 120,
    title: /\bвасса\b/i,
    venue: /наций/i,
  },
  {
    score: 100,
    title: /поминальн\w*\s+молитв/i,
  },
  {
    score: 90,
    title: /день\s+закрытых\s+дверей/i,
  },
  // Venue soft boost — если title не попал в HOT, но площадка топовая
  {
    score: 40,
    title: /./,
    venue: /большо\w*\s+театр/i,
  },
  {
    score: 35,
    title: /./,
    venue: /мхт|чехов/i,
  },
  {
    score: 30,
    title: /./,
    venue: /вахтангов/i,
  },
  {
    score: 28,
    title: /./,
    venue: /станиславск|немирович/i,
  },
  {
    score: 25,
    title: /./,
    venue: /александрин/i,
  },
];

function eventKeys(ev: DemandRankableEvent): string[] {
  const out: string[] = [];
  for (const raw of [ev.repertoireId, ev.id]) {
    const s = String(raw || '')
      .trim()
      .toLowerCase();
    if (!s) continue;
    out.push(s);
    if (s.includes('::')) out.push(s.split('::')[0]!);
  }
  return out;
}

/** Wordstat/HOT score; 0 = нет сигнала. */
export function theaterDemandScore(ev: DemandRankableEvent): number {
  const title = String(ev.title || '');
  const venue = String(ev.venue || '');
  const keys = eventKeys(ev);
  let best = 0;
  for (const rule of THEATER_DEMAND_RULES) {
    if (rule.ids?.some((id) => keys.includes(id.toLowerCase()))) {
      best = Math.max(best, rule.score);
      continue;
    }
    if (!rule.title.test(title)) continue;
    if (rule.venue && !rule.venue.test(venue)) continue;
    best = Math.max(best, rule.score);
  }
  const rating = Number(ev.ratingScore);
  if (Number.isFinite(rating) && rating > 0) {
    best += rating * 8;
  }
  if (ev.isPremiere) best += 25;
  return best;
}

function timeMs(ev: DemandRankableEvent): number {
  const raw = ev.isoDate?.trim();
  if (!raw) return Number.MAX_SAFE_INTEGER;
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : Number.MAX_SAFE_INTEGER;
}

/**
 * Спрос ↓, внутри одинакового score — ближайшая дата.
 * Стабильно при равных: исходный индекс.
 */
export function sortEventsByTheaterDemand<T extends DemandRankableEvent>(events: T[]): T[] {
  return events
    .map((ev, idx) => ({ ev, idx, demand: theaterDemandScore(ev), t: timeMs(ev) }))
    .sort((a, b) => {
      if (b.demand !== a.demand) return b.demand - a.demand;
      if (a.t !== b.t) return a.t - b.t;
      return a.idx - b.idx;
    })
    .map((x) => x.ev);
}
