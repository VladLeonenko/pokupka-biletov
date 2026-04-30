import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Popover, Typography } from '@mui/material';
import {
  buildSvgNativePlacements,
  parseLayoutSeatPositions,
  parseLayoutMode,
  processHallSvgForNative,
  seatMapKey,
  type SvgNativePlacement,
  type SvgNativeSeat,
} from '../../utils/svgNativeSeatLayout';
import styles from './TicketHallInteractiveBlock.module.css';

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

function sortOffersForGrid(rows: HallOfferRow[]): HallOfferRow[] {
  return [...rows].sort((a, b) => {
    const sa = String(a.Sector ?? '');
    const sb = String(b.Sector ?? '');
    if (sa !== sb) return sa.localeCompare(sb, 'ru');
    return String(a.Row ?? '').localeCompare(String(b.Row ?? ''), 'ru', { numeric: true });
  });
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
  reservePending?: boolean;
  /** В модальном окне — другие отступы и высота под Dialog */
  variant?: 'page' | 'dialog';
  /** «К списку мест»: закрыть схему и прокрутить к блоку фильтров */
  onNavigateToList?: () => void;
};

/**
 * Слой кликабельных мест поверх статичной SVG/PNG-схемы.
 * Режимы: (1) layout_json.seats / seatPositions — точки по координатам поверх любой подложки;
 * (2) SVG с circle[place-name][row][place] — точки по координатам и сопоставление с офферами;
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
  reservePending = false,
  variant = 'page',
  onNavigateToList,
}: Props) {
  const overlay = useMemo(() => parseOverlayRect(layoutJson), [layoutJson]);
  const sorted = useMemo(() => sortOffersForGrid(offers), [offers]);
  const maxSeatsInAnyRow = useMemo(
    () => Math.max(1, ...sorted.map((o) => (Array.isArray(o.SeatList) ? o.SeatList.length : 0))),
    [sorted],
  );
  const numRows = Math.max(1, sorted.length);

  const layoutMode = useMemo(() => parseLayoutMode(layoutJson), [layoutJson]);
  const layoutSeats = useMemo(() => parseLayoutSeatPositions(layoutJson), [layoutJson]);
  const nativeProcessed = useMemo(() => processHallSvgForNative(hallSvgHtml), [hallSvgHtml]);
  const nativeSource = layoutSeats.length >= 2 ? 'layout' : nativeProcessed ? 'svg' : null;
  const nativeSeats = useMemo<SvgNativeSeat[]>(() => {
    if (layoutSeats.length >= 2) return layoutSeats;
    return nativeProcessed?.seats ?? [];
  }, [layoutSeats, nativeProcessed]);
  const useSvgNative =
    layoutMode !== 'grid' &&
    (layoutMode === 'svgNative' ||
      (layoutMode === 'auto' && nativeSeats.length >= 2));

  const svgHtmlSafe = useMemo(
    () => (useSvgNative && nativeSource === 'svg' && nativeProcessed ? nativeProcessed.svgHtml : hallSvgHtml),
    [hallSvgHtml, useSvgNative, nativeSource, nativeProcessed],
  );

  const { nativePlacements } = useMemo(() => {
    if (!useSvgNative || nativeSeats.length < 2) {
      return {
        nativePlacements: [] as SvgNativePlacement[],
      };
    }
    const { placements } = buildSvgNativePlacements(
      nativeSeats,
      offers,
      getPriceKey,
    );
    return {
      nativePlacements: placements,
    };
  }, [useSvgNative, nativeSeats, offers, getPriceKey]);

  const matchedNativeSeatKeys = useMemo(
    () => new Set(nativePlacements.map((p) => p.svgKey)),
    [nativePlacements],
  );

  const viewportRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<HTMLDivElement>(null);
  const [fitZoom, setFitZoom] = useState(1);

  const [zoom, setZoom] = useState(1);
  const clampZoom = useCallback((z: number) => Math.min(2.75, Math.max(0.2, z)), []);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hoverAnchor, setHoverAnchor] = useState<HTMLElement | null>(null);
  const [hoverSeat, setHoverSeat] = useState<HoverSeatInfo | null>(null);
  const dragRef = useRef<{ active: boolean; id: number; sx: number; sy: number; ox: number; oy: number } | null>(
    null,
  );

  const showSeatInfo = useCallback((anchor: HTMLElement, info: HoverSeatInfo) => {
    setHoverAnchor(anchor);
    setHoverSeat(info);
  }, []);

  const hideSeatInfo = useCallback(() => {
    setHoverAnchor(null);
    setHoverSeat(null);
  }, []);

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
    setZoom(fit);
    if (resetPan) setPan({ x: 0, y: 0 });
  }, []);

  const onPointerDownPan = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    hideSeatInfo();
    if (e.button !== 0 && e.pointerType !== 'touch') return;
    const t = e.currentTarget as HTMLElement;
    t.setPointerCapture(e.pointerId);
    dragRef.current = {
      active: true,
      id: e.pointerId,
      sx: e.clientX,
      sy: e.clientY,
      ox: pan.x,
      oy: pan.y,
    };
  }, [hideSeatInfo, pan.x, pan.y]);

  const onPointerMovePan = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d?.active || e.pointerId !== d.id) return;
    setPan({
      x: d.ox + (e.clientX - d.sx),
      y: d.oy + (e.clientY - d.sy),
    });
  }, []);

  const endPan = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.id) return;
    dragRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* */
    }
  }, []);

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

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.07 : 0.07;
      setZoom((z) => clampZoom(z + delta));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [clampZoom]);

  const zoomPctLabel = Math.max(1, Math.round((zoom / Math.max(0.001, fitZoom)) * 100));

  const rootClass =
    variant === 'dialog' ? `${styles.root} ${styles.rootInDialog}` : styles.root;

  return (
    <div className={rootClass}>
      <div className={styles.toolbar}>
        <div className={styles.zoomBtns}>
          <button type="button" className={styles.zoomBtn} onClick={() => setZoom((z) => clampZoom(z - 0.15))} aria-label="Уменьшить">
            −
          </button>
          <button
            type="button"
            className={styles.zoomPct}
            onClick={() => {
              setZoom(fitZoom);
              setPan({ x: 0, y: 0 });
            }}
            aria-label="Сброс масштаба и позиции"
          >
            {zoomPctLabel}%
          </button>
          <button type="button" className={styles.zoomBtn} onClick={() => setZoom((z) => clampZoom(z + 0.15))} aria-label="Увеличить">
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
        <div className={styles.panInner}>
          <div
            ref={layersRef}
            className={styles.layers}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
            }}
          >
            <div
              className={styles.svgLayer}
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: svgHtmlSafe }}
            />
            <div
              className={styles.seatLayer}
              aria-hidden={useSvgNative ? nativePlacements.length === 0 : sorted.length === 0}
            >
              {useSvgNative && nativeSource === 'layout'
                ? nativeSeats
                    .filter((seat) => !matchedNativeSeatKeys.has(seatMapKey(seat.sector, seat.row, seat.seat)))
                    .map((seat) => (
                      <span
                        key={`unavailable-${seatMapKey(seat.sector, seat.row, seat.seat)}`}
                        className={styles.seatDotUnavailable}
                        style={{ left: `${seat.xPct}%`, top: `${seat.yPct}%` }}
                        title={`${seat.sector} · ряд ${seat.row} · место ${seat.seat} — недоступно`}
                      />
                    ))
                : null}
              {useSvgNative
                ? nativePlacements.map((p) => {
                    const active = activeOfferId === p.offerId && selectedSeats.includes(p.seat);
                    const bg = colorForSeat(p.priceKey);
                    return (
                      <button
                        key={p.key}
                        type="button"
                        className={`${styles.seatDot} ${styles.seatDotNative} ${active ? styles.seatDotOn : ''}`}
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
                          showSeatInfo(ev.currentTarget, {
                            offerId: p.offerId,
                            sector: p.sectorLabel,
                            row: p.rowLabel,
                            seat: p.seat,
                            priceKey: p.priceKey,
                          });
                        }}
                        onPointerEnter={(ev) => {
                          showSeatInfo(ev.currentTarget, {
                            offerId: p.offerId,
                            sector: p.sectorLabel,
                            row: p.rowLabel,
                            seat: p.seat,
                            priceKey: p.priceKey,
                          });
                        }}
                        onFocus={(ev) => {
                          showSeatInfo(ev.currentTarget, {
                            offerId: p.offerId,
                            sector: p.sectorLabel,
                            row: p.rowLabel,
                            seat: p.seat,
                            priceKey: p.priceKey,
                          });
                        }}
                        onClick={(ev) => {
                          showSeatInfo(ev.currentTarget, {
                            offerId: p.offerId,
                            sector: p.sectorLabel,
                            row: p.rowLabel,
                            seat: p.seat,
                            priceKey: p.priceKey,
                          });
                          onToggleSeat(p.offerId, p.seat, p.available);
                        }}
                      >
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
                      const active = activeOfferId === oid && selectedSeats.includes(seat);
                      return (
                        <button
                          key={`${oid}-${seat}`}
                          type="button"
                          className={`${styles.seatDot} ${active ? styles.seatDotOn : ''}`}
                          style={{ left: `${gx * 100}%`, top: `${gy * 100}%`, '--seat-accent': bg } as React.CSSProperties}
                          aria-label={`${row.Sector ?? ''} · ряд ${row.Row ?? ''} · место ${seat} · ${pk} ₽`}
                          onPointerDown={(ev) => {
                            ev.stopPropagation();
                            showSeatInfo(ev.currentTarget, {
                              offerId: oid,
                              sector: String(row.Sector ?? ''),
                              row: String(row.Row ?? ''),
                              seat,
                              priceKey: pk,
                            });
                          }}
                          onPointerEnter={(ev) => {
                            showSeatInfo(ev.currentTarget, {
                              offerId: oid,
                              sector: String(row.Sector ?? ''),
                              row: String(row.Row ?? ''),
                              seat,
                              priceKey: pk,
                            });
                          }}
                          onFocus={(ev) => {
                            showSeatInfo(ev.currentTarget, {
                              offerId: oid,
                              sector: String(row.Sector ?? ''),
                              row: String(row.Row ?? ''),
                              seat,
                              priceKey: pk,
                            });
                          }}
                          onClick={(ev) => {
                            showSeatInfo(ev.currentTarget, {
                              offerId: oid,
                              sector: String(row.Sector ?? ''),
                              row: String(row.Row ?? ''),
                              seat,
                              priceKey: pk,
                            });
                            onToggleSeat(oid, seat, seats);
                          }}
                        >
                          <span className={styles.seatDotLabel}>{seat}</span>
                        </button>
                      );
                    });
                  })}
            </div>
          </div>
        </div>
      </div>

      <Popover
        open={Boolean(hoverAnchor && hoverSeat)}
        anchorEl={hoverAnchor}
        onClose={hideSeatInfo}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        disableAutoFocus
        disableEnforceFocus
        disableRestoreFocus
        slotProps={{
          paper: {
            sx: { p: 1.25, maxWidth: 280, borderRadius: 2 },
          },
        }}
      >
        {hoverSeat && (
          <>
            <Typography variant="body2" sx={{ lineHeight: 1.45 }}>
              <strong>{hoverSeat.sector || 'Сектор'}</strong>, {hoverSeat.row || '—'} ряд, место{' '}
              {hoverSeat.seat}, цена{' '}
              <strong>{Number(hoverSeat.priceKey).toLocaleString('ru-RU')} ₽</strong>
            </Typography>
            {onReserveFromMap && activeOfferId === hoverSeat.offerId && selectedSeats.includes(hoverSeat.seat) ? (
              <Button
                fullWidth
                variant="contained"
                size="small"
                disabled={reservePending}
                onClick={() => onReserveFromMap()}
                sx={{ mt: 1 }}
              >
                {reservePending ? 'Бронирование…' : 'Забронировать'}
              </Button>
            ) : null}
          </>
        )}
      </Popover>

      {selectedOffer && activeOfferId && selectedSeats.length > 0 && String(selectedOffer.Id ?? '') === activeOfferId ? (
        <div className={styles.selectionBar}>
          <div className={styles.selectionText}>
            <strong>{selectedOffer.Sector ?? '—'}</strong> · ряд {selectedOffer.Row ?? '—'} · места{' '}
            {selectedSeats.join(', ')}
          </div>
          <div className={styles.selectionActions}>
            {onNavigateToList ? (
              <Button size="small" variant="text" onClick={onNavigateToList}>
                К списку мест
              </Button>
            ) : null}
            {onReserveFromMap ? (
              <Button variant="contained" size="small" disabled={reservePending} onClick={() => onReserveFromMap()}>
                {reservePending ? 'Бронирование…' : 'Забронировать'}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
