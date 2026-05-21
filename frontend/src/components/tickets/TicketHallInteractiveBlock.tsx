import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, IconButton, Paper, Popper, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import {
  buildSvgNativePlacements,
  parseLayoutSeatPositions,
  parseLayoutMode,
  parsePreferLayoutSeatPositions,
  processHallSvgForNative,
  seatMapKey,
  type OfferLike,
  type SvgNativePlacement,
  type SvgNativeSeat,
} from '../../utils/svgNativeSeatLayout';
import styles from './TicketHallInteractiveBlock.module.css';

/** Совпадает с фоновой заливкой точек чаши на canvas (dense rects). */
const CANVAS_HALL_SEAT_DOT_FILL = 'rgba(148, 163, 184, 0.72)';
/** Маркер без оффера / превью схемы в DOM (slate ≈ rgb(148,163,184)); офферы — colorForSeat. */
const DOM_UNIFORM_SEAT_ACCENT = '#94a3b8';
/** Подложка при zoom — без grayscale, поле остаётся зелёным. */
const CANVAS_ZOOMED_BACKDROP_FILTER = 'saturate(1.1) contrast(1.03) brightness(1.02)';

/** Радиус sellable-точки на canvas (px viewport), как в draw loop: w = layerWidth * zoom. */
function stadiumSeatCanvasRadiusPx(
  zoom: number,
  layerWidth: number,
  svgViewBoxWidth: number,
  active: boolean,
  mapZoomed: boolean,
): number {
  const w = layerWidth * zoom;
  let r = active ? 5 : Math.max(2.6, Math.min(6, (w / Math.max(1, svgViewBoxWidth)) * 10));
  /** На обзоре 100% (fit) — sellable в 2× меньше, при zoom-in — полный размер. */
  if (!mapZoomed) {
    r *= 0.5;
    r = active ? Math.max(2.5, r) : Math.max(1.3, r);
  }
  return r;
}

/** DOM-хитбокс в px слоя: после transform(zoom) в viewport = 2*r. */
function stadiumSeatHitboxLayerPx(
  zoom: number,
  layerWidth: number,
  svgViewBoxWidth: number,
  active: boolean,
  mapZoomed: boolean,
): number {
  return sellablePickHitRadiusLayerPx(zoom, layerWidth, svgViewBoxWidth, mapZoomed, active);
}

/** Радиус pick/hover в координатах слоя (= видимая точка на canvas, min ~12px на экране). */
function sellablePickHitRadiusLayerPx(
  zoom: number,
  layerWidth: number,
  svgViewBoxWidth: number,
  mapZoomed: boolean,
  active = false,
): number {
  const r = stadiumSeatCanvasRadiusPx(zoom, layerWidth, svgViewBoxWidth, active, mapZoomed);
  const z = Math.max(0.001, zoom);
  return Math.max(12 / z, (2 * r + 4) / z);
}

type LayerScreenBox = {
  left: number;
  top: number;
  width: number;
  height: number;
  screenW: number;
  screenH: number;
};

type PlacementPickCtx = {
  viewport: HTMLDivElement;
  getLayerScreenBox: () => LayerScreenBox | null;
  zoom: number;
  placements: SvgNativePlacement[];
  mapZoomed: boolean;
};

/** Hit-test sellable: координаты через getBoundingClientRect слоя (как canvas), не inner+offset. */
function findNearestSellablePlacement(
  clientX: number,
  clientY: number,
  ctx: PlacementPickCtx,
): SvgNativePlacement | null {
  const box = ctx.getLayerScreenBox();
  if (!box || box.screenW < 1 || box.screenH < 1) return null;
  const vpRect = ctx.viewport.getBoundingClientRect();
  const layerX = ((clientX - vpRect.left - box.left) / box.screenW) * box.width;
  const layerY = ((clientY - vpRect.top - box.top) / box.screenH) * box.height;
  const z = Math.max(0.001, ctx.zoom);
  const hitRLayer = Math.max(
    22 / z,
    sellablePickHitRadiusLayerPx(ctx.zoom, box.width, box.width, ctx.mapZoomed),
  );
  let best: SvgNativePlacement | null = null;
  let bestD = Infinity;
  for (const p of ctx.placements) {
    if (p.previewOnly || !p.offerId) continue;
    const sx = (p.xPct / 100) * box.width;
    const sy = (p.yPct / 100) * box.height;
    const dist = Math.hypot(layerX - sx, layerY - sy);
    if (dist < hitRLayer && dist < bestD) {
      bestD = dist;
      best = p;
    }
  }
  return best;
}

export type HallOfferRow = {
  Id?: string;
  Sector?: string;
  Row?: string;
  SeatList?: string[];
  NominalPrice?: string;
  AgentPrice?: string;
};

type OverlayRect = { x: number; y: number; w: number; h: number };
type HoverSeatInfo = {
  offerId: string;
  sector: string;
  row: string;
  seat: string;
  priceKey: string;
};
export type HallSelectedSeat = HoverSeatInfo & { key: string };
type Point = { x: number; y: number };
type BBox = { minX: number; minY: number; maxX: number; maxY: number };
type SectorMeta = {
  id: string;
  label: string;
  path: string;
  availableSeats?: number;
  minPrice?: number | null;
  maxPrice?: number | null;
};
type SectorSummary = {
  meta: SectorMeta;
  offers: HallOfferRow[];
  seatCount: number;
  minPrice: number | null;
  maxPrice: number | null;
};
type BackgroundSeatCoordinate = {
  xPct: number;
  yPct: number;
};

function parseOverlayRect(layout: unknown): OverlayRect {
  if (!layout || typeof layout !== 'object') {
    return { x: 0.06, y: 0.14, w: 0.88, h: 0.72 };
  }
  const o = layout as Record<string, unknown>;
  const r = o.overlayRect;
  if (r && typeof r === 'object' && r !== null) {
    const b = r as Record<string, unknown>;
    const x = Number(b.x);
    const y = Number(b.y);
    const w = Number(b.w);
    const h = Number(b.h);
    if ([x, y, w, h].every((n) => Number.isFinite(n) && n >= 0 && n <= 1)) {
      return { x, y, w, h };
    }
  }
  return { x: 0.06, y: 0.14, w: 0.88, h: 0.72 };
}

function shouldShowUnavailableSeats(layout: unknown): boolean {
  if (!layout || typeof layout !== 'object') return true;
  return (layout as Record<string, unknown>).showUnavailableSeats !== false;
}

function parseBackgroundSeatCoordinates(layout: unknown): BackgroundSeatCoordinate[] {
  if (!layout || typeof layout !== 'object') return [];
  const record = layout as Record<string, unknown>;
  const raw = record.allSeatCoordinates ?? record.backgroundSeats ?? record.coordinates;
  if (Array.isArray(raw) && raw.length > 0) {
    const out: BackgroundSeatCoordinate[] = [];
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue;
      const seat = item as Record<string, unknown>;
      const x = Number(seat.xPct ?? seat.x_percent ?? seat.xPercent ?? seat.left ?? seat.x);
      const y = Number(seat.yPct ?? seat.y_percent ?? seat.yPercent ?? seat.top ?? seat.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      const xPct = x >= 0 && x <= 1 ? x * 100 : x;
      const yPct = y >= 0 && y <= 1 ? y * 100 : y;
      if (xPct < 0 || xPct > 100 || yPct < 0 || yPct > 100) continue;
      out.push({ xPct, yPct });
    }
    return out;
  }
  /** Fallback: все места из seats / seatPositions — без дублирования allSeatCoordinates в JSON. */
  const seatRows = record.seats ?? record.seatPositions;
  if (!Array.isArray(seatRows)) return [];
  const out: BackgroundSeatCoordinate[] = [];
  for (const item of seatRows) {
    if (!item || typeof item !== 'object') continue;
    const seat = item as Record<string, unknown>;
    const x = Number(seat.xPct ?? seat.x_percent ?? seat.xPercent ?? seat.left ?? seat.x);
    const y = Number(seat.yPct ?? seat.y_percent ?? seat.yPercent ?? seat.top ?? seat.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const xPct = x >= 0 && x <= 1 ? x * 100 : x;
    const yPct = y >= 0 && y <= 1 ? y * 100 : y;
    if (xPct < 0 || xPct > 100 || yPct < 0 || yPct > 100) continue;
    out.push({ xPct, yPct });
  }
  return out;
}

function parseSeatSelectionDisabled(layout: unknown): boolean {
  if (!layout || typeof layout !== 'object') return false;
  return (layout as Record<string, unknown>).seatSelectionDisabled === true;
}

/** Места из офферов выглядят как остальная чаша (без цвета цены поверх фона). */
function parseUniformHallSeatAppearance(layout: unknown): boolean {
  if (!layout || typeof layout !== 'object') return false;
  return (layout as Record<string, unknown>).uniformHallSeatAppearance === true;
}

/** Пока нет офферов GetBilet — отрисовать все места из layout_json серым (ориентир). */
function parseGrayHallWhenNoOffers(
  layout: unknown,
  seatSelectionDisabled: boolean,
  hasLiveOffers: boolean,
): boolean {
  if (hasLiveOffers) return false;
  if (!layout || typeof layout !== 'object') return seatSelectionDisabled;
  const r = layout as Record<string, unknown>;
  if (r.grayHallWhenNoOffers === false) return false;
  if (r.grayHallWhenNoOffers === true) return true;
  return seatSelectionDisabled;
}

function parseSectorMode(layout: unknown): { enabled: boolean; sectors: SectorMeta[] } {
  if (!layout || typeof layout !== 'object') return { enabled: false, sectors: [] };
  const raw = (layout as Record<string, unknown>).sectorMode;
  if (!raw || typeof raw !== 'object') return { enabled: false, sectors: [] };
  const record = raw as Record<string, unknown>;
  const sectors = Array.isArray(record.sectors)
    ? record.sectors
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const s = item as Record<string, unknown>;
          const id = String(s.id ?? '').trim();
          const label = String(s.label ?? '').trim();
          const path = String(s.path ?? '').trim();
          if (!id || !label || !path) return null;
          const minPrice = Number(s.minPrice);
          const maxPrice = Number(s.maxPrice);
          return {
            id,
            label,
            path,
            availableSeats: Number(s.availableSeats) || 0,
            minPrice: Number.isFinite(minPrice) ? minPrice : null,
            maxPrice: Number.isFinite(maxPrice) ? maxPrice : null,
          };
        })
        .filter(Boolean) as SectorMeta[]
    : [];
  return { enabled: record.enabled === true && sectors.length > 0, sectors };
}

