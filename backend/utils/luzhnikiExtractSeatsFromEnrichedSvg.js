/**
 * Из enriched SVG → seats[] для bundle-luzhniki-gray-cloud-labeled-seats.json (карта checkout).
 */

import { resolveCanonicalSectorLabel } from './luzhnikiSectorDisplayLabel.js';
import { decodeHtmlEntities } from './ticketHallSectorNormalize.js';

function decodeSvgAttr(s) {
  return decodeHtmlEntities(String(s || '')).trim();
}

function parseViewBox(svgMarkup) {
  const m = svgMarkup.match(/viewBox=["']([^"']+)["']/i);
  if (!m) return { w: 11413, h: 9676 };
  const p = m[1].trim().split(/[\s,]+/).map(Number);
  if (p.length >= 4 && p[2] > 0 && p[3] > 0) return { w: p[2], h: p[3] };
  return { w: 11413, h: 9676 };
}

function attr(tag, name) {
  const re = new RegExp(`${name}=["']([^"']*)["']`, 'i');
  const m = tag.match(re);
  return m ? decodeSvgAttr(m[1]) : '';
}

function parseMatrix(transform) {
  if (!transform || !String(transform).includes('matrix')) return null;
  const m = String(transform).match(/matrix\(\s*([^)]+)\)/i);
  if (!m) return null;
  const parts = m[1].split(/[\s,]+/).map((x) => Number.parseFloat(x.trim()));
  if (parts.length !== 6 || parts.some((n) => !Number.isFinite(n))) return null;
  return parts;
}

function applyMatrix(cx, cy, matrix) {
  if (!matrix) return { x: cx, y: cy };
  const [a, b, c, d, e, f] = matrix;
  return {
    x: a * cx + c * cy + e,
    y: b * cx + d * cy + f,
  };
}

function extractGlobalCircleMatrix(svgMarkup) {
  const viewport =
    svgMarkup.match(/<g\b[^>]*class=["'][^"']*\bsvg-pan-zoom_viewport\b[^"']*["'][^>]*>/i)?.[0] ||
    svgMarkup.match(/<g\b[^>]*transform=["'][^"']*matrix\([^)]+\)[^"']*["'][^>]*>/i)?.[0] ||
    '';
  return parseMatrix(attr(viewport, 'transform'));
}

function isValidRowSeat(row, seat) {
  const r = String(row ?? '').trim();
  const s = String(seat ?? '').trim();
  if (!r || !s || r === '—' || s === '—') return false;
  return true;
}

/**
 * @param {string} svgMarkup
 * @returns {{ seats: object[], hallWidth: number, hallHeight: number, labeledCount: number }}
 */
export function extractLabeledSeatsFromSvgMarkup(svgMarkup) {
  const { w, h } = parseViewBox(svgMarkup);
  const matrix = extractGlobalCircleMatrix(svgMarkup);
  const seats = [];
  const re = /<circle\b[^>]*\/?>/gi;
  let m;
  while ((m = re.exec(svgMarkup))) {
    const tag = m[0];
    const cx = Number(attr(tag, 'cx'));
    const cy = Number(attr(tag, 'cy'));
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) continue;
    const { x, y } = applyMatrix(cx, cy, matrix);
    const sectorRaw = attr(tag, 'data-sector') || attr(tag, 'place-name');
    const row = attr(tag, 'data-row') || attr(tag, 'row');
    const seat = attr(tag, 'data-seat') || attr(tag, 'place');
    if (!sectorRaw || !isValidRowSeat(row, seat)) continue;
    const source = attr(tag, 'data-source') || 'svg';
    /** fieldGrid/cloud (~75k) — не в checkout bundle; только hover-правки (manual-*). */
    if (!source.startsWith('manual')) continue;
    const sector = resolveCanonicalSectorLabel(sectorRaw);
    seats.push({
      sector,
      row: String(row).trim(),
      seat: String(seat).trim(),
      xPct: (x / w) * 100,
      yPct: (y / h) * 100,
      geodesySource: source.startsWith('manual') ? 'manualEditor' : source,
    });
  }
  return {
    seats,
    hallWidth: w,
    hallHeight: h,
    labeledCount: seats.length,
  };
}
