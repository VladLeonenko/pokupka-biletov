/**
 * Генерация «боевой» разметки Лужников для канонической карты luzhniki-football:
 * сектора (path), места в полярной сетке клина + те же места как circle[place-name][row][place].
 *
 * Подписи секторов и плотность сетки задаются манифестом JSON (или дефолты).
 * Чтобы места совпали с GetBilet, в манифесте выставьте label = полю Sector из оффера (можно частично — fuzzy match на фронте).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cheerio from 'cheerio';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Жёсткий лимит встроенных circle в SVG — выше только layout_json (иначе разметка МБ и тормозит cheerio/БД). */
export const LUZHNIKI_MAX_SEAT_CIRCLES_IN_SVG = 12000;

const DEF = {
  viewW: 1000,
  viewH: 820,
  cx: 500,
  cy: 415,
  /** Внешний/внутренний эллипс трибуны (согласованы с hall-maps/luzhniki-football-stadium.svg). */
  rxOut: 448,
  ryOut: 352,
  rxIn: 252,
  ryIn: 198,
  /** 90×30×30 = 81 000 — порядок величины вместимости «Лужников». */
  wedgeCount: 90,
  /** Смещение первого клина (градусы): −90 — верх «у сцены». */
  angleOffsetDeg: -92,
  defaultRows: 30,
  defaultSeatsPerRow: 30,
};

function round(n, d = 2) {
  const p = 10 ** d;
  return Math.round(n * p) / p;
}

/**
 * Клин между двумя углами на эллиптическом кольце (линейная интерполяция rx/ry по радиусу).
 */
export function ellipticalWedgePath(cx, cy, rxOut, ryOut, rxIn, ryIn, deg0, deg1, segments = 20) {
  const r0 = (deg0 * Math.PI) / 180;
  const r1 = (deg1 * Math.PI) / 180;
  const ptsOut = [];
  const ptsIn = [];
  for (let i = 0; i <= segments; i++) {
    const t = r0 + ((r1 - r0) * i) / segments;
    ptsOut.push([cx + rxOut * Math.cos(t), cy + ryOut * Math.sin(t)]);
    ptsIn.push([cx + rxIn * Math.cos(t), cy + ryIn * Math.sin(t)]);
  }
  let d = `M ${round(ptsOut[0][0])} ${round(ptsOut[0][1])}`;
  for (let i = 1; i < ptsOut.length; i++) d += ` L ${round(ptsOut[i][0])} ${round(ptsOut[i][1])}`;
  for (let i = ptsIn.length - 1; i >= 0; i--) d += ` L ${round(ptsIn[i][0])} ${round(ptsIn[i][1])}`;
  d += ' Z';
  return d;
}

function escAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Места строго внутри клина: радиус — ряд, азимут — номер в ряду.
 * @returns {{ sector: string, row: string, seat: string, xPct: number, yPct: number }[]}
 */
export function polarSeatsInWedge(
  label,
  cx,
  cy,
  rxOut,
  ryOut,
  rxIn,
  ryIn,
  deg0,
  deg1,
  rows,
  seatsPerRow,
  viewW,
  viewH,
) {
  const out = [];
  const span = deg1 - deg0;
  for (let ri = 0; ri < rows; ri++) {
    const fr = (ri + 0.5) / rows;
    const rxAt = rxIn + fr * (rxOut - rxIn);
    const ryAt = ryIn + fr * (ryOut - ryIn);
    const rowLabel = String(ri + 1);
    for (let ci = 0; ci < seatsPerRow; ci++) {
      const fc = (ci + 0.5) / seatsPerRow;
      const angleDeg = deg0 + fc * span;
      const rad = (angleDeg * Math.PI) / 180;
      const x = cx + rxAt * Math.cos(rad);
      const y = cy + ryAt * Math.sin(rad);
      out.push({
        sector: label,
        row: rowLabel,
        seat: String(ci + 1),
        xPct: (x / viewW) * 100,
        yPct: (y / viewH) * 100,
      });
    }
  }
  return out;
}

function defaultSectorLabel(i, total) {
  return `LZ-${String(i + 1).padStart(3, '0')}`;
}

/**
 * @param {string | null} manifestPath абсолютный путь к JSON или null
 */
