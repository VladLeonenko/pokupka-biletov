/**
 * Сборка enriched SVG (как Лужники): подложка + circle на каждую точку координат.
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

export const HALL_SEAT_COORDINATES_LAYER_ID = 'hall-seat-coordinates';

/**
 * @param {string} bgSvgMarkup
 * @param {{
 *   hallW?: number;
 *   hallH?: number;
 *   allSeatCoordinates?: { xPct?: number; yPct?: number; x?: number; y?: number }[];
 *   labeledSeats?: { sector?: string; row?: string; seat?: string; xPct?: number; yPct?: number }[];
 * }} opts
 */
export function buildHallEnrichedSvg(bgSvgMarkup, opts = {}) {
  let svg = String(bgSvgMarkup || '').trim();
  if (!svg.includes('<svg')) throw new Error('bg SVG пустой');

  const vb = parseViewBox(svg);
  const hallW = Number(opts.hallW) || vb?.w || 1494;
  const hallH = Number(opts.hallH) || vb?.h || 1292;

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
    const labeled = sector && row && seat;
    const attrs = [
      `cx="${cx.toFixed(2)}"`,
      `cy="${cy.toFixed(2)}"`,
      'r="5"',
      labeled ? 'fill="#22c55e"' : 'fill="#94a3b8"',
      labeled ? 'stroke="#ffffff"' : 'opacity="0.55"',
      labeled ? 'stroke-width="1"' : '',
      labeled ? `data-sector="${escapeAttr(sector)}"` : 'data-unlabeled="1"',
      labeled ? `data-row="${escapeAttr(row)}"` : '',
      labeled ? `data-seat="${escapeAttr(seat)}"` : '',
      labeled
        ? `data-source="${escapeAttr(String(meta?.geodesySource || 'manual-editor').includes('manual') ? 'manual-editor' : meta?.geodesySource || 'pbilet-import')}"`
        : '',
    ]
      .filter(Boolean)
      .join(' ');
    circles.push(`    <circle ${attrs}/>`);
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
    `  <g id="${HALL_SEAT_COORDINATES_LAYER_ID}" pointer-events="all">`,
    ...circles,
    '  </g>',
  ].join('\n');

  if (/<\/svg>\s*$/i.test(svg)) {
    return svg.replace(/<\/svg>\s*$/i, `${layer}\n</svg>`);
  }
  return `${svg}\n${layer}\n</svg>`;
}
