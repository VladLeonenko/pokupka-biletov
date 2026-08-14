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
  sectorMatchScore,
  stripSvgSeatCirclesForBackdrop,
  type OfferLike,
  type SvgNativePlacement,
  type SvgNativeSeat,
} from '../../utils/svgNativeSeatLayout';
import styles from './TicketHallInteractiveBlock.module.css';

/** Совпадает с фоновой заливкой точек чаши на canvas (dense hall). */
const CANVAS_HALL_SEAT_DOT_FILL = 'rgba(148, 163, 184, 0.72)';
/** Маркер без оффера / превью схемы в DOM (slate ≈ rgb(148,163,184)); офферы — colorForSeat. */
const DOM_UNIFORM_SEAT_ACCENT = '#94a3b8';
/** Подложка при zoom — без grayscale, поле остаётся зелёным. */
const CANVAS_ZOOMED_BACKDROP_FILTER = 'saturate(1.1) contrast(1.03) brightness(1.02)';

/** Радиус sellable-точки на canvas (px viewport), как Лужники: w = layerWidth * zoom. */
function stadiumSeatCanvasRadiusPx(
  zoom: number,
  layerWidth: number,
  svgViewBoxWidth: number,
  active: boolean,
  mapZoomed: boolean,
): number {
  const w = layerWidth * zoom;
  const baseR = Math.max(2.6, Math.min(6, (w / Math.max(1, svgViewBoxWidth)) * 10));
  let r = active ? baseR * 0.68 : baseR;
  /** На обзоре 100% — в 2× меньше (эталон стадиона). */
  if (!mapZoomed) {
    r *= 0.5;
    r = Math.max(active ? 1.2 : 1.3, r);
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
  previewImageUrl?: string | null;
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

function hallBackgroundSeatRadiusPx(scalePx: number, dense: boolean): number {
  return dense
    ? Math.max(0.5, Math.min(1.75, scalePx * 3.6))
    : Math.max(0.85, Math.min(2.6, scalePx * 5.5));
}

/** Серые точки театра (МХТ/Вахтангов): плотные мелкие, не «blobs» как stadium bowl. */
function theaterBackgroundSeatRadiusPx(scalePx: number, seatCount: number): number {
  const dense = seatCount >= 600;
  const r = dense
    ? Math.max(0.55, Math.min(1.35, scalePx * 2.8))
    : Math.max(0.7, Math.min(1.65, scalePx * 3.4));
  return r;
}

type BackgroundArcLayout = {
  left: number;
  top: number;
  screenW: number;
  screenH: number;
};

type PctBox = { x0: number; y0: number; x1: number; y1: number };

function pointInPctBoxes(xPct: number, yPct: number, boxes: PctBox[]): boolean {
  for (let i = 0; i < boxes.length; i += 1) {
    const b = boxes[i];
    if (xPct >= b.x0 && xPct <= b.x1 && yPct >= b.y0 && yPct <= b.y1) return true;
  }
  return false;
}

function drawHallBackgroundArcs(
  ctx: CanvasRenderingContext2D,
  seats: BackgroundSeatCoordinate[] | Float32Array,
  layout: BackgroundArcLayout,
  viewportWidth: number,
  viewportHeight: number,
  svgViewBoxWidth: number,
  dense: boolean,
  excludePctBoxes: PctBox[] = [],
): void {
  const { left, top, screenW, screenH } = layout;
  const scalePx = screenW / Math.max(1, svgViewBoxWidth);
  const r = hallBackgroundSeatRadiusPx(scalePx, dense);
  ctx.fillStyle = CANVAS_HALL_SEAT_DOT_FILL;
  ctx.beginPath();
  const limW = viewportWidth + 14;
  const limH = viewportHeight + 14;
  const skipField = excludePctBoxes.length > 0;

  if (seats instanceof Float32Array) {
    for (let i = 0; i < seats.length; i += 2) {
      const xPct = seats[i];
      const yPct = seats[i + 1];
      if (skipField && pointInPctBoxes(xPct, yPct, excludePctBoxes)) continue;
      const sx = left + (xPct / 100) * screenW;
      const sy = top + (yPct / 100) * screenH;
      if (sx < -8 || sy < -8 || sx > limW || sy > limH) continue;
      ctx.moveTo(sx + r, sy);
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
    }
  } else {
    for (const seat of seats) {
      if (skipField && pointInPctBoxes(seat.xPct, seat.yPct, excludePctBoxes)) continue;
      const sx = left + (seat.xPct / 100) * screenW;
      const sy = top + (seat.yPct / 100) * screenH;
      if (sx < -8 || sy < -8 || sx > limW || sy > limH) continue;
      ctx.moveTo(sx + r, sy);
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
    }
  }
  ctx.fill();
}

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
      if (Array.isArray(item)) {
        const x = Number(item[0]);
        const y = Number(item[1]);
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        const xPct = x >= 0 && x <= 1 ? x * 100 : x;
        const yPct = y >= 0 && y <= 1 ? y * 100 : y;
        if (xPct < 0 || xPct > 100 || yPct < 0 || yPct > 100) continue;
        out.push({ xPct, yPct });
        continue;
      }
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

/**
 * Серая чаша из layout.seats.
 * Театр (Вахтангов): всегда — иначе при живых офферах видны только sellable и зал «пустой».
 * Стадион / прочее: только пока нет офферов (или seatSelectionDisabled).
 */
function parseGrayHallWhenNoOffers(
  layout: unknown,
  seatSelectionDisabled: boolean,
  hasLiveOffers: boolean,
): boolean {
  if (!layout || typeof layout !== 'object') {
    return hasLiveOffers ? false : seatSelectionDisabled;
  }
  const r = layout as Record<string, unknown>;
  if (r.grayHallWhenNoOffers === false) return false;
  const isTheater = String(r.hallKind || '').trim().toLowerCase() === 'theater';
  if (isTheater && r.grayHallWhenNoOffers === true) return true;
  if (hasLiveOffers) return false;
  if (r.grayHallWhenNoOffers === true) return true;
  return seatSelectionDisabled;
}

/** Стадион (Лужники): тысячи фоновых точек; театр — компактная схема. */
function isStadiumScaleHallLayout(layout: unknown): boolean {
  const r = layout && typeof layout === 'object' ? (layout as Record<string, unknown>) : null;
  if (!r) return false;
  if (
    r.stadiumMapKey === 'luzhniki-football' ||
    r.stadiumMapKey === 'luzhniki-concert' ||
    r.stadiumMapKey === 'supercup-nn-football'
  ) {
    return true;
  }
  const bg = r.allSeatCoordinates;
  if (Array.isArray(bg) && bg.length > 8000) return true;
  return false;
}

/** Цвета уровней театра на обзоре 100% — читаемые зоны, не «белый лист». */
function theaterLevelAccent(label: string): string {
  const s = normalizeTheaterSectorKey(label);
  if (s.includes('бенуар')) return '#db2777';
  if (s.includes('ложа') && s.includes('балкон')) return '#7c3aed';
  if (s.includes('ложа') && (s.includes('бельэтаж') || s.includes('бельетаж'))) return '#d97706';
  if (s.includes('ложа')) return '#c026d3';
  if (s.includes('балкон')) return '#7c3aed';
  if (s.includes('бельэтаж') || s.includes('бельетаж')) return '#d97706';
  if (s.includes('амфитеатр')) return '#059669';
  if (s.includes('партер')) return '#2563eb';
  return '#64748b';
}

/**
 * Вахтангов и часть выгрузок: латиница-«близнецы» в именах секторов (пaptep → партер).
 * Без нормализации заливка не матчится и сыпется серыми плитками.
 */
function normalizeTheaterSectorKey(label: string): string {
  return String(label || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    // Латиница, визуально похожая на кириллицу в выгрузках GetBilet/Portal.
    .replace(/a/g, 'а')
    .replace(/b/g, 'б')
    .replace(/c/g, 'с')
    .replace(/e/g, 'е')
    .replace(/h/g, 'н')
    .replace(/k/g, 'к')
    .replace(/m/g, 'м')
    .replace(/o/g, 'о')
    .replace(/p/g, 'р')
    .replace(/t/g, 'т')
    .replace(/x/g, 'х')
    .replace(/y/g, 'у');
}

/**
 * Группа заливки: один уровень зала = один фон.
 * Ложи лев/прав не склеиваем в один AABB через весь зал.
 */
function theaterLevelFillGroup(label: string): { key: string; displayLabel: string } {
  const s = normalizeTheaterSectorKey(label);
  const compact = s.replace(/\s+/g, '');
  const side = /лев/.test(s) ? ' левая' : /прав/.test(s) ? ' правая' : '';

  if (compact.includes('ложа') && compact.includes('бенуар')) {
    return { key: `lozha-benuar${side}`, displayLabel: `Ложи бенуара${side}`.trim() };
  }
  if (compact.includes('ложа') && (compact.includes('бельэтаж') || compact.includes('бельетаж'))) {
    return { key: `lozha-beletazh${side}`, displayLabel: `Ложи бельэтажа${side}`.trim() };
  }
  if (compact.includes('ложа') && compact.includes('балкон')) {
    return { key: `lozha-balkon${side}`, displayLabel: `Ложи балкона${side}`.trim() };
  }
  if (compact.includes('балкон')) {
    return { key: 'balkon', displayLabel: 'Балкон' };
  }
  if (compact.includes('бельэтаж') || compact.includes('бельетаж')) {
    return { key: 'beletazh', displayLabel: 'Бельэтаж' };
  }
  if (compact.includes('амфитеатр')) {
    return { key: 'amfiteatr', displayLabel: 'Амфитеатр' };
  }
  if (compact.includes('партер')) {
    return { key: 'parter', displayLabel: 'Партер' };
  }
  const raw = String(label || '').trim() || 'Зал';
  return { key: `other:${normalizeTheaterSectorKey(raw)}`, displayLabel: raw };
}

/** Макс. zoom относительно fit (2 = 200%). layout_json.maxZoomMultiplier; театры — 2× по умолчанию. */
function parseMaxZoomMultiplier(
  layout: unknown,
  sectorModeEnabled: boolean,
  isCoarsePointer: boolean,
): number {
  const r = layout && typeof layout === 'object' ? (layout as Record<string, unknown>) : null;
  const raw = r?.maxZoomMultiplier;
  const n = typeof raw === 'number' ? raw : Number.parseFloat(String(raw ?? ''));
  if (Number.isFinite(n) && n >= 1) return n;
  if (sectorModeEnabled && !isStadiumScaleHallLayout(layout)) return 2;
  if (sectorModeEnabled) return isCoarsePointer ? 28 : 12;
  return isCoarsePointer ? 18 : 8;
}

/** Zoom при клике по сектору (не zoom-to-fill bbox). */
function parseSectorFocusZoomMultiplier(layout: unknown, maxZoomMultiplier: number): number {
  const r = layout && typeof layout === 'object' ? (layout as Record<string, unknown>) : null;
  const raw = r?.sectorFocusZoomMultiplier;
  const n = typeof raw === 'number' ? raw : Number.parseFloat(String(raw ?? ''));
  if (Number.isFinite(n) && n >= 1) return Math.min(n, maxZoomMultiplier);
  if (!isStadiumScaleHallLayout(layout)) return Math.min(2, maxZoomMultiplier);
  return maxZoomMultiplier;
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
          /** Театр без path (Вахтангов) — сектор всё равно нужен для матчинга офферов; заливка только при path. */
          if (!id || !label) return null;
          if (!path && String((layout as Record<string, unknown>).hallKind || '').toLowerCase() !== 'theater') {
            return null;
          }
          const minPrice = Number(s.minPrice);
          const maxPrice = Number(s.maxPrice);
          const previewImageUrl = String(s.previewImageUrl ?? '').trim() || null;
          return {
            id,
            label,
            path,
            availableSeats: Number(s.availableSeats) || 0,
            minPrice: Number.isFinite(minPrice) ? minPrice : null,
            maxPrice: Number.isFinite(maxPrice) ? maxPrice : null,
            previewImageUrl,
          };
        })
        .filter(Boolean) as SectorMeta[]
    : [];
  return { enabled: record.enabled === true && sectors.length > 0, sectors };
}

function resolveHallPreviewImageUrl(
  raw: string | null | undefined,
  fallbacks: (string | null | undefined)[],
): string | null {
  const candidates = [raw, ...fallbacks];
  for (const item of candidates) {
    const s = String(item ?? '').trim();
    if (!s) continue;
    if (/^https?:\/\//i.test(s)) return s;
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${s.startsWith('/') ? '' : '/'}${s}`;
    }
    return s;
  }
  return null;
}

import {
  buildLabeledSeatIndex,
  labeledSeatLookupKeys,
  lookupLabeledSeat,
} from '@/utils/hallSeatSeatLookup';
import {
  hallBackgroundDotsUrlFromRaster,
  isConcertZoneOnlySectorLabel,
  isLuzhnikiConcertFieldZoneLabel,
  parseDisableHallBackgroundDots,
  parseHallBackgroundRasterUrl,
  parseHallMapFieldMasks,
  parseMaskFieldBackgroundDots,
  parseOmitClientSeatCoordinateCloud,
  parsePbiletCategoryCheckout,
  parseShowSeatsAtOverview,
} from '@/utils/luzhnikiStadiumMap';
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

function parseSvgViewBox(svg: string): {
  value: string;
  minX: number;
  minY: number;
  width: number;
  height: number;
} {
  const viewBox = svg.match(/\bviewBox=["']([^"']+)["']/i)?.[1];
  if (viewBox) {
    const parts = viewBox.trim().split(/[\s,]+/).map(Number);
    if (parts.length >= 4 && parts.every(Number.isFinite) && parts[2] > 0 && parts[3] > 0) {
      return {
        value: viewBox,
        minX: parts[0],
        minY: parts[1],
        width: parts[2],
        height: parts[3],
      };
    }
  }
  const width = Number(svg.match(/\bwidth=["']([^"']+)["']/i)?.[1]);
  const height = Number(svg.match(/\bheight=["']([^"']+)["']/i)?.[1]);
  if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
    return { value: `0 0 ${width} ${height}`, minX: 0, minY: 0, width, height };
  }
  return { value: '0 0 100 100', minX: 0, minY: 0, width: 100, height: 100 };
}

/**
 * Заливка уровней на 100%: ровно один скруглённый фон на уровень
 * (Партер / Амфитеатр / …), без нарезки на плитки по gap.
 */
function buildTheaterLevelAabbFills(
  seats: SvgNativeSeat[],
  vb: { minX: number; minY: number; width: number; height: number },
): { id: string; label: string; path: string }[] {
  if (seats.length < 2 || !(vb.width > 0) || !(vb.height > 0)) return [];

  const byGroup = new Map<string, { displayLabel: string; seats: SvgNativeSeat[] }>();
  for (const seat of seats) {
    const raw = String(seat.sector || '').trim();
    if (!raw) continue;
    const { key, displayLabel } = theaterLevelFillGroup(raw);
    const bucket = byGroup.get(key);
    if (bucket) bucket.seats.push(seat);
    else byGroup.set(key, { displayLabel, seats: [seat] });
  }

  /** Небольшой запас; без overlap-плиток соседних кусков одного сектора. */
  const padPct = 1.15;
  const out: { id: string; label: string; path: string }[] = [];
  let seq = 0;

  for (const { displayLabel, seats: group } of byGroup.values()) {
    if (group.length < 1) continue;
    let minXp = Infinity;
    let minYp = Infinity;
    let maxXp = -Infinity;
    let maxYp = -Infinity;
    for (const s of group) {
      minXp = Math.min(minXp, s.xPct);
      minYp = Math.min(minYp, s.yPct);
      maxXp = Math.max(maxXp, s.xPct);
      maxYp = Math.max(maxYp, s.yPct);
    }
    minXp -= padPct;
    minYp -= padPct;
    maxXp += padPct;
    maxYp += padPct;
    const x0 = vb.minX + (minXp / 100) * vb.width;
    const y0 = vb.minY + (minYp / 100) * vb.height;
    const x1 = vb.minX + (maxXp / 100) * vb.width;
    const y1 = vb.minY + (maxYp / 100) * vb.height;
    const w = Math.max(0.5, x1 - x0);
    const h = Math.max(0.5, y1 - y0);
    const radius = Math.min(w, h) * 0.14;
    out.push({
      id: `theater-fill-${seq++}`,
      label: displayLabel,
      path: roundedRectPath(x0, y0, x1, y1, radius),
    });
  }

  return out;
}

function roundedRectPath(x0: number, y0: number, x1: number, y1: number, r: number): string {
  const w = x1 - x0;
  const h = y1 - y0;
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  if (rr < 0.2) {
    return `M ${x0.toFixed(2)} ${y0.toFixed(2)} L ${x1.toFixed(2)} ${y0.toFixed(2)} L ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x0.toFixed(2)} ${y1.toFixed(2)} Z`;
  }
  return [
    `M ${(x0 + rr).toFixed(2)} ${y0.toFixed(2)}`,
    `L ${(x1 - rr).toFixed(2)} ${y0.toFixed(2)}`,
    `Q ${x1.toFixed(2)} ${y0.toFixed(2)} ${x1.toFixed(2)} ${(y0 + rr).toFixed(2)}`,
    `L ${x1.toFixed(2)} ${(y1 - rr).toFixed(2)}`,
    `Q ${x1.toFixed(2)} ${y1.toFixed(2)} ${(x1 - rr).toFixed(2)} ${y1.toFixed(2)}`,
    `L ${(x0 + rr).toFixed(2)} ${y1.toFixed(2)}`,
    `Q ${x0.toFixed(2)} ${y1.toFixed(2)} ${x0.toFixed(2)} ${(y1 - rr).toFixed(2)}`,
    `L ${x0.toFixed(2)} ${(y0 + rr).toFixed(2)}`,
    `Q ${x0.toFixed(2)} ${y0.toFixed(2)} ${(x0 + rr).toFixed(2)} ${y0.toFixed(2)}`,
    'Z',
  ].join(' ');
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

type Props = {
  hallSvgHtml: string;
  layoutJson: unknown;
  offers: HallOfferRow[];
  getPriceKey: (o: HallOfferRow) => string;
  colorForSeat: (priceKey: string) => string;
  activeOfferId: string | null;
  selectedSeats: string[];
  /**
   * Восстановление деталей выбора с родителя (корзина / sessionStorage).
   * Схема сама владеет selectedSeatDetails при кликах; это только hydrate, когда локально пусто.
   */
  parentSelectedSeats?: HallSelectedSeat[];
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
  /** Фото вида с трибуны в модалке категории (Portalbilet-style) */
  categoryPreviewImageUrl?: string | null;
  /** Короткая дата сеанса в модалке, напр. «18.07» */
  sessionDateLabel?: string | null;
  /** Тост «Требуется Fan ID» поверх схемы */
  showFanIdNotice?: boolean;
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
  parentSelectedSeats = undefined,
  onToggleSeat,
  selectedOffer = null,
  onReserveFromMap,
  onClearSelection,
  onSelectionChange,
  reservePending = false,
  variant = 'page',
  hideSelectionBar = false,
  focusSectorNorm = null,
  categoryPreviewImageUrl = null,
  sessionDateLabel = null,
  showFanIdNotice = false,
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
  const hallMapLabels = useMemo(() => {
    if (!layoutJson || typeof layoutJson !== 'object') return [];
    const raw = (layoutJson as Record<string, unknown>).hallMapLabels;
    if (!Array.isArray(raw)) return [];
    return raw
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const r = item as Record<string, unknown>;
        const text = String(r.text ?? '').trim();
        const x = Number(r.x);
        const y = Number(r.y);
        const fontSize = Number(r.fontSize);
        if (!text || !Number.isFinite(x) || !Number.isFinite(y)) return null;
        return {
          text,
          x,
          y,
          fontSize: Number.isFinite(fontSize) && fontSize > 0 ? fontSize : 180,
        };
      })
      .filter((x): x is { text: string; x: number; y: number; fontSize: number } => Boolean(x));
  }, [layoutJson]);
  const hallMapFieldMasks = useMemo(() => parseHallMapFieldMasks(layoutJson), [layoutJson]);
  const maskFieldBackgroundDots = useMemo(
    () => parseMaskFieldBackgroundDots(layoutJson),
    [layoutJson],
  );
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
  const layoutSeats = useMemo(() => parseLayoutSeatPositions(layoutJson), [layoutJson]);
  const sellableSeatsFromLayout = useMemo(
    () => parseLayoutSeatPositions(
      layoutJson && typeof layoutJson === 'object'
        ? { seats: (layoutJson as Record<string, unknown>).sellableSeats }
        : null,
    ),
    [layoutJson],
  );
  const backgroundSeatCoordinates = useMemo(() => parseBackgroundSeatCoordinates(layoutJson), [layoutJson]);
  const hallBackgroundRasterUrl = useMemo(
    () => parseHallBackgroundRasterUrl(layoutJson),
    [layoutJson],
  );
  const omitClientSeatCoordinateCloud = useMemo(
    () => parseOmitClientSeatCoordinateCloud(layoutJson),
    [layoutJson],
  );
  const pbiletCategoryCheckout = useMemo(
    () => parsePbiletCategoryCheckout(layoutJson),
    [layoutJson],
  );
  const showSeatsAtOverview = useMemo(() => parseShowSeatsAtOverview(layoutJson), [layoutJson]);
  /** Portalbilet NN / pbilet 1800: только полигоны категорий, без grid-точек по офферам. */
  const categorySectorOnlyCheckout = pbiletCategoryCheckout && sectorMode.enabled;
  const isZoneOnlySector = useCallback(
    (label: string) => isConcertZoneOnlySectorLabel(label, layoutJson),
    [layoutJson],
  );
  /** Серая чаша при zoom: координаты из bundle редактора (API), не статический dots.bin. */
  const preferBundleBackgroundDots = useMemo(() => {
    if (!layoutJson || typeof layoutJson !== 'object') return false;
    const rec = layoutJson as Record<string, unknown>;
    return (
      omitClientSeatCoordinateCloud &&
      backgroundSeatCoordinates.length >= 100 &&
      rec.sellableSeatsFromLiveOffers === true &&
      rec.sellableGeodesyMode === 'manualBundleFast'
    );
  }, [layoutJson, omitClientSeatCoordinateCloud, backgroundSeatCoordinates.length]);
  const useHallBackgroundRaster = Boolean(
    hallBackgroundRasterUrl
    && (omitClientSeatCoordinateCloud || backgroundSeatCoordinates.length < 1),
  );
  const disableHallBackgroundDots = useMemo(
    () => parseDisableHallBackgroundDots(layoutJson),
    [layoutJson],
  );
  const hallBackgroundDotsUrl = useMemo(() => {
    if (disableHallBackgroundDots) return null;
    return hallBackgroundDotsUrlFromRaster(hallBackgroundRasterUrl);
  }, [disableHallBackgroundDots, hallBackgroundRasterUrl]);
  const nativeProcessed = useMemo(() => processHallSvgForNative(hallSvgHtml), [hallSvgHtml]);
  /**
   * Театр из layout_json ИЛИ fallback по SVG-местам (если seed затёр hallKind —
   * всё равно canvas + заливка уровней, как эталон МХТ).
   */
  const theaterSectorCheckout = useMemo(() => {
    if (isStadiumScaleHallLayout(layoutJson)) return false;
    if (layoutJson && typeof layoutJson === 'object') {
      const r = layoutJson as Record<string, unknown>;
      if (r.luzhnikiStadiumCheckout === true || r.pbiletCategoryCheckout === true) return false;
      if (String(r.hallKind || '').trim().toLowerCase() === 'theater' && sectorMode.enabled) {
        return true;
      }
    }
    /** Fallback только если seed затёр hallKind, а в SVG уже театр (партер/амфитеатр/…). */
    const svgSeats = nativeProcessed?.seats ?? [];
    if (svgSeats.length < 100) return false;
    const sample = svgSeats
      .slice(0, 80)
      .map((s) => String(s.sector || '').toLowerCase())
      .join(' ');
    return /партер|амфитеатр|бельэтаж|бельетаж|балкон|бенуар|ложа/.test(sample);
  }, [layoutJson, sectorMode.enabled, nativeProcessed]);
  const preferLayoutSeatPositions = useMemo(
    () => parsePreferLayoutSeatPositions(layoutJson),
    [layoutJson],
  );
  /** Все театры (МХТ + Вахтангов): места/sellable одним canvas-стилем как на МХТ. */
  const theaterSvgSeatCanvas = theaterSectorCheckout;
  const nativeSeats = useMemo<SvgNativeSeat[]>(() => {
    if (preferLayoutSeatPositions && layoutSeats.length >= 2) return layoutSeats;
    if (sectorMode.enabled && layoutSeats.length < 2 && sellableSeatsFromLayout.length >= 2) return sellableSeatsFromLayout;
    const fromSvg = nativeProcessed?.seats ?? [];
    if (fromSvg.length >= 2) return fromSvg;
    if (layoutSeats.length >= 2) return layoutSeats;
    return [];
  }, [preferLayoutSeatPositions, layoutSeats, sectorMode.enabled, sellableSeatsFromLayout, nativeProcessed]);
  /**
   * Всегда брать подрезанный SVG из processHallSvgForNative, если круги есть.
   * Иначе при preferLayoutSeatPositions отдавался сырой SVG со style 1200×218 → «тонкая полоска».
   */
  const svgGeometryFromParsedCircles = useMemo(
    () => (nativeProcessed?.seats?.length ?? 0) >= 2,
    [nativeProcessed],
  );
  const useSvgNative =
    layoutMode !== 'grid' &&
    (layoutMode === 'svgNative' ||
      (layoutMode === 'auto' && nativeSeats.length >= 2));

  const svgHtmlSafe = useMemo(() => {
    if (!useSvgNative) return hallSvgHtml;
    if (svgGeometryFromParsedCircles && nativeProcessed?.svgHtml) return nativeProcessed.svgHtml;
    return hallSvgHtml;
  }, [hallSvgHtml, nativeProcessed, svgGeometryFromParsedCircles, useSvgNative]);

  /** viewBox от отображаемого SVG (после processHallSvgForNative). */
  const svgViewBox = useMemo(
    () => parseSvgViewBox(svgHtmlSafe || hallSvgHtml),
    [svgHtmlSafe, hallSvgHtml],
  );
  const fieldDotExcludePctBoxes = useMemo((): PctBox[] => {
    if (!maskFieldBackgroundDots || hallMapFieldMasks.length < 1) return [];
    const vw = Math.max(1, svgViewBox.width);
    const vh = Math.max(1, svgViewBox.height);
    const boxes: PctBox[] = [];
    for (const mask of hallMapFieldMasks) {
      if (
        Number.isFinite(mask.x) &&
        Number.isFinite(mask.y) &&
        Number.isFinite(mask.w) &&
        Number.isFinite(mask.h)
      ) {
        boxes.push({
          x0: ((mask.x as number) / vw) * 100,
          y0: ((mask.y as number) / vh) * 100,
          x1: (((mask.x as number) + (mask.w as number)) / vw) * 100,
          y1: (((mask.y as number) + (mask.h as number)) / vh) * 100,
        });
        continue;
      }
      if (!mask.path) continue;
      const bb = pathBBox(mask.path);
      if (!bb) continue;
      boxes.push({
        x0: (bb.minX / vw) * 100,
        y0: (bb.minY / vh) * 100,
        x1: (bb.maxX / vw) * 100,
        y1: (bb.maxY / vh) * 100,
      });
    }
    return boxes;
  }, [maskFieldBackgroundDots, hallMapFieldMasks, svgViewBox.width, svgViewBox.height]);

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
        const offerPrice = Number(getPriceKey(offer));
        for (const seat of list) {
          if (!seat.trim()) continue;
          for (const key of labeledSeatLookupKeys(offer.Sector, offer.Row, seat)) {
            const prev = offerBySeatKey.get(key);
            if (!prev || offerPrice > Number(getPriceKey(prev.offer))) {
              offerBySeatKey.set(key, { offer, seat, list });
            }
          }
        }
      }

      const placements: SvgNativePlacement[] = [];
      const placedBySvgKey = new Map<string, number>();

      const pushPlacement = (
        hit: SvgNativeSeat,
        offer: OfferLike,
        seat: string,
        list: string[],
      ) => {
        const oid = String(offer.Id ?? '');
        const svgKey = seatMapKey(hit.sector, hit.row, seat);
        const rowLabel = String(offer.Row ?? hit.row);
        const sectorLabel = String(offer.Sector ?? hit.sector);
        const priceKey = getPriceKey(offer);
        const nextPrice = Number(priceKey);
        const existingIdx = placedBySvgKey.get(svgKey);
        if (existingIdx != null) {
          const prev = placements[existingIdx];
          if (!prev || !(nextPrice > Number(prev.priceKey))) return;
          placements[existingIdx] = {
            svgKey,
            key: selectionSeatKey(oid, rowLabel, seat),
            offerId: oid,
            sectorLabel,
            seat,
            rowLabel,
            available: list,
            xPct: hit.xPct,
            yPct: hit.yPct,
            title: `${sectorLabel}, ${rowLabel} ряд, место ${seat}, цена ${formatRub(nextPrice)}`,
            priceKey,
          };
          return;
        }
        placedBySvgKey.set(svgKey, placements.length);
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
          title: `${sectorLabel}, ${rowLabel} ряд, место ${seat}, цена ${formatRub(nextPrice)}`,
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
        /** sellableSeats с API частичны — добираем strict match по layout.seats (pbilet). */
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
      let bestScore = 0;
      for (const meta of sectorMode.sectors) {
        if (sectorNormsMatch(offer.Sector, meta.label)) {
          key = normalizeSectorLabel(meta.label);
          bestScore = 100;
          break;
        }
        /** Театр/МХТ: GetBilet «бельэтаж, левая сторона» ↔ схема «Бельэтаж». */
        const score = sectorMatchScore(String(offer.Sector ?? ''), meta.label);
        if (score > bestScore) {
          bestScore = score;
          key = normalizeSectorLabel(meta.label);
        }
      }
      if (bestScore > 0 && bestScore < 55) key = null;
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
      const maxPrice = prices.length ? Math.max(...prices) : null;
      const minPrice = prices.length ? Math.min(...prices) : null;
      /** Танцпол/фанзона: единая цена = max среди селлеров. */
      const alignToMax = isLuzhnikiConcertFieldZoneLabel(meta.label);
      return {
        meta,
        offers: sectorOffers,
        /** Только живые офферы GetBilet — не снимок pbilet (meta.availableSeats) при пустом API. */
        seatCount,
        minPrice: alignToMax ? maxPrice : minPrice,
        maxPrice,
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

  /** Только заливка уровней на 100% — по координатам уже видимых мест. Места/sellable не трогаем. */
  const theaterOverviewFills = useMemo(() => {
    if (!theaterSectorCheckout || nativeSeats.length < 2) return [];
    return buildTheaterLevelAabbFills(nativeSeats, svgViewBox);
  }, [theaterSectorCheckout, nativeSeats, svgViewBox]);
  /**
   * Вахтангов и залы с готовыми кривыми path в layout — родная заливка секторов.
   * МХТ (AABB из seed / без preferLayout) — FE-подушки по уровням.
   */
  const useNativeTheaterSectorPaths = useMemo(() => {
    if (!theaterSectorCheckout) return false;
    if (preferLayoutSeatPositions) return true;
    const curved = sectorMode.sectors.filter((s) => {
      const p = String(s.path || '');
      return /[CcQqSs]/.test(p) || (p.match(/[Ll]/g) || []).length >= 6;
    }).length;
    return curved >= 3;
  }, [theaterSectorCheckout, preferLayoutSeatPositions, sectorMode.sectors]);

  const resolveSectorSummaryForLabel = useCallback(
    (label: string): SectorSummary | null => {
      const direct = sectorSummaryByLabel.get(normalizeSectorLabel(label));
      if (direct) return direct;
      let best: SectorSummary | null = null;
      let bestScore = 0;
      for (const summary of sectorSummaries) {
        const score = sectorMatchScore(label, summary.meta.label);
        if (score > bestScore) {
          bestScore = score;
          best = summary;
        }
      }
      return bestScore >= 55 ? best : null;
    },
    [sectorSummaries, sectorSummaryByLabel],
  );

  const viewportRef = useRef<HTMLDivElement>(null);
  const hoverProbeRef = useRef<HTMLDivElement>(null);
  const panInnerRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const placementsForHoverRef = useRef<SvgNativePlacement[]>([]);
  const probeSeatHoverRef = useRef<(clientX: number, clientY: number) => void>(() => {});
  const activatePlacementRef = useRef<(p: SvgNativePlacement) => void>(() => {});
  const touchSeatToggleRef = useRef<{ key: string; at: number } | null>(null);
  const touchSeatPressRef = useRef<{ key: string; x: number; y: number } | null>(null);
  const canvasImageRef = useRef<HTMLImageElement | null>(null);
  const hallRasterImageRef = useRef<HTMLImageElement | null>(null);
  const bowlDotsRef = useRef<Float32Array | null>(null);
  const bowlDotsLoadRef = useRef<Promise<void> | null>(null);
  const [canvasImageVersion, setCanvasImageVersion] = useState(0);
  const [hallRasterVersion, setHallRasterVersion] = useState(0);
  const [bowlDotsVersion, setBowlDotsVersion] = useState(0);
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
  const maxZoomMultiplier = useMemo(
    () => parseMaxZoomMultiplier(layoutJson, sectorMode.enabled, isCoarsePointer),
    [isCoarsePointer, layoutJson, sectorMode.enabled],
  );
  const sectorFocusZoomMultiplier = useMemo(
    () => parseSectorFocusZoomMultiplier(layoutJson, maxZoomMultiplier),
    [layoutJson, maxZoomMultiplier],
  );
  const maxZoom = fitZoom * maxZoomMultiplier;
  const sectorFocusZoom = fitZoom * sectorFocusZoomMultiplier;
  const clampZoom = useCallback((z: number) => Math.min(maxZoom || 4, Math.max(0.03, z)), [maxZoom]);
  const discreteZoomLevels = useMemo(
    () => {
      const baseMultipliers = sectorMode.enabled
        ? isCoarsePointer
          ? [1, 2, 3, 4, 6, 8, 12, 16, 20, 24, 28]
          : [1, 2, 3, 4, 6, 8, 10, 12]
        : isCoarsePointer
          ? [1, 2, 3, 4, 6, 8, 12, 16, 18]
          : [1, 2, 3, 4, 6, 8];
      const multipliers = baseMultipliers.filter((m) => m <= maxZoomMultiplier + 0.001);
      if (!multipliers.length || multipliers[multipliers.length - 1] < maxZoomMultiplier - 0.001) {
        multipliers.push(maxZoomMultiplier);
      }
      return multipliers.map((multiplier) => fitZoom * multiplier).map(clampZoom);
    },
    [clampZoom, fitZoom, isCoarsePointer, maxZoomMultiplier, sectorMode.enabled],
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
    setZoom(nextZoom);
    setPan(nextPan);
  }, []);

  const applyPan = useCallback((nextPan: Point) => {
    panRef.current = nextPan;
    setPan(nextPan);
  }, []);

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

  /**
   * Canvas+цветные sellable как на Лужниках — sectorMode или театр (в т.ч. SVG-fallback без layout).
   * Ширину слоя в px=viewBox не трогаем у театра (см. layersStyle + isStadiumScaleHallLayout).
   */
  const stadiumCanvasEnabled =
    (sectorMode.enabled || theaterSvgSeatCanvas)
    && svgViewBox.width > 100
    && svgViewBox.height > 100;

  /** Растр SVG подложки на canvas готов — только тогда скрываем DOM-SVG (иначе подложка «пропадает», остаются точки). */
  const [canvasBackdropReady, setCanvasBackdropReady] = useState(false);
  const useCanvasCompositing = stadiumCanvasEnabled && canvasBackdropReady;

  useEffect(() => {
    if (!stadiumCanvasEnabled || !svgHtmlSafe.trim()) {
      canvasImageRef.current = null;
      setCanvasBackdropReady(false);
      setCanvasImageVersion((v) => v + 1);
      return;
    }

    setCanvasBackdropReady(false);
    canvasImageRef.current = null;

    /** Без circle-мест: иначе SVG-точки + canvas sellable = ареолы. */
    const backdropSvg = stripSvgSeatCirclesForBackdrop(svgHtmlSafe);
    const blob = new Blob([backdropSvg], { type: 'image/svg+xml;charset=utf-8' });
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
    if (!useHallBackgroundRaster || !hallBackgroundRasterUrl) {
      hallRasterImageRef.current = null;
      setHallRasterVersion((v) => v + 1);
      return;
    }

    hallRasterImageRef.current = null;
    const img = new Image();
    img.decoding = 'async';
    let cancelled = false;

    const finalize = () => {
      if (cancelled) return;
      setHallRasterVersion((v) => v + 1);
    };

    img.onload = () => {
      if (cancelled) return;
      const ok = img.naturalWidth > 0 && img.naturalHeight > 0;
      hallRasterImageRef.current = ok ? img : null;
      finalize();
    };
    img.onerror = () => {
      if (cancelled) return;
      hallRasterImageRef.current = null;
      finalize();
    };
    img.src = hallBackgroundRasterUrl;

    return () => {
      cancelled = true;
      if (hallRasterImageRef.current === img) hallRasterImageRef.current = null;
    };
  }, [hallBackgroundRasterUrl, useHallBackgroundRaster]);

  useEffect(() => {
    if (!activeOfferId || selectedSeats.length === 0) {
      setSelectedSeatDetails((prev) => (prev.length === 0 ? prev : []));
      return;
    }
    if (!parentSelectedSeats || parentSelectedSeats.length === 0) return;
    setSelectedSeatDetails((prev) => (prev.length > 0 ? prev : parentSelectedSeats));
  }, [activeOfferId, selectedSeats.length, parentSelectedSeats]);

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
    applyCamera(nextZoom, {
      x: middle.x - vpRect.left - base.x - layerX * nextZoom,
      y: middle.y - vpRect.top - base.y - layerY * nextZoom,
    });
  }, [applyCamera, clampZoom, getLayerBase]);

  const onPointerDownPan = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-sector-panel="true"]')) return;
    if ((e.target as HTMLElement).closest('[data-seat-dot="true"]')) return;
    if ((e.target as HTMLElement).closest('[data-sector-path="true"]') && zoomRef.current <= fitZoomRef.current + 0.01) return;
    hideSeatInfo();
    hideSectorInfo();
    if (e.button !== 0 && e.pointerType !== 'touch') return;
    if (e.pointerType === 'touch') e.preventDefault();
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
      if (e.pointerType === 'touch') e.preventDefault();
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
        applyPan({
          x: d.ox + dx,
          y: d.oy + dy,
        });
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
    if (pointersRef.current.size === 0) setIsMapDragging(false);
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
    const vp = viewportRef.current;
    const layers = layersRef.current;
    if (!vp || !layers) {
      setSelectedSector(normalizeSectorLabel(sector.meta.label));
      return;
    }

    /**
     * Театр: камера по облаку мест уровня (path из seed часто крошечный AABB /
     * в чужих координатах → белая пустота на 200%).
     */
    const focusSeats = nativeSeats.filter((seat) => {
      if (theaterSectorCheckout) {
        return theaterLevelFillGroup(seat.sector).key === theaterLevelFillGroup(sector.meta.label).key;
      }
      return sectorNormsMatch(seat.sector, sector.meta.label);
    });
    if (focusSeats.length >= 2) {
      let minXp = Infinity;
      let minYp = Infinity;
      let maxXp = -Infinity;
      let maxYp = -Infinity;
      for (const seat of focusSeats) {
        minXp = Math.min(minXp, seat.xPct);
        minYp = Math.min(minYp, seat.yPct);
        maxXp = Math.max(maxXp, seat.xPct);
        maxYp = Math.max(maxYp, seat.yPct);
      }
      const centerX = (((minXp + maxXp) / 2) / 100) * layers.offsetWidth;
      const centerY = (((minYp + maxYp) / 2) / 100) * layers.offsetHeight;
      focusLayerPoint(centerX, centerY, sectorFocusZoom, sector.meta.label);
      return;
    }

    const bbox = pathBBox(sector.meta.path);
    if (!bbox) {
      setSelectedSector(normalizeSectorLabel(sector.meta.label));
      return;
    }
    const midX = (bbox.minX + bbox.maxX) / 2;
    const midY = (bbox.minY + bbox.maxY) / 2;
    const centerX = ((midX - svgViewBox.minX) / Math.max(1e-6, svgViewBox.width)) * layers.offsetWidth;
    const centerY = ((midY - svgViewBox.minY) / Math.max(1e-6, svgViewBox.height)) * layers.offsetHeight;
    focusLayerPoint(centerX, centerY, sectorFocusZoom, sector.meta.label);
  }, [
    focusLayerPoint,
    nativeSeats,
    sectorFocusZoom,
    svgViewBox.height,
    svgViewBox.minX,
    svgViewBox.minY,
    svgViewBox.width,
    theaterSectorCheckout,
  ]);

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

  const setCategoryOfferQty = useCallback(
    (offer: OfferLike, targetQty: number) => {
      const oid = String(offer.Id ?? '');
      const seats = Array.isArray(offer.SeatList) ? offer.SeatList.map(String) : [];
      const priceKey = getPriceKey(offer);
      const rowLabel = String(offer.Row ?? '');
      const sectorLabel = String(offer.Sector ?? selectedSector ?? '');
      const prefix = `${oid}|${rowLabel}|`;
      const clamped = Math.max(0, Math.min(targetQty, seats.length));
      setSelectedSeatDetails((prev) => {
        const kept = prev.filter((d) => !d.key.startsWith(prefix));
        const next = [...kept];
        for (let i = 0; i < clamped; i++) {
          const seat = seats[i];
          next.push({
            key: selectionSeatKey(oid, rowLabel, seat),
            offerId: oid,
            sector: sectorLabel,
            row: rowLabel,
            seat,
            priceKey,
          });
        }
        onSelectionChange?.(next);
        return next;
      });
    },
    [getPriceKey, onSelectionChange, selectedSector],
  );

  /** Танцпол/фанзона: qty из всех офферов зоны, цена = max среди селлеров. */
  const setFieldZoneQty = useCallback(
    (sectorOffers: OfferLike[], targetQty: number, alignPrice: number, sectorLabel: string) => {
      const priceKey = String(alignPrice);
      const sectorNorm = normalizeSectorLabel(sectorLabel);
      const sorted = [...sectorOffers]
        .filter((o) => Array.isArray(o.SeatList) && o.SeatList.length > 0)
        .sort((a, b) => Number(getPriceKey(b)) - Number(getPriceKey(a)));
      const totalSeats = sorted.reduce((sum, o) => sum + (o.SeatList?.length ?? 0), 0);
      const clamped = Math.max(0, Math.min(targetQty, totalSeats));
      setSelectedSeatDetails((prev) => {
        const kept = prev.filter((d) => normalizeSectorLabel(d.sector) !== sectorNorm);
        const next = [...kept];
        let remaining = clamped;
        for (const offer of sorted) {
          if (remaining <= 0) break;
          const oid = String(offer.Id ?? '');
          const seats = (offer.SeatList ?? []).map(String);
          const rowLabel = String(offer.Row ?? '');
          for (const seat of seats) {
            if (remaining <= 0) break;
            next.push({
              key: selectionSeatKey(oid, rowLabel, seat),
              offerId: oid,
              sector: sectorLabel,
              row: rowLabel,
              seat,
              priceKey,
            });
            remaining -= 1;
          }
        }
        onSelectionChange?.(next);
        return next;
      });
    },
    [getPriceKey, onSelectionChange],
  );

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
  const categoryDefaultPreviewUrl = useMemo(() => {
    if (!layoutJson || typeof layoutJson !== 'object') return null;
    const d = (layoutJson as Record<string, unknown>).categoryCheckoutDefaults;
    if (!d || typeof d !== 'object') return null;
    const url = String((d as Record<string, unknown>).previewImageUrl ?? '').trim();
    return url || null;
  }, [layoutJson]);
  const selectedSectorPreviewUrl = useMemo(() => {
    if (!selectedSectorSummary) return null;
    return resolveHallPreviewImageUrl(selectedSectorSummary.meta.previewImageUrl, [
      categoryDefaultPreviewUrl,
      categoryPreviewImageUrl,
    ]);
  }, [selectedSectorSummary, categoryDefaultPreviewUrl, categoryPreviewImageUrl]);
  const categoryModalSelectedCount = useMemo(() => {
    if (!selectedSectorSummary) return 0;
    const sectorNorm = normalizeSectorLabel(selectedSectorSummary.meta.label);
    return selectedSeatDetails.filter((d) => normalizeSectorLabel(d.sector) === sectorNorm).length;
  }, [selectedSeatDetails, selectedSectorSummary]);
  const categoryModalSelectedTotal = useMemo(() => {
    if (!selectedSectorSummary) return 0;
    const sectorNorm = normalizeSectorLabel(selectedSectorSummary.meta.label);
    return selectedSeatDetails
      .filter((d) => normalizeSectorLabel(d.sector) === sectorNorm)
      .reduce((sum, d) => {
        const price = Number(d.priceKey);
        return Number.isFinite(price) ? sum + price : sum;
      }, 0);
  }, [selectedSeatDetails, selectedSectorSummary]);
  const mapZoomed = zoom > fitZoom + 0.01;

  useEffect(() => {
    bowlDotsRef.current = null;
    bowlDotsLoadRef.current = null;
    setBowlDotsVersion((v) => v + 1);
  }, [hallBackgroundDotsUrl, preferBundleBackgroundDots]);

  useEffect(() => {
    if (!useHallBackgroundRaster || !hallBackgroundDotsUrl || !mapZoomed) return;
    if (preferBundleBackgroundDots) return;
    if (bowlDotsRef.current || bowlDotsLoadRef.current) return;

    let cancelled = false;
    bowlDotsLoadRef.current = fetch(hallBackgroundDotsUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`dots ${response.status}`);
        const ct = response.headers.get('content-type') || '';
        if (ct.includes('text/html')) throw new Error('dots html fallback');
        return response.arrayBuffer();
      })
      .then((buffer) => {
        if (cancelled || buffer.byteLength < 100_000) return;
        bowlDotsRef.current = new Float32Array(buffer);
        setBowlDotsVersion((v) => v + 1);
      })
      .catch(() => {
        /* zoom без vector dots — останется PNG fallback */
      })
      .finally(() => {
        bowlDotsLoadRef.current = null;
      });

    return () => {
      cancelled = true;
    };
  }, [hallBackgroundDotsUrl, mapZoomed, preferBundleBackgroundDots, useHallBackgroundRaster]);
  const selectedSectorOffers = useMemo(
    () => (selectedSectorSummary ? sortOffersForGrid(selectedSectorSummary.offers) : []),
    [selectedSectorSummary],
  );
  const selectedSectorOffersWithSeats = useMemo(
    () => selectedSectorOffers.filter((offer) => Array.isArray(offer.SeatList) && offer.SeatList.length > 0),
    [selectedSectorOffers],
  );
  const categoryModalRowsLabel = useMemo(() => {
    if (!selectedSectorSummary) return '';
    const rows = [
      ...new Set(
        selectedSectorOffersWithSeats
          .map((offer) => String(offer.Row ?? '').trim())
          .filter(Boolean),
      ),
    ];
    return rows.join(', ');
  }, [selectedSectorSummary, selectedSectorOffersWithSeats]);
  const zoneQuantityCheckout = Boolean(
    selectedSectorSummary && isZoneOnlySector(selectedSectorSummary.meta.label),
  );
  const useCategoryQtyUi = pbiletCategoryCheckout || zoneQuantityCheckout;

  /**
   * На обзоре: pbilet category — только полигоны.
   * Театр (Вахтангов и др.): места всегда видны на 100% — иначе «пустой зал» и ощущение, что билетов нет.
   */
  const visibleNativePlacements = useMemo(() => {
    if (pbiletCategoryCheckout && sectorMode.enabled) return [];
    if (!sectorMode.enabled) return nativePlacements;
    return nativePlacements;
  }, [nativePlacements, pbiletCategoryCheckout, sectorMode.enabled]);

  const denseBackgroundHall = backgroundSeatCoordinates.length >= 8000 || useHallBackgroundRaster;
  const skipDuplicateInteractiveDotsOnCanvas =
    uniformHallSeatAppearance && denseBackgroundHall && useCanvasCompositing;
  /** Canvas рисует точки — DOM только hitbox, иначе двойные «ареолы» (театр + стадион). */
  const uniformDomOverlayGhost = useCanvasCompositing && useSvgNative;
  /** Сектора на обзоре 100%: подсветка и клик; заливку path убираем только после zoom-in. */
  const hideSectorFill = mapZoomed;

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
      if (useHallBackgroundRaster) return [];
      /** МХТ: серые места на canvas — DOM-unavailable не дублируем. */
      if (theaterSvgSeatCanvas) return [];
      /**
       * Вахтангов / layout seats: не сыпать DOM-точками поверх allSeatCoordinates
       * (иначе огромные серые кружки).
       */
      if (theaterSectorCheckout && (backgroundSeatCoordinates.length > 0 || preferLayoutSeatPositions)) {
        return [];
      }
      if (theaterSectorCheckout) {
        const inScope = selectedSectorSummary
          ? nativeSeats.filter((seat) => sectorNormsMatch(seat.sector, selectedSector))
          : nativeSeats;
        return inScope.filter(
          (seat) => !matchedNativeSeatKeys.has(seatMapKey(seat.sector, seat.row, seat.seat)),
        );
      }
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
  }, [
    backgroundSeatCoordinates.length,
    preferLayoutSeatPositions,
    theaterSvgSeatCanvas,
    matchedNativeSeatKeys,
    nativeSeats,
    sectorMode.enabled,
    selectedSector,
    selectedSectorSummary,
    showUnavailableSeats,
    theaterSectorCheckout,
    useHallBackgroundRaster,
    useSvgNative,
  ]);

  const visibleBackgroundSeatCoordinates = useMemo(() => {
    if (useHallBackgroundRaster) return [];
    if (!sectorMode.enabled || backgroundSeatCoordinates.length === 0) return [];
    if (mapZoomed || denseBackgroundHall) return backgroundSeatCoordinates;
    return [];
  }, [
    backgroundSeatCoordinates,
    denseBackgroundHall,
    mapZoomed,
    sectorMode.enabled,
    useHallBackgroundRaster,
  ]);

  const layersStyle = useMemo<React.CSSProperties>(() => {
    const style: React.CSSProperties = {
      transform: `matrix(${zoom}, 0, 0, ${zoom}, ${pan.x}, ${pan.y})`,
      transformOrigin: '0 0',
      transition: isMapDragging || stadiumCanvasEnabled ? 'none' : undefined,
    };
    /**
     * Стадион: 1 unit viewBox ≈ 1 CSS-px до zoom (viewBox ~10k).
     * Театр/МХТ: viewBox после crop ~150–800 — если зафиксировать width=viewBox.px,
     * схема сжимается в «точку» по центру белого поля (как на скрине).
     */
    if (
      sectorMode.enabled
      && isStadiumScaleHallLayout(layoutJson)
      && svgViewBox.width > 100
    ) {
      style.width = `${Math.round(svgViewBox.width)}px`;
      style.maxWidth = 'none';
    }
    return style;
  }, [
    isMapDragging,
    layoutJson,
    pan.x,
    pan.y,
    sectorMode.enabled,
    stadiumCanvasEnabled,
    svgViewBox.width,
    zoom,
  ]);

  useEffect(() => {
    if (!useCanvasCompositing) return;
    const canvas = canvasRef.current;
    const viewport = viewportRef.current;
    if (!canvas || !viewport) return;

    let frame = requestAnimationFrame(() => {
      const box = getLayerScreenBox();
      if (!box) return;
      const width = viewport.clientWidth;
      const height = viewport.clientHeight;
      if (width <= 0 || height <= 0) return;

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

      const img = canvasImageRef.current;
      if (img) {
        ctx.save();
        ctx.filter = zoom > fitZoom + 0.01 ? CANVAS_ZOOMED_BACKDROP_FILTER : 'none';
        ctx.drawImage(img, x, y, w, h);
        ctx.restore();
      }

      const hallRaster = hallRasterImageRef.current;
      const mapZoomedNow = zoom > fitZoom + 0.01;
      const bowlDots = preferBundleBackgroundDots ? null : bowlDotsRef.current;
      /** МХТ svg-места: не двоить с allSeatCoordinates. Вахтангов — свой bowl. */
      const skipStadiumBowlDots = theaterSvgSeatCanvas;
      if (
        !skipStadiumBowlDots
        && useHallBackgroundRaster
        && hallRaster
        && (!mapZoomedNow || (!bowlDots && !preferBundleBackgroundDots))
      ) {
        ctx.drawImage(hallRaster, x, y, w, h);
      }

      if (!skipStadiumBowlDots && preferBundleBackgroundDots && mapZoomedNow && backgroundSeatCoordinates.length > 0) {
        drawHallBackgroundArcs(
          ctx,
          backgroundSeatCoordinates,
          { left: x, top: y, screenW: w, screenH: h },
          width,
          height,
          svgViewBox.width,
          backgroundSeatCoordinates.length >= 8000,
          fieldDotExcludePctBoxes,
        );
      } else if (!skipStadiumBowlDots && useHallBackgroundRaster && mapZoomedNow && bowlDots) {
        drawHallBackgroundArcs(
          ctx,
          bowlDots,
          { left: x, top: y, screenW: w, screenH: h },
          width,
          height,
          svgViewBox.width,
          true,
          fieldDotExcludePctBoxes,
        );
      }

      const bg = backgroundSeatCoordinates;
      if (
        !skipStadiumBowlDots
        && !useHallBackgroundRaster
        && bg.length > 0
        && (mapZoomedNow || bg.length >= 8000)
      ) {
        drawHallBackgroundArcs(
          ctx,
          bg,
          { left: x, top: y, screenW: w, screenH: h },
          width,
          height,
          svgViewBox.width,
          bg.length >= 8000,
          fieldDotExcludePctBoxes,
        );
      }

      /**
       * Театр: фон зала — серые точки только для НЕ-sellable.
       * Sellable — тот же radius/алгоритм, что стадион (stadiumSeatCanvasRadiusPx), без серой подложки = без ареол.
       */
      if (theaterSvgSeatCanvas && nativeSeats.length > 0) {
        const sellableKeys = new Set(
          visibleNativePlacements.filter((s) => !s.previewOnly).map((s) => s.key),
        );
        const scalePx = w / Math.max(1, svgViewBox.width);
        const rBg = theaterBackgroundSeatRadiusPx(scalePx, nativeSeats.length);
        ctx.fillStyle = CANVAS_HALL_SEAT_DOT_FILL;
        ctx.beginPath();
        for (const seat of nativeSeats) {
          const key = seatMapKey(seat.sector, seat.row, seat.seat);
          if (sellableKeys.has(key)) continue;
          const sx = x + (seat.xPct / 100) * w;
          const sy = y + (seat.yPct / 100) * h;
          if (sx < -8 || sy < -8 || sx > width + 8 || sy > height + 8) continue;
          ctx.moveTo(sx + rBg, sy);
          ctx.arc(sx, sy, rBg, 0, Math.PI * 2);
        }
        ctx.fill();

        const activeKeys = new Set(selectedSeatDetails.map((seatDetail) => seatDetail.key));
        const mapZoomedNowTheater = zoom > fitZoom + 0.01;
        for (const seat of visibleNativePlacements) {
          if (seat.previewOnly) continue;
          const active = activeKeys.has(seat.key);
          const sx = x + (seat.xPct / 100) * w;
          const sy = y + (seat.yPct / 100) * h;
          if (sx < -16 || sy < -16 || sx > width + 16 || sy > height + 16) continue;
          const r = stadiumSeatCanvasRadiusPx(
            zoom,
            box.width,
            svgViewBox.width,
            active,
            mapZoomedNowTheater,
          );
          ctx.beginPath();
          ctx.fillStyle = colorForSeat(seat.priceKey);
          ctx.arc(sx, sy, r, 0, Math.PI * 2);
          ctx.fill();
          if (active) {
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#fff';
            ctx.stroke();
          }
        }
      } else if (visibleNativePlacements.length > 0) {
        const activeKeys = new Set(selectedSeatDetails.map((seatDetail) => seatDetail.key));
        for (const seat of visibleNativePlacements) {
          const active = activeKeys.has(seat.key);
          /** Серые «лишние» точки без оффера совпадают с фоном allSeatCoordinates — не дублировать. Офферы GetBilet всегда цветом цены. */
          if (skipDuplicateInteractiveDotsOnCanvas && !active && seat.previewOnly) continue;

          const sx = x + (seat.xPct / 100) * w;
          const sy = y + (seat.yPct / 100) * h;
          if (sx < -16 || sy < -16 || sx > width + 16 || sy > height + 16) continue;
          const r = stadiumSeatCanvasRadiusPx(
            zoom,
            box.width,
            svgViewBox.width,
            active,
            zoom > fitZoom + 0.01,
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
    });

    return () => cancelAnimationFrame(frame);
  }, [
    backgroundSeatCoordinates,
    bowlDotsVersion,
    canvasImageVersion,
    colorForSeat,
    fieldDotExcludePctBoxes,
    fitZoom,
    getLayerScreenBox,
    hallRasterVersion,
    preferBundleBackgroundDots,
    selectedSeatDetails,
    skipDuplicateInteractiveDotsOnCanvas,
    theaterSvgSeatCanvas,
    theaterSectorCheckout,
    nativeSeats,
    uniformHallSeatAppearance,
    svgViewBox.width,
    useHallBackgroundRaster,
    visibleNativePlacements,
    zoom,
    pan.x,
    pan.y,
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
        onTouchStart={(ev) => {
          if (ev.touches.length > 1) ev.preventDefault();
        }}
        onTouchMove={(ev) => {
          if (ev.touches.length > 1) ev.preventDefault();
        }}
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
            className={styles.layers}
            style={layersStyle}
          >
            <div
              className={`${styles.svgLayer} ${useCanvasCompositing ? styles.svgLayerCanvasBacked : ''} ${
                stadiumCanvasEnabled || theaterSvgSeatCanvas ? styles.svgLayerHideSeatCircles : ''
              } ${
                !stadiumCanvasEnabled && visibleBackgroundSeatCoordinates.length > 0 ? styles.svgLayerFocused : ''
              }`}
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: svgHtmlSafe }}
            />
            {useHallBackgroundRaster && !useCanvasCompositing && hallBackgroundRasterUrl ? (
              <img
                className={styles.hallBackgroundRaster}
                src={hallBackgroundRasterUrl}
                alt=""
                aria-hidden="true"
                decoding="async"
              />
            ) : null}
            {sectorMode.enabled ? (
              <svg
                className={`${styles.sectorLayer} ${
                  pbiletCategoryCheckout ? styles.sectorLayerCategoryCheckout : ''
                } ${
                  theaterSectorCheckout && !useNativeTheaterSectorPaths ? styles.sectorLayerTheater : ''
                } ${
                  /** Театр: сектора всегда под местами (даже без stadium canvas). */
                  useCanvasCompositing || theaterSectorCheckout ? styles.sectorLayerUnderSeats : ''
                } ${
                  hideSectorFill ? `${styles.sectorLayerSeatPick} ${styles.sectorLayerFocused}` : styles.sectorLayerFitOverview
                }`}
                viewBox={svgViewBox.value}
                preserveAspectRatio="xMidYMid meet"
                aria-label="Секторы зала"
              >
                {hallMapFieldMasks.map((mask) => {
                  if (mask.path) return null;
                  if (
                    !Number.isFinite(mask.x) ||
                    !Number.isFinite(mask.y) ||
                    !Number.isFinite(mask.w) ||
                    !Number.isFinite(mask.h)
                  ) {
                    return null;
                  }
                  return (
                    <rect
                      key={`field-mask-${mask.id}`}
                      x={mask.x}
                      y={mask.y}
                      width={mask.w}
                      height={mask.h}
                      className={`${styles.sectorPath} ${styles.sectorPathFieldMask}`}
                      aria-hidden="true"
                    />
                  );
                })}
                {theaterSectorCheckout && !hideSectorFill && !useNativeTheaterSectorPaths
                  ? theaterOverviewFills.map((fill) => {
                      const sector =
                        resolveSectorSummaryForLabel(fill.label) ??
                        ({
                          meta: {
                            id: fill.id,
                            label: fill.label,
                            path: fill.path,
                            availableSeats: 0,
                            minPrice: null,
                            maxPrice: null,
                            previewImageUrl: null,
                          },
                          offers: [],
                          seatCount: 0,
                          minPrice: null,
                          maxPrice: null,
                        } satisfies SectorSummary);
                      const available = sector.seatCount > 0 || sector.offers.length > 0;
                      const active = selectedSector === normalizeSectorLabel(fill.label);
                      const sectorForFocus = {
                        ...sector,
                        meta: { ...sector.meta, path: fill.path, label: fill.label },
                      };
                      return (
                        <path
                          key={fill.id}
                          d={fill.path}
                          data-sector-path="true"
                          className={`${styles.sectorPath} ${styles.sectorPathInteractive} ${
                            available ? styles.sectorPathAvailable : styles.sectorPathUnavailable
                          } ${active ? styles.sectorPathActive : ''} ${styles.sectorPathTheaterLevel}`}
                          style={
                            {
                              '--sector-accent': theaterLevelAccent(fill.label),
                            } as React.CSSProperties
                          }
                          tabIndex={0}
                          role="button"
                          aria-label={`${fill.label}: ${sector.seatCount > 0 ? `${sector.seatCount} мест` : 'уровень зала'}`}
                          onPointerDown={(ev) => {
                            showSectorInfo(ev.currentTarget, sectorForFocus);
                          }}
                          onPointerEnter={(ev) => {
                            showSectorInfo(ev.currentTarget, sectorForFocus);
                          }}
                          onPointerLeave={(ev) => {
                            if (ev.pointerType !== 'touch') hideSectorInfo();
                          }}
                          onFocus={(ev) => {
                            showSectorInfo(ev.currentTarget, sectorForFocus);
                          }}
                          onBlur={hideSectorInfo}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            if (suppressMapClickRef.current) return;
                            focusSector(sectorForFocus);
                          }}
                        />
                      );
                    })
                  : sectorSummaries.map((sector) => {
                  if (theaterSectorCheckout && !useNativeTheaterSectorPaths) return null;
                  if (!sector.meta.path) return null;
                  const available =
                    sector.seatCount > 0 ||
                    sector.offers.length > 0 ||
                    (sector.meta.minPrice != null && Number.isFinite(Number(sector.meta.minPrice)));
                  const active = selectedSector === normalizeSectorLabel(sector.meta.label);
                  const priceForColor =
                    sector.maxPrice != null
                      ? String(
                          isLuzhnikiConcertFieldZoneLabel(sector.meta.label)
                            ? sector.maxPrice
                            : (sector.minPrice ?? sector.maxPrice),
                        )
                      : '0';
                  const fieldZone = isLuzhnikiConcertFieldZoneLabel(sector.meta.label);
                  const zoneOnly = isZoneOnlySector(sector.meta.label);
                  const sectorAccent = available ? colorForSeat(priceForColor) : '#9ca3af';
                  return (
                    <path
                      key={sector.meta.id}
                      d={sector.meta.path}
                      data-sector-path="true"
                      className={`${styles.sectorPath} ${styles.sectorPathInteractive} ${
                        available ? styles.sectorPathAvailable : styles.sectorPathUnavailable
                      } ${
                        active ? styles.sectorPathActive : ''
                      } ${fieldZone ? styles.sectorPathFieldMask : ''}`}
                      style={
                        {
                          '--sector-accent': sectorAccent,
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
                        if (zoneOnly) {
                          setSelectedSector(normalizeSectorLabel(sector.meta.label));
                          setSectorPanelCollapsed(false);
                          return;
                        }
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
                {hallMapLabels.length > 0 ? (
                  <g
                    aria-hidden="true"
                    style={{ pointerEvents: 'none' }}
                    fontFamily="system-ui, -apple-system, Segoe UI, sans-serif"
                  >
                    {hallMapLabels.map((label) => (
                      <text
                        key={`hall-label-${label.text}-${label.x}-${label.y}`}
                        x={label.x}
                        y={label.y}
                        fontSize={label.fontSize}
                        fontWeight={700}
                        fill="#475569"
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        {label.text}
                      </text>
                    ))}
                  </g>
                ) : null}
              </svg>
            ) : null}
            <div
              className={`${styles.seatLayer} ${useCanvasCompositing ? styles.seatLayerCanvasPick : ''}`}
              aria-hidden={
                categorySectorOnlyCheckout
                  ? true
                  : useSvgNative
                    ? nativePlacements.length === 0
                    : sorted.length === 0
              }
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
              {useSvgNative
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
                    const layerBox = getLayerScreenBox();
                    const stadiumLayerWidth = layerBox?.width && layerBox.width > 1
                      ? layerBox.width
                      : Math.round(svgViewBox.width);
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
                    const useStadiumSeatChrome = sectorMode.enabled;
                    if (p.previewOnly) {
                      return (
                        <span
                          key={p.key}
                          className={`${styles.seatDot} ${styles.seatDotNative} ${styles.seatDotNonInteractive} ${
                            useStadiumSeatChrome ? styles.seatDotStadium : ''
                          } ${useStadiumSeatChrome && !selectedSector ? styles.seatDotOverview : ''} ${
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
                          useStadiumSeatChrome ? styles.seatDotStadium : ''
                        } ${
                          useCanvasCompositing ? styles.seatDotCanvasHit : ''
                        } ${uniformDomOverlayGhost ? styles.seatDotUniformCanvas : ''} ${
                          useStadiumSeatChrome && !selectedSector && !syncCanvasHitbox
                            ? styles.seatDotOverview
                            : ''
                        } ${active ? styles.seatDotOn : ''} ${
                          syncCanvasHitbox ? styles.seatDotStadiumHitbox : ''
                        } ${
                          useStadiumSeatChrome && !mapZoomed ? styles.seatDotNoPickAtOverview : ''
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
                          if (ev.pointerType === 'touch') {
                            touchSeatPressRef.current = { key: visualKey, x: ev.clientX, y: ev.clientY };
                          }
                          showSeatInfo(ev.currentTarget, seatInfo);
                        }}
                        onPointerUp={(ev) => {
                          if (ev.pointerType !== 'touch') return;
                          ev.stopPropagation();
                          ev.preventDefault();
                          const press = touchSeatPressRef.current;
                          touchSeatPressRef.current = null;
                          if (
                            !press ||
                            press.key !== visualKey ||
                            Math.hypot(ev.clientX - press.x, ev.clientY - press.y) > 10
                          ) {
                            return;
                          }
                          touchSeatToggleRef.current = { key: visualKey, at: Date.now() };
                          showSeatInfo(ev.currentTarget, seatInfo);
                          updateSelectedDetails(seatInfo, p.available);
                          if (!onSelectionChange) onToggleSeat(p.offerId, p.seat, p.available);
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
                          const touchToggle = touchSeatToggleRef.current;
                          if (touchToggle?.key === visualKey && Date.now() - touchToggle.at < 700) return;
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
                : categorySectorOnlyCheckout
                  ? null
                : sorted.map((row, rowIdx) => {
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
                  })}
            </div>
          </div>
          {selectedSectorSummary && sectorPanelCollapsed && !useCategoryQtyUi ? (
            <button
              type="button"
              className={styles.sectorPanelRestore}
              onPointerDown={(ev) => ev.stopPropagation()}
              onClick={() => setSectorPanelCollapsed(false)}
            >
              Показать места
            </button>
          ) : null}
          {selectedSectorSummary && useCategoryQtyUi ? (
            <>
              <div
                className={styles.categoryModalBackdrop}
                aria-hidden="true"
                onPointerDown={(ev) => ev.stopPropagation()}
                onClick={() => {
                  if (zoneQuantityCheckout) {
                    setSelectedSector(null);
                    return;
                  }
                  resetSectorFocus();
                }}
              />
              <div
                className={styles.categoryModal}
                data-sector-panel="true"
                role="dialog"
                aria-modal="true"
                aria-label={selectedSectorSummary.meta.label}
                onPointerDown={(ev) => ev.stopPropagation()}
              >
                <button
                  type="button"
                  className={styles.categoryModalClose}
                  aria-label="Закрыть"
                  onClick={() => {
                    if (zoneQuantityCheckout) {
                      setSelectedSector(null);
                      return;
                    }
                    resetSectorFocus();
                  }}
                >
                  ×
                </button>
                <div className={styles.categoryModalGrid}>
                  <div className={styles.categoryModalVisual}>
                    <div className={styles.categoryModalTitle}>{selectedSectorSummary.meta.label}</div>
                    <div className={styles.categoryModalImageWrap}>
                      {selectedSectorPreviewUrl ? (
                        <img
                          className={styles.categoryModalImage}
                          src={selectedSectorPreviewUrl}
                          alt={`Вид с трибуны — ${selectedSectorSummary.meta.label}`}
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className={styles.categoryModalImageFallback} aria-hidden="true" />
                      )}
                    </div>
                    <p className={styles.categoryModalHint}>
                      {zoneQuantityCheckout
                        ? 'Выберите количество билетов. Цена единая для зоны (максимальная среди предложений).'
                        : `${categoryModalRowsLabel ? `${categoryModalRowsLabel}. ` : ''}Выберите количество билетов. Система автоматически подберёт лучшие места в выбранных зонах. При заказе более одного билета места будут рядом.`}
                    </p>
                  </div>
                  <div className={styles.categoryModalOffers}>
                    {sessionDateLabel ? (
                      <div className={styles.categoryModalDate}>{sessionDateLabel}</div>
                    ) : null}
                    <p className={styles.categoryModalLead}>
                      {zoneQuantityCheckout
                        ? 'Бронирование по зоне — места подберёт система.'
                        : 'Для вас собраны предложения из разных источников. Выбирайте лучшее!'}
                    </p>
                    <div className={styles.categoryModalOfferList}>
                      {zoneQuantityCheckout ? (
                        selectedSectorSummary.seatCount > 0 && selectedSectorSummary.maxPrice != null ? (
                          <div className={styles.categoryModalOfferCard}>
                            <div className={styles.categoryModalOfferTop}>
                              <span className={styles.categoryModalOfferPrice}>
                                {formatRub(selectedSectorSummary.maxPrice)}/шт
                              </span>
                              <div className={styles.categoryQtyRow}>
                                <button
                                  type="button"
                                  className={`${styles.categoryQtyBtn} ${styles.categoryQtyBtnMinus}`}
                                  aria-label="Меньше"
                                  disabled={categoryModalSelectedCount <= 0}
                                  onClick={() =>
                                    setFieldZoneQty(
                                      selectedSectorSummary.offers,
                                      categoryModalSelectedCount - 1,
                                      selectedSectorSummary.maxPrice!,
                                      selectedSectorSummary.meta.label,
                                    )
                                  }
                                >
                                  −
                                </button>
                                <span className={styles.categoryQtyValue}>{categoryModalSelectedCount}</span>
                                <button
                                  type="button"
                                  className={`${styles.categoryQtyBtn} ${styles.categoryQtyBtnPlus}`}
                                  aria-label="Больше"
                                  disabled={categoryModalSelectedCount >= selectedSectorSummary.seatCount}
                                  onClick={() =>
                                    setFieldZoneQty(
                                      selectedSectorSummary.offers,
                                      categoryModalSelectedCount + 1,
                                      selectedSectorSummary.maxPrice!,
                                      selectedSectorSummary.meta.label,
                                    )
                                  }
                                >
                                  +
                                </button>
                              </div>
                            </div>
                            <div className={styles.sectorOfferAvail}>
                              Свободно {selectedSectorSummary.seatCount} шт
                            </div>
                          </div>
                        ) : (
                          <div className={styles.sectorOfferEmpty}>
                            Сейчас в этой зоне нет доступных мест для бронирования.
                          </div>
                        )
                      ) : selectedSectorOffersWithSeats.length > 0 ? (
                        selectedSectorOffersWithSeats.map((offer) => {
                          const oid = String(offer.Id ?? '');
                          const seats = Array.isArray(offer.SeatList) ? offer.SeatList.map(String) : [];
                          const priceKey = getPriceKey(offer);
                          const rowLabel = String(offer.Row ?? '');
                          const prefix = `${oid}|${rowLabel}|`;
                          const selectedCount = selectedSeatDetails.filter((d) => d.key.startsWith(prefix)).length;
                          return (
                            <div key={`${oid}-${rowLabel}-${priceKey}`} className={styles.categoryModalOfferCard}>
                              <div className={styles.categoryModalOfferTop}>
                                <span className={styles.categoryModalOfferPrice}>
                                  {formatRub(Number(priceKey))}/шт
                                </span>
                                <div className={styles.categoryQtyRow}>
                                  <button
                                    type="button"
                                    className={`${styles.categoryQtyBtn} ${styles.categoryQtyBtnMinus}`}
                                    aria-label="Меньше"
                                    disabled={selectedCount <= 0}
                                    onClick={() => setCategoryOfferQty(offer, selectedCount - 1)}
                                  >
                                    −
                                  </button>
                                  <span className={styles.categoryQtyValue}>{selectedCount}</span>
                                  <button
                                    type="button"
                                    className={`${styles.categoryQtyBtn} ${styles.categoryQtyBtnPlus}`}
                                    aria-label="Больше"
                                    disabled={selectedCount >= seats.length}
                                    onClick={() => setCategoryOfferQty(offer, selectedCount + 1)}
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                              <div className={styles.sectorOfferAvail}>Свободно {seats.length} шт</div>
                            </div>
                          );
                        })
                      ) : (
                        <div className={styles.sectorOfferEmpty}>
                          Сейчас в этом секторе нет доступных мест для бронирования.
                        </div>
                      )}
                    </div>
                    {onReserveFromMap ? (
                      <Button
                        variant="contained"
                        fullWidth
                        size="large"
                        disabled={categoryModalSelectedCount <= 0 || reservePending}
                        onClick={() => onReserveFromMap()}
                        sx={{ mt: 2, borderRadius: 999, py: 1.2, fontWeight: 800 }}
                      >
                        {reservePending
                          ? 'Бронирование…'
                          : categoryModalSelectedCount > 0
                            ? `Купить · ${formatRub(categoryModalSelectedTotal)}`
                            : 'Купить'}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </>
          ) : selectedSectorSummary && !sectorPanelCollapsed ? (
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
                {pbiletCategoryCheckout ? (
                  <>
                    {selectedSectorSummary.meta.label}. Выберите количество билетов. Система автоматически подберёт
                    лучшие места в выбранных зонах.
                  </>
                ) : (
                  <>
                    {selectedSectorSummary.seatCount > 0
                      ? `${selectedSectorSummary.seatCount} мест`
                      : 'Нет мест в наличии'}{' '}
                    {selectedSectorSummary.minPrice != null
                      ? `· ${formatRub(selectedSectorSummary.minPrice)}${
                          selectedSectorSummary.maxPrice &&
                          selectedSectorSummary.maxPrice !== selectedSectorSummary.minPrice
                            ? ` - ${formatRub(selectedSectorSummary.maxPrice)}`
                            : ''
                        }`
                      : ''}
                  </>
                )}
              </div>
              <div className={styles.sectorOfferList}>
                {selectedSectorOffersWithSeats.length > 0 ? (
                  pbiletCategoryCheckout ? (
                    selectedSectorOffersWithSeats.map((offer) => {
                      const oid = String(offer.Id ?? '');
                      const seats = Array.isArray(offer.SeatList) ? offer.SeatList.map(String) : [];
                      const priceKey = getPriceKey(offer);
                      const rowLabel = String(offer.Row ?? '');
                      const prefix = `${oid}|${rowLabel}|`;
                      const selectedCount = selectedSeatDetails.filter((d) => d.key.startsWith(prefix)).length;
                      return (
                        <div key={`${oid}-${rowLabel}-${priceKey}`} className={styles.sectorOfferRow}>
                          <div className={styles.sectorOfferHead}>
                            <span>{formatRub(Number(priceKey))}/шт</span>
                            <span className={styles.sectorOfferAvail}>Свободно {seats.length} шт</span>
                          </div>
                          <div className={styles.categoryQtyRow}>
                            <button
                              type="button"
                              className={styles.categoryQtyBtn}
                              aria-label="Меньше"
                              disabled={selectedCount <= 0}
                              onClick={() => setCategoryOfferQty(offer, selectedCount - 1)}
                            >
                              −
                            </button>
                            <span className={styles.categoryQtyValue}>{selectedCount}</span>
                            <button
                              type="button"
                              className={styles.categoryQtyBtn}
                              aria-label="Больше"
                              disabled={selectedCount >= seats.length}
                              onClick={() => setCategoryOfferQty(offer, selectedCount + 1)}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    selectedSectorOffersWithSeats.map((offer) => {
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
                    })
                  )
                ) : (
                  <div className={styles.sectorOfferEmpty}>
                    Сейчас в этом секторе нет доступных мест для бронирования.
                  </div>
                )}
              </div>
            </div>
          ) : null}
          {showFanIdNotice ? (
            <div className={styles.fanIdMapToast} role="status">
              <span className={styles.fanIdMapToastIcon} aria-hidden="true">
                !
              </span>
              <span>Внимание! Требуется Fan ID!</span>
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
