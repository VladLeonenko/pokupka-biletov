#!/usr/bin/env node
/**
 * Параметрическая сборка Исторической сцены Большого по референсу moscow-77.
 *
 * Зачем не правка руками: в официальном дампе ticket.bolshoi.ru подписи
 * row/seat местами разъехались с координатами, у 1/2/3 яруса нет приставных
 * лож у сцены, у 2 яруса нет правой стороны, балконы подписаны только частично.
 * Поэтому геометрия задаётся спекой, а не правится точками.
 *
 * Схема: 1500×1100, сцена сверху (y=0), ось зала x=750.
 * Правая сторона зала = большие X (так стоят подписи BOLSHOI_HALL_MAP_LABELS).
 * Место 1 в центральных зонах — у правой стороны (большой X), как в референсе.
 *
 * Боковые ложи: 5 концентрических «подков». Все пять начинаются на одной
 * линии FRONT_Y от сцены — это и есть «одинаковое расстояние от сцены».
 * В каждой ложе 8 мест в 3 ряда: ряд 1 = 1,3,5 · ряд 2 = 2,4,6 · ряд 3 = 7,8.
 *
 *   node scripts/_build-bolshoi-historical-hall.mjs                 # отчёт + preview JSON
 *   APPLY=1 node scripts/_build-bolshoi-historical-hall.mjs         # DB + SVG + bundle
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const APPLY = process.env.APPLY === '1' || process.env.APPLY === 'true';
const STAGE_ID =
  process.env.BOLSHOI_HISTORICAL_STAGE_EXTERNAL_ID?.trim() || 'bolshoi-historical-stage';

const HALL_W = 1500;
/** Высота по нижнему ряду балкона 4 яруса + поля; пустой низ уменьшал схему. */
const HALL_H = 1100;
const AXIS = HALL_W / 2;

/** Единая линия начала всех боковых ярусов. */
const FRONT_Y = 112;

const DEG = Math.PI / 180;

/* ─────────────────────────── Партер ─────────────────────────── */

const PARTER_ROWS = [
  { row: 'А', seats: 28, y: 80 },
  { row: 'Б', seats: 28, y: 106 },
  { row: '1', seats: 30, y: 146 },
  { row: '2', seats: 30, y: 163 },
  { row: '3', seats: 30, y: 180 },
  { row: '4', seats: 30, y: 197 },
  { row: '5', seats: 30, y: 214 },
  { row: '6', seats: 30, y: 231 },
  { row: '7', seats: 30, y: 248 },
  { row: '8', seats: 30, y: 265 },
  { row: '9', seats: 30, y: 282 },
  { row: '10', seats: 30, y: 299 },
  { row: '11', seats: 30, y: 316 },
  { row: '12', seats: 26, y: 333 },
  { row: '13', seats: 26, y: 350 },
  { row: '14', seats: 24, y: 367 },
  { row: '15', seats: 20, y: 384 },
  { row: '16', seats: 14, y: 401 },
  { row: '17', seats: 6, y: 418 },
];

const SEAT_PITCH = 17;
const SIDE_AISLE = 22;
const MID_AISLE = 24;

/**
 * Место 1 — справа (большой X), далее влево. Полный ряд: блоки 5|10|10|5.
 * Суженные ряды теряют места с краёв, поэтому боковые блоки усыхают и
 * исчезают — проходы при этом остаются на одних и тех же X.
 */
function parterRowXs(seats) {
  const outerBlock = Math.max(0, seats / 2 - 10);
  const offs = [];
  for (let n = 1; n <= seats; n += 1) {
    const fromCenter = seats / 2 + 0.5 - n; // место 1 → +N/2, место N → −N/2
    let extra = n <= seats / 2 ? MID_AISLE / 2 : -MID_AISLE / 2;
    if (n <= outerBlock) extra += SIDE_AISLE;
    if (n > seats - outerBlock) extra -= SIDE_AISLE;
    offs.push(fromCenter * SEAT_PITCH + extra);
  }
  return offs.map((o) => AXIS + o);
}

