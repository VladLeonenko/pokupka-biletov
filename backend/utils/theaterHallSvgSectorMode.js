/**
 * sectorMode для театральных SVG (Яндекс Афиша / pbilet path[data-id][data-name]).
 */

const PATH_TAG_RE = /<path\b([^>]*?)\/?>/gi;

function decodeHtmlEntities(value) {
  return String(value ?? '')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (_, entity) => {
      if (entity.startsWith('#x')) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
      if (entity.startsWith('#')) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
      if (entity === 'amp') return '&';
      if (entity === 'lt') return '<';
      if (entity === 'gt') return '>';
      if (entity === 'quot') return '"';
      if (entity === 'apos') return "'";
      return _;
    })
    .trim();
}

function readAttr(attrs, name) {
  const re = new RegExp(`\\b${name}\\s*=\\s*(["'])([^"']*)\\1`, 'i');
  const m = attrs.match(re);
  return m ? decodeHtmlEntities(m[2]) : '';
}

function normalizeText(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @param {string} svgMarkup
 * @returns {{ id: string; label: string; path: string }[]}
 */
export function parseTheaterHallSvgSectors(svgMarkup) {
  if (typeof svgMarkup !== 'string' || !svgMarkup.includes('<svg')) return [];

  const out = [];
  const seen = new Set();
  let m;
  PATH_TAG_RE.lastIndex = 0;
  while ((m = PATH_TAG_RE.exec(svgMarkup))) {
    const attrs = m[1] || '';
    const id = normalizeText(readAttr(attrs, 'data-id'));
    const label = normalizeText(readAttr(attrs, 'data-name') || readAttr(attrs, 'data-label'));
    const path = normalizeText(readAttr(attrs, 'd'));
    if (!id || !label || !path) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, label, path });
  }
  return out;
}

/**
 * @param {string} svgMarkup
 * @param {{ source?: string }} [options]
 */
export function buildTheaterHallSectorMode(svgMarkup, options = {}) {
  const sectors = parseTheaterHallSvgSectors(svgMarkup);
  return {
    enabled: sectors.length > 0,
    source: options.source || 'svg-paths',
    sectors,
  };
}
