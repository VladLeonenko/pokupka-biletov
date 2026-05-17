/**
 * Парсинг circle[place-name][row][place] из SVG (как processHallSvgForNative на фронте).
 * Для Лужников pbilet bg кругов нет — injectPbiletSeatsIntoSvg добавляет их из tickets.json.
 */

import cheerio from 'cheerio';
import {
  buildLabeledSeatIndex,
  buildSellableSeatGeodesy,
  labeledSeatLookupKeys,
} from './hallSeatGeodesyMatch.js';
import { strictSeatKey } from './ticketHallSectorNormalize.js';

function parseMatrix(transform) {
  if (!transform || !String(transform).includes('matrix')) return null;
  const m = String(transform).match(/matrix\(\s*([^)]+)\)/i);
  if (!m) return null;
  const parts = m[1].split(/[\s,]+/).map((x) => Number.parseFloat(x.trim()));
  if (parts.length !== 6 || parts.some((n) => !Number.isFinite(n))) return null;
  return parts;
}

function applyMatrix(cx, cy, matrix) {
  const [a, b, c, d, e, f] = matrix;
  return { x: a * cx + c * cy + e, y: b * cx + d * cy + f };
}

function parseDataReplacedSeat(value) {
  const text = String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;
  const rowMatch = text.match(/(?:^|[,;])\s*ряд\s+([^,;]+)/i);
  const seatMatch = text.match(/(?:^|[,;])\s*место\s+([^,;]+)/i);
  if (!rowMatch || !seatMatch) return null;
  const row = rowMatch[1]?.trim() ?? '';
  const seat = seatMatch[1]?.trim() ?? '';
  const sector = text
    .slice(0, rowMatch.index ?? 0)
    .replace(/[,;]\s*$/g, '')
    .trim();
  if (!sector || !row || !seat) return null;
  return { sector, row, seat };
}

/**
 * @returns {{ sector: string, row: string, seat: string, xPct: number, yPct: number }[]}
 */
export function parseSvgNativeSeatCircles(svgMarkup, hallWidth, hallHeight) {
  const trimmed = String(svgMarkup ?? '').trim();
  if (!trimmed.includes('<svg')) return [];

  const w = Number(hallWidth) > 0 ? Number(hallWidth) : 11413;
  const h = Number(hallHeight) > 0 ? Number(hallHeight) : 9676;

  const $ = cheerio.load(trimmed, { xml: true });
  const svg = $('svg').first();
  if (!svg.length) return [];

  let matrix = null;
  const panG = svg.find('g.svg-pan-zoom_viewport').first();
  const panG2 = panG.length ? panG : svg.find('g[transform*="matrix"]').first();
  if (panG2.length) {
    matrix = parseMatrix(panG2.attr('transform'));
  }

  const seats = [];
  const seen = new Set();

  $('circle[place-name], circle[data-replaced]').each((_, el) => {
    const c = $(el);
    const replaced = parseDataReplacedSeat(c.attr('data-replaced'));
    const sector = String(c.attr('place-name') ?? '').trim() || replaced?.sector || '';
    const row = String(c.attr('row') ?? c.attr('data-row') ?? replaced?.row ?? '').trim();
    const seat = String(c.attr('place') ?? c.attr('data-place') ?? replaced?.seat ?? '').trim();
    if (!sector || !row || !seat) return;

    const cx = Number.parseFloat(c.attr('cx') || '');
    const cy = Number.parseFloat(c.attr('cy') || '');
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) return;

    const { x, y } = matrix ? applyMatrix(cx, cy, matrix) : { x: cx, y: cy };
    const xPct = (x / w) * 100;
    const yPct = (y / h) * 100;
    const key = strictSeatKey(sector, row, seat);
    if (seen.has(key)) return;
    seen.add(key);
    seats.push({ sector, row, seat, xPct, yPct });
  });

  return seats;
}

export function countSvgNativeSeatCircles(svgMarkup) {
  const s = String(svgMarkup ?? '');
  if (!s.includes('<svg')) return 0;
  return (s.match(/<circle\b[^>]*\bplace-name=/gi) || []).length;
}

/**
 * Вшивает места из tickets (x,y) как circle в подложку pbilet (там их нет из коробки).
 * @param {{ sector: string, row: string, seat: string, xPct: number, yPct: number }[]} labeledSeats
 */
