/**
 * Разбор экспорта Inkscape для стадиона Лужники: сектора как `<g id="C248">` с вложенными `path[d]`.
 * Трансформы предков сплющиваются в глобальные координаты viewBox через svgpath.
 */

import cheerio from 'cheerio';
import SvgPath from 'svgpath';

/** Трибуны A–D + номер (+ диапазон), как в типичной разметке; VIP отдельно. */
export function isLuzhnikiInkscapeSectorGroupId(id) {
  if (!id || typeof id !== 'string') return false;
  const t = id.trim();
  if (!t) return false;
  if (/^VIP\d*$/i.test(t)) return true;
  return /^[ABCD]\d+(?:-\d+)?$/i.test(t);
}

export function parseSvgViewBoxSize(svgMarkup) {
  const viewBox = svgMarkup.match(/\bviewBox=["']([^"']+)["']/i)?.[1];
  if (viewBox) {
    const parts = viewBox.trim().split(/[\s,]+/).map(Number);
    if (parts.length >= 4 && parts.every(Number.isFinite) && parts[2] > 0 && parts[3] > 0) {
      return { viewBox: viewBox.trim(), width: parts[2], height: parts[3] };
    }
  }
  const width = Number(svgMarkup.match(/\bwidth=["']([^"'px]+)/i)?.[1]);
  const height = Number(svgMarkup.match(/\bheight=["']([^"'px]+)/i)?.[1]);
  if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
    return { viewBox: `0 0 ${width} ${height}`, width, height };
  }
  return { viewBox: '0 0 100 100', width: 100, height: 100 };
}

/** Трансформы от самого элемента (path) к корню svg: сначала локальный path, затем родители. */
function collectTransformsInnerFirst(element) {
  const list = [];
  let cur = element;
  while (cur && cur.type === 'tag') {
    const name = cur.name?.toLowerCase?.() ?? '';
    if (name === 'svg') break;
    const tr = cur.attribs?.transform;
    if (tr && String(tr).trim()) list.push(String(tr).trim());
    cur = cur.parent;
  }
  return list;
}

function flattenPathData(pathEl) {
  const rawD = String(pathEl.attribs?.d ?? '').trim();
  if (!rawD) return '';
  const chain = collectTransformsInnerFirst(pathEl);
  const combined = chain.slice().reverse().join(' ');
  let p = SvgPath(rawD);
  if (combined.trim()) p = p.transform(combined.trim());
  return p.abs().round(3).toString();
}

/** Грубый bbox по координатам команд path (как на фронте для демо-сетки). */
export function pathBBox(pathStr) {
  const nums = pathStr.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)?.map(Number) ?? [];
  if (nums.length < 2) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = nums[i];
    const y = nums[i + 1];
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null;
  return { minX, minY, maxX, maxY };
}

function seatKey(sector, row, seat) {
  return `${sector.toLowerCase()}|${row.toLowerCase()}|${seat.toLowerCase()}`;
}

function syntheticSeatsInSectorPaths(sectors, width, height, seatsPerSector, demoRow = 'Демо') {
  const out = [];
  const seen = new Set();

  for (const sec of sectors) {
    const label = sec.label;
    const pathStr = sec.path;
    if (!label || !pathStr) continue;

    const bbox = pathBBox(pathStr);
    if (!bbox) continue;

    const padX = Math.max(4, (bbox.maxX - bbox.minX) * 0.08);
    const padY = Math.max(4, (bbox.maxY - bbox.minY) * 0.08);
    const innerMinX = bbox.minX + padX;
    const innerMaxX = bbox.maxX - padX;
    const innerMinY = bbox.minY + padY;
    const innerMaxY = bbox.maxY - padY;
    if (innerMaxX <= innerMinX || innerMaxY <= innerMinY) continue;

    const cols = Math.ceil(Math.sqrt(seatsPerSector));
    const rows = Math.ceil(seatsPerSector / cols);

    let n = 0;
    for (let r = 0; r < rows && n < seatsPerSector; r++) {
      for (let col = 0; col < cols && n < seatsPerSector; col++, n++) {
        const fx = (col + 0.5) / cols;
        const fy = (r + 0.5) / rows;
        const x = innerMinX + fx * (innerMaxX - innerMinX);
        const y = innerMinY + fy * (innerMaxY - innerMinY);
        const seatLabel = String(n + 1);
        const key = seatKey(label, demoRow, seatLabel);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({
          sector: label,
          row: demoRow,
          seat: seatLabel,
          xPct: (x / width) * 100,
          yPct: (y / height) * 100,
        });
      }
    }
  }

  return out;
}

/**
 * @param {string} svgMarkup
 * @param {{ seatsPerSector?: number }} opts
 */
export function parseLuzhnikiInkscapeStadiumSvg(svgMarkup, opts = {}) {
  const seatsPerSector = Number(opts.seatsPerSector) > 0 ? Number(opts.seatsPerSector) : 14;
  const $ = cheerio.load(svgMarkup, { xml: true });
  const svgEl = $('svg').first()[0];
  if (!svgEl) throw new Error('В разметке нет корневого <svg>');

  const serialized = $.xml();
  const { width, height, viewBox } = parseSvgViewBoxSize(serialized);

  /** @type {{ id: string, label: string, path: string }[]} */
  const sectors = [];

  $('g').each((_, gEl) => {
    const id = gEl.attribs?.id?.trim();
    if (!isLuzhnikiInkscapeSectorGroupId(id)) return;

    const pathEls = $(gEl)
      .find('path')
      .toArray()
      .filter((p) => String(p.attribs?.d ?? '').trim());

    const flatParts = [];
    for (const pEl of pathEls) {
      const flat = flattenPathData(pEl);
      if (flat) flatParts.push(flat);
    }
    const pathJoined = flatParts.join(' ');
    if (!pathJoined) return;

    const sectorId = id;
    sectors.push({
      id: sectorId,
      label: sectorId,
      path: pathJoined,
      totalSeats: null,
      availableSeats: 0,
      minPrice: null,
      maxPrice: null,
    });
  });

  sectors.sort((a, b) => a.label.localeCompare(b.label, 'ru', { numeric: true }));

  const seats = syntheticSeatsInSectorPaths(sectors, width, height, seatsPerSector);

  return {
    svgMarkupOut: serialized.trim(),
    viewBox,
    width,
    height,
    sectors,
    seats,
  };
}
