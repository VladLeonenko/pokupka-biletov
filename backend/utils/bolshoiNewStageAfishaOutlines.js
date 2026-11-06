/**
 * Новая сцена: контуры секторов = Afisha hallplan level.outline (тот же viewBox, что seats).
 * Не convex-hull от точек и не сырой xyz decor без проверки containment.
 */

import SvgPath from 'svgpath';

/**
 * @param {string} d
 * @param {number} [step]
 * @returns {number[][]}
 */
export function sampleSvgPath(d, step = 3) {
  const pts = [];
  const sp = new SvgPath(d).abs().unshort().unarc();
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  sp.iterate((s) => {
    const c = s[0];
    if (c === 'M') {
      cx = s[1];
      cy = s[2];
      sx = cx;
      sy = cy;
      pts.push([cx, cy]);
    } else if (c === 'L') {
      const x2 = s[1];
      const y2 = s[2];
      const n = Math.max(1, (Math.hypot(x2 - cx, y2 - cy) / step) | 0);
      for (let k = 1; k <= n; k += 1) pts.push([cx + ((x2 - cx) * k) / n, cy + ((y2 - cy) * k) / n]);
      cx = x2;
      cy = y2;
    } else if (c === 'H') {
      const x2 = s[1];
      const n = Math.max(1, (Math.abs(x2 - cx) / step) | 0);
      for (let k = 1; k <= n; k += 1) pts.push([cx + ((x2 - cx) * k) / n, cy]);
      cx = x2;
    } else if (c === 'V') {
      const y2 = s[1];
      const n = Math.max(1, (Math.abs(y2 - cy) / step) | 0);
      for (let k = 1; k <= n; k += 1) pts.push([cx, cy + ((y2 - cy) * k) / n]);
      cy = y2;
    } else if (c === 'C') {
      const [, x1, y1, x2, y2, x3, y3] = s;
      const n = Math.max(8, (Math.hypot(x3 - cx, y3 - cy) / step) | 0);
      for (let k = 1; k <= n; k += 1) {
        const t = k / n;
        const u = 1 - t;
        pts.push([
          u * u * u * cx + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
          u * u * u * cy + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
        ]);
      }
      cx = x3;
      cy = y3;
    } else if (c === 'Q') {
      const [, x1, y1, x2, y2] = s;
      const n = Math.max(6, (Math.hypot(x2 - cx, y2 - cy) / step) | 0);
      for (let k = 1; k <= n; k += 1) {
        const t = k / n;
        const u = 1 - t;
        pts.push([u * u * cx + 2 * u * t * x1 + t * t * x2, u * u * cy + 2 * u * t * y1 + t * t * y2]);
      }
      cx = x2;
      cy = y2;
    } else if (c === 'Z' || c === 'z') {
      pts.push([sx, sy]);
      cx = sx;
      cy = sy;
    }
  });
  return pts;
}

export function pointInPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0];
    const yi = poly[i][1];
    const xj = poly[j][0];
    const yj = poly[j][1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-15) + xi) inside = !inside;
  }
  return inside;
}

function sectionIdFromLabel(sector) {
  return (
    String(sector)
      .toLowerCase()
      .replace(/[^a-zа-яё0-9]+/gi, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 64) || 'sector'
  );
}

function pathCentroid(pts) {
  if (!pts.length) return { x: 0, y: 0 };
  let sx = 0;
  let sy = 0;
  for (const [x, y] of pts) {
    sx += x;
    sy += y;
  }
  return { x: sx / pts.length, y: sy / pts.length };
}

/**
 * Секторы из level.outline (+ fallback hull builder если outline битый).
 * @param {Array<{ name?: string, seats?: Array<{x_coord:number,y_coord:number,place?:string,row?:string}>, outline?: string }>} levels
 * @param {(places: object[]) => Array<{id:string,label:string,path:string,totalSeats:number}>} [hullFallback]
 */
export function buildSectorsFromAfishaOutlines(levels, hullFallback) {
  /** @type {Array<{ id: string, label: string, path: string, totalSeats: number, centroid: {x:number,y:number}, containmentPct: number, inside: number }>} */
  const sectors = [];
  const metrics = [];

  for (const level of levels || []) {
    const label = String(level?.name || '').trim();
    if (!label) continue;
    const seats = Array.isArray(level.seats) ? level.seats : [];
    const outline = String(level.outline || '').trim();
    let path = outline;
    let pts = [];
    let inside = 0;

    if (outline) {
      try {
        pts = sampleSvgPath(outline);
        for (const s of seats) {
          const x = Number(s.x_coord);
          const y = Number(s.y_coord);
          if (Number.isFinite(x) && Number.isFinite(y) && pointInPolygon(x, y, pts)) inside += 1;
        }
      } catch {
        pts = [];
        inside = 0;
      }
    }

    const pct = seats.length ? (100 * inside) / seats.length : 0;
    if (!path || pct < 90) {
      if (typeof hullFallback === 'function') {
        const places = seats
          .map((s) => {
            const x = Number(s.x_coord);
            const y = Number(s.y_coord);
            if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
            return {
              sectionId: sectionIdFromLabel(label),
              section: label,
              cx: x,
              cy: y,
            };
          })
          .filter(Boolean);
        const hulls = hullFallback(places);
        const h = hulls[0];
        if (h?.path) {
          path = h.path;
          try {
            pts = sampleSvgPath(path);
          } catch {
            pts = places.map((p) => [p.cx, p.cy]);
          }
          inside = seats.length;
        }
      }
    }

    if (!path) continue;

    const sector = {
      id: sectionIdFromLabel(label),
      label,
      path,
      totalSeats: seats.length,
      centroid: pathCentroid(pts),
      containmentPct: seats.length ? (100 * inside) / seats.length : 100,
      inside,
    };
    sectors.push(sector);
    metrics.push({
      label,
      seats: seats.length,
      inside: sector.inside,
      pct: Number(sector.containmentPct.toFixed(1)),
      source: outline && sector.containmentPct >= 90 ? 'outline' : 'hull-fallback',
    });
  }

  sectors.sort((a, b) => a.label.localeCompare(b.label, 'ru'));
  metrics.sort((a, b) => a.label.localeCompare(b.label, 'ru'));

  const seatTotal = metrics.reduce((a, m) => a + m.seats, 0);
  const insideTotal = metrics.reduce((a, m) => a + m.inside, 0);

  return {
    sectors,
    metrics,
    transform: 'identity',
    note: 'afisha level.outline already shares hallplan seat space (1373×1107); no affine',
    overallPct: seatTotal ? (100 * insideTotal) / seatTotal : 0,
    seatTotal,
    insideTotal,
  };
}

/**
 * Белые декоративные зоны из xyz-hallscheme (эквивалент серых «подушечек» на тёмном фоне).
 * Не для sectorMode — только фон. Identity coords.
 */
export function extractXyzWhiteSectorFills(markup) {
  if (!markup) return [];
  const whiteG = markup.match(/<g\s+fill="#FFF">([\s\S]*?)<\/g>/i);
  if (!whiteG) return [];
  return [...whiteG[1].matchAll(/<path\b[^>]*\bd="([^"]+)"[^>]*>/gi)].map((m) => m[1]);
}