import {
  HALL_MAP_DELEGATED_HIT_MIN,
} from '@/utils/ticketHallMapInteraction';
import {
  parseHallBackgroundRasterUrl,
  parseOmitClientSeatCoordinateCloud,
} from '@/utils/luzhnikiStadiumMap';
import {
  buildLabeledSeatIndex,
  labeledSeatLookupKeys,
  lookupLabeledSeat,
} from '@/utils/hallSeatSeatLookup';
import {
  normalizeRowLabel,
  normalizeSeatToken,
  normalizeSectorLabel,
  sectorNormsMatch,
} from '@/utils/ticketHallSectorNormalize';

function normalizeSimpleToken(value: unknown): string {
  return normalizeSeatToken(value);
}

function selectionSeatKey(offerId: unknown, row: unknown, seat: unknown): string {
  return `${String(offerId ?? '')}|${normalizeRowLabel(row)}|${normalizeSimpleToken(seat)}`;
}

/** Все места из схемы (pbilet координаты) без продажи — серые точки. */
function buildGrayHallPreviewPlacements(nativeSeats: SvgNativeSeat[]): SvgNativePlacement[] {
  const seen = new Set<string>();
  const out: SvgNativePlacement[] = [];
  for (const svgSeat of nativeSeats) {
    const svgKey = seatMapKey(svgSeat.sector, svgSeat.row, svgSeat.seat);
    if (seen.has(svgKey)) continue;
    seen.add(svgKey);
    out.push({
      svgKey,
      key: `preview-${svgKey}`,
      offerId: '',
      sectorLabel: String(svgSeat.sector ?? ''),
      seat: String(svgSeat.seat ?? ''),
      rowLabel: String(svgSeat.row ?? ''),
      available: [],
      xPct: svgSeat.xPct,
      yPct: svgSeat.yPct,
      title: `${svgSeat.sector}, ${svgSeat.row} ряд, место ${svgSeat.seat} — ориентир (продажа через сайт позже)`,
      priceKey: '0',
      previewOnly: true,
    });
  }
  return out;
}

/** Серые точки для мест из схемы, для которых ещё нет placement (частичные офферы GetBilet). */
function mergeGrayHallUnmatchedPlacements(
  placements: SvgNativePlacement[],
  nativeSeats: SvgNativeSeat[],
): SvgNativePlacement[] {
  const keys = new Set(placements.map((p) => p.svgKey));
  const next = [...placements];
  for (const extra of buildGrayHallPreviewPlacements(nativeSeats)) {
    if (!keys.has(extra.svgKey)) {
      next.push(extra);
      keys.add(extra.svgKey);
    }
  }
  return next;
}

function parseSvgViewBox(svg: string): { value: string; width: number; height: number } {
  const viewBox = svg.match(/\bviewBox=["']([^"']+)["']/i)?.[1];
  if (viewBox) {
    const parts = viewBox.trim().split(/[\s,]+/).map(Number);
    if (parts.length >= 4 && parts.every(Number.isFinite) && parts[2] > 0 && parts[3] > 0) {
      return { value: viewBox, width: parts[2], height: parts[3] };
    }
  }
  const width = Number(svg.match(/\bwidth=["']([^"']+)["']/i)?.[1]);
  const height = Number(svg.match(/\bheight=["']([^"']+)["']/i)?.[1]);
  if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
    return { value: `0 0 ${width} ${height}`, width, height };
  }
  return { value: '0 0 100 100', width: 100, height: 100 };
}

function pathBBox(path: string): BBox | null {
  const nums = path.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)?.map(Number) ?? [];
  if (nums.length < 2) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = nums[i];
    const y = nums[i + 1];
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null;
  }
  return { minX, minY, maxX, maxY };
}

function sortOffersForGrid(rows: HallOfferRow[]): HallOfferRow[] {
  return [...rows].sort((a, b) => {
    const sa = String(a.Sector ?? '');
    const sb = String(b.Sector ?? '');
    if (sa !== sb) return sa.localeCompare(sb, 'ru');
    return String(a.Row ?? '').localeCompare(String(b.Row ?? ''), 'ru', { numeric: true });
  });
}

function formatRub(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return `${value.toLocaleString('ru-RU')} ₽`;
}

function formatSelectedPlaces(seats: string[], row: unknown): string {
  const rowLabel = String(row ?? '').trim();
  const rowText = rowLabel ? `, ${rowLabel} ряд` : '';
  if (seats.length === 1) {
    return `Выбрано: ${seats[0]} место${rowText}`;
  }
  return `Выбрано: места ${seats.join(', ')}${rowText}`;
}

function formatSelectedPlacesDetailed(details: HallSelectedSeat[], fallbackSeats: string[], fallbackRow: unknown): string {
  if (details.length === 0) return formatSelectedPlaces(fallbackSeats, fallbackRow);
  if (details.length === 1) return formatSelectedPlaces([details[0].seat], details[0].row);
  const rows = new Set(details.map((d) => d.row).filter(Boolean));
  if (rows.size === 1) return formatSelectedPlaces(details.map((d) => d.seat), details[0].row);
  return `Выбрано: ${details.map((d) => `${d.seat} место${d.row ? `, ${d.row} ряд` : ''}`).join('; ')}`;
}

function pointDistance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pointMiddle(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

type BowlCacheEntry = {
  canvas: HTMLCanvasElement;
  layerW: number;
  layerH: number;
  key: string;
};

/** Серая чаша в координатах слоя — один раз в offscreen, дальше blit через drawImage. */
function buildBowlCacheCanvas(
  bg: BackgroundSeatCoordinate[],
  layerW: number,
  layerH: number,
  svgViewBoxWidth: number,
): HTMLCanvasElement | null {
  if (bg.length === 0 || layerW < 8 || layerH < 8) return null;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(layerW));
  canvas.height = Math.max(1, Math.round(layerH));
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = CANVAS_HALL_SEAT_DOT_FILL;
  const scalePx = layerW / Math.max(1, svgViewBoxWidth);
  const useRects = bg.length >= 2500;
  if (useRects) {
    const dense = bg.length >= 8000;
    const r = dense
      ? Math.max(0.5, Math.min(1.75, scalePx * 3.6))
      : Math.max(0.85, Math.min(2.6, scalePx * 5.5));
    ctx.beginPath();
    for (const seat of bg) {
      const sx = (seat.xPct / 100) * layerW;
      const sy = (seat.yPct / 100) * layerH;
      ctx.rect(sx - r * 0.5, sy - r * 0.5, r, r);
    }
    ctx.fill();
  } else {
    const r = Math.max(1.15, Math.min(3.2, scalePx * 7));
    ctx.beginPath();
    for (const seat of bg) {
      const sx = (seat.xPct / 100) * layerW;
      const sy = (seat.yPct / 100) * layerH;
      ctx.moveTo(sx + r, sy);
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
    }
    ctx.fill();
  }
  return canvas;
}

type Props = {
  hallSvgHtml: string;
  layoutJson: unknown;
  offers: HallOfferRow[];
  getPriceKey: (o: HallOfferRow) => string;
  colorForSeat: (priceKey: string) => string;
  activeOfferId: string | null;
  selectedSeats: string[];
  onToggleSeat: (offerId: string, seat: string, available: string[]) => void;
  /** Оффер, соответствующий activeOfferId — для карточки на схеме */
  selectedOffer?: HallOfferRow | null;
  onReserveFromMap?: () => void;
  onClearSelection?: () => void;
  onSelectionChange?: (details: HallSelectedSeat[]) => void;
  reservePending?: boolean;
  /** В модальном окне — другие отступы и высота под Dialog */
  variant?: 'page' | 'dialog';
  /** «К списку мест»: закрыть схему и прокрутить к блоку фильтров */
  onNavigateToList?: () => void;
  /** Глобальная плашка корзины вместо встроенной selectionBar */
  hideSelectionBar?: boolean;
  /** Нормализованный сектор из фильтра списка (a101) — фокус карты */
  focusSectorNorm?: string | null;
};

/**
 * Слой кликабельных мест поверх статичной SVG/PNG-схемы.
 * Режимы: (1) SVG с circle — координаты и подрезка viewBox из {@link processHallSvgForNative} (приоритет);
 * (2) только layout_json.seats / seatPositions — если в SVG нет кругов мест или явно preferLayoutSeatPositions;
 * (3) условная сетка внутри overlayRect (layout_json.overlayRect или дефолт).
 * layout_json.layoutMode: auto | grid | svgNative (auto: нативный SVG, если найдены круги).
 */
