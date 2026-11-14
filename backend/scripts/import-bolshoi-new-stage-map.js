/**
 * Большой — Новая сцена: импорт мест напрямую из Afisha hallplan JSON
 * (без rect↔label NN / align-shift, в отличие от Исторической).
 *
 *   # только SVG + счётчики (без БД):
 *   APPLY_DB=0 node scripts/import-bolshoi-new-stage-map.js
 *
 *   # upsert getbilet_stage_maps + SVG + editor bundle:
 *   APPLY_DB=1 node scripts/import-bolshoi-new-stage-map.js
 *
 * Env:
 *   STAGE_MAP_STAGE_ID=bolshoi-new-stage
 *   STAGE_MAP_TITLE=Большой театр — Новая сцена
 *   STAGE_MAP_AFISHA_JSON=backend/data/bolshoi-new/afisha-hallplan-levels.json
 *   STAGE_MAP_SVG_PATH=frontend/public/hall-maps/bolshoi-new-stage.svg
 *   STAGE_MAP_BUNDLE_PATH=backend/data/bolshoi-geodesy/hand/bolshoi-new-stage-seats.bundle.json
 *
 * Места: hallplan x_coord/y_coord as-is (НЕ двигать).
 * Серые зоны + ⬡ = level.outline (тот же path, без отдельного hull-stroke).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import ticketPool from '../ticketDb.js';
import { buildBolshoiSectors } from '../utils/bolshoiHistoricalHallSvg.js';
import {
  buildSectorsFromAfishaOutlines,
  pointInPolygon,
  sampleSvgPath,
} from '../utils/bolshoiNewStageAfishaOutlines.js';
import {
  BOLSHOI_NEW_STAGE_SECTOR_FILL,
  collapseBolshoiNewStageToParterMid,
} from '../utils/bolshoiNewStageParterCheckout.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

const STAGE_ID = process.env.STAGE_MAP_STAGE_ID?.trim() || 'bolshoi-new-stage';
const TITLE = process.env.STAGE_MAP_TITLE?.trim() || 'Большой театр — Новая сцена';
/** All sectors white — bookable Партер shown via colored sellable seat dots (Historical style). */
const SECTOR_FILL = BOLSHOI_NEW_STAGE_SECTOR_FILL;
const HALL_VIEWPORT_BG = '#f5f5f5';
const SECTOR_STROKE = 'rgba(0,0,0,0.06)';

function optionalEnv(name, fallback = null) {
  return process.env[name]?.trim() || fallback;
}