function buildParter() {
  const out = [];
  for (const r of PARTER_ROWS) {
    const xs = parterRowXs(r.seats);
    xs.forEach((x, i) => {
      out.push({ sector: 'Партер', row: r.row, seat: String(i + 1), cx: x, cy: r.y });
    });
  }
  return out;
}

/* ───────────────────────── Амфитеатр ───────────────────────── */

const AMPHI_CENTER_Y = -400;
const AMPHI_ROWS = [
  { row: '1', seats: 24, r: 862 },
  { row: '2', seats: 26, r: 890 },
  { row: '3', seats: 34, r: 918 },
];

function buildAmphitheater() {
  const out = [];
  for (const r of AMPHI_ROWS) {
    for (let n = 1; n <= r.seats; n += 1) {
      const fromCenter = r.seats / 2 + 0.5 - n;
      const along = fromCenter * SEAT_PITCH + (n <= r.seats / 2 ? MID_AISLE / 2 : -MID_AISLE / 2);
      const a = along / r.r;
      out.push({
        sector: 'Амфитеатр',
        row: r.row,
        seat: String(n),
        cx: AXIS + r.r * Math.sin(a),
        cy: AMPHI_CENTER_Y + r.r * Math.cos(a),
      });
    }
  }
  return out;
}

/* ──────────────────────── Боковые ложи ──────────────────────── */

/**
 * Подкова яруса: прямой участок вдоль боковой стены от FRONT_Y, затем
 * эллиптическая дуга вокруг зала. Левая сторона схемы = малые X.
 */
const TIERS = [
  { tier: 'Бенуар', boxes: 8, wallX: 430, straightTo: 404, arc: null, seatPitch: 11, rowPitch: 13 },
  {
    tier: 'Бельэтаж',
    boxes: 15,
    wallX: 345,
    straightTo: 430,
    arc: { cy: 430, a: 405, b: 250, endDeg: 115 },
    seatPitch: 13,
    rowPitch: 15,
  },
  {
    tier: '1 ярус',
    boxes: 12,
    wallX: 262,
    straightTo: 470,
    arc: { cy: 470, a: 488, b: 290, endDeg: 98 },
    seatPitch: 15,
    rowPitch: 17,
  },
  {
    tier: '2 ярус',
    boxes: 9,
    wallX: 180,
    straightTo: 520,
    arc: { cy: 520, a: 570, b: 345, endDeg: 115 },
    seatPitch: 15,
    rowPitch: 17,
  },
  {
    tier: '3 ярус',
    boxes: 9,
    wallX: 98,
    straightTo: 560,
    arc: { cy: 560, a: 652, b: 400, endDeg: 120 },
    seatPitch: 15,
    rowPitch: 17,
  },
];

/** Места в ложе: ряд 1 — ближний к залу, место 1 — ближнее к сцене. */
const BOX_ROWS = [
  { row: '1', seats: ['1', '3', '5'] },
  { row: '2', seats: ['2', '4', '6'] },
  { row: '3', seats: ['7', '8'] },
];

/** Доля точек tierPath, которая приходится на прямой участок у стены. */
const TIER_STRAIGHT_FRAC = 0.3;

/** Индекс последней точки прямого участка в tierPath(spec, steps). */
function tierStraightEnd(steps = 1400) {
  return Math.max(2, Math.round(steps * TIER_STRAIGHT_FRAC));
}

/** Полилиния пути яруса (левая сторона), от сцены к центру-назад. */
function tierPath(spec, steps = 1400) {
  const pts = [];
  const straightSteps = tierStraightEnd(steps);
  for (let i = 0; i <= straightSteps; i += 1) {
    const t = i / straightSteps;
    pts.push({ x: spec.wallX, y: FRONT_Y + (spec.straightTo - FRONT_Y) * t });
  }
  if (spec.arc) {
    const { cy, a, b, endDeg } = spec.arc;
    const arcSteps = steps - straightSteps;
    for (let i = 1; i <= arcSteps; i += 1) {
      const th = (180 + (endDeg - 180) * (i / arcSteps)) * DEG;
      pts.push({ x: AXIS + a * Math.cos(th), y: cy + b * Math.sin(th) });
    }
  }
  return pts;
}