export function loadManifest(manifestPath) {
  if (!manifestPath || !fs.existsSync(manifestPath)) {
    return { overrides: [], wedgeCount: null };
  }
  const raw = fs.readFileSync(manifestPath, 'utf8');
  const j = JSON.parse(raw);
  const overrides = Array.isArray(j.sectors) ? j.sectors : [];
  return {
    wedgeCount: typeof j.wedgeCount === 'number' && j.wedgeCount > 0 ? j.wedgeCount : null,
    angleOffsetDeg: typeof j.angleOffsetDeg === 'number' ? j.angleOffsetDeg : null,
    overrides,
    rxOut: typeof j.rxOut === 'number' ? j.rxOut : null,
    ryOut: typeof j.ryOut === 'number' ? j.ryOut : null,
    rxIn: typeof j.rxIn === 'number' ? j.rxIn : null,
    ryIn: typeof j.ryIn === 'number' ? j.ryIn : null,
    defaultRows: typeof j.defaultRows === 'number' ? j.defaultRows : null,
    defaultSeatsPerRow: typeof j.defaultSeatsPerRow === 'number' ? j.defaultSeatsPerRow : null,
    embedSeatCirclesInSvg:
      j.embedSeatCirclesInSvg === true
        ? true
        : j.embedSeatCirclesInSvg === false
          ? false
          : null,
    maxSeatCirclesInSvg:
      typeof j.maxSeatCirclesInSvg === 'number' && j.maxSeatCirclesInSvg > 0 ? j.maxSeatCirclesInSvg : null,
  };
}

function mergeParams(manifest) {
  const m = manifest || { overrides: [] };
  const wedgeCount = m.wedgeCount ?? DEF.wedgeCount;
  return {
    viewW: DEF.viewW,
    viewH: DEF.viewH,
    cx: DEF.cx,
    cy: DEF.cy,
    rxOut: m.rxOut ?? DEF.rxOut,
    ryOut: m.ryOut ?? DEF.ryOut,
    rxIn: m.rxIn ?? DEF.rxIn,
    ryIn: m.ryIn ?? DEF.ryIn,
    wedgeCount,
    angleOffsetDeg: m.angleOffsetDeg ?? DEF.angleOffsetDeg,
    defaultRows: m.defaultRows ?? DEF.defaultRows,
    defaultSeatsPerRow: m.defaultSeatsPerRow ?? DEF.defaultSeatsPerRow,
    overrides: m.overrides || [],
    embedSeatCirclesInSvg: m.embedSeatCirclesInSvg,
    maxSeatCirclesInSvg: m.maxSeatCirclesInSvg,
  };
}

function overrideForIndex(overrides, index) {
  for (const o of overrides) {
    if (Number(o.index) === index) return o;
  }
  return null;
}

/**
 * @returns {{
 *   svgMarkup: string,
 *   layoutJson: Record<string, unknown>,
 *   stats: { sectors: number, seats: number }
 * }}
 */
