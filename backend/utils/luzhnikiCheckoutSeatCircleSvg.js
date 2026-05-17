/**
 * Круги SVG 1:1 как на чекауте: cx/cy из xPct/yPct, атрибуты place-name / row / place.
 */

import { extractPbiletTicketSectorPaths } from './luzhnikiPbiletGeodesyExtract.js';
import {
  escSvgAttr,
  luzhnikiNativeSeatCircleRadius,
  luzhnikiPilotSeatCircleId,
} from './luzhnikiPilotSeatSvg.js';

export function layoutSeatToSvgCircle(seat, hallWidth, hallHeight, opts = {}) {
  const w = Number(hallWidth) > 0 ? Number(hallWidth) : 11413;
  const h = Number(hallHeight) > 0 ? Number(hallHeight) : 9676;
  const cx = (Number(seat.xPct) / 100) * w;
  const cy = (Number(seat.yPct) / 100) * h;
  const r = Number(opts.radius) > 0 ? Number(opts.radius) : luzhnikiNativeSeatCircleRadius(w, h);
  const id = luzhnikiPilotSeatCircleId(seat.sector, seat.row, seat.seat);
  const fill = opts.fill ?? '#94a3b8';
  const opacity = opts.opacity ?? 0.75;
  const stroke = opts.stroke ?? '#1e293b';
  return `<circle id="${escSvgAttr(id)}" cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${r.toFixed(2)}" place-name="${escSvgAttr(seat.sector)}" row="${escSvgAttr(seat.row)}" place="${escSvgAttr(seat.seat)}" fill="${fill}" stroke="${stroke}" stroke-width="0.35" opacity="${opacity}" data-source="${escSvgAttr(seat.geodesySource ?? 'layout')}"/>`;
}

export function sectorBoundaryPathsMarkup(sectorPaths, opts = {}) {
  const stroke = opts.stroke ?? '#475569';
  const width = Number(opts.strokeWidth) > 0 ? Number(opts.strokeWidth) : 3;
  const opacity = opts.opacity ?? 0.55;
  return (sectorPaths || [])
    .map((sp) => {
      const d = String(sp.path ?? '').trim();
      if (!d) return '';
      return `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-opacity="${opacity}" data-sector="${escSvgAttr(sp.label)}"/>`;
    })
    .filter(Boolean)
    .join('\n');
}

export function buildCheckoutSeatCircleOverlay(seats, hallWidth, hallHeight, sectorPaths = []) {
  const circles = (seats || []).map((s) => layoutSeatToSvgCircle(s, hallWidth, hallHeight));
  const bounds = sectorBoundaryPathsMarkup(sectorPaths);
  const sectorSet = new Set((seats || []).map((s) => String(s.sector).trim()));
  const rowSet = new Set();
  for (const s of seats || []) {
    const rn = parseInt(String(s.row).replace(/\D/g, ''), 10);
    if (Number.isFinite(rn)) rowSet.add(rn);
  }
  return {
    markup: `${bounds}\n<g id="layout-seat-circles">${circles.join('\n')}</g>`,
    seatCount: seats.length,
    sectorCount: sectorSet.size,
    rowCount: rowSet.size,
  };
}