function truthyEnv(name, defaultTrue = false) {
  const raw = process.env[name];
  if (raw == null || raw === '') return defaultTrue;
  const v = String(raw).trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
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

/** Алгебраическая окружность по точкам ряда. null, если ряд прямой. */
function fitCircle(pts) {
  if (pts.length < 3) return null;
  const rows = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  for (const [x, y] of pts) {
    const z = x * x + y * y;
    rows[0][0] += x * x;
    rows[0][1] += x * y;
    rows[0][2] += x;
    rows[0][3] += x * z;
    rows[1][0] += x * y;
    rows[1][1] += y * y;
    rows[1][2] += y;
    rows[1][3] += y * z;
    rows[2][0] += x;
    rows[2][1] += y;
    rows[2][2] += 1;
    rows[2][3] += z;
  }
  for (let col = 0; col < 3; col += 1) {
    let piv = col;
    for (let r = col + 1; r < 3; r += 1) {
      if (Math.abs(rows[r][col]) > Math.abs(rows[piv][col])) piv = r;
    }
    if (Math.abs(rows[piv][col]) < 1e-6) return null;
    const tmp = rows[col];
    rows[col] = rows[piv];
    rows[piv] = tmp;
    const div = rows[col][col];
    for (let c = col; c < 4; c += 1) rows[col][c] /= div;
    for (let r = 0; r < 3; r += 1) {
      if (r === col) continue;
      const f = rows[r][col];
      for (let c = col; c < 4; c += 1) rows[r][c] -= f * rows[col][c];
    }
  }
  const cx = rows[0][3] / 2;
  const cy = rows[1][3] / 2;
  const r2 = rows[2][3] + cx * cx + cy * cy;
  if (!(r2 > 16)) return null;
  return { cx, cy, r: Math.sqrt(r2) };
}

function tangentDeg(ang) {
  return (Math.atan2(Math.cos(ang), -Math.sin(ang)) * 180) / Math.PI;
}

/** Буквы идут влево-направо, на вертикали — сверху вниз. reverse() массива места не двигает. */
function layReadingOrder(glyphs) {
  if (!glyphs || glyphs.length < 2) return glyphs;
  const a = glyphs[0];
  const b = glyphs[glyphs.length - 1];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const backward = Math.abs(dx) >= Math.abs(dy) ? dx < 0 : dy < 0;
  if (!backward) return glyphs;
  const xs = glyphs.map((g) => g.x);
  const ys = glyphs.map((g) => g.y);
  const rots = glyphs.map((g) => g.rotate);
  const n = glyphs.length;
  return glyphs.map((g, i) => ({
    ...g,
    x: xs[n - 1 - i],
    y: ys[n - 1 - i],
    rotate: rots[n - 1 - i],
  }));
}

/** Нижняя дуга: касательная переворачивает буквы. +180° оставляет их вдоль дуги, но читаемыми. */
function uprightGlyphs(glyphs) {
  if (!glyphs?.length) return glyphs;
  const mid = glyphs[Math.floor((glyphs.length - 1) / 2)];
  let rot = Number(mid.rotate) || 0;
  while (rot > 180) rot -= 360;
  while (rot < -180) rot += 360;
  if (Math.abs(rot) <= 90) return glyphs;
  return glyphs.map((g) => {
    let r = (Number(g.rotate) || 0) + 180;
    while (r > 180) r -= 360;
    while (r < -180) r += 360;
    return { ...g, rotate: r };
  });
}

/**
 * Подпись по дуге сектора. Короткие имена — над рядами.
 * Длинные (ложи балкона) — буквами вдоль дуги клина, не прямой строкой.
 * @returns {Array<{ text: string, x: number, y: number, fontSize: number, rotate: number }> | null}
 */
function radialLabelGlyphs(text, fontSize, seatPts, anchor, outlinePts) {
  const circle = fitCircle(seatPts);
  if (!circle || circle.r > 20000) return null;
  const mid = Math.atan2(anchor.y - circle.cy, anchor.x - circle.cx);
  const unwrap = (a) => {
    let d = a - mid;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return mid + d;
  };
  const angs = seatPts.map(([x, y]) => unwrap(Math.atan2(y - circle.cy, x - circle.cx)));
  const full = Math.max(...angs) - Math.min(...angs);
  if (!(full > 0.012)) return null;
  const chars = [...text];
  const radii = seatPts.map(([x, y]) => Math.hypot(x - circle.cx, y - circle.cy));
  const outerR = Math.max(...radii);
  const anchorR = Math.hypot(anchor.x - circle.cx, anchor.y - circle.cy);
  const outward = anchorR >= outerR - 2 ? 1 : -1;
  /** Полоса сразу за крайним рядом, не на острие сектора. */
  const rText = outward > 0 ? Math.min(anchorR, outerR + fontSize * 1.6) : Math.max(anchorR, outerR - fontSize * 1.6);
  const inside = (x, y) => !outlinePts?.length || pointInPolygon(x, y, outlinePts);
  const clearOfSeats = (glyphs) => {
    for (const g of glyphs) {
      if (!inside(g.x, g.y)) return false;
      for (const [sx, sy] of seatPts) {
        if (Math.hypot(g.x - sx, g.y - sy) < fontSize * 0.95) return false;
      }
    }
    return true;
  };

  if (chars.length > 12) {
    const seatMid = angs.reduce((sum, a) => sum + a, 0) / angs.length;
    let edgeR = outerR;
    if (outlinePts?.length) {
      edgeR = outward > 0 ? 0 : Infinity;
      for (const [x, y] of outlinePts) {
        const rr = Math.hypot(x - circle.cx, y - circle.cy);
        if (outward > 0) edgeR = Math.max(edgeR, rr);
        else edgeR = Math.min(edgeR, rr);
      }
    }
    let rBand = outerR + outward * Math.min(Math.abs(edgeR - outerR) * 0.55, fontSize * 3.6);
    let gap = fontSize * 0.82;
    const buildBand = (r, step) => {
      const dAng = step / r;
      const span = (chars.length - 1) * dAng;
      const glyphs = chars.map((ch, i) => {
        const ang = seatMid - span / 2 + i * dAng;
        return {
          text: ch,
          x: circle.cx + r * Math.cos(ang),
          y: circle.cy + r * Math.sin(ang),
          fontSize,
          rotate: tangentDeg(ang),
        };
      });
      return layReadingOrder(glyphs);
    };
    let glyphs = buildBand(rBand, gap);
    for (let k = 0; k < 8 && !clearOfSeats(glyphs); k += 1) {
      gap *= 0.9;
      glyphs = buildBand(rBand, gap);
    }
    for (let k = 0; k < 6 && !clearOfSeats(glyphs); k += 1) {
      rBand = outerR + (rBand - outerR) * 0.85;
      glyphs = buildBand(rBand, gap);
    }
    if (!clearOfSeats(glyphs)) {
      return uprightGlyphs([{ text, x: anchor.x, y: anchor.y, fontSize, rotate: tangentDeg(mid) }]);
    }
    return uprightGlyphs(glyphs);
  }

  const n = chars.length;
  const maxGap = fontSize * 3.2;
  let span = Math.min(full * 0.55, ((n - 1) * maxGap) / rText);
  const build = (useSpan) => {
    const glyphs = chars.map((ch, i) => {
      const t = n === 1 ? 0 : i / (n - 1);
      const ang = mid - useSpan / 2 + t * useSpan;
      return {
        text: ch,
        x: circle.cx + rText * Math.cos(ang),
        y: circle.cy + rText * Math.sin(ang),
        fontSize,
        rotate: tangentDeg(ang),
      };
    });
    return layReadingOrder(glyphs);
  };
  let glyphs = build(span);
  for (let k = 0; k < 8 && !clearOfSeats(glyphs); k += 1) {
    span *= 0.75;
    glyphs = build(span);
  }
  if (!clearOfSeats(glyphs)) return null;
  return uprightGlyphs(glyphs);
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * @param {{ levels: Array<{ id?: number, name: string, outline?: string, seats: Array<{ place: string, row: string, x_coord: number, y_coord: number }> }>, stage?: object }} hallplan
 * @param {{ hallWidth: number, hallHeight: number }} opts
 */
export function buildTheaterLayoutFromAfishaHallplan(hallplan, opts) {
  const { hallWidth, hallHeight } = opts;
  const levels = Array.isArray(hallplan?.levels) ? hallplan.levels : [];
  if (!levels.length) throw new Error('afisha hallplan: нет levels');

  /** @type {Map<string, number>} */
  const sectorCounts = new Map();
  const places = [];

  for (const level of levels) {
    const section = String(level?.name || '').trim();
    if (!section) continue;
    const sectionId = sectionIdFromLabel(section);
    const seats = Array.isArray(level.seats) ? level.seats : [];
    sectorCounts.set(section, (sectorCounts.get(section) || 0) + seats.length);

    for (const s of seats) {
      const x = Number(s.x_coord);
      const y = Number(s.y_coord);
      const row = String(s.row ?? '').trim();
      const seat = String(s.place ?? s.seat ?? '').trim();
      if (!Number.isFinite(x) || !Number.isFinite(y) || !row || !seat) continue;
      places.push({
        id: `${section}|${row}|${seat}`,
        sectionId,
        section,
        row,
        seat,
        x,
        y,
        w: 12,
        h: 12,
        cx: x,
        cy: y,
      });
    }
  }

  if (places.length < 50) {
    throw new Error(`afisha hallplan: слишком мало мест (${places.length})`);
  }

  const outlineBuilt = buildSectorsFromAfishaOutlines(levels, buildBolshoiSectors);
  const sectors = outlineBuilt.sectors;
  if (!sectors.length) throw new Error('afisha hallplan: нет outline-секторов');

  /** Явный якорь подписи (пустая зона сектора), иначе центроид. */
  const labelByName = new Map();
  for (const level of hallplan.levels || []) {
    const name = String(level?.name || '').trim();
    const lab = level?.label;
    if (!name || !lab || typeof lab !== 'object') continue;
    const x = Number(lab.x);
    const y = Number(lab.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const rotate = Number(lab.rotate);
    labelByName.set(name, {
      x,
      y,
      rotate: Number.isFinite(rotate) ? rotate : 0,
      radial: lab.radial === true,
      glyphs: Array.isArray(lab.glyphs) ? lab.glyphs : null,
    });
  }
  const seatsBySection = new Map();
  for (const p of places) {
    const list = seatsBySection.get(p.section) || [];
    list.push(p);
    seatsBySection.set(p.section, list);
  }
  for (const s of sectors) {
    const anchor = labelByName.get(s.label) || { x: s.centroid.x, y: s.centroid.y, rotate: 0 };
    s.labelAnchor = anchor;
    const fsPx = s.totalSeats <= 8 ? 9 : s.totalSeats <= 20 ? 10 : 11;
    const sectionSeats = seatsBySection.get(s.label) || [];
    /** Дуга подписи = ряд, ближайший к якорю, а не вся толща яруса. */
    const byRow = new Map();
    for (const p of sectionSeats) {
      const rowPts = byRow.get(p.row) || [];
      rowPts.push([p.cx, p.cy]);
      byRow.set(p.row, rowPts);
    }
    let arcPts = sectionSeats.map((p) => [p.cx, p.cy]);
    let bestD = Infinity;
    for (const pts of byRow.values()) {
      if (pts.length < 3) continue;
      const mx = pts.reduce((sum, pt) => sum + pt[0], 0) / pts.length;
      const my = pts.reduce((sum, pt) => sum + pt[1], 0) / pts.length;
      const d = Math.hypot(mx - anchor.x, my - anchor.y);
      if (d < bestD) {
        bestD = d;
        arcPts = pts;
      }
    }
    if (anchor.glyphs?.length) {
      s.labelPieces = anchor.glyphs
        .map((g) => {
          const x = Number(g.x);
          const y = Number(g.y);
          const fontSize = Number(g.fontSize);
          if (!g.text || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(fontSize)) return null;
          const piece = { text: String(g.text), x, y, fontSize };
          const rot = Number(g.rotate);
          if (Number.isFinite(rot) && rot !== 0) piece.rotate = rot;
          return piece;
        })
        .filter(Boolean);
      continue;
    }
    const radial = anchor.radial
      ? radialLabelGlyphs(
          s.label,
          fsPx,
          arcPts,
          anchor,
          s.path ? sampleSvgPath(s.path, 4) : [],
        )
      : null;
    s.labelPieces = radial || [
      { text: s.label, x: anchor.x, y: anchor.y, fontSize: fsPx, rotate: anchor.rotate || 0 },
    ];
  }

  const rDot = Math.max(2.4, Math.min(hallWidth, hallHeight) * 0.0026);
  const circles = places
    .map(
      (p) =>
        `    <circle cx="${p.cx.toFixed(2)}" cy="${p.cy.toFixed(2)}" r="${rDot.toFixed(2)}" place-name="${esc(p.section)}" row="${esc(p.row)}" place="${esc(p.seat)}" fill="#f97316" stroke="none"/>`,
    )
    .join('\n');

  const stage = hallplan.stage && typeof hallplan.stage === 'object' ? hallplan.stage : null;
  let stageX = stage && Number.isFinite(Number(stage.x_coord))
    ? Number(stage.x_coord) + (Number(stage.width) || 0) / 2
    : hallWidth / 2;
  let stageY = stage && Number.isFinite(Number(stage.y_coord))
    ? Number(stage.y_coord) + 8
    : Math.round(hallHeight * 0.97);
  /** Цирк: тонкая «сцена» Яндекса внутри кольца, не на краю. Подпись — в центр арены. */
  let stageAnchor = 'baseline';
  if (places.length >= 50 && stage) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of places) {
      if (p.cx < minX) minX = p.cx;
      if (p.cy < minY) minY = p.cy;
      if (p.cx > maxX) maxX = p.cx;
      if (p.cy > maxY) maxY = p.cy;
    }
    const bw = maxX - minX;
    const bh = maxY - minY;
    const edge = Math.min(bw, bh) * 0.18;
    const scx = Number(stage.x_coord) + (Number(stage.width) || 0) / 2;
    const scy = Number(stage.y_coord) + (Number(stage.height) || 0) / 2;
    const nearEdge =
      scx < minX + edge || scx > maxX - edge || scy < minY + edge || scy > maxY - edge;
    if (!nearEdge && bw > 0 && bh > 0) {
      stageX = (minX + maxX) / 2;
      stageY = (minY + maxY) / 2;
      stageAnchor = 'central';
    }
  }

  /**
   * ONE path per sector: white fill + sector-contour (same d).
   * Labels group AFTER seats so names paint above dots (SVG paint order).
   * No separate hull stroke layer — that was the bad «линии».
   * Bookable look = canvas sellable dots (not rose path wash).
   */
  const sectorPaths = sectors
    .map((s) => {
      return `    <path class="sector-contour" d="${esc(s.path)}" fill="${SECTOR_FILL}" fill-opacity="1" stroke="${SECTOR_STROKE}" stroke-width="1" data-sector="${esc(s.label)}" pointer-events="fill"/>`;
    })
    .join('\n');

  const sectorLabels = sectors
    .flatMap((s) =>
      (s.labelPieces || []).map((g) => {
        const rot = g.rotate
          ? ` transform="rotate(${Number(g.rotate).toFixed(1)} ${g.x.toFixed(1)} ${g.y.toFixed(1)})"`
          : '';
        return `    <text x="${g.x.toFixed(1)}" y="${g.y.toFixed(1)}"${rot} text-anchor="middle" dominant-baseline="middle" font-family="Arial,Helvetica,sans-serif" font-size="${g.fontSize}" fill="rgba(90,90,86,0.8)" pointer-events="none">${esc(g.text)}</text>`;
      }),
    )
    .join('\n');

  const svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${hallWidth} ${hallHeight}" width="${hallWidth}" height="${hallHeight}" style="background:${HALL_VIEWPORT_BG}">
  <title>${esc(TITLE)}</title>
  <desc>Afisha seats as-is; white sectors on #f5f5f5; sellable = colored dots; labels above seats</desc>
  <rect width="100%" height="100%" fill="${HALL_VIEWPORT_BG}" pointer-events="none"/>
  <g id="bolshoi-new-stage-sector-outlines">
${sectorPaths}
  </g>
  <g id="bolshoi-new-stage-scene">
    <text x="${stageX.toFixed(1)}" y="${stageY.toFixed(1)}" text-anchor="middle" dominant-baseline="${stageAnchor === 'central' ? 'central' : 'auto'}" font-family="system-ui,sans-serif" font-size="22" font-weight="600" fill="rgba(90,90,86,0.55)">Сцена</text>
  </g>
  <g id="bolshoi-new-stage-seats" fill="#f97316" stroke="none">
${circles}
  </g>
  <g id="bolshoi-new-stage-sector-labels" pointer-events="none">
${sectorLabels}
  </g>
</svg>
`;

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

  const sectorMode = {
    enabled: true,
    source: 'bolshoi-new-stage-afisha-outlines',
    sectors: sectors.map((s) => {
      return {
        id: s.id,
        label: s.label,
        path: s.path,
        maxQuantity: Math.min(8, Math.max(1, s.totalSeats || 8)),
        totalSeats: s.totalSeats,
        fill: SECTOR_FILL,
        accent: SECTOR_FILL,
      };
    }),
  };

  return {
    hallWidth,
    hallHeight,
    places,
    sectors,
    outlineBuilt,
    sectorCounts: Object.fromEntries([...sectorCounts.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ru'))),
    svgMarkup,
    allSeatCoordinates,
    seats,
    sectorMode,
  };
}

async function main() {
  const jsonRel =
    optionalEnv('STAGE_MAP_AFISHA_JSON') ||
    'backend/data/bolshoi-new/afisha-hallplan-levels.json';
  const jsonAbs = path.isAbsolute(jsonRel) ? jsonRel : path.join(REPO_ROOT, jsonRel);
  if (!fs.existsSync(jsonAbs)) throw new Error(`Нет Afisha JSON: ${jsonAbs}`);

  const hallWidth = Number(optionalEnv('STAGE_MAP_HALL_WIDTH', '1373'));
  const hallHeight = Number(optionalEnv('STAGE_MAP_HALL_HEIGHT', '1107'));

  const hallplan = JSON.parse(fs.readFileSync(jsonAbs, 'utf8'));
  const built = buildTheaterLayoutFromAfishaHallplan(hallplan, {
    hallWidth,
    hallHeight,
  });
  console.log(
    `[import-bolshoi-new-stage] transform=${built.outlineBuilt.transform} containment=${built.outlineBuilt.overallPct.toFixed(1)}% (${built.outlineBuilt.insideTotal}/${built.outlineBuilt.seatTotal})`,
  );
  for (const m of built.outlineBuilt.metrics) {
    console.log(`  ${m.label}: ${m.pct}% (${m.inside}/${m.seats}) ${m.source}`);
  }

  const svgOutRel =
    optionalEnv('STAGE_MAP_SVG_PATH') || 'frontend/public/hall-maps/bolshoi-new-stage.svg';
  const svgOut = path.isAbsolute(svgOutRel) ? svgOutRel : path.join(REPO_ROOT, svgOutRel);
  fs.mkdirSync(path.dirname(svgOut), { recursive: true });
  fs.writeFileSync(svgOut, `${built.svgMarkup}\n`, 'utf8');

  const bundleRel =
    optionalEnv('STAGE_MAP_BUNDLE_PATH') ||
    'backend/data/bolshoi-geodesy/hand/bolshoi-new-stage-seats.bundle.json';
  const bundleOut = path.isAbsolute(bundleRel) ? bundleRel : path.join(REPO_ROOT, bundleRel);
  const bundle = {
    builtAt: new Date().toISOString(),
    stageExternalId: STAGE_ID,
    hallWidth: built.hallWidth,
    hallHeight: built.hallHeight,
    note: 'afisha hallplan seats as-is + level.outline gray fills (no hulls, no seat move)',
    seats: built.seats,
  };
  fs.mkdirSync(path.dirname(bundleOut), { recursive: true });
  fs.writeFileSync(bundleOut, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');

  const enrichedRel =
    optionalEnv('STAGE_MAP_ENRICHED_SVG') ||
    'frontend/public/tools/bolshoi-new-stage-enriched.svg';
  const enrichedOut = path.isAbsolute(enrichedRel) ? enrichedRel : path.join(REPO_ROOT, enrichedRel);
  try {
    fs.mkdirSync(path.dirname(enrichedOut), { recursive: true });
    fs.writeFileSync(enrichedOut, `${built.svgMarkup}\n`, 'utf8');
  } catch {
    /* optional */
  }

  const maxZoom = Number(optionalEnv('STAGE_MAP_MAX_ZOOM_MULTIPLIER', '2'));
  /** Большой: секторный предзаказ. Остальные залы того же hallplan — места. */
  const seatCheckout = truthyEnv('STAGE_MAP_SEAT_CHECKOUT', false);
  let layoutJson = {
    layoutMode: 'svgNative',
    showUnavailableSeats: true,
    grayHallWhenNoOffers: true,
    showSeatsAtOverview: true,
    allSeatCoordinates: built.allSeatCoordinates,
    seats: built.seats,
    maxZoomMultiplier: Number.isFinite(maxZoom) ? maxZoom : 2,
    /** Клик по сектору кадрирует облако мест (клиент). Не путать с потолком зума. */
    sectorFocusZoomMultiplier: 2,
    hallKind: optionalEnv('STAGE_MAP_HALL_KIND', 'theater'),
    hallViewportBackground: HALL_VIEWPORT_BG,
    preferLayoutSeatPositions: true,
    /** Большой: qty по сектору. STAGE_MAP_SEAT_CHECKOUT=1 — места, как Вахтангов. */
    hallPreviewSectorCheckout: !seatCheckout,
    seatSelectionDisabled: !seatCheckout,
    hideSeatList: !seatCheckout,
    /** Надписи поверх canvas-точек (sectorLayer hallMapLabels, z > seats). */
    hallMapLabels: (built.sectors || [])
      .flatMap((s) =>
        (s.labelPieces || [])
          .map((g) => {
            const x = Number(g.x);
            const y = Number(g.y);
            if (!g.text || !Number.isFinite(x) || !Number.isFinite(y)) return null;
            const label = { text: g.text, x, y, fontSize: g.fontSize, plate: false };
            if (g.rotate) label.rotate = Math.round(g.rotate * 10) / 10;
            return label;
          })
          .filter(Boolean),
      ),
    sectorMode: built.sectorMode,
    pbilet: {
      hallWidth: built.hallWidth,
      hallHeight: built.hallHeight,
    },
    bolshoiNewStage: {
      sourceJson: path.relative(REPO_ROOT, jsonAbs),
      hallWidth: built.hallWidth,
      hallHeight: built.hallHeight,
      placeCount: built.places.length,
      sectorCount: built.sectorMode.sectors.length,
      sectorCounts: built.sectorCounts,
      transform: built.outlineBuilt.transform,
      containmentPct: built.outlineBuilt.overallPct,
      containmentMetrics: built.outlineBuilt.metrics,
      importedAt: new Date().toISOString(),
      pipeline: 'afisha-outline-fills-no-hull-strokes',
    },
    note:
      optionalEnv('STAGE_MAP_NOTE') ||
      'bolshoi-new: seats as-is; gray fills+⬡ = level.outline; no convex-hull strokes',
  };

  /** Большой: один сектор «Партер (середина)» = лейбл ManualOffer из seed. */
  if (!seatCheckout) {
    const collapsed = collapseBolshoiNewStageToParterMid(layoutJson);
    layoutJson = collapsed.layout;
    console.log(`[import-bolshoi-new-stage] parter collapse: ${collapsed.reason}`);
  }

  const layoutOutRel = optionalEnv('STAGE_MAP_LAYOUT_JSON');
  if (layoutOutRel) {
    const layoutOut = path.isAbsolute(layoutOutRel) ? layoutOutRel : path.join(REPO_ROOT, layoutOutRel);
    fs.mkdirSync(path.dirname(layoutOut), { recursive: true });
    fs.writeFileSync(layoutOut, `${JSON.stringify(layoutJson)}\n`, 'utf8');
  }

  const applyDb = truthyEnv('APPLY_DB', false);
  let saved = null;
  if (applyDb) {
    const result = await ticketPool.query(
      `INSERT INTO getbilet_stage_maps (
         stage_external_id, place_external_id, title, svg_markup, layout_json,
         notes_internal, external_plan_url, updated_at
       )
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, NOW())
       ON CONFLICT (stage_external_id) DO UPDATE SET
         title = EXCLUDED.title,
         svg_markup = EXCLUDED.svg_markup,
         layout_json = EXCLUDED.layout_json,
         notes_internal = EXCLUDED.notes_internal,
         external_plan_url = EXCLUDED.external_plan_url,
         updated_at = NOW()
       RETURNING id, stage_external_id, title`,
      [
        STAGE_ID,
        optionalEnv('STAGE_MAP_PLACE_ID'),
        TITLE,
        built.svgMarkup,
        JSON.stringify(layoutJson),
        `${TITLE}: places=${built.places.length}; outline sectors=${built.sectorMode.sectors.length}; containment=${built.outlineBuilt.overallPct.toFixed(1)}%; no hull strokes`,
        optionalEnv(
          'STAGE_MAP_EXTERNAL_PLAN_URL',
          'https://bolshoi.ru/visit/halls/new_stage/',
        ),
      ],
    );
    saved = result.rows[0];
  }

  console.log(
    JSON.stringify(
      {
        saved,
        applyDb,
        places: built.places.length,
        sectors: built.sectorMode.sectors.length,
        transform: built.outlineBuilt.transform,
        containmentPct: built.outlineBuilt.overallPct,
        sectorCounts: built.sectorCounts,
        hallWidth: built.hallWidth,
        hallHeight: built.hallHeight,
        svg: path.relative(REPO_ROOT, svgOut),
        bundle: path.relative(REPO_ROOT, bundleOut),
        svgBytes: built.svgMarkup.length,
      },
      null,
      2,
    ),
  );
}

main()
  .then(async () => {
    try {
      await ticketPool.end();
    } catch {
      /* ignore */
    }
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    try {
      await ticketPool.end();
    } catch {
      /* ignore */
    }
    process.exit(1);
  });