export function buildLuzhnikiFootballNativeArtifacts(manifest) {
  const p = mergeParams(manifest);
  const step = 360 / p.wedgeCount;

  /** @type {{ id: string, label: string, path: string, rows: number, seatsPerRow: number, deg0: number, deg1: number }[]} */
  const sectorDefs = [];

  for (let i = 0; i < p.wedgeCount; i++) {
    const deg0 = p.angleOffsetDeg + i * step;
    const deg1 = p.angleOffsetDeg + (i + 1) * step;
    const ov = overrideForIndex(p.overrides, i);
    const label = ov?.label?.trim() ? String(ov.label).trim() : defaultSectorLabel(i, p.wedgeCount);
    const rows = Number(ov?.rows) > 0 ? Number(ov.rows) : p.defaultRows;
    const seatsPerRow = Number(ov?.seatsPerRow) > 0 ? Number(ov.seatsPerRow) : p.defaultSeatsPerRow;
    const path = ellipticalWedgePath(p.cx, p.cy, p.rxOut, p.ryOut, p.rxIn, p.ryIn, deg0, deg1);
    sectorDefs.push({
      id: `lz-sector-${i}`,
      label,
      path,
      rows,
      seatsPerRow,
      deg0,
      deg1,
    });
  }

  /** @type {{ sector: string, row: string, seat: string, xPct: number, yPct: number }[]} */
  const seats = [];
  for (const sd of sectorDefs) {
    seats.push(
      ...polarSeatsInWedge(
        sd.label,
        p.cx,
        p.cy,
        p.rxOut,
        p.ryOut,
        p.rxIn,
        p.ryIn,
        sd.deg0,
        sd.deg1,
        sd.rows,
        sd.seatsPerRow,
        p.viewW,
        p.viewH,
      ),
    );
  }

  const sectorsMeta = sectorDefs.map((sd) => ({
    id: sd.id,
    label: sd.label,
    path: sd.path,
    totalSeats: sd.rows * sd.seatsPerRow,
    availableSeats: 0,
    minPrice: null,
    maxPrice: null,
  }));

  const backgroundSvgPath = path.join(__dirname, '../../frontend/public/hall-maps/luzhniki-football-stadium.svg');

  let baseSvg = '';
  try {
    baseSvg = fs.readFileSync(backgroundSvgPath, 'utf8');
  } catch {
    baseSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${p.viewW} ${p.viewH}"><rect width="100%" height="100%" fill="#eef1f5"/></svg>`;
  }

  const $ = cheerio.load(baseSvg, { xml: true });
  const svg = $('svg').first();
  if (!svg.length) throw new Error('Базовый SVG без корня <svg>');

  svg.find('#luz-native-sector-outlines').remove();
  svg.find('#luz-native-seat-markers').remove();

  const og = $('<g id="luz-native-sector-outlines" fill="rgba(148,163,184,0.12)" stroke="#94a3b8" stroke-width="1.2" stroke-opacity="0.65"/>');
  for (const sd of sectorDefs) {
    og.append(`<path data-sector="${escAttr(sd.label)}" d="${sd.path}"/>`);
  }
  svg.append(og);

  const maxCircles =
    p.maxSeatCirclesInSvg != null ? p.maxSeatCirclesInSvg : LUZHNIKI_MAX_SEAT_CIRCLES_IN_SVG;
  const embedCircles =
    p.embedSeatCirclesInSvg === true ||
    (p.embedSeatCirclesInSvg !== false && seats.length <= maxCircles);

  if (embedCircles && seats.length > 0) {
    const sg = $('<g id="luz-native-seat-markers" fill="#c4c9d4"/>');
    const rDot = round(Math.min(p.viewW, p.viewH) * 0.0029, 2);
    for (const s of seats) {
      const cx = round((s.xPct / 100) * p.viewW, 3);
      const cy = round((s.yPct / 100) * p.viewH, 3);
      sg.append(
        `<circle cx="${cx}" cy="${cy}" r="${rDot}" place-name="${escAttr(s.sector)}" row="${escAttr(s.row)}" place="${escAttr(s.seat)}"/>`,
      );
    }
    svg.append(sg);
  } else {
    svg.find('#luz-native-seat-markers').remove();
  }

  /** Заголовок/desc без битой кодировки */
  svg.find('title').first().text('Стадион «Лужники» — футбол');
  const descParts = [
    'Сектора — path; места — все координаты и связка sector/row/seat в layout_json.seats (режим svgNative).',
  ];
  if (!embedCircles) {
    descParts.push(
      `Круги в SVG не вшиты (${seats.length} мест > ${maxCircles}), чтобы не раздувать разметку — см. JSON.`,
    );
  } else {
    descParts.push('Круги с place-name / row / place дублируют JSON.');
  }
  svg.find('desc').first().text(descParts.join(' '));

  const svgMarkup = $.xml ? $.xml() : $.html();

  const layoutJson = {
    layoutMode: 'svgNative',
    showUnavailableSeats: true,
    grayHallWhenNoOffers: true,
    nativeSeatCount: seats.length,
    sectorPathCount: sectorDefs.length,
    seats,
    sectorMode: {
      enabled: true,
      source: 'luzhniki-football-native',
      sectors: sectorsMeta,
    },
    seatCirclesEmbeddedInSvg: embedCircles,
    seatCirclesOmittedReason: embedCircles ? null : `count>${maxCircles}; coordinates in layout_json.seats only`,
    note:
      'Сгенерировано luzhnikiFootballNativeGenerator. Полная вместимость (~81k): координаты в seats[]; круги в SVG только если мест ≤ maxSeatCirclesInSvg. Подписи секторов — манифест.',
  };

  return {
    svgMarkup,
    layoutJson,
    stats: { sectors: sectorDefs.length, seats: seats.length },
  };
}
