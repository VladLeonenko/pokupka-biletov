/**
 * Сборка enriched SVG (как Лужники): подложка + circle на каждую точку координат.
 *
 * denseCloud (стадион): стиль как luzhniki-gray-cloud hand SVG —
 * opaque #c8ccd4, stroke=none, labeled через data-sector/row/seat (без green+stroke).
 * Театры (не dense): зелёные labeled как раньше.
 */

function parseViewBox(svgMarkup) {
  const m = String(svgMarkup || '').match(/viewBox=["']([^"']+)["']/i);
  if (!m) return null;
  const p = m[1].trim().split(/[\s,]+/).map(Number);
  if (p.length >= 4 && p[2] > 0 && p[3] > 0) return { w: p[2], h: p[3] };
  return null;
}

function escapeAttr(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function coordKey(xPct, yPct) {
  return `${Number(xPct).toFixed(4)}|${Number(yPct).toFixed(4)}`;
}

function seatSourceAttr(meta) {
  const raw = String(meta?.geodesySource || meta?.source || '').trim();
  if (raw) return raw;
  return 'pbilet-import';
}

export const HALL_SEAT_COORDINATES_LAYER_ID = 'hall-seat-coordinates';

/**
 * @param {string} bgSvgMarkup
 * @param {{
 *   hallW?: number;
 *   hallH?: number;
 *   allSeatCoordinates?: { xPct?: number; yPct?: number; x?: number; y?: number }[];
 *   labeledSeats?: { sector?: string; row?: string; seat?: string; xPct?: number; yPct?: number }[];
 *   denseCloud?: boolean;
 * }} opts
 */
export function buildHallEnrichedSvg(bgSvgMarkup, opts = {}) {
  let svg = String(bgSvgMarkup || '').trim();
  if (!svg.includes('<svg')) throw new Error('bg SVG пустой');

  const vb = parseViewBox(svg);
  const hallW = Number(opts.hallW) || vb?.w || 1494;
  const hallH = Number(opts.hallH) || vb?.h || 1292;
  const denseCloud = opts.denseCloud === true || (opts.allSeatCoordinates?.length || 0) > 12000;
  const unlabeledR = denseCloud ? 3 : 5;
  const labeledR = denseCloud ? 3 : 5;

  svg = svg.replace(
    new RegExp(`<g\\b[^>]*id=["']${HALL_SEAT_COORDINATES_LAYER_ID}["'][^>]*>[\\s\\S]*?</g>`, 'i'),
    '',
  );

  const labeledByCoord = new Map();
  for (const s of opts.labeledSeats || []) {
    const xPct = Number(s?.xPct);
    const yPct = Number(s?.yPct);
    if (!Number.isFinite(xPct) || !Number.isFinite(yPct)) continue;
    labeledByCoord.set(coordKey(xPct, yPct), s);
  }

  const seen = new Set();
  const circles = [];
  const pushCircle = (xPct, yPct, meta) => {
    const k = coordKey(xPct, yPct);
    if (seen.has(k)) return;
    seen.add(k);
    const cx = (xPct / 100) * hallW;
    const cy = (yPct / 100) * hallH;
    const sector = String(meta?.sector || '').trim();
    const row = String(meta?.row || '').trim();
    const seat = String(meta?.seat || '').trim();
    const labeled = Boolean(sector && row && seat);
    const r = labeled ? labeledR : unlabeledR;
    const attrs = [
      `cx="${cx.toFixed(2)}"`,
      `cy="${cy.toFixed(2)}"`,
      `r="${r}"`,
    ];
    if (labeled && denseCloud) {
      // Как спорт: серые точки + data-* (без fill/stroke/opacity на circle).
      attrs.push(
        `data-sector="${escapeAttr(sector)}"`,
        `data-row="${escapeAttr(row)}"`,
        `data-seat="${escapeAttr(seat)}"`,
        `data-source="${escapeAttr(seatSourceAttr(meta))}"`,
      );
    } else if (labeled) {
      attrs.push(
        'fill="#22c55e"',
        'stroke="#ffffff"',
        'stroke-width="1"',
        `data-sector="${escapeAttr(sector)}"`,
        `data-row="${escapeAttr(row)}"`,
        `data-seat="${escapeAttr(seat)}"`,
        `data-source="${escapeAttr(seatSourceAttr(meta))}"`,
      );
    } else if (denseCloud) {
      attrs.push('data-unlabeled="1"');
    } else {
      attrs.push('fill="#94a3b8"', 'opacity="0.55"', 'data-unlabeled="1"');
    }
    circles.push(`    <circle ${attrs.join(' ')}/>`);
  };

  for (const pt of opts.allSeatCoordinates || []) {
    const xPct = Number(pt?.xPct ?? pt?.x);
    const yPct = Number(pt?.yPct ?? pt?.y);
    if (!Number.isFinite(xPct) || !Number.isFinite(yPct)) continue;
    pushCircle(xPct, yPct, labeledByCoord.get(coordKey(xPct, yPct)));
  }
  for (const s of opts.labeledSeats || []) {
    const xPct = Number(s?.xPct);
    const yPct = Number(s?.yPct);
    if (!Number.isFinite(xPct) || !Number.isFinite(yPct)) continue;
    pushCircle(xPct, yPct, s);
  }

  const layer = [
    denseCloud
      ? `  <g id="${HALL_SEAT_COORDINATES_LAYER_ID}" fill="#c8ccd4" stroke="none" pointer-events="all">`
      : `  <g id="${HALL_SEAT_COORDINATES_LAYER_ID}" pointer-events="all">`,
    ...circles,
    '  </g>',
  ].join('\n');

  if (/<\/svg>\s*$/i.test(svg)) {
    return svg.replace(/<\/svg>\s*$/i, `${layer}\n</svg>`);
  }
  return `${svg}\n${layer}\n</svg>`;
}
