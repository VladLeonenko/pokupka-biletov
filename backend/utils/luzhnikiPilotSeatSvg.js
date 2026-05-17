/**
 * Пилотные circle в SVG — только для геодезии (координаты sellable).
 * На карте точки рисует canvas из sellableSeats, не эти круги.
 */

import cheerio from 'cheerio';

import { normalizeSectorLabel } from './ticketHallSectorNormalize.js';

/** Как luzhnikiFootballNativeGenerator: min(W,H) * 0.0029 */
export const LUZHNIKI_PILOT_SEATS_LAYER_ID = 'luzhniki-pilot-seats';
export const LUZHNIKI_PILOT_SECTOR_LAYER_ID = 'luzhniki-pilot-sector';

export function luzhnikiNativeSeatCircleRadius(hallWidth, hallHeight) {
  const w = Number(hallWidth) > 0 ? Number(hallWidth) : 11413;
  const h = Number(hallHeight) > 0 ? Number(hallHeight) : 9676;
  return Math.round(Math.min(w, h) * 0.0029 * 100) / 100;
}

export function escSvgAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Убрать тяжёлый слой geodesy-кругов из svg_markup перед отдачей клиенту.
 * Координаты sellable берутся из layout_json.seats / sellableSeats, не из DOM.
 */
const PILOT_LAYER_STUB = `<g id="${LUZHNIKI_PILOT_SEATS_LAYER_ID}" data-geodesy="layout-seats-only" pointer-events="none"></g>`;

/** Быстро вырезать 80k circle из слоя пилота (без cheerio на мегабайтах). */
export function stripLuzhnikiPilotSeatsLayerFromSvg(svgMarkup) {
  const trimmed = String(svgMarkup ?? '').trim();
  if (!trimmed.includes(LUZHNIKI_PILOT_SEATS_LAYER_ID)) return trimmed;

  const circleCount = (trimmed.match(/<circle\b[^>]*\bplace-name=/gi) || []).length;
  if (circleCount > 6000) {
    let replaced = trimmed.replace(
      new RegExp(
        `<g[^>]*id=["']${LUZHNIKI_PILOT_SEATS_LAYER_ID}["'][^>]*>[\\s\\S]*?</g>`,
        'i',
      ),
      PILOT_LAYER_STUB,
    );
    replaced = replaced.replace(
      /<g[^>]*id=["']pbilet-strict-seat-geodesy["'][^>]*>[\s\S]*?<\/g>/i,
      '',
    );
    if (replaced !== trimmed) return replaced;
  }

  const $ = cheerio.load(trimmed, { xml: true });
  $(`#${LUZHNIKI_PILOT_SEATS_LAYER_ID}`).remove();
  const svg = $('svg').first();
  if (svg.length) svg.append(PILOT_LAYER_STUB);
  return $.xml ? $.xml() : $.html();
}

/** Стабильный id для DOM (80k кругов пилота). */
export function luzhnikiPilotSeatCircleId(sector, row, seat) {
  const norm = normalizeSectorLabel(sector) || 'sector';
  const rowClean = String(row ?? '').replace(/\D/g, '') || '0';
  const seatClean = String(seat ?? '').replace(/\D/g, '') || '0';
  return `lz-${norm}-r${rowClean}-s${seatClean}`;
}

/** Невидимые круги: не портят подложку и processHallSvgForNative. */
export function pilotSeatCircleMarkup(sector, row, seat, cx, cy, hallWidth, hallHeight, extraAttrs = '') {
  const w = Number(hallWidth) > 0 ? Number(hallWidth) : 11413;
  const h = Number(hallHeight) > 0 ? Number(hallHeight) : 9676;
  const r = luzhnikiNativeSeatCircleRadius(w, h);
  const cxN = Number(cx);
  const cyN = Number(cy);
  const id = luzhnikiPilotSeatCircleId(sector, row, seat);
  return `<circle id="${escSvgAttr(id)}" cx="${cxN.toFixed(2)}" cy="${cyN.toFixed(2)}" r="${r.toFixed(2)}" place-name="${escSvgAttr(sector)}" row="${escSvgAttr(row)}" place="${escSvgAttr(seat)}" fill="none" stroke="none" opacity="0" pointer-events="none"${extraAttrs ? ` ${extraAttrs}` : ''}/>`;
}
