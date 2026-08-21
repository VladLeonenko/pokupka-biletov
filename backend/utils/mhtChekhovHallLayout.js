/**
 * Нормализация схемы основного зала МХТ → класс театра (как Вахтангов):
 * координаты seats, sectorMode с AABB-блоками по реальным меткам SVG.
 */

import cheerio from 'cheerio';
import { randomUUID } from 'node:crypto';

function parseMatrix(transform) {
  if (!transform || !String(transform).includes('matrix')) return null;
  const m = String(transform).match(/matrix\(\s*([^)]+)\)/i);
  if (!m) return null;
  const parts = m[1].split(/[\s,]+/).map((x) => Number.parseFloat(x.trim()));
  if (parts.length !== 6 || parts.some((n) => !Number.isFinite(n))) return null;
  return parts;
}

function applyMatrix(cx, cy, matrix) {
  const [a, b, c, d, e, f] = matrix;
  return { x: a * cx + c * cy + e, y: b * cx + d * cy + f };
}

export function parseDataReplacedSeat(value) {
  const text = String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;
  const rowMatch = text.match(/(?:^|[,;])\s*ряд\s+([^,;]+)/i);
  const seatMatch = text.match(/(?:^|[,;])\s*место\s+([^,;]+)/i);
  if (!rowMatch || !seatMatch) return null;
  const row = rowMatch[1]?.trim() ?? '';
  const seat = seatMatch[1]?.trim() ?? '';
  const sector = text
    .slice(0, rowMatch.index ?? 0)
    .replace(/[,;]\s*$/g, '')
    .trim();
  if (!sector || !row || !seat) return null;
  return { sector, row, seat };
}

/** Плотный прямоугольник вокруг блока мест — не convex hull (он обхватывает чужие ярусы). */
function aabbToPath(points, pad = 6) {
  if (!points.length) return '';
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  minX -= pad;
  minY -= pad;
  maxX += pad;
  maxY += pad;
  return `M ${minX.toFixed(2)} ${minY.toFixed(2)} L ${maxX.toFixed(2)} ${minY.toFixed(2)} L ${maxX.toFixed(2)} ${maxY.toFixed(2)} L ${minX.toFixed(2)} ${maxY.toFixed(2)} Z`;
}

/**
 * Разбить точки на пространственные блоки (лево / центр / право),
 * если между ними явный зазор.
 * @param {{ x: number, y: number }[]} points
 */
function splitSeatBlocks(points, gapFactor = 3.2) {
  if (points.length < 4) return [points];
  let minDist = Infinity;
  const n = Math.min(points.length, 120);
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const d = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
      if (d > 1e-4) minDist = Math.min(minDist, d);
    }
  }
  if (!Number.isFinite(minDist) || minDist === Infinity) return [points];
  const gap = minDist * gapFactor;

  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  /** @type {{ x: number, y: number }[][]} */
  const blocks = [];
  /** @type {{ x: number, y: number }[]} */
  let cur = [];
  for (const p of sorted) {
    if (!cur.length) {
      cur = [p];
      continue;
    }
    const near = cur.some((q) => Math.hypot(p.x - q.x, p.y - q.y) <= gap);
    if (near) cur.push(p);
    else {
      blocks.push(cur);
      cur = [p];
    }
  }
  if (cur.length) blocks.push(cur);
  return blocks.length ? blocks : [points];
}

/**
 * @param {string} svgMarkup
 */