export function TicketHallInteractiveBlock({
  hallSvgHtml,
  layoutJson,
  offers,
  getPriceKey,
  colorForSeat,
  activeOfferId,
  selectedSeats,
  onToggleSeat,
  selectedOffer = null,
  onReserveFromMap,
  onClearSelection,
  onSelectionChange,
  reservePending = false,
  variant = 'page',
  hideSelectionBar = false,
  focusSectorNorm = null,
}: Props) {
  const overlay = useMemo(() => parseOverlayRect(layoutJson), [layoutJson]);
  const sorted = useMemo(() => sortOffersForGrid(offers), [offers]);
  const maxSeatsInAnyRow = useMemo(
    () => Math.max(1, ...sorted.map((o) => (Array.isArray(o.SeatList) ? o.SeatList.length : 0))),
    [sorted],
  );
  const numRows = Math.max(1, sorted.length);

  const layoutMode = useMemo(() => parseLayoutMode(layoutJson), [layoutJson]);
  const showUnavailableSeats = useMemo(() => shouldShowUnavailableSeats(layoutJson), [layoutJson]);
  const sectorMode = useMemo(() => parseSectorMode(layoutJson), [layoutJson]);
  const seatSelectionDisabled = useMemo(() => parseSeatSelectionDisabled(layoutJson), [layoutJson]);
  const hasLiveOffers = offers.length > 0;
  const grayHallWhenNoOffers = useMemo(
    () => parseGrayHallWhenNoOffers(layoutJson, seatSelectionDisabled, hasLiveOffers),
    [layoutJson, seatSelectionDisabled, hasLiveOffers],
  );
  const uniformHallSeatAppearance = useMemo(
    () => parseUniformHallSeatAppearance(layoutJson),
    [layoutJson],
  );
  const svgViewBox = useMemo(() => parseSvgViewBox(hallSvgHtml), [hallSvgHtml]);
  const layoutSeats = useMemo(() => parseLayoutSeatPositions(layoutJson), [layoutJson]);
  const omitClientSeatCoordinateCloud = useMemo(
    () => parseOmitClientSeatCoordinateCloud(layoutJson),
    [layoutJson],
  );
  const hallBackgroundRasterUrl = useMemo(
    () => parseHallBackgroundRasterUrl(layoutJson),
    [layoutJson],
  );
  const backgroundSeatCoordinates = useMemo(() => {
    if (omitClientSeatCoordinateCloud) return [];
    return parseBackgroundSeatCoordinates(layoutJson);
  }, [layoutJson, omitClientSeatCoordinateCloud]);
  const nativeProcessed = useMemo(() => processHallSvgForNative(hallSvgHtml), [hallSvgHtml]);
  const preferLayoutSeatPositions = useMemo(
    () => parsePreferLayoutSeatPositions(layoutJson),
    [layoutJson],
  );
  const nativeSeats = useMemo<SvgNativeSeat[]>(() => {
    if (preferLayoutSeatPositions && layoutSeats.length >= 2) return layoutSeats;
    const fromSvg = nativeProcessed?.seats ?? [];
    if (fromSvg.length >= 2) return fromSvg;
    if (layoutSeats.length >= 2) return layoutSeats;
    return [];
  }, [preferLayoutSeatPositions, layoutSeats, nativeProcessed]);
  /** Подрезанный SVG из processHallSvgForNative имеет тот же вьюбокс, что и xPct/yPct из парсинга circle. */
  const svgGeometryFromParsedCircles = useMemo(() => {
    if (sectorMode.enabled) return false;
    if (preferLayoutSeatPositions) return false;
    return (nativeProcessed?.seats?.length ?? 0) >= 2;
  }, [preferLayoutSeatPositions, nativeProcessed, sectorMode.enabled]);
  const useSvgNative =
    layoutMode !== 'grid' &&
    (layoutMode === 'svgNative' ||
      (layoutMode === 'auto' && nativeSeats.length >= 2));

  const svgHtmlSafe = useMemo(() => {
    if (!useSvgNative) return hallSvgHtml;
    if (svgGeometryFromParsedCircles && nativeProcessed?.svgHtml) return nativeProcessed.svgHtml;
    return hallSvgHtml;
  }, [hallSvgHtml, nativeProcessed, svgGeometryFromParsedCircles, useSvgNative]);

  const { nativePlacements } = useMemo(() => {
    if (!useSvgNative || nativeSeats.length < 2) {
      return {
        nativePlacements: [] as SvgNativePlacement[],
      };
    }

    if (sectorMode.enabled) {
      const layoutRecord =
        layoutJson && typeof layoutJson === 'object' ? (layoutJson as Record<string, unknown>) : null;
      const sellableFromApi = parseLayoutSeatPositions(
        layoutRecord ? { seats: layoutRecord.sellableSeats } : null,
      );
      const sellableFromLiveOffers = layoutRecord?.sellableSeatsFromLiveOffers === true;

      const layoutIndex = buildLabeledSeatIndex(nativeSeats);
      for (const s of sellableFromApi) {
        for (const key of labeledSeatLookupKeys(s.sector, s.row, s.seat)) {
          layoutIndex.set(key, s);
        }
      }

      const offerBySeatKey = new Map<string, { offer: OfferLike; seat: string; list: string[] }>();
      for (const offer of offers) {
        const list = Array.isArray(offer.SeatList) ? offer.SeatList.map(String) : [];
        if (list.length === 0) continue;
        const oid = String(offer.Id ?? '');
        if (!oid) continue;
        for (const seat of list) {
          if (!seat.trim()) continue;
          for (const key of labeledSeatLookupKeys(offer.Sector, offer.Row, seat)) {
            offerBySeatKey.set(key, { offer, seat, list });
          }
        }
      }

      const placements: SvgNativePlacement[] = [];
      const placedKeys = new Set<string>();

      const pushPlacement = (
        hit: SvgNativeSeat,
        offer: OfferLike,
        seat: string,
        list: string[],
      ) => {
        const oid = String(offer.Id ?? '');
        const svgKey = seatMapKey(hit.sector, hit.row, seat);
        if (placedKeys.has(svgKey)) return;
        placedKeys.add(svgKey);
        const rowLabel = String(offer.Row ?? hit.row);
        const sectorLabel = String(offer.Sector ?? hit.sector);
        const priceKey = getPriceKey(offer);
        placements.push({
          svgKey,
          key: selectionSeatKey(oid, rowLabel, seat),
          offerId: oid,
          sectorLabel,
          seat,
          rowLabel,
          available: list,
          xPct: hit.xPct,
          yPct: hit.yPct,
          title: `${sectorLabel}, ${rowLabel} ряд, место ${seat}, цена ${formatRub(Number(priceKey))}`,
          priceKey,
        });
      };

      if (sellableFromApi.length > 0) {
        for (const hit of sellableFromApi) {
          let matched: { offer: OfferLike; seat: string; list: string[] } | undefined;
          for (const key of labeledSeatLookupKeys(hit.sector, hit.row, hit.seat)) {
            const m = offerBySeatKey.get(key);
            if (m) {
              matched = m;
              break;
            }
          }
          if (!matched) continue;
          pushPlacement(hit, matched.offer, matched.seat, matched.list);
        }
      } else {
        for (const offer of offers) {
          const list = Array.isArray(offer.SeatList) ? offer.SeatList.map(String) : [];
          if (list.length === 0) continue;
          const oid = String(offer.Id ?? '');
          if (!oid) continue;

          for (const seat of list) {
            if (!seat.trim()) continue;
            const hit = lookupLabeledSeat(layoutIndex, offer.Sector, offer.Row, seat);
            if (!hit) continue;
            pushPlacement(hit, offer, seat, list);
          }
        }
      }

      const merged =
        grayHallWhenNoOffers && nativeSeats.length >= 2
          ? mergeGrayHallUnmatchedPlacements(placements, nativeSeats)
          : placements;

      return {
        nativePlacements: merged,
      };
    }

    let { placements } = buildSvgNativePlacements(nativeSeats, offers, getPriceKey);
    const mergedNonSector =
      grayHallWhenNoOffers && nativeSeats.length >= 2
        ? mergeGrayHallUnmatchedPlacements(placements, nativeSeats)
        : placements;
    return {
      nativePlacements: mergedNonSector,
    };
  }, [
    colorForSeat,
    getPriceKey,
    grayHallWhenNoOffers,
    offers,
    sectorMode.enabled,
    seatSelectionDisabled,
    layoutJson,
    useSvgNative,
    nativeSeats,
  ]);

  const matchedNativeSeatKeys = useMemo(
    () => new Set(nativePlacements.map((p) => p.svgKey)),
    [nativePlacements],
  );

  const sectorSummaries = useMemo(() => {
    const offersBySector = new Map<string, HallOfferRow[]>();
    for (const offer of offers) {
      let key: string | null = null;
      for (const meta of sectorMode.sectors) {
        if (sectorNormsMatch(offer.Sector, meta.label)) {
          key = normalizeSectorLabel(meta.label);
          break;
        }
      }
      if (!key) key = normalizeSectorLabel(offer.Sector);
      if (!key) continue;
      const arr = offersBySector.get(key) ?? [];
      arr.push(offer);
      offersBySector.set(key, arr);
    }

    return sectorMode.sectors.map((meta) => {
      const sectorOffers = offersBySector.get(normalizeSectorLabel(meta.label)) ?? [];
      const prices = sectorOffers.map((offer) => Number(getPriceKey(offer))).filter(Number.isFinite);
      const seatCount = sectorOffers.reduce(
        (sum, offer) => sum + (Array.isArray(offer.SeatList) ? offer.SeatList.length : 0),
        0,
      );
      return {
        meta,
        offers: sectorOffers,
        seatCount,
        minPrice: prices.length ? Math.min(...prices) : sectorOffers.length > 0 ? meta.minPrice ?? null : null,
        maxPrice: prices.length ? Math.max(...prices) : sectorOffers.length > 0 ? meta.maxPrice ?? null : null,
      };
    });
  }, [getPriceKey, offers, sectorMode.sectors]);

  const sectorSummaryByLabel = useMemo(() => {
    const map = new Map<string, SectorSummary>();
    for (const summary of sectorSummaries) {
      map.set(normalizeSectorLabel(summary.meta.label), summary);
    }
    return map;
  }, [sectorSummaries]);

  const viewportRef = useRef<HTMLDivElement>(null);
  const hoverProbeRef = useRef<HTMLDivElement>(null);
  const panInnerRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const placementsForHoverRef = useRef<SvgNativePlacement[]>([]);
  const probeSeatHoverRef = useRef<(clientX: number, clientY: number) => void>(() => {});
  const activatePlacementRef = useRef<(p: SvgNativePlacement) => void>(() => {});
  const canvasImageRef = useRef<HTMLImageElement | null>(null);
  const bowlImageRef = useRef<HTMLImageElement | null>(null);
  const [bowlImageVersion, setBowlImageVersion] = useState(0);
  const [canvasImageVersion, setCanvasImageVersion] = useState(0);
  const [fitZoom, setFitZoom] = useState(1);

  const isCoarsePointer = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(pointer: coarse)').matches ||
      navigator.maxTouchPoints > 0 ||
      window.innerWidth < 900
    );
  }, []);

  const [zoom, setZoom] = useState(1);
  const maxZoomMultiplier = sectorMode.enabled
    ? isCoarsePointer
      ? 28
      : 12
    : isCoarsePointer
      ? 18
      : 8;
  const maxZoom = fitZoom * maxZoomMultiplier;
  const clampZoom = useCallback((z: number) => Math.min(maxZoom || 4, Math.max(0.03, z)), [maxZoom]);
  const discreteZoomLevels = useMemo(
    () => {
      const multipliers = sectorMode.enabled
        ? isCoarsePointer
          ? [1, 2, 3, 4, 6, 8, 12, 16, 20, 24, 28]
          : [1, 2, 3, 4, 6, 8, 10, 12]
        : isCoarsePointer
          ? [1, 2, 3, 4, 6, 8, 12, 16, 18]
          : [1, 2, 3, 4, 6, 8];
      return multipliers.map((multiplier) => fitZoom * multiplier).map(clampZoom);
    },
    [clampZoom, fitZoom, isCoarsePointer, sectorMode.enabled],
  );
  const getNextZoomLevel = useCallback((current: number, direction: 1 | -1) => {
    const ordered = [...new Set(discreteZoomLevels.map((level) => Number(level.toFixed(4))))].sort((a, b) => a - b);
    return direction > 0
      ? ordered.find((level) => level > current + 0.01)
      : [...ordered].reverse().find((level) => level < current - 0.01);
  }, [discreteZoomLevels]);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isMapDragging, setIsMapDragging] = useState(false);
  const [mapPreparing, setMapPreparing] = useState(true);
  const [hoverAnchor, setHoverAnchor] = useState<HTMLElement | null>(null);
  const [hoverSeat, setHoverSeat] = useState<HoverSeatInfo | null>(null);
  const [hoverSectorAnchor, setHoverSectorAnchor] = useState<Element | null>(null);
  const [hoverSector, setHoverSector] = useState<SectorSummary | null>(null);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [sectorPanelCollapsed, setSectorPanelCollapsed] = useState(false);
  const [selectedSeatDetails, setSelectedSeatDetails] = useState<HallSelectedSeat[]>([]);
  const zoomRef = useRef(zoom);
  const fitZoomRef = useRef(1);
  const panRef = useRef(pan);
  const pointersRef = useRef(new Map<number, Point>());
  const suppressMapClickRef = useRef(false);
  const pinchRef = useRef<{
    startDistance: number;
    startZoom: number;
    startPan: Point;
    startMiddle: Point;
  } | null>(null);
  const dragRef = useRef<{ active: boolean; moved: boolean; id: number; sx: number; sy: number; ox: number; oy: number } | null>(
    null,
  );
  const bowlCacheRef = useRef<BowlCacheEntry | null>(null);
  const canvasDrawRafRef = useRef<number | null>(null);
  const useCanvasCompositingRef = useRef(false);
  const canvasDrawContextRef = useRef({
    backgroundSeatCoordinates: [] as BackgroundSeatCoordinate[],
    omitClientSeatCoordinateCloud: false,
    visibleNativePlacements: [] as SvgNativePlacement[],
    selectedSeatDetails: [] as HallSelectedSeat[],
    skipDuplicateInteractiveDotsOnCanvas: false,
    colorForSeat: ((_priceKey: string) => '#888') as (priceKey: string) => string,
    svgViewBoxWidth: 100,
  });
  const scheduleStadiumCanvasDrawRef = useRef<(() => void) | null>(null);
  const applyCameraLiveRef = useRef<(nextZoom: number, nextPan: Point) => void>(() => {});
  const applyPanLiveRef = useRef<(nextPan: Point) => void>(() => {});

  const syncLayersTransform = useCallback((nextZoom: number, nextPan: Point) => {
    if (!useCanvasCompositingRef.current) return;
    const layers = layersRef.current;
    if (!layers) return;
    layers.style.transform = `matrix(${nextZoom}, 0, 0, ${nextZoom}, ${nextPan.x}, ${nextPan.y})`;
  }, []);

  const getLayerBase = useCallback(() => {
    const vp = viewportRef.current;
    const inner = panInnerRef.current;
    const layers = layersRef.current;
    if (!vp || !inner || !layers) return null;
    const vpRect = vp.getBoundingClientRect();
    const innerRect = inner.getBoundingClientRect();
    return {
      x: innerRect.left - vpRect.left + layers.offsetLeft,
      y: innerRect.top - vpRect.top + layers.offsetTop,
      width: layers.offsetWidth,
      height: layers.offsetHeight,
    };
  }, []);

  const getLayerScreenBox = useCallback((): LayerScreenBox | null => {
    const vp = viewportRef.current;
    const layers = layersRef.current;
    if (!vp || !layers) return null;
    const vpRect = vp.getBoundingClientRect();
    const lr = layers.getBoundingClientRect();
    return {
      left: lr.left - vpRect.left,
      top: lr.top - vpRect.top,
      width: layers.offsetWidth,
      height: layers.offsetHeight,
      screenW: lr.width,
      screenH: lr.height,
    };
  }, []);

  const buildPlacementPickCtx = useCallback(
    (mapZoomed: boolean): PlacementPickCtx | null => {
      const vp = viewportRef.current;
      if (!vp) return null;
      return {
        viewport: vp,
        getLayerScreenBox,
        zoom: zoomRef.current,
        placements: placementsForHoverRef.current,
        mapZoomed,
      };
    },
    [getLayerScreenBox],
  );

  const applyCamera = useCallback((nextZoom: number, nextPan: Point) => {
    zoomRef.current = nextZoom;
    panRef.current = nextPan;
    syncLayersTransform(nextZoom, nextPan);
    setZoom(nextZoom);
    setPan(nextPan);
    scheduleStadiumCanvasDrawRef.current?.();
  }, [syncLayersTransform]);

  const applyPan = useCallback((nextPan: Point) => {
    panRef.current = nextPan;
    syncLayersTransform(zoomRef.current, nextPan);
    setPan(nextPan);
    scheduleStadiumCanvasDrawRef.current?.();
  }, [syncLayersTransform]);

  const getCenteredPan = useCallback((targetZoom: number) => {
    const vp = viewportRef.current;
    const inner = panInnerRef.current;
    const layers = layersRef.current;
    if (!vp || !inner || !layers) return { x: 0, y: 0 };
    const vpRect = vp.getBoundingClientRect();
    const innerRect = inner.getBoundingClientRect();
    const baseX = innerRect.left - vpRect.left + layers.offsetLeft;
    const baseY = innerRect.top - vpRect.top + layers.offsetTop;
    const lw = layers.offsetWidth;
    const lh = layers.offsetHeight;
    return {
      x: vp.clientWidth / 2 - baseX - (lw * targetZoom) / 2,
      y: vp.clientHeight / 2 - baseY - (lh * targetZoom) / 2,
    };
  }, []);

  const showSeatInfo = useCallback((anchor: HTMLElement, info: HoverSeatInfo) => {
    setHoverAnchor(anchor);
    setHoverSeat(info);
  }, []);

  const hideSeatInfo = useCallback(() => {
    setHoverAnchor(null);
    setHoverSeat(null);
  }, []);

  const showSectorInfo = useCallback((anchor: SVGPathElement, sector: SectorSummary) => {
    setHoverSectorAnchor(anchor);
    setHoverSector(sector);
  }, []);

  const hideSectorInfo = useCallback(() => {
    setHoverSectorAnchor(null);
    setHoverSector(null);
  }, []);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    fitZoomRef.current = fitZoom;
  }, [fitZoom]);

  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  const stadiumCanvasEnabled = sectorMode.enabled && svgViewBox.width > 100 && svgViewBox.height > 100;

  /** Canvas-compositing для Лужников пока выключен: он может дать вторую, искажённую копию поверх SVG. */
  const [, setCanvasBackdropReady] = useState(false);
  const useCanvasCompositing = false;
  useCanvasCompositingRef.current = useCanvasCompositing;

  const ensureBowlCache = useCallback(() => {
    const layers = layersRef.current;
    const ctxBag = canvasDrawContextRef.current;
    const bg = ctxBag.backgroundSeatCoordinates;
    if (!useCanvasCompositingRef.current || bg.length === 0) {
      bowlCacheRef.current = null;
      return;
    }
    if (!layers) return;
    const layerW = layers.offsetWidth;
    const layerH = layers.offsetHeight;
    if (layerW < 8 || layerH < 8) return;
    const key = `${bg.length}:${ctxBag.svgViewBoxWidth}:${layerW}:${layerH}`;
    if (bowlCacheRef.current?.key === key) return;
    const cacheCanvas = buildBowlCacheCanvas(bg, layerW, layerH, ctxBag.svgViewBoxWidth);
    bowlCacheRef.current = cacheCanvas
      ? { canvas: cacheCanvas, layerW, layerH, key }
      : null;
  }, []);

  const drawStadiumCanvas = useCallback(() => {
    if (!useCanvasCompositingRef.current) return;
    const canvas = canvasRef.current;
    const viewport = viewportRef.current;
    if (!canvas || !viewport) return;

    const box = getLayerScreenBox();
    if (!box) return;
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    if (width <= 0 || height <= 0) return;

    const currentZoom = zoomRef.current;
    const currentFit = fitZoomRef.current;
    const ctxBag = canvasDrawContextRef.current;

    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const pixelWidth = Math.max(1, Math.round(width * dpr));
    const pixelHeight = Math.max(1, Math.round(height * dpr));
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);

    const x = box.left;
    const y = box.top;
    const w = box.screenW;
    const h = box.screenH;
    const mapZoomedNow = currentZoom > currentFit + 0.01;

    const img = canvasImageRef.current;
    if (img) {
      ctx.save();
      ctx.filter = mapZoomedNow ? CANVAS_ZOOMED_BACKDROP_FILTER : 'none';
      ctx.drawImage(img, x, y, w, h);
      ctx.restore();
    }

    if (ctxBag.omitClientSeatCoordinateCloud && bowlImageRef.current) {
      ctx.drawImage(bowlImageRef.current, x, y, w, h);
    } else {
      const bg = ctxBag.backgroundSeatCoordinates;
      if (bg.length > 0 && (mapZoomedNow || bg.length >= 8000)) {
        ensureBowlCache();
        const cache = bowlCacheRef.current;
        if (cache) {
          ctx.drawImage(cache.canvas, x, y, w, h);
        }
      }
    }

    const { visibleNativePlacements, selectedSeatDetails, skipDuplicateInteractiveDotsOnCanvas, colorForSeat } =
      ctxBag;
    if (visibleNativePlacements.length > 0) {
      const activeKeys = new Set(selectedSeatDetails.map((seatDetail) => seatDetail.key));
      for (const seat of visibleNativePlacements) {
        const active = activeKeys.has(seat.key);
        if (skipDuplicateInteractiveDotsOnCanvas && !active && seat.previewOnly) continue;

        const sx = x + (seat.xPct / 100) * w;
        const sy = y + (seat.yPct / 100) * h;
        if (sx < -16 || sy < -16 || sx > width + 16 || sy > height + 16) continue;
        const r = stadiumSeatCanvasRadiusPx(
          currentZoom,
          box.width,
          ctxBag.svgViewBoxWidth,
          active,
          mapZoomedNow,
        );
        ctx.beginPath();
        ctx.fillStyle = seat.previewOnly ? CANVAS_HALL_SEAT_DOT_FILL : colorForSeat(seat.priceKey);
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
        if (active && !seat.previewOnly) {
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#fff';
          ctx.stroke();
        }
      }
    }
  }, [ensureBowlCache, getLayerScreenBox]);

  const scheduleStadiumCanvasDraw = useCallback(() => {
    if (!useCanvasCompositingRef.current) return;
    if (canvasDrawRafRef.current != null) return;
    canvasDrawRafRef.current = requestAnimationFrame(() => {
      canvasDrawRafRef.current = null;
      drawStadiumCanvas();
    });
  }, [drawStadiumCanvas]);

  scheduleStadiumCanvasDrawRef.current = scheduleStadiumCanvasDraw;

  applyCameraLiveRef.current = (nextZoom: number, nextPan: Point) => {
    zoomRef.current = nextZoom;
    panRef.current = nextPan;
    syncLayersTransform(nextZoom, nextPan);
    scheduleStadiumCanvasDraw();
  };

  applyPanLiveRef.current = (nextPan: Point) => {
    panRef.current = nextPan;
    syncLayersTransform(zoomRef.current, nextPan);
    scheduleStadiumCanvasDraw();
  };

  useEffect(() => {
    if (!useCanvasCompositing) {
      bowlCacheRef.current = null;
      const layers = layersRef.current;
      if (layers) layers.style.transform = '';
      return;
    }
    syncLayersTransform(zoomRef.current, panRef.current);
  }, [useCanvasCompositing, syncLayersTransform]);

  useEffect(() => {
    bowlCacheRef.current = null;
  }, [backgroundSeatCoordinates, svgViewBox.width, svgViewBox.height]);

  useEffect(
    () => () => {
      if (canvasDrawRafRef.current != null) {
        cancelAnimationFrame(canvasDrawRafRef.current);
        canvasDrawRafRef.current = null;
      }
    },
    [],
  );

  useEffect(() => {
    if (!stadiumCanvasEnabled || !svgHtmlSafe.trim()) {
      canvasImageRef.current = null;
      setCanvasBackdropReady(false);
      setCanvasImageVersion((v) => v + 1);
      return;
    }

    setCanvasBackdropReady(false);
    canvasImageRef.current = null;

    const blob = new Blob([svgHtmlSafe], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.decoding = 'async';
    let cancelled = false;

    const finalizeBackdrop = () => {
      if (cancelled) return;
      setCanvasImageVersion((v) => v + 1);
    };

    img.onload = () => {
      if (cancelled) return;
      const ok = img.naturalWidth > 0 && img.naturalHeight > 0;
      if (ok) {
        canvasImageRef.current = img;
        setCanvasBackdropReady(true);
      } else {
        canvasImageRef.current = null;
        setCanvasBackdropReady(false);
      }
      finalizeBackdrop();
    };
    img.onerror = () => {
      if (cancelled) return;
      canvasImageRef.current = null;
      setCanvasBackdropReady(false);
      finalizeBackdrop();
    };
    img.src = url;

    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
      if (canvasImageRef.current === img) canvasImageRef.current = null;
      setCanvasBackdropReady(false);
    };
  }, [stadiumCanvasEnabled, svgHtmlSafe]);

  useEffect(() => {
    if (!omitClientSeatCoordinateCloud || !hallBackgroundRasterUrl) {
      bowlImageRef.current = null;
      setBowlImageVersion((v) => v + 1);
      return;
    }
    bowlImageRef.current = null;
    const img = new Image();
    img.decoding = 'async';
    let cancelled = false;
    img.onload = () => {
      if (cancelled) return;
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        bowlImageRef.current = img;
      } else {
        bowlImageRef.current = null;
      }
      setBowlImageVersion((v) => v + 1);
      scheduleStadiumCanvasDrawRef.current?.();
    };
    img.onerror = () => {
      if (cancelled) return;
      bowlImageRef.current = null;
      setBowlImageVersion((v) => v + 1);
    };
    img.src = hallBackgroundRasterUrl;
    return () => {
      cancelled = true;
      if (bowlImageRef.current === img) bowlImageRef.current = null;
    };
  }, [hallBackgroundRasterUrl, omitClientSeatCoordinateCloud]);

  useEffect(() => {
    if (!activeOfferId || selectedSeats.length === 0) {
      setSelectedSeatDetails([]);
    }
  }, [activeOfferId, selectedSeats.length]);

  useEffect(() => {
    setSectorPanelCollapsed(false);
  }, [selectedSector]);

  useEffect(() => {
    setMapPreparing(true);
  }, [hallSvgHtml, stadiumCanvasEnabled, svgHtmlSafe, variant]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setMapPreparing(false);
    }, stadiumCanvasEnabled ? 520 : 280);
    return () => window.clearTimeout(timeout);
  }, [canvasImageVersion, hallSvgHtml, stadiumCanvasEnabled, svgHtmlSafe, variant]);

  const applyFit = useCallback((resetPan: boolean) => {
    const vp = viewportRef.current;
    const layers = layersRef.current;
    if (!vp || !layers) return;
    const vw = vp.clientWidth;
    const vh = vp.clientHeight;
    const lw = layers.offsetWidth;
    const lh = layers.offsetHeight;
    if (lw < 8 || lh < 8) return;
    const margin = 10;
    const zx = (vw - margin * 2) / lw;
    const zy = (vh - margin * 2) / lh;
    const fit = Math.min(1, zx, zy);
    setFitZoom(fit);
    if (resetPan || zoomRef.current < fit) {
      applyCamera(fit, resetPan ? getCenteredPan(fit) : panRef.current);
    }
  }, [applyCamera, getCenteredPan]);

  const startPinchIfReady = useCallback(() => {
    const points = [...pointersRef.current.values()];
    if (points.length < 2) {
      pinchRef.current = null;
      return;
    }
    const [a, b] = points;
    pinchRef.current = {
      startDistance: Math.max(1, pointDistance(a, b)),
      startZoom: zoomRef.current,
      startPan: panRef.current,
      startMiddle: pointMiddle(a, b),
    };
    dragRef.current = null;
  }, []);

  const applyPinchGesture = useCallback(() => {
    const pinch = pinchRef.current;
    if (!pinch) return;
    const vp = viewportRef.current;
    const base = getLayerBase();
    if (!vp || !base) return;
    const points = [...pointersRef.current.values()];
    if (points.length < 2) return;
    const [a, b] = points;
    const dist = Math.max(1, pointDistance(a, b));
    const middle = pointMiddle(a, b);
    const vpRect = vp.getBoundingClientRect();
    const startZoom = Math.max(0.001, pinch.startZoom);
    const nextZoom = clampZoom(pinch.startZoom * (dist / pinch.startDistance));
    const layerX = (pinch.startMiddle.x - vpRect.left - base.x - pinch.startPan.x) / startZoom;
    const layerY = (pinch.startMiddle.y - vpRect.top - base.y - pinch.startPan.y) / startZoom;
    const nextPan = {
      x: middle.x - vpRect.left - base.x - layerX * nextZoom,
      y: middle.y - vpRect.top - base.y - layerY * nextZoom,
    };
    if (useCanvasCompositingRef.current) {
      applyCameraLiveRef.current(nextZoom, nextPan);
    } else {
      applyCamera(nextZoom, nextPan);
    }
  }, [applyCamera, clampZoom, getLayerBase]);

  const onPointerDownPan = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-sector-panel="true"]')) return;
    if ((e.target as HTMLElement).closest('[data-seat-dot="true"]')) return;
    if ((e.target as HTMLElement).closest('[data-sector-path="true"]')) return;
    hideSeatInfo();
    hideSectorInfo();
    if (e.button !== 0 && e.pointerType !== 'touch') return;
    const t = e.currentTarget as HTMLElement;
    t.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragRef.current = {
      active: true,
      moved: false,
      id: e.pointerId,
      sx: e.clientX,
      sy: e.clientY,
      ox: panRef.current.x,
      oy: panRef.current.y,
    };
    setIsMapDragging(true);
    if (pointersRef.current.size >= 2) startPinchIfReady();
  }, [hideSeatInfo, hideSectorInfo, startPinchIfReady]);

  const onPointerMovePan = useCallback(
    (e: React.PointerEvent) => {
      if (pointersRef.current.has(e.pointerId)) {
        pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }
      if (pointersRef.current.size >= 2 && pinchRef.current) {
        suppressMapClickRef.current = true;
        applyPinchGesture();
        hideSeatInfo();
        return;
      }
      const d = dragRef.current;
      if (d?.active && e.pointerId === d.id) {
        const dx = e.clientX - d.sx;
        const dy = e.clientY - d.sy;
        if (!d.moved && Math.hypot(dx, dy) < 4) {
          probeSeatHoverRef.current(e.clientX, e.clientY);
          return;
        }
        d.moved = true;
        suppressMapClickRef.current = true;
        hideSeatInfo();
        const nextPan = { x: d.ox + dx, y: d.oy + dy };
        if (useCanvasCompositingRef.current) {
          applyPanLiveRef.current(nextPan);
        } else {
          applyPan(nextPan);
        }
        return;
      }
      if (!d?.moved && pointersRef.current.size <= 1) {
        probeSeatHoverRef.current(e.clientX, e.clientY);
      }
    },
    [applyPan, applyPinchGesture, hideSeatInfo],
  );

  const focusLayerPoint = useCallback((layerX: number, layerY: number, targetZoom: number, sectorLabel?: string) => {
    const vp = viewportRef.current;
    const base = getLayerBase();
    if (!vp || !base) return;
    const panelOffset = vp.clientWidth >= 760 ? Math.min(390, vp.clientWidth * 0.38) : 0;
    const targetScreenX = panelOffset + (vp.clientWidth - panelOffset) / 2;
    const targetScreenY = vp.clientHeight / 2;
    if (sectorLabel) setSelectedSector(normalizeSectorLabel(sectorLabel));
    applyCamera(targetZoom, {
      x: targetScreenX - base.x - layerX * targetZoom,
      y: targetScreenY - base.y - layerY * targetZoom,
    });
  }, [applyCamera, getLayerBase]);

  const focusClickPoint = useCallback((clientX: number, clientY: number) => {
    const vp = viewportRef.current;
    const base = getLayerBase();
    if (!vp || !base) return;
    const vpRect = vp.getBoundingClientRect();
    const currentZoom = Math.max(0.001, zoomRef.current);
    const layerX = (clientX - vpRect.left - base.x - panRef.current.x) / currentZoom;
    const layerY = (clientY - vpRect.top - base.y - panRef.current.y) / currentZoom;
    const nextZoom = getNextZoomLevel(currentZoom, 1);
    if (typeof nextZoom !== 'number') return;
    setSelectedSector(null);
    focusLayerPoint(layerX, layerY, nextZoom);
  }, [focusLayerPoint, getLayerBase, getNextZoomLevel]);

  const endPan = useCallback((e: React.PointerEvent) => {
    const wasPinching = pointersRef.current.size >= 2;
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (wasPinching && pointersRef.current.size === 1) {
      const [id, pt] = [...pointersRef.current.entries()][0];
      dragRef.current = {
        active: true,
        moved: true,
        id,
        sx: pt.x,
        sy: pt.y,
        ox: panRef.current.x,
        oy: panRef.current.y,
      };
      suppressMapClickRef.current = true;
      window.setTimeout(() => {
        suppressMapClickRef.current = false;
      }, 0);
    }
    const d = dragRef.current;
    const clicked = d && e.pointerId === d.id && !d.moved;
    const moved = Boolean(d && e.pointerId === d.id && d.moved);
    if (d && e.pointerId === d.id) dragRef.current = null;
    if (moved) {
      window.setTimeout(() => {
        suppressMapClickRef.current = false;
      }, 0);
    }
    if (pointersRef.current.size === 0) {
      setIsMapDragging(false);
      if (useCanvasCompositingRef.current) {
        setZoom(zoomRef.current);
        setPan({ x: panRef.current.x, y: panRef.current.y });
      }
    }
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* */
    }
    if (clicked && !(e.target as HTMLElement).closest('[data-seat-dot="true"]')) {
      const mapZoomedNow = zoomRef.current > fitZoomRef.current + 0.01;
      const pickCtx = buildPlacementPickCtx(mapZoomedNow);
      if (
        pickCtx
        && mapZoomedNow
        && (stadiumCanvasEnabled || sectorMode.enabled)
      ) {
        const picked = findNearestSellablePlacement(e.clientX, e.clientY, pickCtx);
        if (picked) {
          activatePlacementRef.current(picked);
          return;
        }
      }
      if (
        !(e.target as HTMLElement).closest('button')
        && !(e.target as HTMLElement).closest('[data-sector-path="true"]')
      ) {
        focusClickPoint(e.clientX, e.clientY);
      }
    }
  }, [buildPlacementPickCtx, fitZoom, focusClickPoint, sectorMode.enabled, stadiumCanvasEnabled]);

  useEffect(() => {
    applyFit(true);
    const raf = requestAnimationFrame(() => applyFit(true));
    return () => cancelAnimationFrame(raf);
  }, [hallSvgHtml, svgHtmlSafe, applyFit, variant]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => applyFit(false));
    ro.observe(el);
    return () => ro.disconnect();
  }, [applyFit]);

  const focusSector = useCallback((sector: SectorSummary) => {
    setSectorPanelCollapsed(false);
    const bbox = pathBBox(sector.meta.path);
    const vp = viewportRef.current;
    const layers = layersRef.current;
    if (!bbox || !vp || !layers) {
      setSelectedSector(normalizeSectorLabel(sector.meta.label));
      return;
    }

    const centerX = ((bbox.minX + bbox.maxX) / 2 / svgViewBox.width) * layers.offsetWidth;
    const centerY = ((bbox.minY + bbox.maxY) / 2 / svgViewBox.height) * layers.offsetHeight;
    focusLayerPoint(centerX, centerY, maxZoom, sector.meta.label);
  }, [focusLayerPoint, maxZoom, svgViewBox.height, svgViewBox.width]);

  const stepZoom = useCallback((direction: 1 | -1) => {
    const current = zoomRef.current;
    const next = getNextZoomLevel(current, direction);
    if (typeof next !== 'number') return;
    if (next <= fitZoom + 0.01) {
      setSelectedSector(null);
      applyCamera(next, getCenteredPan(next));
      return;
    }
    const vp = viewportRef.current;
    const base = getLayerBase();
    if (!vp || !base) {
      applyCamera(next, panRef.current);
      return;
    }
    const currentZoom = Math.max(0.001, zoomRef.current);
    const focusX = vp.clientWidth / 2;
    const focusY = vp.clientHeight / 2;
    const layerX = (focusX - base.x - panRef.current.x) / currentZoom;
    const layerY = (focusY - base.y - panRef.current.y) / currentZoom;
    focusLayerPoint(layerX, layerY, next);
  }, [applyCamera, fitZoom, focusLayerPoint, getCenteredPan, getLayerBase, getNextZoomLevel]);

  const resetSectorFocus = useCallback(() => {
    setSelectedSector(null);
    applyCamera(fitZoom, getCenteredPan(fitZoom));
  }, [applyCamera, fitZoom, getCenteredPan]);

  const zoomPctLabel = Math.max(1, Math.round((zoom / Math.max(0.001, fitZoom)) * 100));
  const selectedPrices = selectedSeatDetails.map((d) => Number(d.priceKey)).filter(Number.isFinite);
  const selectedTotal = selectedPrices.reduce((sum, price) => sum + price, 0);
  const selectedPlacesText = formatSelectedPlacesDetailed(selectedSeatDetails, selectedSeats, selectedOffer?.Row);
  const selectedSectors = new Set(selectedSeatDetails.map((d) => d.sector).filter(Boolean));
  const selectedPriceKeys = new Set(selectedSeatDetails.map((d) => d.priceKey).filter(Boolean));
  const selectionMetaText =
    selectedSeatDetails.length === 0
      ? ''
      : `${selectedSectors.size === 1 ? [...selectedSectors][0] : 'Несколько зон'} · ${
          selectedPriceKeys.size === 1 ? `цена за место ${formatRub(Number([...selectedPriceKeys][0]))}` : 'разные цены'
        }`;
  const updateSelectedDetails = useCallback((detail: HallSelectedSeat, available: string[]) => {
    setSelectedSeatDetails((prev) => {
      if (!available.includes(detail.seat)) return prev;
      const next = prev.some((d) => d.key === detail.key)
        ? prev.filter((d) => d.key !== detail.key)
        : [...prev, detail];
      onSelectionChange?.(next);
      return next;
    });
  }, [onSelectionChange]);

  activatePlacementRef.current = (p: SvgNativePlacement) => {
    if (sectorMode.enabled && zoomRef.current <= fitZoomRef.current + 0.01) return;
    const seatInfo: HallSelectedSeat = {
      key: p.key,
      offerId: p.offerId,
      sector: p.sectorLabel,
      row: p.rowLabel,
      seat: p.seat,
      priceKey: p.priceKey,
    };
    updateSelectedDetails(seatInfo, p.available);
    if (!onSelectionChange) onToggleSeat(p.offerId, p.seat, p.available);
  };

  const clearSelection = useCallback(() => {
    setSelectedSeatDetails([]);
    hideSeatInfo();
    onSelectionChange?.([]);
    onClearSelection?.();
  }, [hideSeatInfo, onClearSelection, onSelectionChange]);

  const selectedSectorSummary = selectedSector ? sectorSummaryByLabel.get(selectedSector) ?? null : null;
  const mapZoomed = zoom > fitZoom + 0.01;
  const selectedSectorOffers = useMemo(
    () => (selectedSectorSummary ? sortOffersForGrid(selectedSectorSummary.offers) : []),
    [selectedSectorSummary],
  );
  const selectedSectorOffersWithSeats = useMemo(
    () => selectedSectorOffers.filter((offer) => Array.isArray(offer.SeatList) && offer.SeatList.length > 0),
    [selectedSectorOffers],
  );
  /** Все sellable на карте при любом zoom — после приближения можно панорамировать к соседним секторам. */
  const visibleNativePlacements = useMemo(() => {
    if (!sectorMode.enabled) return nativePlacements;
    return nativePlacements;
  }, [nativePlacements, sectorMode.enabled]);

  const denseBackgroundHall = backgroundSeatCoordinates.length >= 8000;
  const skipDuplicateInteractiveDotsOnCanvas =
    uniformHallSeatAppearance && denseBackgroundHall && useCanvasCompositing;
  const uniformDomOverlayGhost =
    uniformHallSeatAppearance && useCanvasCompositing && useSvgNative;
  /** Сектора на обзоре 100%: подсветка и клик; заливку path убираем только после zoom-in. */
  const hideSectorFill = mapZoomed;
  const sellablePlacementCount = useMemo(
    () => visibleNativePlacements.filter((p) => !p.previewOnly && p.offerId).length,
    [visibleNativePlacements],
  );
  const useDelegatedSeatHits =
    useCanvasCompositing &&
    stadiumCanvasEnabled &&
    sellablePlacementCount >= HALL_MAP_DELEGATED_HIT_MIN;

  placementsForHoverRef.current = visibleNativePlacements;

  const probeSeatHover = useCallback(
    (clientX: number, clientY: number) => {
      if (!stadiumCanvasEnabled && !sectorMode.enabled) return;
      if (sectorMode.enabled && zoomRef.current <= fitZoomRef.current + 0.01) {
        hideSeatInfo();
        return;
      }
      const vp = viewportRef.current;
      const probe = hoverProbeRef.current;
      if (!vp || !probe) return;
      if (dragRef.current?.moved) return;
      const pickCtx = buildPlacementPickCtx(zoomRef.current > fitZoom + 0.01);
      if (!pickCtx) return;
      const best = findNearestSellablePlacement(clientX, clientY, pickCtx);
      if (best) {
        const vpRect = vp.getBoundingClientRect();
        probe.style.left = `${clientX - vpRect.left}px`;
        probe.style.top = `${clientY - vpRect.top}px`;
        showSeatInfo(probe, {
          key: best.key,
          offerId: best.offerId,
          sector: best.sectorLabel,
          row: best.rowLabel,
          seat: best.seat,
          priceKey: best.priceKey,
        });
      } else {
        hideSeatInfo();
      }
    },
    [buildPlacementPickCtx, fitZoom, hideSeatInfo, sectorMode.enabled, showSeatInfo, stadiumCanvasEnabled],
  );
  probeSeatHoverRef.current = probeSeatHover;

  const pickSellableAtClient = useCallback(
    (clientX: number, clientY: number): SvgNativePlacement | null => {
      if (sectorMode.enabled && zoomRef.current <= fitZoomRef.current + 0.01) return null;
      const pickCtx = buildPlacementPickCtx(zoomRef.current > fitZoomRef.current + 0.01);
      if (!pickCtx) return null;
      return findNearestSellablePlacement(clientX, clientY, pickCtx);
    },
    [buildPlacementPickCtx, sectorMode.enabled],
  );

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onMove = (e: PointerEvent) => {
      if (dragRef.current?.moved) return;
      probeSeatHoverRef.current(e.clientX, e.clientY);
    };
    vp.addEventListener('pointermove', onMove, { passive: true });
    return () => vp.removeEventListener('pointermove', onMove);
  }, [hideSeatInfo]);

  useEffect(() => {
    if (!focusSectorNorm) {
      setSelectedSector(null);
      return;
    }
    setSelectedSector(normalizeSectorLabel(focusSectorNorm));
  }, [focusSectorNorm]);

  const visibleUnavailableNativeSeats = useMemo(() => {
    if (!useSvgNative) return [];
    if (sectorMode.enabled) {
      if (backgroundSeatCoordinates.length > 0) return [];
      if (!selectedSectorSummary) return [];
      return nativeSeats.filter(
        (seat) =>
          sectorNormsMatch(seat.sector, selectedSector)
          && !matchedNativeSeatKeys.has(seatMapKey(seat.sector, seat.row, seat.seat)),
      );
    }
    return showUnavailableSeats
      ? nativeSeats.filter((seat) => !matchedNativeSeatKeys.has(seatMapKey(seat.sector, seat.row, seat.seat)))
      : [];
  }, [backgroundSeatCoordinates.length, matchedNativeSeatKeys, nativeSeats, sectorMode.enabled, selectedSector, selectedSectorSummary, showUnavailableSeats, useSvgNative]);

  const visibleBackgroundSeatCoordinates = useMemo(() => {
    if (!sectorMode.enabled || backgroundSeatCoordinates.length === 0) return [];
    if (mapZoomed || denseBackgroundHall) return backgroundSeatCoordinates;
    return [];
  }, [
    backgroundSeatCoordinates,
    denseBackgroundHall,
    mapZoomed,
    sectorMode.enabled,
  ]);

  canvasDrawContextRef.current = {
    backgroundSeatCoordinates,
    omitClientSeatCoordinateCloud,
    visibleNativePlacements,
    selectedSeatDetails,
    skipDuplicateInteractiveDotsOnCanvas,
    colorForSeat,
    svgViewBoxWidth: svgViewBox.width,
  };

  const layersStyle = useMemo<React.CSSProperties>(() => {
    const style: React.CSSProperties = {
      transformOrigin: '0 0',
      transition: isMapDragging || stadiumCanvasEnabled ? 'none' : undefined,
    };
    if (!useCanvasCompositing) {
      style.transform = `matrix(${zoom}, 0, 0, ${zoom}, ${pan.x}, ${pan.y})`;
    }
    if (sectorMode.enabled && svgViewBox.width > 100) {
      style.width = `${Math.round(svgViewBox.width)}px`;
      style.height = `${Math.round(svgViewBox.height)}px`;
      style.maxWidth = 'none';
    }
    return style;
  }, [
    isMapDragging,
    pan.x,
    pan.y,
    sectorMode.enabled,
    stadiumCanvasEnabled,
    svgViewBox.height,
    svgViewBox.width,
    useCanvasCompositing,
    zoom,
  ]);

  useEffect(() => {
    if (!useCanvasCompositing) return;
    scheduleStadiumCanvasDraw();
  }, [
    backgroundSeatCoordinates,
    bowlImageVersion,
    canvasImageVersion,
    colorForSeat,
    omitClientSeatCoordinateCloud,
    selectedSeatDetails,
    skipDuplicateInteractiveDotsOnCanvas,
    svgViewBox.width,
    useCanvasCompositing,
    visibleNativePlacements,
    zoom,
    pan.x,
    pan.y,
    scheduleStadiumCanvasDraw,
  ]);

  const rootClass =
    variant === 'dialog' ? `${styles.root} ${styles.rootInDialog}` : styles.root;

  return (
    <div className={rootClass}>
      <div className={styles.toolbar}>
        <div className={styles.zoomBtns}>
          <button type="button" className={styles.zoomBtn} onClick={() => stepZoom(-1)} aria-label="Уменьшить">
            −
          </button>
          <button
            type="button"
            className={styles.zoomPct}
            onClick={() => {
              resetSectorFocus();
            }}
            aria-label="Сброс масштаба и позиции"
          >
            {selectedSectorSummary ? '⤢' : `${zoomPctLabel}%`}
          </button>
          <button type="button" className={styles.zoomBtn} onClick={() => stepZoom(1)} aria-label="Увеличить">
            +
          </button>
        </div>
      </div>

      <div
        ref={viewportRef}
        className={styles.viewport}
        onPointerDown={onPointerDownPan}
        onPointerMove={onPointerMovePan}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        onPointerLeave={() => {
          if (pointersRef.current.size === 0) hideSeatInfo();
        }}
        role="presentation"
      >
        <div ref={hoverProbeRef} className={styles.hoverProbeAnchor} aria-hidden="true" />
        {useCanvasCompositing ? <canvas ref={canvasRef} className={styles.stadiumCanvas} aria-hidden="true" /> : null}
        <div ref={panInnerRef} className={styles.panInner}>
          <div
            ref={layersRef}
            className={`${styles.layers} ${stadiumCanvasEnabled ? styles.layersStadium : ''}`}
            style={layersStyle}
          >
            {!useCanvasCompositing ? (
              <div
                className={`${styles.svgLayer} ${
                  !stadiumCanvasEnabled && visibleBackgroundSeatCoordinates.length > 0 ? styles.svgLayerFocused : ''
                }`}
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: svgHtmlSafe }}
              />
            ) : null}
            {sectorMode.enabled ? (
              <svg
                className={`${styles.sectorLayer} ${
                  useCanvasCompositing ? styles.sectorLayerUnderSeats : ''
                } ${
                  hideSectorFill ? `${styles.sectorLayerSeatPick} ${styles.sectorLayerFocused}` : ''
                }`}
                viewBox={svgViewBox.value}
                preserveAspectRatio="xMidYMid meet"
                aria-label="Секторы стадиона"
              >
                {sectorSummaries.map((sector) => {
                  const available = sector.seatCount > 0 || sector.offers.length > 0;
                  const active = selectedSector === normalizeSectorLabel(sector.meta.label);
                  const priceForColor = sector.minPrice != null ? String(sector.minPrice) : '0';
                  return (
                    <path
                      key={sector.meta.id}
                      d={sector.meta.path}
                      data-sector-path="true"
                      className={`${styles.sectorPath} ${styles.sectorPathInteractive} ${
                        available ? styles.sectorPathAvailable : styles.sectorPathUnavailable
                      } ${
                        active ? styles.sectorPathActive : ''
                      }`}
                      style={
                        {
                          '--sector-accent': available ? colorForSeat(priceForColor) : '#9ca3af',
                        } as React.CSSProperties
                      }
                      tabIndex={0}
                      role="button"
                      aria-label={`${sector.meta.label}: ${sector.seatCount > 0 ? `${sector.seatCount} мест` : 'нет мест в наличии'}`}
                      onPointerDown={(ev) => {
                        showSectorInfo(ev.currentTarget, sector);
                      }}
                      onPointerEnter={(ev) => {
                        const picked = mapZoomed ? pickSellableAtClient(ev.clientX, ev.clientY) : null;
                        if (picked) {
                          const probe = hoverProbeRef.current;
                          if (probe) {
                            const vpRect = viewportRef.current?.getBoundingClientRect();
                            if (vpRect) {
                              probe.style.left = `${ev.clientX - vpRect.left}px`;
                              probe.style.top = `${ev.clientY - vpRect.top}px`;
                            }
                            showSeatInfo(probe, {
                              key: picked.key,
                              offerId: picked.offerId,
                              sector: picked.sectorLabel,
                              row: picked.rowLabel,
                              seat: picked.seat,
                              priceKey: picked.priceKey,
                            });
                          }
                          return;
                        }
                        showSectorInfo(ev.currentTarget, sector);
                      }}
                      onPointerLeave={(ev) => {
                        if (ev.pointerType !== 'touch') hideSectorInfo();
                      }}
                      onFocus={(ev) => {
                        showSectorInfo(ev.currentTarget, sector);
                      }}
                      onBlur={hideSectorInfo}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        if (suppressMapClickRef.current) return;
                        if (mapZoomed) {
                          const picked = pickSellableAtClient(ev.clientX, ev.clientY);
                          if (picked) {
                            activatePlacementRef.current(picked);
                            return;
                          }
                        }
                        focusSector(sector);
                      }}
                    />
                  );
                })}
              </svg>
            ) : null}
            <div
              className={`${styles.seatLayer} ${useCanvasCompositing ? styles.seatLayerCanvasPick : ''}`}
              aria-hidden={useSvgNative ? nativePlacements.length === 0 : sorted.length === 0}
            >
              {!stadiumCanvasEnabled &&
              visibleBackgroundSeatCoordinates.length > 0 &&
              visibleBackgroundSeatCoordinates.length <= 4000 ? (
                <svg
                  className={styles.backgroundSeatLayer}
                  viewBox={`0 0 ${svgViewBox.width} ${svgViewBox.height}`}
                  preserveAspectRatio="xMidYMid meet"
                  aria-hidden="true"
                >
                  {visibleBackgroundSeatCoordinates.map((seat, index) => (
                    <circle
                      key={`bg-seat-${index}-${seat.xPct.toFixed(3)}-${seat.yPct.toFixed(3)}`}
                      className={styles.backgroundSeatDot}
                      cx={(seat.xPct / 100) * svgViewBox.width}
                      cy={(seat.yPct / 100) * svgViewBox.height}
                      r="7"
                    />
                  ))}
                </svg>
              ) : null}
              {visibleUnavailableNativeSeats.length > 0
                ? visibleUnavailableNativeSeats
                    .map((seat) => (
                      <span
                        key={`unavailable-${seatMapKey(seat.sector, seat.row, seat.seat)}`}
                        className={`${styles.seatDotUnavailable} ${
                          useSvgNative ? styles.seatDotUnavailableNative : ''
                        }`}
                        style={{ left: `${seat.xPct}%`, top: `${seat.yPct}%` }}
                        title={`${seat.sector} · ряд ${seat.row} · место ${seat.seat} — недоступно`}
                      />
                    ))
                : null}
              {useSvgNative && !useDelegatedSeatHits
                ? visibleNativePlacements.map((p) => {
                    const visualKey = p.key;
                    const active = selectedSeatDetails.some((d) => d.key === visualKey);
                    const bg = p.previewOnly ? DOM_UNIFORM_SEAT_ACCENT : colorForSeat(p.priceKey);
                    const seatInfo = {
                      key: visualKey,
                      offerId: p.offerId,
                      sector: p.sectorLabel,
                      row: p.rowLabel,
                      seat: p.seat,
                      priceKey: p.priceKey,
                    };
                    const stadiumLayerWidth = Math.round(svgViewBox.width);
                    const syncCanvasHitbox =
                      sectorMode.enabled && useSvgNative && useCanvasCompositing;
                    const hitboxPx = syncCanvasHitbox
                      ? stadiumSeatHitboxLayerPx(
                          zoom,
                          stadiumLayerWidth,
                          svgViewBox.width,
                          active,
                          mapZoomed,
                        )
                      : null;
                    const seatPos = { left: `${p.xPct}%`, top: `${p.yPct}%` };
                    if (p.previewOnly) {
                      return (
                        <span
                          key={p.key}
                          className={`${styles.seatDot} ${styles.seatDotNative} ${styles.seatDotNonInteractive} ${
                            sectorMode.enabled ? styles.seatDotStadium : ''
                          } ${sectorMode.enabled && !selectedSector ? styles.seatDotOverview : ''} ${
                            uniformDomOverlayGhost ? styles.seatDotUniformCanvasGhost : ''
                          } ${syncCanvasHitbox ? styles.seatDotStadiumHitbox : ''}`}
                          style={
                            {
                              ...seatPos,
                              '--seat-accent': bg,
                              ...(hitboxPx != null
                                ? { width: `${hitboxPx}px`, height: `${hitboxPx}px` }
                                : null),
                            } as React.CSSProperties
                          }
                          title={p.title}
                          aria-hidden
                        >
                          <span className={styles.seatDotLabel}>{p.seat}</span>
                        </span>
                      );
                    }
                    return (
                      <button
                        key={p.key}
                        type="button"
                        data-seat-dot="true"
                        className={`${styles.seatDot} ${styles.seatDotNative} ${
                          sectorMode.enabled ? styles.seatDotStadium : ''
                        } ${
                          useCanvasCompositing ? styles.seatDotCanvasHit : ''
                        } ${uniformDomOverlayGhost ? styles.seatDotUniformCanvas : ''} ${
                          sectorMode.enabled && !selectedSector && !syncCanvasHitbox
                            ? styles.seatDotOverview
                            : ''
                        } ${active ? styles.seatDotOn : ''} ${
                          syncCanvasHitbox ? styles.seatDotStadiumHitbox : ''
                        } ${
                          sectorMode.enabled && !mapZoomed ? styles.seatDotNoPickAtOverview : ''
                        }`}
                        style={
                          {
                            ...seatPos,
                            '--seat-accent': bg,
                            ...(hitboxPx != null
                              ? { width: `${hitboxPx}px`, height: `${hitboxPx}px` }
                              : null),
                          } as React.CSSProperties
                        }
                        aria-label={p.title}
                        onPointerDown={(ev) => {
                          ev.stopPropagation();
                          showSeatInfo(ev.currentTarget, seatInfo);
                        }}
                        onPointerEnter={(ev) => {
                          showSeatInfo(ev.currentTarget, seatInfo);
                        }}
                        onPointerLeave={(ev) => {
                          if (ev.pointerType !== 'touch') hideSeatInfo();
                        }}
                        onFocus={(ev) => {
                          showSeatInfo(ev.currentTarget, seatInfo);
                        }}
                        onBlur={hideSeatInfo}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          if (sectorMode.enabled && !mapZoomed) {
                            focusClickPoint(ev.clientX, ev.clientY);
                            return;
                          }
                          showSeatInfo(ev.currentTarget, seatInfo);
                          updateSelectedDetails(seatInfo, p.available);
                          if (!onSelectionChange) onToggleSeat(p.offerId, p.seat, p.available);
                        }}
                      >
                        {active && !uniformDomOverlayGhost ? <span className={styles.seatDotCheck}>✓</span> : null}
                        <span className={styles.seatDotLabel}>{p.seat}</span>
                      </button>
                    );
                  })
                : null}
              {!useSvgNative
                ? sorted.map((row, rowIdx) => {
                    const oid = String(row.Id ?? '');
                    const seats = Array.isArray(row.SeatList) ? row.SeatList.map(String) : [];
                    const pk = getPriceKey(row);
                    const bg = colorForSeat(pk);
                    const n = seats.length;
                    const offset = (maxSeatsInAnyRow - n) / 2;
                    return seats.map((seat, j) => {
                      const gx = overlay.x + overlay.w * ((offset + j + 0.5) / maxSeatsInAnyRow);
                      const gy = overlay.y + overlay.h * ((rowIdx + 0.5) / numRows);
                      const visualKey = selectionSeatKey(oid, row.Row, seat);
                      const active = selectedSeatDetails.some((d) => d.key === visualKey);
                      const seatInfo = {
                        key: visualKey,
                        offerId: oid,
                        sector: String(row.Sector ?? ''),
                        row: String(row.Row ?? ''),
                        seat,
                        priceKey: pk,
                      };
                      return (
                        <button
                          key={`${oid}-${seat}`}
                          type="button"
                          data-seat-dot="true"
                          className={`${styles.seatDot} ${active ? styles.seatDotOn : ''}`}
                          style={{ left: `${gx * 100}%`, top: `${gy * 100}%`, '--seat-accent': bg } as React.CSSProperties}
                          aria-label={`${row.Sector ?? ''} · ряд ${row.Row ?? ''} · место ${seat} · ${pk} ₽`}
                          onPointerDown={(ev) => {
                            ev.stopPropagation();
                            showSeatInfo(ev.currentTarget, seatInfo);
                          }}
                          onPointerEnter={(ev) => {
                            showSeatInfo(ev.currentTarget, seatInfo);
                          }}
                          onPointerLeave={(ev) => {
                            if (ev.pointerType !== 'touch') hideSeatInfo();
                          }}
                          onFocus={(ev) => {
                            showSeatInfo(ev.currentTarget, seatInfo);
                          }}
                          onBlur={hideSeatInfo}
                          onClick={(ev) => {
                            showSeatInfo(ev.currentTarget, seatInfo);
                            updateSelectedDetails(seatInfo, seats);
                            if (!onSelectionChange) onToggleSeat(oid, seat, seats);
                          }}
                        >
                          {active ? <span className={styles.seatDotCheck}>✓</span> : null}
                          <span className={styles.seatDotLabel}>{seat}</span>
                        </button>
                      );
                    });
                  })
                : null}
            </div>
          </div>
          {selectedSectorSummary && sectorPanelCollapsed ? (
            <button
              type="button"
              className={styles.sectorPanelRestore}
              onPointerDown={(ev) => ev.stopPropagation()}
              onClick={() => setSectorPanelCollapsed(false)}
            >
              Показать места
            </button>
          ) : null}
          {selectedSectorSummary && !sectorPanelCollapsed ? (
            <div className={styles.sectorPanel} data-sector-panel="true" onPointerDown={(ev) => ev.stopPropagation()}>
              <div className={styles.sectorPanelActions}>
                <button type="button" className={styles.sectorPanelClose} onClick={() => setSectorPanelCollapsed(true)}>
                  Скрыть
                </button>
                <button type="button" className={styles.sectorPanelClose} onClick={resetSectorFocus}>
                  Вся схема
                </button>
              </div>
              <div className={styles.sectorPanelTitle}>{selectedSectorSummary.meta.label}</div>
              <div className={styles.sectorPanelMeta}>
                {selectedSectorSummary.seatCount > 0
                  ? `${selectedSectorSummary.seatCount} мест`
                  : 'Нет мест в наличии'}{' '}
                {selectedSectorSummary.minPrice != null
                  ? `· ${formatRub(selectedSectorSummary.minPrice)}${
                      selectedSectorSummary.maxPrice && selectedSectorSummary.maxPrice !== selectedSectorSummary.minPrice
                        ? ` - ${formatRub(selectedSectorSummary.maxPrice)}`
                        : ''
                    }`
                  : ''}
              </div>
              <div className={styles.sectorOfferList}>
                {selectedSectorOffersWithSeats.length > 0 ? selectedSectorOffersWithSeats.map((offer) => {
                  const oid = String(offer.Id ?? '');
                  const seats = Array.isArray(offer.SeatList) ? offer.SeatList.map(String) : [];
                  const priceKey = getPriceKey(offer);
                  return (
                    <div key={`${oid}-${offer.Row ?? ''}`} className={styles.sectorOfferRow}>
                      <div className={styles.sectorOfferHead}>
                        <span>Ряд {offer.Row ?? '—'}</span>
                        <strong>{formatRub(Number(priceKey))}</strong>
                      </div>
                      <div className={styles.sectorSeatButtons}>
                        {seats.map((seat) => {
                          const detail = {
                            key: selectionSeatKey(oid, offer.Row, seat),
                            offerId: oid,
                            sector: String(offer.Sector ?? selectedSectorSummary.meta.label),
                            row: String(offer.Row ?? ''),
                            seat,
                            priceKey,
                          };
                          const active = selectedSeatDetails.some((d) => d.key === detail.key);
                          return (
                            <button
                              key={seat}
                              type="button"
                              className={`${styles.sectorSeatButton} ${active ? styles.sectorSeatButtonActive : ''}`}
                              onClick={() => updateSelectedDetails(detail, seats)}
                            >
                              {seat}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                }) : (
                  <div className={styles.sectorOfferEmpty}>
                    Сейчас в этом секторе нет доступных мест для бронирования.
                  </div>
                )}
              </div>
            </div>
          ) : null}
          {selectedSeatDetails.length > 0 && !hideSelectionBar ? (
            <div className={styles.selectionBar}>
              {onClearSelection ? (
                <IconButton
                  className={styles.selectionClose}
                  size="small"
                  aria-label="Сбросить выбранные места"
                  onClick={clearSelection}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              ) : null}
              <div className={styles.selectionSummary}>
                <div className={styles.selectionCount}>
                  {selectedPlacesText}
                </div>
                <div className={styles.selectionText}>
                  {selectionMetaText}
                </div>
              </div>
              <div className={styles.selectionActions}>
                <div className={styles.selectionTotal}>{formatRub(selectedTotal)}</div>
                {onReserveFromMap ? (
                  <Button variant="contained" size="small" disabled={reservePending} onClick={() => onReserveFromMap()}>
                    {reservePending ? 'Бронирование…' : 'Забронировать'}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {mapPreparing ? (
        <div className={styles.mapPreloader} aria-live="polite" aria-label="Схема загружается">
          <div className={styles.mapPreloaderCard}>
            <span className={styles.mapPreloaderSpinner} aria-hidden="true" />
            <span>Загрузка схемы</span>
          </div>
        </div>
      ) : null}

      <Popper
        open={Boolean(hoverAnchor && hoverSeat)}
        anchorEl={hoverAnchor}
        placement="top"
        modifiers={[{ name: 'offset', options: { offset: [0, 8] } }]}
        sx={{ zIndex: 1600 }}
      >
        {hoverSeat && (
          <Paper elevation={4} sx={{ p: 1.25, maxWidth: 280, borderRadius: 2 }}>
            <Typography variant="body2" sx={{ lineHeight: 1.45 }}>
              <strong>{hoverSeat.sector || 'Сектор'}</strong>, {hoverSeat.row || '—'} ряд, место{' '}
              {hoverSeat.seat}, цена{' '}
              <strong>{formatRub(Number(hoverSeat.priceKey))}</strong>
            </Typography>
          </Paper>
        )}
      </Popper>

      <Popper
        open={Boolean(hoverSectorAnchor && hoverSector)}
        anchorEl={hoverSectorAnchor as HTMLElement | null}
        placement="top"
        modifiers={[{ name: 'offset', options: { offset: [0, 10] } }]}
        sx={{ zIndex: 30 }}
      >
        {hoverSector && (
          <Paper elevation={4} sx={{ p: 1.35, maxWidth: 260, borderRadius: 2 }}>
            <Typography variant="body2" sx={{ lineHeight: 1.45, color: 'rgba(0,0,0,0.82)' }}>
              <span style={{ color: 'rgba(0,0,0,0.5)' }}>
                {hoverSector.seatCount > 0 ? `${hoverSector.seatCount} свободных мест` : 'Нет мест в наличии'}
              </span>
              <br />
              <strong>{hoverSector.meta.label}</strong>
              <br />
              <strong>
                {hoverSector.minPrice != null
                  ? `${formatRub(hoverSector.minPrice)}${
                      hoverSector.maxPrice && hoverSector.maxPrice !== hoverSector.minPrice
                        ? ` - ${formatRub(hoverSector.maxPrice)}`
                        : ''
                    }`
                  : 'Цена уточняется'}
              </strong>
            </Typography>
          </Paper>
        )}
      </Popper>
    </div>
  );
}
