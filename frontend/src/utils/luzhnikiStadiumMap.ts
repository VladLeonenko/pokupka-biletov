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

/** GetBilet StageId Лукойл Арена. Карта в БД лежит под этим id, не под stadiumMapKey. */
export const LUKOIL_ARENA_STAGE_EXTERNAL_ID = '66f16a8c09a369003081a02f';
export const LUKOIL_ARENA_STAGE_MAP_KEY = 'lukoil-arena';

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

export function isLukoilArenaStageId(stageId: string | null | undefined): boolean {
  const id = String(stageId || '').trim().toLowerCase();
  return Boolean(id && id === LUKOIL_ARENA_STAGE_EXTERNAL_ID);
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
  return (
    r.stadiumMapKey === SUPERKUP_NN_STAGE_MAP_KEY ||
    r.stadiumMapKey === LUZHNIKI_CONCERT_STAGE_MAP_KEY ||
    r.stadiumMapKey === LUKOIL_ARENA_STAGE_MAP_KEY
  );
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

/** Явно отключить dots.bin (редко; концерт обычно маскирует поле, а не выключает чашу). */
export function parseDisableHallBackgroundDots(layout: unknown): boolean {
  if (!layout || typeof layout !== 'object') return false;
  return (layout as Record<string, unknown>).disableHallBackgroundDots === true;
}

/** Концерт: не рисовать серые точки чаши на сцене/танцполе/фан-зоне. */
export function parseMaskFieldBackgroundDots(layout: unknown): boolean {
  if (!layout || typeof layout !== 'object') return false;
  return (layout as Record<string, unknown>).maskFieldBackgroundDots === true;
}

export type HallMapFieldMask = {
  id: string;
  path?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  label?: string;
};

export function parseHallMapFieldMasks(layout: unknown): HallMapFieldMask[] {
  if (!layout || typeof layout !== 'object') return [];
  const raw = (layout as Record<string, unknown>).hallMapFieldMasks;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, i) => {
      if (!item || typeof item !== 'object') return null;
      const r = item as Record<string, unknown>;
      const id = String(r.id ?? r.label ?? `mask-${i}`).trim() || `mask-${i}`;
      const path = typeof r.path === 'string' && r.path.trim() ? r.path.trim() : undefined;
      const x = Number(r.x);
      const y = Number(r.y);
      const w = Number(r.w);
      const h = Number(r.h);
      const rectOk =
        Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0;
      if (!path && !rectOk) return null;
      return {
        id,
        path,
        ...(rectOk ? { x, y, w, h } : null),
        label: typeof r.label === 'string' ? r.label : undefined,
      };
    })
    .filter((x): x is HallMapFieldMask => Boolean(x));
}

export function isLuzhnikiConcertFieldZoneLabel(label: string): boolean {
  const n = String(label || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
  return n === 'танцпол' || n === 'фан-зона' || n === 'fan-zone' || /танц|фан|fan-?zone/i.test(label);
}

/** Секторы концерта Лужников без точек: qty-бронь по зоне (layout.concertZoneOnlySectors). */
export function parseConcertZoneOnlySectors(layout: unknown): string[] {
  if (!layout || typeof layout !== 'object') return [];
  const raw = (layout as Record<string, unknown>).concertZoneOnlySectors;
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => String(x ?? '').trim()).filter(Boolean);
}

export function isConcertZoneOnlySectorLabel(label: string, layout: unknown): boolean {
  if (!isLuzhnikiConcertFieldZoneLabel(label)) return false;
  const zones = parseConcertZoneOnlySectors(layout);
  if (zones.length === 0) return false;
  const needle = String(label || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
  return zones.some((z) => {
    const n = String(z || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-');
    return n === needle || n.includes(needle) || needle.includes(n);
  });
}

/** Театр: показывать места на обзоре (scale≈fit), не только после zoom. */
export function parseShowSeatsAtOverview(layout: unknown): boolean {
  if (!layout || typeof layout !== 'object') return false;
  return (layout as Record<string, unknown>).showSeatsAtOverview === true;
}

/** Обзор как Portalbilet: цветные сектора, места только после зума. Не qty-чекаут. */
export function parsePortalBiletSectorOverview(layout: unknown): boolean {
  if (!layout || typeof layout !== 'object') return false;
  return (layout as Record<string, unknown>).portalBiletSectorOverview === true;
}