function cumulativeLengths(pts) {
  const acc = [0];
  for (let i = 1; i < pts.length; i += 1) {
    acc.push(acc[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  }
  return acc;
}

function pointAt(pts, acc, s) {
  const total = acc[acc.length - 1];
  const target = Math.min(Math.max(s, 0), total);
  let i = 1;
  while (i < acc.length && acc[i] < target) i += 1;
  const i0 = i - 1;
  const seg = acc[i] - acc[i0] || 1;
  const t = (target - acc[i0]) / seg;
  const p0 = pts[i0];
  const p1 = pts[Math.min(i, pts.length - 1)];
  const x = p0.x + (p1.x - p0.x) * t;
  const y = p0.y + (p1.y - p0.y) * t;
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x, y, tx: dx / len, ty: dy / len };
}

function buildSideBoxes() {
  const out = [];
  for (const spec of TIERS) {
    const pts = tierPath(spec);
    const acc = cumulativeLengths(pts);
    const total = acc[acc.length - 1];
    const pitch = total / spec.boxes;
    for (let b = 1; b <= spec.boxes; b += 1) {
      const p = pointAt(pts, acc, (b - 0.5) * pitch);
      /**
       * Нормаль внутрь зала (путь идёт сверху вниз вдоль левой стены, значит
       * внутрь = (ty, −tx)). Ряд 1 ложи — у барьера, ближе к залу; ряд 3
       * с местами 7/8 — в глубине, у стены.
       */
      const nx = p.ty;
      const ny = -p.tx;
      for (const br of BOX_ROWS) {
        const depth = (2 - Number(br.row)) * spec.rowPitch;
        const k = br.seats.length;
        br.seats.forEach((seat, i) => {
          const along = (i - (k - 1) / 2) * spec.seatPitch;
          const cxL = p.x + p.tx * along + nx * depth;
          const cyL = p.y + p.ty * along + ny * depth;
          out.push({
            sector: `${spec.tier} Левая сторона Ложа ${b}`,
            row: br.row,
            seat,
            cx: cxL,
            cy: cyL,
          });
          out.push({
            sector: `${spec.tier} Правая сторона Ложа ${b}`,
            row: br.row,
            seat,
            cx: HALL_W - cxL,
            cy: cyL,
          });
        });
      }
    }
  }
  return out;
}

/* ─────────────────────────── Балконы ─────────────────────────── */

/**
 * Балкон 2/3 яруса — это центральная часть того же яруса, что и его ложи, и
 * занимает ту же полосу: 3 ряда на тех же глубинах, что ряды лож (`depth` в
 * шагах `rowPitch`, минус — внутрь зала). Тогда зазор «ложи ↔ балкон» равен
 * зазору «ложи ↔ ложи» по всему залу. Балкон 4 яруса своих лож не имеет.
 *
 * Нумерация по референсу разная: на балконе 2 яруса каждая сторона своя,
 * 1…12 от внешнего края к центру; на балконах 3 и 4 — непрерывная через весь
 * балкон, место 1 у правой стороны (большой X).
 */
const BALCONIES = [
  {
    label: 'Балкон 2 яруса',
    base: TIERS[3],
    spanDeg: 40,
    numbering: 'per-side-outward',
    rows: [
      { row: '1', depth: -1, seats: 24 },
      { row: '2', depth: 0, seats: 24 },
      { row: '3', depth: 1, seats: 20 },
    ],
  },
  {
    label: 'Балкон 3 яруса',
    base: TIERS[4],
    spanDeg: 52,
    rows: [
      { row: '1', depth: -1, seats: 40 },
      { row: '2', depth: 0, seats: 40 },
      { row: '3', depth: 1, seats: 40 },
    ],
  },
];

/**
 * Балкон 4 яруса — самая внешняя подкова, у неё своих лож нет.
 *
 * Строится как эквидистанта подковы 3 яруса: у боковой стены зазор постоянный
 * (достаточно обойти ряд 3 лож), а на дуге растёт до `atCenter` — в центре зала
 * надо выйти за балкон 3 яруса. Постоянный зазор на всю подкову не годится:
 * у эллипсов разные центры и кривые пересекаются на полпути.
 *
 * Подкова разбита пятью лестничными выходами на шесть участков A…F. Границы
 * участков — одни и те же доли базового пути для всех рядов, поэтому выходы и
 * места выстраиваются радиально, а зазор между рядами постоянный. Ширина
 * выходов и раскладка мест по участкам взяты из официального дампа (в ряду 1
 * скачки X после мест 18, 30, 41, 52, 66) и с референса. Крылья A и F есть
 * только у рядов 1 и 2 — ряды 3, 4 и стоячие начинаются за первым выходом.
 */
const BALCONY4 = {
  label: 'Балкон 4 яруса',
  base: TIERS[TIERS.length - 1],
  /** Дуга базовой подковы до оси зала, чтобы путь замкнулся по центру. */
  endDeg: 90,
  /**
   * Участки подковы от правой стены к левой: `slots` — сколько шагов сетки
   * занимает участок с местами, `exit` — ширина следующего за ним выхода.
   * Сетка строится по ряду 1, поэтому его числа мест здесь и стоят.
   */
  segments: [
    { id: 'A', slots: 18, exit: 2 },
    { id: 'B', slots: 12, exit: 3 },
    { id: 'C', slots: 11, exit: 7 },
    { id: 'D', slots: 11, exit: 3 },
    { id: 'E', slots: 14, exit: 2 },
    { id: 'F', slots: 15, exit: 0 },
  ],
  /**
   * Четыре ряда, как на референсе: ряды 1 и 2 идут от боковой стены через всю
   * подкову, ряды 3 и 4 — только в центре. Дальше к стене их ставить некуда:
   * полоса ряда 2 уже упирается в край схемы, у неё зазор ровно в один шаг
   * яруса (82) от подковы 3 яруса.
   *
   * Зазор у каждого ряда постоянный по всей подкове — иначе крылья балкона
   * расходятся с ложами 3 яруса. Шаг между рядами тот же `rowPitch`, что в
   * ложах, а ряд 1 отстоит от внешнего ряда лож ровно как ложи друг от друга.
   */
  rows: [
    { row: '1', gap: 65, counts: { A: 18, B: 12, C: 11, D: 11, E: 14, F: 15 } },
    { row: '2', gap: 82, counts: { A: 16, B: 12, C: 11, D: 11, E: 14, F: 13 } },
    { row: '3', gap: 99, counts: { C: 11, D: 11 } },
    { row: '4', gap: 116, counts: { C: 11, D: 11 } },
  ],
};

/**
 * Эквидистанта пути яруса наружу зала на постоянное расстояние `d`. Нормаль
 * внутрь зала — (ty, −tx), значит наружу — (−ty, tx).
 */
function outwardOffsetPath(pts, d) {
  const out = [];
  for (let i = 0; i < pts.length; i += 1) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[Math.min(pts.length - 1, i + 1)];
    const len = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1;
    const tx = (p1.x - p0.x) / len;
    const ty = (p1.y - p0.y) / len;
    out.push({ x: pts[i].x - ty * d, y: pts[i].y + tx * d });
  }
  return out;
}

