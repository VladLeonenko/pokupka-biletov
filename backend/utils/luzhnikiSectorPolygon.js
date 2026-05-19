/**
 * Контуры секторов из tickets.json sector.o → point-in-polygon для cloud-точек.
 */

/** SVG path d → вершины полигона (конечные точки сегментов; кривые не субдискретизируем). */
export function svgPathToPoints(d) {
  const points = [];
  const tokens = String(d || '').match(
    /[MmLlHhVvCcSsQqTtAaZz]|[-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?/g,
  );
  if (!tokens) return points;

  let i = 0;
  let cx = 0;
  let cy = 0;
  let startX = 0;
  let startY = 0;
  const num = () => parseFloat(tokens[i++]);

  while (i < tokens.length) {
    const cmd = tokens[i++];
    switch (cmd) {
      case 'M': {
        cx = num();
        cy = num();
        startX = cx;
        startY = cy;
        points.push([cx, cy]);
        break;
      }
      case 'm': {
        cx += num();
        cy += num();
        startX = cx;
        startY = cy;
        points.push([cx, cy]);
        break;
      }
      case 'L': {
        cx = num();
        cy = num();
        points.push([cx, cy]);
        break;
      }
      case 'l': {
        cx += num();
        cy += num();
        points.push([cx, cy]);
        break;
      }
      case 'H': {
        cx = num();
        points.push([cx, cy]);
        break;
      }
      case 'h': {
        cx += num();
        points.push([cx, cy]);
        break;
      }
      case 'V': {
        cy = num();
        points.push([cx, cy]);
        break;
      }
      case 'v': {
        cy += num();
        points.push([cx, cy]);
        break;
      }
      case 'C': {
        num();
        num();
        num();
        num();
        cx = num();
        cy = num();
        points.push([cx, cy]);
        break;
      }
      case 'c': {
        num();
        num();
        num();
        num();
        cx += num();
        cy += num();
        points.push([cx, cy]);
        break;
      }
      case 'S': {
        num();
        num();
        cx = num();
        cy = num();
        points.push([cx, cy]);
        break;
      }
      case 's': {
        num();
        num();
        cx += num();
        cy += num();
        points.push([cx, cy]);
        break;
      }
      case 'Q': {
        num();
        num();
        cx = num();
        cy = num();
        points.push([cx, cy]);
        break;
      }
      case 'q': {
        num();
        num();
        cx += num();
        cy += num();
        points.push([cx, cy]);
        break;
      }
      case 'T': {
        cx = num();
        cy = num();
        points.push([cx, cy]);
        break;
      }
      case 't': {
        cx += num();
        cy += num();
        points.push([cx, cy]);
        break;
      }
      case 'A': {
        num();
        num();
        num();
        num();
        num();
        cx = num();
        cy = num();
        points.push([cx, cy]);
        break;
      }
      case 'a': {
        num();
        num();
        num();
        num();
        num();
        cx += num();
        cy += num();
        points.push([cx, cy]);
        break;
      }
      case 'Z':
      case 'z': {
        cx = startX;
        cy = startY;
        break;
      }
      default:
        break;
    }
  }
  return points;
}

/** Ray casting */
export function pointInPolygon(px, py, polygon) {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * @param {unknown} ticketsPayload
 * @returns {{ name: string, polygon: number[][], minX: number, minY: number, maxX: number, maxY: number }[]}
 */
export function buildSectorPolygonIndex(ticketsPayload) {
  const sectors = ticketsPayload?.sectors;
  const sectorList = Array.isArray(sectors)
    ? sectors
    : sectors && typeof sectors === 'object'
      ? Object.values(sectors)
      : [];

  const index = [];
  for (const sec of sectorList) {
    const pathD = String(sec?.o ?? '').trim();
    if (!pathD) continue;
    const polygon = svgPathToPoints(pathD);
    if (polygon.length < 3) continue;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const [x, y] of polygon) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }

    index.push({
      name: String(sec?.i ?? '').trim(),
      polygon,
      minX,
      minY,
      maxX,
      maxY,
    });
  }
  return index;
}

export function findSectorNameForPoint(px, py, sectorIndex) {
  if (!Number.isFinite(px) || !Number.isFinite(py) || !sectorIndex?.length) return null;
  for (const sec of sectorIndex) {
    if (px < sec.minX || px > sec.maxX || py < sec.minY || py > sec.maxY) continue;
    if (pointInPolygon(px, py, sec.polygon)) return sec.name;
  }
  return null;
}
