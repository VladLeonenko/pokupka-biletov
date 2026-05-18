/**
 * Из enriched SVG → seats[] для bundle-luzhniki-gray-cloud-labeled-seats.json (карта checkout).
 */

function decodeSvgAttr(s) {
  return String(s || '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
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
  const seats = [];
  const re = /<circle\b[^>]*\/?>/gi;
  let m;
  while ((m = re.exec(svgMarkup))) {
    const tag = m[0];
    const cx = Number(attr(tag, 'cx'));
    const cy = Number(attr(tag, 'cy'));
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) continue;
    const sector = attr(tag, 'data-sector') || attr(tag, 'place-name');
    const row = attr(tag, 'data-row') || attr(tag, 'row');
    const seat = attr(tag, 'data-seat') || attr(tag, 'place');
    if (!sector || !isValidRowSeat(row, seat)) continue;
    const source = attr(tag, 'data-source') || 'svg';
    seats.push({
      sector,
      row: String(row).trim(),
      seat: String(seat).trim(),
      xPct: (cx / w) * 100,
      yPct: (cy / h) * 100,
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