/** Полная подкова из левой половины: правое крыло вниз, по дну, вверх к левому. */
function mirrorToFullRing(half) {
  return [...half.map((p) => ({ x: HALL_W - p.x, y: p.y })), ...[...half].reverse().slice(1)];
}

/**
 * Точка пути по доле номера точки. Эквидистанты строятся из одной полилинии,
 * поэтому точка с одним и тем же `u` у всех рядов лежит на общей нормали —
 * только так места встают ровными радиальными колонками.
 */
function pointAtFraction(pts, u) {
  const t = Math.min(Math.max(u, 0), 1) * (pts.length - 1);
  const i0 = Math.floor(t);
  const i1 = Math.min(pts.length - 1, i0 + 1);
  const f = t - i0;
  return { x: pts[i0].x + (pts[i1].x - pts[i0].x) * f, y: pts[i0].y + (pts[i1].y - pts[i0].y) * f };
}

/** Обратное к длине: доля номера точки, на которой пройдено `s` длины пути. */
function fractionAtLength(acc, s) {
  const target = Math.min(Math.max(s, 0), acc[acc.length - 1]);
  let i = 1;
  while (i < acc.length && acc[i] < target) i += 1;
  const seg = acc[i] - acc[i - 1] || 1;
  return (i - 1 + (target - acc[i - 1]) / seg) / (acc.length - 1);
}

