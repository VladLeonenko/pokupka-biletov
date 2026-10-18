/**
 * Большой театр — Историческая сцена.
 * Источник: HTML/SVG с ticket.bolshoi.ru (rect.seat, viewBox 1500×1190).
 * Пайплайн как Ticketland/Кремль: places → hull sectors → SVG с place-name circles.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

export function parseBolshoiHallDimensions(markup) {
  const vb = markup.match(/viewBox\s*=\s*["']\s*0\s+0\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)/i);
  if (vb) {
    return { hallWidth: Math.round(Number(vb[1])), hallHeight: Math.round(Number(vb[2])) };
  }
  const w = markup.match(/<svg\b[^>]*\bwidth="(\d+(?:\.\d+)?)/i);
  const h = markup.match(/<svg\b[^>]*\bheight="(\d+(?:\.\d+)?)/i);
  return {
    hallWidth: w ? Math.round(Number(w[1])) : 1500,
    hallHeight: h ? Math.round(Number(h[1])) : 1190,
  };
}

/**
 * Сырые места с официальной схемы (координаты ПОСЛЕ всех transform в SVG = x/y rect).
 * @returns {{ x: number, y: number, cx: number, cy: number, w: number, h: number }[]}
 */
export function parseBolshoiSeatRects(markup) {
  const out = [];
  const re = /<rect\b([^>]*)>/gi;
  let m;
  while ((m = re.exec(markup))) {
    const attrs = m[1];
    const cls = readAttr(attrs, 'class');
    if (cls && !/\bseat\b/i.test(cls) && !/unavailable|passport|has-tooltip/i.test(cls)) {
      // всё равно берём, если есть x/y — в дампе почти все rect это места
    }
    const x = Number(readAttr(attrs, 'x'));
    const y = Number(readAttr(attrs, 'y'));
    const w = Number(readAttr(attrs, 'width')) || 11;
    const h = Number(readAttr(attrs, 'height')) || 11;
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    out.push({ x, y, w, h, cx: x + w / 2, cy: y + h / 2 });
  }
  return out;
}

/**
 * Подписи из ранее снятого labeled SVG (data-tooltip) — только метаданные, не координаты.
 */
export function parseBolshoiLabeledCircles(circlesMarkup) {
  const out = [];
  const re =
    /<circle\b[^>]*\bcx="([\d.]+)"[^>]*\bcy="([\d.]+)"[^>]*data-tooltip="([^"]*)"/gi;
  let m;
  while ((m = re.exec(circlesMarkup))) {
    const tip = m[3];
    const rowM = tip.match(/ряд\s*:\s*([^,]+)/i);
    const seatM = tip.match(/место\s*:\s*([^,\s<]+)/i);
    if (!rowM || !seatM) continue;
    const sector = normalizeText(tip.split(',')[0].replace(/\([^)]*\)/g, ''));
    out.push({
      x: Number(m[1]),
      y: Number(m[2]),
      sector,
      row: normalizeText(rowM[1]),
      seat: normalizeText(seatM[1]),
      tip,
    });
  }
  return out;
}