export function normalizeMhtChekhovHallSvg(svgMarkup) {
  const trimmed = String(svgMarkup ?? '').trim();
  if (!trimmed.includes('<svg')) {
    throw new Error('normalizeMhtChekhovHallSvg: не SVG');
  }

  const $ = cheerio.load(trimmed, { xml: true, xmlMode: true });
  const svg = $('svg').first();
  if (!svg.length) throw new Error('normalizeMhtChekhovHallSvg: нет <svg>');

  let matrix = null;
  const panG = svg.find('g.svg-pan-zoom_viewport').first();
  const panG2 = panG.length ? panG : svg.find('g[transform*="matrix"]').first();
  if (panG2.length) matrix = parseMatrix(panG2.attr('transform'));

  /** @type {{ sector: string, row: string, seat: string, x: number, y: number, el: import('cheerio').Cheerio }[]} */
  const raw = [];
  svg.find('circle[place-name], circle[data-replaced]').each((_, el) => {
    const c = $(el);
    const replaced = parseDataReplacedSeat(c.attr('data-replaced'));
    const sector = String(c.attr('place-name') ?? '').trim() || replaced?.sector || '';
    const row = String(c.attr('row') ?? c.attr('data-row') ?? replaced?.row ?? '').trim();
    const seat = String(c.attr('place') ?? c.attr('data-place') ?? replaced?.seat ?? '').trim();
    if (!sector || !row || !seat) return;
    const cx = Number.parseFloat(c.attr('cx') || '');
    const cy = Number.parseFloat(c.attr('cy') || '');
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) return;
    const { x, y } = matrix ? applyMatrix(cx, cy, matrix) : { x: cx, y: cy };
    raw.push({ sector, row, seat, x, y, el: c });
  });

  if (raw.length < 2) {
    throw new Error('normalizeMhtChekhovHallSvg: меньше 2 мест в SVG');
  }

  let minCenterDist = Infinity;
  for (let i = 0; i < raw.length; i += 1) {
    for (let j = i + 1; j < raw.length; j += 1) {
      const d = Math.hypot(raw[i].x - raw[j].x, raw[i].y - raw[j].y);
      if (d > 1e-4) minCenterDist = Math.min(minCenterDist, d);
    }
  }
  const densityRadiusCap =
    Number.isFinite(minCenterDist) && minCenterDist < Infinity ? minCenterDist * 0.46 : null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of raw) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }

  const spanW = maxX - minX;
  const spanH = maxY - minY;
  const padXY = Math.max(14, Math.max(spanW, spanH) * 0.055);
  const padBottom = Math.max(padXY, spanH * 0.22);
  const originX = minX - padXY;
  const originY = minY - padXY;
  const vbW = spanW + 2 * padXY;
  const vbH = spanH + padXY + padBottom;

  const radii = raw
    .map((p) => Number.parseFloat(p.el.attr('r') || ''))
    .filter((n) => Number.isFinite(n) && n > 0);
  const medianR =
    radii.length > 0 ? [...radii].sort((a, b) => a - b)[Math.floor(radii.length / 2)] : 3.5;
  const medianClamped = Math.min(4.2, Math.max(1.35, medianR));
  let rUniform =
    densityRadiusCap != null ? Math.min(medianClamped, densityRadiusCap) : medianClamped;
  rUniform = Math.max(0.26, Math.min(rUniform, 4.2));

  for (const p of raw) {
    p.el.attr('cx', String(p.x));
    p.el.attr('cy', String(p.y));
    p.el.attr('r', String(rUniform));
    p.el.attr('fill', '#d0d0d0');
    p.el.attr('stroke', 'none');
    p.el.removeAttr('stroke-width');
    if (!p.el.attr('place-name')) p.el.attr('place-name', p.sector);
    if (!p.el.attr('row')) p.el.attr('row', p.row);
    if (!p.el.attr('place')) p.el.attr('place', p.seat);
  }

  /**
   * GetBilet конвертит номера рядов в path (fill #636466). После crop viewBox
   * 1–6 партера остаются в центральном проходе и перекрывают точки.
   * Места — только circle; path/text не нужны.
   */
  svg.find('path, text, tspan').remove();

  if (panG2.length) {
    panG2.removeAttr('transform');
    panG2.removeAttr('style');
  }
  svg.removeAttr('style');
  svg.attr('viewBox', `${originX} ${originY} ${vbW} ${vbH}`);
  svg.attr('width', String(vbW));
  svg.attr('height', String(vbH));
  svg.attr('preserveAspectRatio', 'xMidYMid meet');

  const absSeats = raw.map(({ sector, row, seat, x, y }) => ({ sector, row, seat, x, y }));
  const seats = absSeats.map((p) => ({
    sector: p.sector,
    row: p.row,
    seat: p.seat,
    xPct: ((p.x - originX) / vbW) * 100,
    yPct: ((p.y - originY) / vbH) * 100,
  }));

  const outSvg = $.xml ? $.xml() : $.html();
  return {
    svgMarkup: outSvg,
    seats,
    absSeats,
    viewBox: { x: originX, y: originY, w: vbW, h: vbH },
    nativeSeatCount: seats.length,
  };
}