export function injectPbiletSeatsIntoSvg(svgMarkup, labeledSeats, hallWidth, hallHeight, options = {}) {
  const maxCircles = Number(options.maxCircles) > 0 ? Number(options.maxCircles) : 12000;
  const layerId = String(options.layerId ?? 'pbilet-labeled-seat-circles');
  const seats = Array.isArray(labeledSeats) ? labeledSeats : [];
  if (!seats.length || seats.length > maxCircles) {
    return { svgMarkup: String(svgMarkup ?? ''), embedded: false, count: 0 };
  }

  const w = Number(hallWidth) > 0 ? Number(hallWidth) : 11413;
  const h = Number(hallHeight) > 0 ? Number(hallHeight) : 9676;
  const trimmed = String(svgMarkup ?? '').trim();
  if (!trimmed.includes('<svg')) {
    return { svgMarkup: trimmed, embedded: false, count: 0 };
  }

  const esc = (s) =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const $ = cheerio.load(trimmed, { xml: true });
  const svg = $('svg').first();
  if (!svg.length) return { svgMarkup: trimmed, embedded: false, count: 0 };

  svg.find(`#${layerId}`).remove();

  const rDot = Math.max(1.2, Math.min(w, h) * 0.00035);
  const g = $(`<g id="${layerId}" fill="#c8ccd4" stroke="none"/>`);
  for (const s of seats) {
    if (!Number.isFinite(s.xPct) || !Number.isFinite(s.yPct)) continue;
    const cx = ((s.xPct / 100) * w).toFixed(3);
    const cy = ((s.yPct / 100) * h).toFixed(3);
    g.append(
      `<circle cx="${cx}" cy="${cy}" r="${rDot.toFixed(3)}" place-name="${esc(s.sector)}" row="${esc(s.row)}" place="${esc(s.seat)}"/>`,
    );
  }
  svg.append(g);

  const out = $.xml ? $.xml() : $.html();
  return { svgMarkup: out, embedded: true, count: seats.length };
}

/**
 * Sellable только по circle в SVG (+ дубли из layout.seats с тем же ключом).
 * Без cloud/svgRow — координаты как у театра.
 */
/**
 * @param {object} [options]
 * @param {boolean} [options.svgOnlyMatched] — только места с кругом в SVG (не подмешивать 80k layout.seats)
 * @param {boolean} [options.layoutHintsOnly] — layout только как подсказка, SVG перекрывает по ключу
 */
export function buildSellableSeatGeodesyFromSvgCircles(
  svgMarkup,
  layoutSeats,
  offers,
  hallWidth,
  hallHeight,
  options = {},
) {
  const { svgOnlyMatched = false, layoutHintsOnly = true, labeledSeatsAsCircles = null } = options;
  const fromSvg =
    Array.isArray(labeledSeatsAsCircles) && labeledSeatsAsCircles.length > 0
      ? labeledSeatsAsCircles
          .filter(
            (s) =>
              s?.sector &&
              s?.row &&
              s?.seat &&
              Number.isFinite(Number(s.xPct)) &&
              Number.isFinite(Number(s.yPct)),
          )
          .map((s) => ({
            sector: String(s.sector),
            row: String(s.row),
            seat: String(s.seat),
            xPct: Number(s.xPct),
            yPct: Number(s.yPct),
          }))
      : parseSvgNativeSeatCircles(svgMarkup, hallWidth, hallHeight);
  const byKey = svgOnlyMatched
    ? new Map()
    : buildLabeledSeatIndex(layoutHintsOnly ? layoutSeats || [] : []);
  for (const s of fromSvg) {
    for (const key of labeledSeatLookupKeys(s.sector, s.row, s.seat)) {
      byKey.set(key, { ...s, geodesySource: 'svgCircle' });
    }
  }

  const mergedSeats = [...byKey.values()];
  const base = buildSellableSeatGeodesy(mergedSeats, offers);
  const svgKeySet = new Set();
  for (const s of fromSvg) {
    for (const key of labeledSeatLookupKeys(s.sector, s.row, s.seat)) {
      svgKeySet.add(key);
    }
  }

  let seats = base.seats.map((s) => {
    const fromCircle = [...labeledSeatLookupKeys(s.sector, s.row, s.seat)].some((k) =>
      svgKeySet.has(k),
    );
    return { ...s, geodesySource: fromCircle ? 'svgCircle' : 'strict' };
  });

  if (svgOnlyMatched) {
    seats = seats.filter((s) => s.geodesySource === 'svgCircle');
  }

  return {
    ...base,
    seats,
    matched: seats.length,
    svgCircleCount: fromSvg.length,
    svgCircleMatched: seats.filter((s) => s.geodesySource === 'svgCircle').length,
  };
}
