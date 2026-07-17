/**
 * Ticketland hall SVG: rect.place → sectorMode paths + allSeatCoordinates.
 */

const PLACE_RECT_RE =
  /<rect\b[^>]*\bclass="[^"]*\bplace\b[^"]*"[^>]*>/gi;
const ATTR_RE = (name) => new RegExp(`\\b${name}\\s*=\\s*(["'])([^"']*)\\1`, 'i');

function readAttr(attrs, name) {
  const m = attrs.match(ATTR_RE(name));
  return m ? m[2].trim() : '';
}

function normalizeText(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/ё/g, 'е')
    .replace(/Ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim();
}

/** @param {string} label */
export function normalizeTicketlandSectionLabel(label) {
  const t = normalizeText(label);
  if (!t) return t;
  return t
    .replace(/^балкон\s*-\s*середина$/i, 'Балкон — середина')
    .replace(/^амфитеатр\s*-\s*середина$/i, 'Амфитеатр — середина');
}

/**
 * @param {string} markup HTML or SVG fragment
 */
export function parseTicketlandHallDimensions(markup) {
  const m = markup.match(/<svg\b[^>]*\bwidth="(\d+(?:\.\d+)?)/i);
  const h = markup.match(/<svg\b[^>]*\bheight="(\d+(?:\.\d+)?)/i);
  const w = m ? Math.round(Number(m[1])) : 3581;
  const height = h ? Math.round(Number(h[1])) : 3052;
  return { hallWidth: w, hallHeight: height };
}

/**
 * @param {string} markup
 * @returns {{ id: string; sectionId: string; section: string; row: string; seat: string; x: number; y: number; w: number; h: number }[]}
 */
export function parseTicketlandPlaces(markup) {
  const { hallWidth, hallHeight } = parseTicketlandHallDimensions(markup);
  const out = [];
  let m;
  PLACE_RECT_RE.lastIndex = 0;
  while ((m = PLACE_RECT_RE.exec(markup))) {
    const attrs = m[0];
    const x = Number(readAttr(attrs, 'x'));
    const y = Number(readAttr(attrs, 'y'));
    const w = Number(readAttr(attrs, 'width')) || 16;
    const h = Number(readAttr(attrs, 'height')) || 16;
    const section = normalizeTicketlandSectionLabel(readAttr(attrs, 'section'));
    const sectionId = readAttr(attrs, 'sectionId');
    const id = readAttr(attrs, 'id');
    const row = readAttr(attrs, 'row');
    const seat = readAttr(attrs, 'seat');
    if (!section || !sectionId || !Number.isFinite(x) || !Number.isFinite(y)) continue;
    out.push({
      id: id || `${sectionId}_${row}_${seat}`,
      sectionId,
      section,
      row,
      seat,
      x,
      y,
      w,
      h,
      cx: x + w / 2,
      cy: y + h / 2,
      hallWidth,
      hallHeight,
    });
  }
  return out;
}

/**
 * @param {string} markup
 * @returns {{ label: string; x: number; y: number }[]}
 */
export function parseTicketlandSectionLabels(markup) {
  const out = [];
  const re =
    /<g\b[^>]*transform="translate\(([-\d.]+),\s*([-\d.]+)\)[^"]*"[^>]*>\s*<text[^>]*>([^<]+)<\/text>/gi;
  let m;
  while ((m = re.exec(markup))) {
    const label = normalizeTicketlandSectionLabel(m[3]);
    if (!label || label === 'СЦЕНА') continue;
    out.push({ label, x: Number(m[1]), y: Number(m[2]) });
  }
  return out;
}

/** @param {{ x: number; y: number }[]} points */
function convexHull(points) {
  if (points.length < 3) return points.slice();
  const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i -= 1) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

function hullToPath(points, pad = 24) {
  if (!points.length) return '';
  if (points.length === 1) {
    const p = points[0];
    return `M ${p.x - pad} ${p.y - pad} L ${p.x + pad} ${p.y - pad} L ${p.x + pad} ${p.y + pad} L ${p.x - pad} ${p.y + pad} Z`;
  }
  const hull = convexHull(points);
  if (hull.length < 3) {
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs) - pad;
    const maxX = Math.max(...xs) + pad;
    const minY = Math.min(...ys) - pad;
    const maxY = Math.max(...ys) + pad;
    return `M ${minX} ${minY} L ${maxX} ${minY} L ${maxX} ${maxY} L ${minX} ${maxY} Z`;
  }
  const expanded = hull.map((p, i) => {
    const prev = hull[(i + hull.length - 1) % hull.length];
    const next = hull[(i + 1) % hull.length];
    const dx1 = p.x - prev.x;
    const dy1 = p.y - prev.y;
    const dx2 = next.x - p.x;
    const dy2 = next.y - p.y;
    const len1 = Math.hypot(dx1, dy1) || 1;
    const len2 = Math.hypot(dx2, dy2) || 1;
    const nx = -(dy1 / len1 + dy2 / len2);
    const ny = dx1 / len1 + dx2 / len2;
    const nlen = Math.hypot(nx, ny) || 1;
    return { x: p.x + (nx / nlen) * pad, y: p.y + (ny / nlen) * pad };
  });
  return `M ${expanded.map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' L ')} Z`;
}

/**
 * @param {ReturnType<typeof parseTicketlandPlaces>} places
 * @param {{ label: string; x: number; y: number }[]} [labelHints]
 */
export function buildTicketlandSectors(places, labelHints = []) {
  /** @type {Map<string, { sectionId: string; label: string; points: { x: number; y: number }[] }>} */
  const byId = new Map();
  for (const p of places) {
    let g = byId.get(p.sectionId);
    if (!g) {
      g = { sectionId: p.sectionId, label: p.section, points: [] };
      byId.set(p.sectionId, g);
    }
    g.points.push({ x: p.cx, y: p.cy });
    g.label = p.section;
  }

  for (const hint of labelHints) {
    const hit = [...byId.values()].find((s) => s.label === hint.label);
    if (hit) continue;
    byId.set(`label:${hint.label}`, {
      sectionId: `label-${hint.label}`,
      label: hint.label,
      points: [
        { x: hint.x - 120, y: hint.y - 40 },
        { x: hint.x + 120, y: hint.y - 40 },
        { x: hint.x + 120, y: hint.y + 40 },
        { x: hint.x - 120, y: hint.y + 40 },
      ],
    });
  }

  const sectors = [...byId.values()]
    .filter((s) => s.label && s.points.length)
    .sort((a, b) => a.label.localeCompare(b.label, 'ru'))
    .map((s, idx) => ({
      id: String(s.sectionId).replace(/^label-/, '') || String(idx + 1),
      label: s.label,
      path: hullToPath(s.points, s.points.length <= 4 ? 40 : 28),
    }));

  return sectors;
}

/**
 * @param {ReturnType<typeof parseTicketlandPlaces>} places
 * @param {number} hallWidth
 * @param {number} hallHeight
 */
export function buildTicketlandAllSeatCoordinates(places, hallWidth, hallHeight) {
  return places.map((p) => ({
    xPct: (p.cx / hallWidth) * 100,
    yPct: (p.cy / hallHeight) * 100,
  }));
}

/**
 * @param {{ id: string; label: string; path: string }[]} sectors
 * @param {number} hallWidth
 * @param {number} hallHeight
 */
export function buildTicketlandHallSvg(sectors, hallWidth, hallHeight) {
  const esc = (s) =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  const paths = sectors
    .map(
      (s) =>
        `    <path data-id="${esc(s.id)}" data-type="level" data-name="${esc(s.label)}" d="${s.path}"/>`,
    )
    .join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${hallWidth} ${hallHeight}" width="${hallWidth}" height="${hallHeight}">
  <title>Kremlin Palace</title>
  <desc>Sectors from Ticketland hall scheme</desc>
  <rect x="0" y="0" width="${hallWidth}" height="${hallHeight}" fill="#f8fafc"/>
  <g id="kremlin-stage" fill="rgba(15, 23, 42, 0.08)" stroke="rgba(15, 23, 42, 0.2)" stroke-width="2">
    <rect x="${Math.round(hallWidth * 0.22)}" y="32" width="${Math.round(hallWidth * 0.56)}" height="120" rx="8"/>
    <text x="${Math.round(hallWidth / 2)}" y="105" text-anchor="middle" font-family="system-ui,sans-serif" font-size="48" fill="rgba(15, 23, 42, 0.55)">Сцена</text>
  </g>
  <g id="kremlin-sectors" fill="rgba(15, 23, 42, 0.04)" stroke="rgba(15, 23, 42, 0.12)" stroke-width="1.5">
${paths}
  </g>
</svg>
`;
}

/**
 * @param {string} markup
 */
export function buildTheaterLayoutFromTicketlandMarkup(markup) {
  const places = parseTicketlandPlaces(markup);
  if (!places.length) throw new Error('Ticketland SVG: не найдено rect.place');
  const { hallWidth, hallHeight } = parseTicketlandHallDimensions(markup);
  const labelHints = parseTicketlandSectionLabels(markup);
  const sectors = buildTicketlandSectors(places, labelHints);
  const svgMarkup = buildTicketlandHallSvg(sectors, hallWidth, hallHeight);
  const allSeatCoordinates = buildTicketlandAllSeatCoordinates(places, hallWidth, hallHeight);
  return {
    hallWidth,
    hallHeight,
    places,
    sectors,
    svgMarkup,
    allSeatCoordinates,
    sectorMode: {
      enabled: sectors.length > 0,
      source: 'ticketland-hull',
      sectors,
    },
  };
}