function buildBalcony4() {
  const spec = BALCONY4;
  const steps = 1400;
  const left = tierPath({ ...spec.base, arc: { ...spec.base.arc, endDeg: spec.endDeg } }, steps);
  const rings = spec.rows.map((r) => mirrorToFullRing(outwardOffsetPath(left, r.gap)));

  /**
   * Сетку шагов размечаем по ряду 1 равномерно по его длине — у него шаг между
   * местами выходит одинаковым. Каждый шаг переводим в долю номера точки `u`
   * и по ней ставим места во всех рядах: у внешних рядов шаг чуть крупнее,
   * ровно во столько, во сколько их дуга длиннее.
   */
  const acc = cumulativeLengths(rings[0]);
  const total = acc[acc.length - 1];
  const totalSlots = spec.segments.reduce((a, s) => a + s.slots + s.exit, 0);
  const slotLength = total / totalSlots;

  const bounds = new Map();
  let slot = 0;
  for (const seg of spec.segments) {
    bounds.set(seg.id, [slot * slotLength, (slot + seg.slots) * slotLength]);
    slot += seg.slots + seg.exit;
  }

  const out = [];
  spec.rows.forEach((r, ri) => {
    const ring = rings[ri];
    let seat = 0;
    for (const seg of spec.segments) {
      const n = r.counts[seg.id] ?? 0;
      if (!n) continue;
      const [s0, s1] = bounds.get(seg.id);
      for (let j = 0; j < n; j += 1) {
        const p = pointAtFraction(ring, fractionAtLength(acc, s0 + ((s1 - s0) * (j + 0.5)) / n));
        seat += 1;
        out.push({
          sector: `${spec.label} ${p.x > AXIS ? 'Правая' : 'Левая'} сторона`,
          row: r.row,
          seat: String(seat),
          cx: p.x,
          cy: p.y,
        });
      }
    }
  });
  return out;
}

function buildBalconies() {
  const out = [];
  for (const bal of BALCONIES) {
    const { cy: arcCy, a, b } = bal.base.arc;
    for (const r of bal.rows) {
      const span = r.spanDeg ?? bal.spanDeg;
      const perSide = bal.numbering === 'per-side-outward';
      const half = r.seats / 2;
      const d = r.depth * bal.base.rowPitch;
      for (let i = 0; i < r.seats; i += 1) {
        /** i идёт от правой стороны (угол 90−span/2) к левой. */
        const th = (90 - span / 2 + (span * (i + 0.5)) / r.seats) * DEG;
        /** Нормаль эллипса наружу зала: (b·cosθ, a·sinθ). */
        const nx = b * Math.cos(th);
        const ny = a * Math.sin(th);
        const nl = Math.hypot(nx, ny) || 1;
        const cx = AXIS + a * Math.cos(th) + (d * nx) / nl;
        const cy = arcCy + b * Math.sin(th) + (d * ny) / nl;
        const side = cx > AXIS ? 'Правая' : 'Левая';
        const seat = perSide ? (i < half ? half - i : i - half + 1) : i + 1;
        out.push({
          sector: `${bal.label} ${side} сторона`,
          row: r.row,
          seat: String(seat),
          cx,
          cy,
        });
      }
    }
  }
  return out;
}

/* ──────────────────────────── Сборка ──────────────────────────── */

