/** Публичные офферы GetOfferListByRepertoireId — поля с разным регистром в разных ответах. */
export type OfferRowLike = {
  Id?: string;
  EventDateTime?: string;
  Sector?: string;
  sector?: string;
  Row?: string;
  row?: string;
  SeatList?: string[];
  NominalPrice?: string;
  AgentPrice?: string;
  [key: string]: unknown;
};

function sectorText(o: OfferRowLike): string {
  return String(o.Sector ?? o.sector ?? o.SectorName ?? o.sectorName ?? '').trim();
}

function rowText(o: OfferRowLike): string {
  return String(o.Row ?? o.row ?? o.RowName ?? o.rowName ?? '').trim();
}

function priceNum(o: OfferRowLike): number {
  const p = o.AgentPrice ?? o.NominalPrice ?? o.agentPrice ?? o.nominalPrice;
  const n = Number(p);
  return Number.isFinite(n) ? n : 0;
}

export type ZoneFilterId =
  | 'all'
  | 'parter'
  | 'balcony'
  | 'beletage'
  | 'gallery'
  | 'amphitheater'
  | 'vip';

export const ZONE_OPTIONS: { id: ZoneFilterId; label: string }[] = [
  { id: 'all', label: 'Все зоны' },
  { id: 'parter', label: 'Партер' },
  { id: 'balcony', label: 'Балкон' },
  { id: 'beletage', label: 'Бельэтаж' },
  { id: 'gallery', label: 'Галёрка' },
  { id: 'amphitheater', label: 'Амфитеатр' },
  { id: 'vip', label: 'VIP / ложа' },
];

function matchesZone(o: OfferRowLike, zone: ZoneFilterId): boolean {
  if (zone === 'all') return true;
  const s = `${sectorText(o)} ${rowText(o)}`.toLowerCase();
  switch (zone) {
    case 'parter':
      return /партер|parter|stall|оркестр/i.test(s);
    case 'balcony':
      return /балкон|balcon/i.test(s);
    case 'beletage':
      return /бельэтаж|belev/i.test(s);
    case 'gallery':
      return /галер|галёр|galler/i.test(s);
    case 'amphitheater':
      return /амфитеатр|амфи|amph/i.test(s);
    case 'vip':
      return /vip|ложа|box|suite/i.test(s);
    default:
      return true;
  }
}

/** Подряд идущие номера мест (цифры из подписи места). */
export function hasAdjacentSeats(seatList: string[], n: number): boolean {
  if (n <= 1 || seatList.length < n) return false;
  const nums = seatList
    .map((s) => {
      const m = String(s).match(/\d+/g);
      return m ? parseInt(m.join(''), 10) : NaN;
    })
    .filter((x) => Number.isFinite(x));
  if (nums.length < n) return false;
  const uniq = [...new Set(nums)].sort((a, b) => a - b);
  for (let i = 0; i <= uniq.length - n; i++) {
    let ok = true;
    for (let j = 1; j < n; j++) {
      if (uniq[i + j] !== uniq[i] + j) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

/** Сектор/ряд явно помечены как проход — данные агентства часто без пометки по каждому месту. */
export function likelyPassageOffer(o: OfferRowLike): boolean {
  const blob = `${sectorText(o)} ${rowText(o)}`.toLowerCase();
  if (/проход|gangway|aisle|у прохода/i.test(blob)) return true;
  return false;
}

export type OfferFilterState = {
  zone: ZoneFilterId;
  /** [min, max] цена в рублях */
  priceRange: [number, number];
  /** 0 — любое; 2/3 — в оффере есть N подряд на ряду */
  adjacent: 0 | 2 | 3;
  hidePassage: boolean;
};

export function filterOffers(rows: OfferRowLike[], state: OfferFilterState): OfferRowLike[] {
  const [lo, hi] = state.priceRange;
  return rows.filter((o) => {
    const pr = priceNum(o);
    if (pr < lo || pr > hi) return false;
    if (!matchesZone(o, state.zone)) return false;
    if (state.hidePassage && likelyPassageOffer(o)) return false;
    const seats = Array.isArray(o.SeatList) ? o.SeatList.map(String) : [];
    if (state.adjacent === 2 && !hasAdjacentSeats(seats, 2)) return false;
    if (state.adjacent === 3 && !hasAdjacentSeats(seats, 3)) return false;
    return true;
  });
}

export function priceBounds(offers: OfferRowLike[]): { min: number; max: number } {
  let min = Infinity;
  let max = 0;
  for (const o of offers) {
    const p = priceNum(o);
    if (p > 0) {
      min = Math.min(min, p);
      max = Math.max(max, p);
    }
  }
  if (!Number.isFinite(min) || min === Infinity) return { min: 0, max: 1 };
  if (max <= min) return { min: min, max: min + 1 };
  return { min, max };
}