/**
 * Уровни зала: партер / амфитеатр / бельэтаж / балкон / бенуар.
 * @param {string} sectorLabel
 */
export function mhtHallLevelLabel(sectorLabel) {
  const s = String(sectorLabel || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е');
  if (!s) return '';
  if (s.includes('бенуар')) return 'Бенуар';
  if (s.includes('балкон')) return 'Балкон';
  if (s.includes('бельэтаж') || s.includes('бельетаж')) return 'Бельэтаж';
  if (s.includes('амфитеатр')) return 'Амфитеатр';
  if (s.includes('партер')) return 'Партер';
  return String(sectorLabel || '').trim();
}

/**
 * Полигоны: AABB по блокам SVG-меток («Балкон, Середина»…), не один hull на весь ярус.
 * Цвет на FE — theaterLevelAccent(label).
 *
 * @param {{ sector: string, x: number, y: number }[]} absSeats
 */
export function buildMhtSectorModeFromSeats(absSeats, options = {}) {
  const pad = options.pad ?? 4.5;
  /** @type {Map<string, { x: number, y: number }[]>} */
  const byRawSector = new Map();
  for (const s of absSeats) {
    const raw = String(s.sector || '').trim();
    if (!raw) continue;
    const arr = byRawSector.get(raw) ?? [];
    arr.push({ x: s.x, y: s.y });
    byRawSector.set(raw, arr);
  }

  const sectors = [];
  for (const [rawLabel, points] of byRawSector.entries()) {
    const level = mhtHallLevelLabel(rawLabel) || rawLabel;
    const blocks = splitSeatBlocks(points);
    for (const block of blocks) {
      const path = aabbToPath(block, pad);
      if (!path) continue;
      sectors.push({
        id: randomUUID(),
        label: rawLabel,
        path,
        maxPrice: null,
        minPrice: null,
        totalSeats: block.length,
        availableSeats: 0,
        level,
      });
    }
  }

  sectors.sort(
    (a, b) =>
      b.totalSeats - a.totalSeats ||
      String(a.level || a.label).localeCompare(String(b.level || b.label), 'ru'),
  );

  return {
    enabled: sectors.length > 0,
    source: options.source || 'mht-svg-aabb-blocks',
    sectors,
  };
}

/**
 * @param {string} svgMarkup
 * @param {{ rewriteSvg?: boolean }} [options]
 */
export function buildMhtChekhovTheaterLayout(svgMarkup, options = {}) {
  /** По умолчанию пишем SVG с viewBox=crop мест — иначе xPct и подложка расходятся (редактор «разъезжается»). */
  const rewriteSvg = options.rewriteSvg !== false;
  const normalized = normalizeMhtChekhovHallSvg(svgMarkup);
  const sectorMode = buildMhtSectorModeFromSeats(normalized.absSeats, { pad: 4.5 });
  const layoutJson = {
    layoutMode: 'svgNative',
    hallKind: 'theater',
    grayHallWhenNoOffers: true,
    showUnavailableSeats: false,
    preferLayoutSeatPositions: false,
    showSeatsAtOverview: true,
    maxZoomMultiplier: 2,
    sectorFocusZoomMultiplier: 2,
    pbilet: {
      hallWidth: normalized.viewBox.w,
      hallHeight: normalized.viewBox.h,
    },
    seats: normalized.seats,
    sectorMode,
    note:
      'МХТ: AABB-блоки по SVG-секторам; sellable GetBilet; SVG viewBox = crop мест (как xPct)',
  };
  return {
    svgMarkup: rewriteSvg ? normalized.svgMarkup : String(svgMarkup ?? '').trim(),
    layoutJson,
    nativeSeatCount: normalized.nativeSeatCount,
    sectorsCount: sectorMode.sectors.length,
  };
}