function buildHall() {
  const places = [
    ...buildParter(),
    ...buildAmphitheater(),
    ...buildSideBoxes(),
    ...buildBalconies(),
    ...buildBalcony4(),
  ];
  return places.map((p, i) => ({
    id: `${p.sector}|${p.row}|${p.seat}|${i}`,
    section: p.sector,
    sector: p.sector,
    row: p.row,
    seat: p.seat,
    cx: p.cx,
    cy: p.cy,
    xPct: (p.cx / HALL_W) * 100,
    yPct: (p.cy / HALL_H) * 100,
    geodesySource: 'bolshoi-hall-spec',
  }));
}

function audit(seats) {
  const bySector = new Map();
  const dupKeys = new Map();
  let outOfBounds = 0;
  let minGap = Infinity;
  for (const s of seats) {
    const k = `${s.sector}|${s.row}|${s.seat}`;
    dupKeys.set(k, (dupKeys.get(k) || 0) + 1);
    if (!bySector.has(s.sector)) bySector.set(s.sector, new Map());
    const rows = bySector.get(s.sector);
    rows.set(s.row, (rows.get(s.row) || 0) + 1);
    if (s.cx < 6 || s.cx > HALL_W - 6 || s.cy < 6 || s.cy > HALL_H - 6) outOfBounds += 1;
  }
  const grid = new Map();
  for (const s of seats) {
    const key = `${Math.floor(s.cx / 12)},${Math.floor(s.cy / 12)}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(s);
  }
  let collisions = 0;
  for (const s of seats) {
    const gx = Math.floor(s.cx / 12);
    const gy = Math.floor(s.cy / 12);
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        for (const o of grid.get(`${gx + dx},${gy + dy}`) || []) {
          if (o === s) continue;
          const d = Math.hypot(o.cx - s.cx, o.cy - s.cy);
          if (d < minGap) minGap = d;
          if (d < 9) collisions += 1;
        }
      }
    }
  }
  return {
    total: seats.length,
    duplicates: [...dupKeys].filter(([, n]) => n > 1).map(([k, n]) => `${k} ×${n}`),
    outOfBounds,
    minGap: +minGap.toFixed(2),
    tooClosePairs: collisions / 2,
    sectors: Object.fromEntries(
      [...bySector]
        .sort()
        .map(([sec, rows]) => [
          sec,
          `${[...rows.values()].reduce((a, b) => a + b, 0)} | ${[...rows]
            .sort((a, b) => String(a[0]).localeCompare(String(b[0]), 'ru', { numeric: true }))
            .map(([r, n]) => `${r}:${n}`)
            .join(' ')}`,
        ]),
    ),
  };
}

async function main() {
  const places = buildHall();
  const report = audit(places);
  console.log(JSON.stringify(report, null, 2));

  const preview = {
    hallWidth: HALL_W,
    hallHeight: HALL_H,
    seats: places.map((s) => ({
      sector: s.sector,
      row: s.row,
      seat: s.seat,
      xPct: s.xPct,
      yPct: s.yPct,
    })),
  };
  const previewPath = process.env.PREVIEW_OUT || '/tmp/bolshoi-spec-preview.json';
  fs.writeFileSync(previewPath, JSON.stringify(preview), 'utf8');
  console.log(`\npreview → ${previewPath}`);

  if (!APPLY) {
    console.log('Dry-run. APPLY=1 чтобы записать DB + SVG + bundle.');
    return;
  }

  const { buildBolshoiHistoricalHallSvg } = await import('../utils/bolshoiHistoricalHallSvg.js');
  const {
    remapBolshoiSeatsToSellableLabels,
    buildBolshoiSellableSectorMode,
    BOLSHOI_HALL_MAP_LABELS,
  } = await import('../utils/bolshoiSellableSectors.js');
  const ticketPool = (await import('../ticketDb.js')).default;

  const bundleSeats = places.map((s) => ({
    sector: s.sector,
    row: s.row,
    seat: s.seat,
    xPct: s.xPct,
    yPct: s.yPct,
    geodesySource: s.geodesySource,
  }));
  const remapped = remapBolshoiSeatsToSellableLabels(bundleSeats);
  const sectorMode = buildBolshoiSellableSectorMode(remapped, HALL_W, HALL_H);
  const svgMarkup = buildBolshoiHistoricalHallSvg(places, [], HALL_W, HALL_H);

  const db = await ticketPool.query(
    `SELECT id, layout_json FROM getbilet_stage_maps WHERE stage_external_id = $1`,
    [STAGE_ID],
  );
  if (!db.rows[0]) throw new Error(`No stage map ${STAGE_ID}`);
  const { id, layout_json: layout } = db.rows[0];

  const nextLayout = {
    ...layout,
    layoutMode: 'svgNative',
    preferLayoutSeatPositions: true,
    hallKind: layout?.hallKind ?? 'theater',
    maxZoomMultiplier: layout?.maxZoomMultiplier ?? 2,
    sectorFocusZoomMultiplier: layout?.sectorFocusZoomMultiplier ?? 2,
    seats: remapped,
    allSeatCoordinates: places.map((s) => ({ xPct: s.xPct, yPct: s.yPct })),
    sectorMode,
    hallMapLabels: BOLSHOI_HALL_MAP_LABELS,
    pbilet: { ...(layout?.pbilet || {}), hallWidth: HALL_W, hallHeight: HALL_H },
    bolshoiHistorical: {
      ...(layout?.bolshoiHistorical || {}),
      hallWidth: HALL_W,
      hallHeight: HALL_H,
      placeCount: places.length,
      specBuildAt: new Date().toISOString(),
      frontY: FRONT_Y,
    },
    note: `bolshoi spec build; seats=${places.length}; все ярусы от y=${FRONT_Y}`,
  };

  await ticketPool.query(
    `UPDATE getbilet_stage_maps
     SET svg_markup = $1, layout_json = $2::jsonb, updated_at = NOW()
     WHERE id = $3`,
    [svgMarkup, JSON.stringify(nextLayout), id],
  );

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const targets = [
    path.join(REPO_ROOT, 'frontend/public/hall-maps/bolshoi-historical-stage.svg'),
    path.join(REPO_ROOT, 'frontend/dist/hall-maps/bolshoi-historical-stage.svg'),
    path.join(REPO_ROOT, 'frontend/public/tools/bolshoi-historical-stage-enriched.svg'),
    path.join(REPO_ROOT, 'frontend/dist/tools/bolshoi-historical-stage-enriched.svg'),
  ];
  for (const p of targets) {
    if (!fs.existsSync(path.dirname(p))) continue;
    if (fs.existsSync(p)) fs.copyFileSync(p, `${p}.${stamp}.bak`);
    fs.writeFileSync(p, `${svgMarkup}\n`, 'utf8');
  }

  const bundlePath = path.join(
    REPO_ROOT,
    'backend/data/bolshoi-geodesy/hand/bolshoi-historical-stage-seats.bundle.json',
  );
  if (fs.existsSync(bundlePath)) fs.copyFileSync(bundlePath, `${bundlePath}.${stamp}.bak`);
  fs.mkdirSync(path.dirname(bundlePath), { recursive: true });
  fs.writeFileSync(
    bundlePath,
    `${JSON.stringify(
      {
        builtAt: new Date().toISOString(),
        mode: 'bolshoi-hall-spec',
        stageId: STAGE_ID,
        stageExternalId: STAGE_ID,
        hallWidth: HALL_W,
        hallHeight: HALL_H,
        seatCount: bundleSeats.length,
        labeledSeatCount: bundleSeats.length,
        note: 'parametric spec build (moscow-77 reference)',
        seats: bundleSeats,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  console.log(
    JSON.stringify(
      {
        written: true,
        stageMapId: id,
        seats: places.length,
        sellable: sectorMode.sectors.map((s) => [s.id, s.totalSeats]),
        svgBytes: svgMarkup.length,
      },
      null,
      2,
    ),
  );
  await ticketPool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
