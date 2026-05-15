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
  normalizeRowLabel,
  normalizeSeatToken,
  normalizeSectorLabel,
  strictSeatKey,
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
  const backgroundSeatCoordinates = useMemo(() => parseBackgroundSeatCoordinates(layoutJson), [layoutJson]);
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
    if (preferLayoutSeatPositions) return false;
    return (nativeProcessed?.seats?.length ?? 0) >= 2;
  }, [preferLayoutSeatPositions, nativeProcessed]);
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
      const exactOffers = new Map<string, { offer: HallOfferRow; seat: string }>();
      for (const offer of offers) {
        if (!Array.isArray(offer.SeatList)) continue;
        for (const seat of offer.SeatList) {
          exactOffers.set(strictSeatKey(offer.Sector, offer.Row, seat), { offer, seat: String(seat) });
        }
      }

      const placements: SvgNativePlacement[] = [];
      for (const svgSeat of nativeSeats) {
        const match = exactOffers.get(strictSeatKey(svgSeat.sector, svgSeat.row, svgSeat.seat));
        if (!match) continue;

        const svgKey = seatMapKey(svgSeat.sector, svgSeat.row, svgSeat.seat);
        const priceKey = getPriceKey(match.offer);
        const offerId = String(match.offer.Id ?? '');
        const available = Array.isArray(match.offer.SeatList) ? match.offer.SeatList.map(String) : [];
        const rowLabel = String(match.offer.Row ?? svgSeat.row);
        const sectorLabel = String(match.offer.Sector ?? svgSeat.sector);
        placements.push({
          svgKey,
          key: selectionSeatKey(offerId, rowLabel, match.seat),
          offerId,
          sectorLabel,
          seat: match.seat,
          rowLabel,
          available,
          xPct: svgSeat.xPct,
          yPct: svgSeat.yPct,
          title: `${sectorLabel}, ${rowLabel} ряд, место ${match.seat}, цена ${formatRub(Number(priceKey))}`,
          priceKey,
        });
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
      const key = normalizeSectorLabel(offer.Sector);
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
  const panInnerRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasImageRef = useRef<HTMLImageElement | null>(null);
  const [canvasImageVersion, setCanvasImageVersion] = useState(0);
  const [fitZoom, setFitZoom] = useState(1);

  const [zoom, setZoom] = useState(1);
  const maxZoom = fitZoom * (sectorMode.enabled ? 12 : 8);
  const clampZoom = useCallback((z: number) => Math.min(maxZoom || 4, Math.max(0.03, z)), [maxZoom]);
  const discreteZoomLevels = useMemo(
    () => {
      const multipliers = sectorMode.enabled ? [1, 2, 3, 4, 6, 8, 10, 12] : [1, 2, 3, 4, 6, 8];
      return multipliers.map((multiplier) => fitZoom * multiplier).map(clampZoom);
    },
    [clampZoom, fitZoom, sectorMode.enabled],
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
    const base = getLayerBase();
    if (!vp || !base) return { x: 0, y: 0 };
    return {
      x: vp.clientWidth / 2 - base.x - (base.width * targetZoom) / 2,
      y: vp.clientHeight / 2 - base.y - (base.height * targetZoom) / 2,
    };
  }, [getLayerBase]);

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
    panRef.current = pan;
  }, [pan]);

  const stadiumCanvasEnabled = sectorMode.enabled && svgViewBox.width > 100 && svgViewBox.height > 100;

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
  }, []);

  const onPointerDownPan = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
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

  const onPointerMovePan = useCallback((e: React.PointerEvent) => {
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    if (pointersRef.current.size >= 2 && pinchRef.current) {
      const points = [...pointersRef.current.values()];
      const [a, b] = points;
      const middle = pointMiddle(a, b);
      applyPan({
        x: pinchRef.current.startPan.x + (middle.x - pinchRef.current.startMiddle.x),
        y: pinchRef.current.startPan.y + (middle.y - pinchRef.current.startMiddle.y),
      });
      return;
    }
    const d = dragRef.current;
    if (!d?.active || e.pointerId !== d.id) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    d.moved = true;
    suppressMapClickRef.current = true;
    applyPan({
      x: d.ox + dx,
      y: d.oy + dy,
    });
  }, [applyPan]);

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
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
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
    if (
      clicked
      && !(e.target as HTMLElement).closest('button')
      && !(e.target as HTMLElement).closest('[data-seat-dot="true"]')
      && !(e.target as HTMLElement).closest('[data-sector-path="true"]')
    ) {
      focusClickPoint(e.clientX, e.clientY);
    }
  }, [focusClickPoint]);

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
      applyCamera(next, { x: 0, y: 0 });
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
  }, [applyCamera, fitZoom, focusLayerPoint, getLayerBase, getNextZoomLevel]);

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
  const visibleNativePlacements = useMemo(() => {
    if (!sectorMode.enabled) return nativePlacements;
    return nativePlacements;
  }, [nativePlacements, sectorMode.enabled]);
  const visibleUnavailableNativeSeats = useMemo(() => {
    if (!useSvgNative) return [];
    if (sectorMode.enabled) {
      if (backgroundSeatCoordinates.length > 0) return [];
      if (!selectedSectorSummary) return [];
      return nativeSeats.filter(
        (seat) => normalizeSectorLabel(seat.sector) === selectedSector
          && !matchedNativeSeatKeys.has(seatMapKey(seat.sector, seat.row, seat.seat)),
      );
    }
    return showUnavailableSeats
      ? nativeSeats.filter((seat) => !matchedNativeSeatKeys.has(seatMapKey(seat.sector, seat.row, seat.seat)))
      : [];
  }, [backgroundSeatCoordinates.length, matchedNativeSeatKeys, nativeSeats, sectorMode.enabled, selectedSector, selectedSectorSummary, showUnavailableSeats, useSvgNative]);

  const denseBackgroundHall = backgroundSeatCoordinates.length >= 8000;
  /** Дубли тех же пикселей, что allSeatCoordinates на canvas — не рисуем; выделение только у выбранных. */
  const skipDuplicateInteractiveDotsOnCanvas =
    uniformHallSeatAppearance && denseBackgroundHall && useCanvasCompositing;
  /** Canvas уже отрисовал точки — скрываем DOM-маркеры офферов, остаются только невидимые хитбоксы. */
  const uniformDomOverlayGhost =
    uniformHallSeatAppearance && useCanvasCompositing && useSvgNative;

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

  const layersStyle = useMemo<React.CSSProperties>(() => {
    const style: React.CSSProperties = {
      transform: `matrix(${zoom}, 0, 0, ${zoom}, ${pan.x}, ${pan.y})`,
      transformOrigin: '0 0',
      transition: isMapDragging || stadiumCanvasEnabled ? 'none' : undefined,
    };
    if (sectorMode.enabled && svgViewBox.width > 100) {
      style.width = `${Math.round(svgViewBox.width)}px`;
      style.maxWidth = 'none';
    }
    return style;
  }, [isMapDragging, pan.x, pan.y, sectorMode.enabled, stadiumCanvasEnabled, svgViewBox.width, zoom]);

  useEffect(() => {
    if (!useCanvasCompositing) return;
    const canvas = canvasRef.current;
    const viewport = viewportRef.current;
    if (!canvas || !viewport) return;

    let frame = requestAnimationFrame(() => {
      const base = getLayerBase();
      if (!base) return;
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

      const x = base.x + pan.x;
      const y = base.y + pan.y;
      const w = base.width * zoom;
      const h = base.height * zoom;

      const img = canvasImageRef.current;
      if (img) {
        ctx.save();
        ctx.filter = zoom > fitZoom + 0.01 ? CANVAS_ZOOMED_BACKDROP_FILTER : 'none';
        ctx.drawImage(img, x, y, w, h);
        ctx.restore();
      }

      const bg = backgroundSeatCoordinates;
      if (
        bg.length > 0 &&
        (zoom > fitZoom + 0.01 || bg.length >= 8000)
      ) {
        ctx.fillStyle = 'rgba(148, 163, 184, 0.72)';
        const scalePx = w / Math.max(1, svgViewBox.width);
        const useRects = bg.length >= 2500;
        if (useRects) {
          const dense = bg.length >= 8000;
          const r = dense
            ? Math.max(0.5, Math.min(1.75, scalePx * 3.6))
            : Math.max(0.85, Math.min(2.6, scalePx * 5.5));
          ctx.beginPath();
          const limW = width + 14;
          const limH = height + 14;
          for (const seat of bg) {
            const sx = x + (seat.xPct / 100) * w;
            const sy = y + (seat.yPct / 100) * h;
            if (sx < -8 || sy < -8 || sx > limW || sy > limH) continue;
            ctx.rect(sx - r * 0.5, sy - r * 0.5, r, r);
          }
          ctx.fill();
        } else {
          ctx.beginPath();
          const r = Math.max(1.15, Math.min(3.2, scalePx * 7));
          for (const seat of bg) {
            const sx = x + (seat.xPct / 100) * w;
            const sy = y + (seat.yPct / 100) * h;
            if (sx < -8 || sy < -8 || sx > width + 8 || sy > height + 8) continue;
            ctx.moveTo(sx + r, sy);
            ctx.arc(sx, sy, r, 0, Math.PI * 2);
          }
          ctx.fill();
        }
      }

      if (visibleNativePlacements.length > 0) {
        const activeKeys = new Set(selectedSeatDetails.map((seatDetail) => seatDetail.key));
        for (const seat of visibleNativePlacements) {
          const active = activeKeys.has(seat.key);
          /** Серые «лишние» точки без оффера совпадают с фоном allSeatCoordinates — не дублировать. Офферы GetBilet всегда цветом цены. */
          if (skipDuplicateInteractiveDotsOnCanvas && !active && seat.previewOnly) continue;

          const sx = x + (seat.xPct / 100) * w;
          const sy = y + (seat.yPct / 100) * h;
          if (sx < -16 || sy < -16 || sx > width + 16 || sy > height + 16) continue;
          const r = active ? 5 : Math.max(2.6, Math.min(6, (w / svgViewBox.width) * 10));
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
    canvasImageVersion,
    colorForSeat,
    fitZoom,
    getLayerBase,
    selectedSeatDetails,
    skipDuplicateInteractiveDotsOnCanvas,
    uniformHallSeatAppearance,
    svgViewBox.width,
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
        role="presentation"
      >
        {useCanvasCompositing ? <canvas ref={canvasRef} className={styles.stadiumCanvas} aria-hidden="true" /> : null}
        <div ref={panInnerRef} className={styles.panInner}>
          <div
            ref={layersRef}
            className={styles.layers}
            style={layersStyle}
          >
            <div
              className={`${styles.svgLayer} ${useCanvasCompositing ? styles.svgLayerCanvasBacked : ''} ${
                !stadiumCanvasEnabled && visibleBackgroundSeatCoordinates.length > 0 ? styles.svgLayerFocused : ''
              }`}
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: svgHtmlSafe }}
            />
            {sectorMode.enabled ? (
              <svg
                className={`${styles.sectorLayer} ${selectedSectorSummary || mapZoomed ? styles.sectorLayerFocused : ''}`}
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
                        showSectorInfo(ev.currentTarget, sector);
                      }}
                      onFocus={(ev) => {
                        showSectorInfo(ev.currentTarget, sector);
                      }}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        if (suppressMapClickRef.current) return;
                        focusSector(sector);
                      }}
                    />
                  );
                })}
              </svg>
            ) : null}
            <div
              className={styles.seatLayer}
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
                    if (p.previewOnly) {
                      return (
                        <span
                          key={p.key}
                          className={`${styles.seatDot} ${styles.seatDotNative} ${styles.seatDotNonInteractive} ${
                            sectorMode.enabled ? styles.seatDotStadium : ''
                          } ${sectorMode.enabled && !selectedSector ? styles.seatDotOverview : ''} ${
                            uniformDomOverlayGhost ? styles.seatDotUniformCanvasGhost : ''
                          }`}
                          style={
                            {
                              left: `${p.xPct}%`,
                              top: `${p.yPct}%`,
                              '--seat-accent': bg,
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
                          sectorMode.enabled && !selectedSector ? styles.seatDotOverview : ''
                        } ${active ? styles.seatDotOn : ''}`}
                        style={
                          {
                            left: `${p.xPct}%`,
                            top: `${p.yPct}%`,
                            '--seat-accent': bg,
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
            <div className={styles.sectorPanel} onPointerDown={(ev) => ev.stopPropagation()}>
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
          {selectedSeatDetails.length > 0 ? (
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
            <span>Готовим схему</span>
          </div>
        </div>
      ) : null}

      <Popper
        open={Boolean(hoverAnchor && hoverSeat)}
        anchorEl={hoverAnchor}
        placement="top"
        modifiers={[{ name: 'offset', options: { offset: [0, 8] } }]}
        sx={{ zIndex: 20 }}
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