function normBox(pts, getXY) {
  const xs = pts.map((p) => getXY(p).x);
  const ys = pts.map((p) => getXY(p).y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const dx = Math.max(maxX - minX, 1e-6);
  const dy = Math.max(maxY - minY, 1e-6);
  return {
    minX,
    minY,
    dx,
    dy,
    toN: (x, y) => [(x - minX) / dx, (y - minY) / dy],
    fromN: (nx, ny) => [nx * dx + minX, ny * dy + minY],
  };
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

/**
 * Официальные x/y + подписи из labeled circles.
 * Affine labeled-bbox → official-bbox, затем greedy NN (сначала жёсткий порог, потом мягкий).
 * Секторные центроиды (старый алгоритм) путали Партер с ложами у сцены.
 */
export function matchBolshoiLabelsToOfficialRects(rects, labeled) {
  if (!rects.length) return [];
  if (!labeled.length) {
    return classifyBolshoiOfficialSeats(rects);
  }

  const lxs = labeled.map((p) => p.x);
  const lys = labeled.map((p) => p.y);
  const rxs = rects.map((p) => p.cx);
  const rys = rects.map((p) => p.cy);
  const lminx = Math.min(...lxs);
  const lmaxx = Math.max(...lxs);
  const lminy = Math.min(...lys);
  const lmaxy = Math.max(...lys);
  const rminx = Math.min(...rxs);
  const rmaxx = Math.max(...rxs);
  const rminy = Math.min(...rys);
  const rmaxy = Math.max(...rys);
  const ldx = Math.max(lmaxx - lminx, 1e-6);
  const ldy = Math.max(lmaxy - lminy, 1e-6);
  const rdx = Math.max(rmaxx - rminx, 1e-6);
  const rdy = Math.max(rmaxy - rminy, 1e-6);

  const mapL = (p) => ({
    x: ((p.x - lminx) / ldx) * rdx + rminx,
    y: ((p.y - lminy) / ldy) * rdy + rminy,
  });

  /** @type {Map<string, typeof labeled>} */
  const bySec = new Map();
  for (const s of labeled) {
    const list = bySec.get(s.sector) || [];
    list.push(s);
    bySec.set(s.sector, list);
  }

  const used = new Set();
  const places = [];
  const seen = new Set();

  /** Сначала мелкие сектора (ложи) — точнее локальный NN. */
  const secs = [...bySec.entries()].sort((a, b) => a[1].length - b[1].length);

  const assignGroup = (sector, pts, maxDist) => {
    const mapped = pts.map((hp) => ({ hp, m: mapL(hp) }));
    for (const { hp, m } of mapped) {
      let best = -1;
      let bestD = Infinity;
      for (let i = 0; i < rects.length; i += 1) {
        if (used.has(i)) continue;
        const d = Math.hypot(rects[i].cx - m.x, rects[i].cy - m.y);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      if (best < 0 || bestD > maxDist) continue;
      used.add(best);
      const key = `${sector}|${hp.row}|${hp.seat}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const r = rects[best];
      places.push({
        id: key,
        sectionId: sectionIdFromLabel(sector),
        section: sector,
        row: hp.row,
        seat: hp.seat,
        x: r.x,
        y: r.y,
        w: r.w,
        h: r.h,
        cx: r.cx,
        cy: r.cy,
        matchDist: bestD,
      });
    }
  };

  for (const [sector, pts] of secs) {
    assignGroup(sector, pts, pts.length <= 12 ? 55 : 90);
  }
  /** Добор оставшихся крупными секторами с мягким порогом. */
  for (const [sector, pts] of secs) {
    const missing = pts.filter((hp) => !seen.has(`${sector}|${hp.row}|${hp.seat}`));
    if (missing.length) assignGroup(sector, missing, 140);
  }

  /** Официальные места без подписи — серые «фон». */
  for (let i = 0; i < rects.length; i += 1) {
    if (used.has(i)) continue;
    const r = rects[i];
    places.push({
      id: `unlabeled|${i}`,
      sectionId: 'unlabeled',
      section: 'Не подписано',
      row: '—',
      seat: String(i + 1),
      x: r.x,
      y: r.y,
      w: r.w,
      h: r.h,
      cx: r.cx,
      cy: r.cy,
      matchDist: Infinity,
    });
  }

  return places;
}

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

function hullToPath(points, pad = 16) {
  if (!points.length) return '';
  if (points.length < 3) {
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs) - pad;
    const maxX = Math.max(...xs) + pad;
    const minY = Math.min(...ys) - pad;
    const maxY = Math.max(...ys) + pad;
    return `M ${minX} ${minY} L ${maxX} ${minY} L ${maxX} ${maxY} L ${minX} ${maxY} Z`;
  }
  const hull = convexHull(points);
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

export function buildBolshoiSectors(places) {
  /** @type {Map<string, { sectionId: string; label: string; points: { x: number; y: number }[] }>} */
  const byId = new Map();
  for (const p of places) {
    let g = byId.get(p.sectionId);
    if (!g) {
      g = { sectionId: p.sectionId, label: p.section, points: [] };
      byId.set(p.sectionId, g);
    }
    g.points.push({ x: p.cx, y: p.cy });
  }
  return [...byId.values()]
    .filter((s) => s.label && s.points.length)
    .sort((a, b) => a.label.localeCompare(b.label, 'ru'))
    .map((s) => ({
      id: s.sectionId,
      label: s.label,
      path: hullToPath(s.points, s.points.length <= 6 ? 22 : 14),
      totalSeats: s.points.length,
    }));
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Официальные координаты без лотос-подписей: зоны по геометрии подковы.
 * (Лейблы с lotus SVG в другой системе координат — матчинг даёт «Партер» на ложах у сцены.)
 */
export function classifyBolshoiOfficialSeats(rects, hallWidth = 1500, hallHeight = 1190) {
  const cx0 = hallWidth / 2;
  /** Центральный плотный блок партера (по гистограмме official rects). */
  const isParter = (p) => p.cx >= 470 && p.cx <= 1035 && p.cy >= 160 && p.cy <= 400;
  const isAmph = (p) => p.cx >= 520 && p.cx <= 980 && p.cy > 400 && p.cy <= 530;
  const isSide = (p) => p.cx < 470 || p.cx > 1035;

  /** @type {{ r: typeof rects[0], section: string, side: string }[]} */
  const raw = [];
  for (const r of rects) {
    let section;
    let side = r.cx < cx0 ? 'Левая сторона' : 'Правая сторона';
    if (isParter(r)) {
      section = 'Партер';
      side = '';
    } else if (isAmph(r)) {
      section = 'Амфитеатр';
      side = '';
    } else if (isSide(r)) {
      if (r.cy < 360) section = `Бельэтаж ${side}`;
      else if (r.cy < 650) section = `1 ярус ${side}`;
      else if (r.cy < 880) section = `Балкон 2 яруса ${side}`;
      else if (r.cy < 1040) section = `Балкон 3 яруса ${side}`;
      else section = `Балкон 4 яруса ${side}`;
    } else if (r.cy > 530 && r.cy < 880) {
      section = r.cy < 700 ? `Балкон 2 яруса ${side}` : `Балкон 3 яруса ${side}`;
    } else {
      section = `Балкон 4 яруса ${side}`;
    }
    raw.push({ r, section, side });
  }

  /** Ряд/место: сортировка внутри секции (ряд = кластер по Y). */
  /** @type {Map<string, typeof raw>} */
  const bySec = new Map();
  for (const item of raw) {
    const list = bySec.get(item.section) || [];
    list.push(item);
    bySec.set(item.section, list);
  }

  const places = [];
  for (const [section, items] of bySec) {
    items.sort((a, b) => a.r.cy - b.r.cy || a.r.cx - b.r.cx);
    const rowTol = section === 'Партер' || section === 'Амфитеатр' ? 10 : 16;
    /** @type {{ y: number, seats: typeof items }[]} */
    const rows = [];
    for (const it of items) {
      const last = rows[rows.length - 1];
      if (!last || Math.abs(it.r.cy - last.y) > rowTol) {
        rows.push({ y: it.r.cy, seats: [it] });
      } else {
        last.seats.push(it);
        last.y = (last.y * (last.seats.length - 1) + it.r.cy) / last.seats.length;
      }
    }
    rows.forEach((row, ri) => {
      const ordered =
        section.startsWith('Бельэтаж') || section.startsWith('1 ярус') || section.startsWith('Балкон')
          ? [...row.seats].sort((a, b) =>
              a.r.cx < cx0 ? b.r.cx - a.r.cx : a.r.cx - b.r.cx,
            )
          : [...row.seats].sort((a, b) => a.r.cx - b.r.cx);
      // Партер: ряд 1 у сцены; ряд А = первый ряд (VIP).
      let rowLabel = String(ri + 1);
      if (section === 'Партер' && ri === 0) rowLabel = 'А';
      else if (section === 'Партер') rowLabel = String(ri);
      ordered.forEach((it, si) => {
        places.push({
          id: `${section}|${rowLabel}|${si + 1}`,
          sectionId: sectionIdFromLabel(section),
          section,
          row: rowLabel,
          seat: String(si + 1),
          x: it.r.x,
          y: it.r.y,
          w: it.r.w,
          h: it.r.h,
          cx: it.r.cx,
          cy: it.r.cy,
          matchDist: 0,
        });
      });
    });
  }
  return places;
}

/**
 * SVG: места + сцена в «рту» подковы (центр, y≈90) — между боковыми ложами, без серого фона.
 * processHallSvgForNative режет viewBox по кругам; сцена должна попадать в pad сверху.
 */
export function buildBolshoiHistoricalHallSvg(places, sectors, hallWidth, hallHeight) {
  void sectors;
  const rDot = Math.max(2.4, Math.min(hallWidth, hallHeight) * 0.0026);
  const circles = places
    .map(
      (p) =>
        `    <circle cx="${p.cx.toFixed(2)}" cy="${p.cy.toFixed(2)}" r="${rDot.toFixed(2)}" place-name="${esc(p.section)}" row="${esc(p.row)}" place="${esc(p.seat)}" fill="#c8ccd4" stroke="none"/>`,
    )
    .join('\n');

  /** Подпись сцены в пустом «рту» подковы (center y≈50–150), без заливки-плашки. */
  const stageY = 72;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${hallWidth} ${hallHeight}" width="${hallWidth}" height="${hallHeight}">
  <title>Большой театр — Историческая сцена</title>
  <desc>Official ticket.bolshoi.ru seat rects; geometric labels; no gray plate</desc>
  <g id="bolshoi-historical-stage">
    <text x="${Math.round(hallWidth / 2)}" y="${stageY}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="28" font-weight="600" fill="rgba(15, 23, 42, 0.45)">Сцена</text>
  </g>
  <g id="bolshoi-historical-seats" fill="#c8ccd4" stroke="none">
${circles}
  </g>
</svg>
`;
}

/**
 * @param {string} markup официальный HTML/SVG
 * @param {string} [labeledCirclesMarkup] optional labeled circles SVG
 */
export function buildTheaterLayoutFromBolshoiMarkup(markup, labeledCirclesMarkup = '') {
  const { hallWidth, hallHeight } = parseBolshoiHallDimensions(markup);
  const rects = parseBolshoiSeatRects(markup);
  if (rects.length < 50) {
    throw new Error(`Bolshoi SVG: слишком мало rect (${rects.length})`);
  }

  let labeled = [];
  if (labeledCirclesMarkup) {
    labeled = parseBolshoiLabeledCircles(labeledCirclesMarkup);
  } else {
    const fallback = path.join(
      __dirname,
      '../data/bolshoi-historical/historical-circles-labeled.svg',
    );
    if (fs.existsSync(fallback)) {
      labeled = parseBolshoiLabeledCircles(fs.readFileSync(fallback, 'utf8'));
    }
  }

  const places = matchBolshoiLabelsToOfficialRects(rects, labeled);
  if (places.length < 50) {
    throw new Error(`Bolshoi: после матчинга мест мало (${places.length})`);
  }

  const sectors = [];
  const svgMarkup = buildBolshoiHistoricalHallSvg(places, sectors, hallWidth, hallHeight);
  const allSeatCoordinates = places.map((p) => ({
    xPct: (p.cx / hallWidth) * 100,
    yPct: (p.cy / hallHeight) * 100,
  }));
  const seats = places.map((p) => ({
    sector: p.section,
    row: p.row,
    seat: p.seat,
    xPct: (p.cx / hallWidth) * 100,
    yPct: (p.cy / hallHeight) * 100,
  }));

  return {
    hallWidth,
    hallHeight,
    places,
    sectors,
    svgMarkup,
    allSeatCoordinates,
    seats,
    labeledCount: labeled.length,
    rectCount: rects.length,
    sectorMode: {
      enabled: false,
      source: 'off',
      sectors: [],
    },
  };
}
