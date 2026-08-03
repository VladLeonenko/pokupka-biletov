/**
 * Правила схемы стадиона «Лужники» (luzhniki-football) на чекауте.
 * Серая чаша = allSeatCoordinates (luzhniki.txt ~77k).
 * Цветные точки = sellable (strict / fieldGrid / anchor).
 */

export const LUZHNIKI_FOOTBALL_STAGE_MAP_KEY = 'luzhniki-football';
export const LUZHNIKI_CONCERT_STAGE_MAP_KEY = 'luzhniki-concert';

export const SUPERKUP_NN_REPERTOIRE_ID = '6a46656d46a4d000309ed0a2';
export const SUPERKUP_NN_SLUG = 'olimpbet-superkubok-rossii';
export const SUPERKUP_NN_STAGE_MAP_KEY = 'supercup-nn-football';

/** Синхронно с backend/utils/luzhnikiFootballRepertoires.js */
const DEFAULT_LUZHNIKI_FOOTBALL_REPERTOIRE_IDS = new Set(['6a05d17b46a4d000309ecf4e']);

/** Синхронно с backend/utils/luzhnikiConcertRepertoires.js */
const DEFAULT_LUZHNIKI_CONCERT_REPERTOIRE_IDS = new Set([
  '69ac1c5246a4d000309ecd5c',
  'basta-guf',
]);

export function isSupercupNnRepertoire(repertoireId: string | null | undefined): boolean {
  const id = String(repertoireId || '').trim().toLowerCase();
  return id === SUPERKUP_NN_REPERTOIRE_ID || id === SUPERKUP_NN_SLUG;
}

export function isLuzhnikiConcertRepertoire(repertoireId: string | null | undefined): boolean {
  const id = String(repertoireId || '').trim().toLowerCase();
  if (!id) return false;
  if (DEFAULT_LUZHNIKI_CONCERT_REPERTOIRE_IDS.has(id)) return true;
  const raw = import.meta.env.VITE_GETBILET_LUZHNIKI_CONCERT_REPERTOIRE_IDS?.trim();
  if (!raw) return false;
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .includes(id);
}

export function isFootballStadiumRepertoire(repertoireId: string | null | undefined): boolean {
  return (
    isLuzhnikiFootballRepertoire(repertoireId) ||
    isLuzhnikiConcertRepertoire(repertoireId) ||
    isSupercupNnRepertoire(repertoireId)
  );
}

export function isFootballStadiumCheckoutLayout(layout: unknown): boolean {
  if (isLuzhnikiStadiumCheckoutLayout(layout)) return true;
  if (!layout || typeof layout !== 'object') return false;
  const r = layout as Record<string, unknown>;
  return r.stadiumMapKey === SUPERKUP_NN_STAGE_MAP_KEY || r.stadiumMapKey === LUZHNIKI_CONCERT_STAGE_MAP_KEY;
}

export function footballStadiumStageMapKeyForRepertoire(
  repertoireId: string | null | undefined,
): string | null {
  if (isLuzhnikiConcertRepertoire(repertoireId)) return LUZHNIKI_CONCERT_STAGE_MAP_KEY;
  if (isLuzhnikiFootballRepertoire(repertoireId)) return LUZHNIKI_FOOTBALL_STAGE_MAP_KEY;
  if (isSupercupNnRepertoire(repertoireId)) return SUPERKUP_NN_STAGE_MAP_KEY;
  return null;
}

export function isLuzhnikiFootballRepertoire(repertoireId: string | null | undefined): boolean {
  const id = String(repertoireId || '').trim().toLowerCase();
  if (!id) return false;
  if (DEFAULT_LUZHNIKI_FOOTBALL_REPERTOIRE_IDS.has(id)) return true;
  const raw = import.meta.env.VITE_GETBILET_LUZHNIKI_FOOTBALL_REPERTOIRE_IDS?.trim();
  if (!raw) return false;
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .includes(id);
}

export function isLuzhnikiStadiumCheckoutLayout(layout: unknown): boolean {
  if (!layout || typeof layout !== 'object') return false;
  const r = layout as Record<string, unknown>;
  return (
    r.stadiumMapKey === LUZHNIKI_FOOTBALL_STAGE_MAP_KEY ||
    r.stadiumMapKey === LUZHNIKI_CONCERT_STAGE_MAP_KEY ||
    r.luzhnikiStadiumCheckout === true
  );
}

/** Флаги layout_json для канонического чекаута Лужников (не отключать canvas/облако). */
export function luzhnikiStadiumCheckoutLayoutFlags(
  base: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    ...base,
    stadiumMapKey: LUZHNIKI_FOOTBALL_STAGE_MAP_KEY,
    luzhnikiStadiumCheckout: true,
    uniformHallSeatAppearance: true,
    omitClientSeatCoordinateCloud: false,
    disableStadiumCanvas: false,
    grayHallWhenNoOffers: false,
    disablePositionalSeatZip: true,
    preferExactOfferSeatMatch: true,
    /** Фон чаши — облако luzhniki.txt, не grid layout.seats (~80k). */
    hallBackgroundFromLabeledSeats: false,
  };
}

export function parseHallBackgroundFromLabeledSeats(layout: unknown): boolean {
  if (!layout || typeof layout !== 'object') return false;
  const r = layout as Record<string, unknown>;
  if (r.hallBackgroundFromLabeledSeats === false) return false;
  if (r.hallBackgroundFromLabeledSeats === true) return true;
  return false;
}

/** ~77k точек не в JSON — серая чаша из hallBackgroundRasterUrl (PNG). */
export function parseOmitClientSeatCoordinateCloud(layout: unknown): boolean {
  if (!layout || typeof layout !== 'object') return false;
  return (layout as Record<string, unknown>).omitClientSeatCoordinateCloud === true;
}

export function parsePbiletCategoryCheckout(layout: unknown): boolean {
  if (!layout || typeof layout !== 'object') return false;
  return (layout as Record<string, unknown>).pbiletCategoryCheckout === true;
}

export function parseHideSeatList(layout: unknown): boolean {
  if (!layout || typeof layout !== 'object') return false;
  return (layout as Record<string, unknown>).hideSeatList === true;
}

export function parseHallBackgroundRasterUrl(layout: unknown): string | null {
  if (!layout || typeof layout !== 'object') return null;
  const url = (layout as Record<string, unknown>).hallBackgroundRasterUrl;
  if (typeof url !== 'string' || !url.trim()) return null;
  return url.trim();
}

/** Lazy-load ~77k x/y для vector-кружков при zoom-in (рядом с PNG чаши). */
export function hallBackgroundDotsUrlFromRaster(rasterUrl: string | null | undefined): string | null {
  if (!rasterUrl?.trim()) return null;
  return rasterUrl.trim().replace(/\.png(\?.*)?$/i, '-dots.bin$1');
}
