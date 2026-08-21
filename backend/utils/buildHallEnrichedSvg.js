/**
 * Сборка enriched SVG (как Лужники): подложка + circle на каждую точку координат.
 */

function parseViewBox(svgMarkup) {
  const m = String(svgMarkup || '').match(/viewBox=["']([^"']+)["']/i);
  if (!m) return null;
  const p = m[1].trim().split(/[\s,]+/).map(Number);
  if (p.length >= 4 && p.every((n) => Number.isFinite(n)) && p[2] > 0 && p[3] > 0) {
    return { minX: p[0], minY: p[1], w: p[2], h: p[3] };
  }
  return null;
}

function parseWidthHeight(svgMarkup) {
  const wM = String(svgMarkup || '').match(/<svg\b[^>]*\bwidth=["']([\d.]+)/i);
  const hM = String(svgMarkup || '').match(/<svg\b[^>]*\bheight=["']([\d.]+)/i);
  const w = wM ? Number.parseFloat(wM[1]) : NaN;
  const h = hM ? Number.parseFloat(hM[1]) : NaN;
  if (Number.isFinite(w) && w > 0 && Number.isFinite(h) && h > 0) return { w, h };
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

/** Убрать исходные circle-места из подложки — иначе двойной слой (крошечный SVG + огромные точки). */
function stripNativeSeatCircles(svgMarkup) {
  return String(svgMarkup || '')
    .replace(/<circle\b[^>]*\bplace-name\s*=[^>]*>/gi, '')
    .replace(/<circle\b[^>]*\bdata-replaced\s*=[^>]*>/gi, '')
    .replace(/<circle\b[^>]*\bdata-sector\s*=[^>]*>/gi, '');
}

export const HALL_SEAT_COORDINATES_LAYER_ID = 'hall-seat-coordinates';

/** r=5 ок для Лужников (~11k), но на МХТ viewBox ~170 это каша из blob'ов. */
function resolveSeatRadii(hallW, hallH, pointsAbs, denseCloud) {
  const minDim = Math.min(hallW, hallH);
  let minDist = Infinity;
  const n = pointsAbs.length;
  const sample = n > 2500 ? 800 : n;
  const step = Math.max(1, Math.floor(n / sample));
  for (let i = 0; i < n; i += step) {
    const a = pointsAbs[i];
    for (let j = i + 1; j < Math.min(n, i + 48); j += 1) {
      const b = pointsAbs[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d > 1e-6 && d < minDist) minDist = d;
    }
  }
  const densityCap =
    Number.isFinite(minDist) && minDist < Infinity ? minDist * 0.42 : minDim * 0.01;
  /** Эталон Лужники: r≈5 при hall≈11413 → доля ~0.00044. */
  const scaleBase = denseCloud ? minDim * 0.00028 : minDim * 0.00042;
  let labeledR = Math.min(densityCap, Math.max(scaleBase, minDim * 0.0022));
  labeledR = Math.min(labeledR, minDim * 0.018);
  labeledR = Math.max(0.18, labeledR);
  const unlabeledR = Math.max(0.14, labeledR * (denseCloud ? 0.7 : 0.85));
  const strokeW = Math.max(0.08, Math.min(labeledR * 0.22, minDim * 0.004));
  return { unlabeledR, labeledR, strokeW };
}

/**
 * @param {string} bgSvgMarkup
 * @param {{
 *   hallW?: number;
 *   hallH?: number;
 *   allSeatCoordinates?: { xPct?: number; yPct?: number; x?: number; y?: number }[];
 *   labeledSeats?: { sector?: string; row?: string; seat?: string; xPct?: number; yPct?: number }[];
 *   denseCloud?: boolean;
 *   stripNativeSeatCircles?: boolean;
 * }} opts
 */
export function buildHallEnrichedSvg(bgSvgMarkup, opts = {}) {
  let svg = String(bgSvgMarkup || '').trim();
  if (!svg.includes('<svg')) throw new Error('bg SVG пустой');

  if (opts.stripNativeSeatCircles !== false) {
    const hasLabeled =
      (opts.labeledSeats?.length || 0) > 0 || (opts.allSeatCoordinates?.length || 0) > 0;
    if (hasLabeled) svg = stripNativeSeatCircles(svg);
  }

  const vb = parseViewBox(svg);
  const wh = parseWidthHeight(svg);
  const hallW = Number(opts.hallW) || vb?.w || wh?.w || 1494;
  const hallH = Number(opts.hallH) || vb?.h || wh?.h || 1292;
  const originX = vb?.minX ?? 0;
  const originY = vb?.minY ?? 0;

  /** Без viewBox редактор рисует «в другом мире» относительно width/height. */
  if (!vb) {
    if (/viewBox\s*=/i.test(svg)) {
      svg = svg.replace(/viewBox=["'][^"']*["']/i, `viewBox="0 0 ${hallW} ${hallH}"`);
    } else {
      svg = svg.replace(/<svg\b/i, `<svg viewBox="0 0 ${hallW} ${hallH}"`);
    }
  }

  const denseCloud = opts.denseCloud === true || (opts.allSeatCoordinates?.length || 0) > 12000;

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

  /** Сначала собираем точки — радиус считаем по плотности, не хардкодим 5. */
  const pending = [];
  const seen = new Set();
  const queuePoint = (xPct, yPct, meta) => {
    const k = coordKey(xPct, yPct);
    if (seen.has(k)) return;
    seen.add(k);
    pending.push({
      xPct,
      yPct,
      x: originX + (xPct / 100) * hallW,
      y: originY + (yPct / 100) * hallH,
      meta: meta || null,
    });
  };

  for (const pt of opts.allSeatCoordinates || []) {
    const xPct = Number(pt?.xPct ?? pt?.x);
    const yPct = Number(pt?.yPct ?? pt?.y);
    if (!Number.isFinite(xPct) || !Number.isFinite(yPct)) continue;
    queuePoint(xPct, yPct, labeledByCoord.get(coordKey(xPct, yPct)));
  }
  for (const s of opts.labeledSeats || []) {
    const xPct = Number(s?.xPct);
    const yPct = Number(s?.yPct);
    if (!Number.isFinite(xPct) || !Number.isFinite(yPct)) continue;
    queuePoint(xPct, yPct, s);
  }

  const { unlabeledR, labeledR, strokeW } = resolveSeatRadii(
    hallW,
    hallH,
    pending,
    denseCloud,
  );
  const rLabeled = Number(labeledR.toFixed(3));
  const rUnlabeled = Number(unlabeledR.toFixed(3));
  const stroke = Number(strokeW.toFixed(3));

  const circles = [];
  for (const pt of pending) {
    const meta = pt.meta;
    const sector = String(meta?.sector || '').trim();
    const row = String(meta?.row || '').trim();
    const seat = String(meta?.seat || '').trim();
    const labeled = Boolean(sector && row && seat);
    const r = labeled ? rLabeled : rUnlabeled;
    const attrs = [
      `cx="${pt.x.toFixed(2)}"`,
      `cy="${pt.y.toFixed(2)}"`,
      `r="${r}"`,
      labeled ? 'fill="#22c55e"' : 'fill="#94a3b8"',
      labeled ? 'stroke="#ffffff"' : 'opacity="0.55"',
      labeled ? `stroke-width="${stroke}"` : '',
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
