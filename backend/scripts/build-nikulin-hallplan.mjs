/**
 * Цирк Никулина: схема Profticket (места cx/cy, без контуров) → hallplan JSON
 * для import-bolshoi-new-stage-map.js. Имена секторов — как в GetBilet.
 *
 *   node scripts/build-nikulin-hallplan.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '../data/nikulin-circus/hallplan.json');

const NAMES = {
  'Левая сторона партер': { name: 'партер левая сторона', band: 'in' },
  'Правая сторона партер': { name: 'партер правая сторона', band: 'in' },
  'Левая сторона амфитеатр': { name: 'амфитеатр левая сторона', band: 'out' },
  'Правая сторона амфитеатр': { name: 'амфитеатр правая сторона', band: 'out' },
  'Ложа партера': { name: 'ложа партера', band: 'in' },
  'Ложа амфитеатра': { name: 'ложа амфитеатра', band: 'out' },
};

const PITCH = 18;
const MARGIN = 36;

function fitCircle(pts) {
  let sxx = 0;
  let sxy = 0;
  let sx = 0;
  let syy = 0;
  let sy = 0;
  let sxz = 0;
  let syz = 0;
  let sz = 0;
  const n = pts.length;
  for (const p of pts) {
    const z = p.x * p.x + p.y * p.y;
    sxx += p.x * p.x;
    sxy += p.x * p.y;
    sx += p.x;
    syy += p.y * p.y;
    sy += p.y;
    sxz += p.x * z;
    syz += p.y * z;
    sz += z;
  }
  const M = [
    [sxx, sxy, sx, sxz],
    [sxy, syy, sy, syz],
    [sx, sy, n, sz],
  ];
  for (let col = 0; col < 3; col += 1) {
    let piv = col;
    for (let r = col; r < 3; r += 1) {
      if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    }
    [M[col], M[piv]] = [M[piv], M[col]];
    const div = M[col][col];
    for (let c = col; c < 4; c += 1) M[col][c] /= div;
    for (let r = 0; r < 3; r += 1) {
      if (r === col) continue;
      const f = M[r][col];
      for (let c = col; c < 4; c += 1) M[r][c] -= f * M[col][c];
    }
  }
  const cx = M[0][3] / 2;
  const cy = M[1][3] / 2;
  return { cx, cy, r: Math.sqrt(cx * cx + cy * cy + M[2][3]) };
}

/** Дуга без разреза ±π: старт после самого большого углового разрыва. */
function arcSpan(angs) {
  const s = [...angs].sort((a, b) => a - b);
  let gap = -1;
  let idx = 0;
  for (let i = 0; i < s.length; i += 1) {
    const next = i === s.length - 1 ? s[0] + Math.PI * 2 : s[i + 1];
    const d = next - s[i];
    if (d > gap) {
      gap = d;
      idx = i;
    }
  }
  const start = idx === s.length - 1 ? s[0] : s[idx + 1];
  let full = s[idx] - start;
  if (full < 0) full += Math.PI * 2;
  return { start, full };
}

function annulusPath(cx, cy, r0, r1, a0, a1) {
  const steps = Math.max(24, Math.round((r1 * (a1 - a0)) / 8));
  const pt = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const outer = [];
  const inner = [];
  for (let i = 0; i <= steps; i += 1) {
    const a = a0 + ((a1 - a0) * i) / steps;
    outer.push(pt(r1, a));
    inner.push(pt(r0, a));
  }
  const seq = [...outer, ...inner.reverse()];
  return `M ${seq.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L ')} Z`;
}

const res = await fetch(
  'https://widget.profticket.ru/api/v1/company/53/event/scheme/?company_id=53&global_show_id=10362&event_id=3799&language=ru-RU',
  { headers: { Accept: 'application/json' } },
);
const raw = await res.json();
const places = (raw?.response?.items || [])
  .filter((it) => it.object_type === 'Place' && NAMES[it.name_sec])
  .map((it) => ({
    sec: it.name_sec,
    row: String(it.row),
    seat: String(it.seat),
    x: (Number(it.cx) + Number(it.cx2)) / 2,
    y: (Number(it.cy) + Number(it.cy2)) / 2,
  }));
if (places.length < 1500) throw new Error(`мало мест: ${places.length}`);

let sx = 0;
let sy = 0;
for (const p of places) {
  sx += p.x;
  sy += p.y;
}
const rough = places
  .map((p) => ({ ...p, r: Math.hypot(p.x - sx / places.length, p.y - sy / places.length) }))
  .sort((a, b) => a.r - b.r);
const circle = fitCircle(rough.slice(0, 160));

const nn = [];
for (let i = 0; i < 60; i += 1) {
  const a = places[i * 30];
  let best = 1e12;
  for (const b of places) {
    if (b === a) continue;
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (d < best && d > 1) best = d;
  }
  nn.push(best);
}
nn.sort((a, b) => a - b);
const scale = PITCH / nn[Math.floor(nn.length / 2)];

const groups = new Map();
for (const p of places) {
  const x = p.x * scale;
  const y = p.y * scale;
  const ang = Math.atan2(y - circle.cy * scale, x - circle.cx * scale);
  const r = Math.hypot(x - circle.cx * scale, y - circle.cy * scale);
  const g = groups.get(p.sec) || { seats: [], angs: [], rmin: Infinity, rmax: 0 };
  g.seats.push({ row: p.row, place: p.seat, x, y, ang, r });
  g.angs.push(ang);
  g.rmin = Math.min(g.rmin, r);
  g.rmax = Math.max(g.rmax, r);
  groups.set(p.sec, g);
}

const cx0 = circle.cx * scale;
const cy0 = circle.cy * scale;
const drafts = [];
for (const [sec, g] of groups) {
  const meta = NAMES[sec];
  const span = arcSpan(g.angs);
  const padAng = 0.02;
  const padIn = meta.band === 'in' ? 58 : 12;
  const padOut = meta.band === 'out' ? 58 : 12;
  const r0 = g.rmin - padIn;
  const r1 = g.rmax + padOut;
  const a0 = span.start - padAng;
  const a1 = span.start + span.full + padAng;
  const mid = span.start + span.full / 2;
  const rLabel = meta.band === 'in' ? g.rmin - 34 : g.rmax + 34;
  drafts.push({
    name: meta.name,
    band: meta.band,
    mid,
    rmin: g.rmin,
    rmax: g.rmax,
    outline: annulusPath(cx0, cy0, r0, r1, a0, a1),
    seats: g.seats.map((s) => ({
      place: s.place,
      row: s.row,
      x_coord: Number(s.x.toFixed(2)),
      y_coord: Number(s.y.toFixed(2)),
    })),
    label: {
      x: Number((cx0 + rLabel * Math.cos(mid)).toFixed(2)),
      y: Number((cy0 + rLabel * Math.sin(mid)).toFixed(2)),
      radial: true,
    },
    r0,
    r1,
  });
}

let minX = Infinity;
let minY = Infinity;
let maxX = -Infinity;
let maxY = -Infinity;
const bump = (x, y) => {
  minX = Math.min(minX, x);
  minY = Math.min(minY, y);
  maxX = Math.max(maxX, x);
  maxY = Math.max(maxY, y);
};
for (const d of drafts) {
  for (const s of d.seats) bump(s.x_coord, s.y_coord);
  bump(d.label.x, d.label.y);
  const nums = d.outline.match(/-?\d+\.?\d*/g) || [];
  for (let i = 0; i < nums.length; i += 2) bump(Number(nums[i]), Number(nums[i + 1]));
}
const ox = MARGIN - minX;
const oy = MARGIN - minY;
const hallWidth = Math.ceil(maxX - minX + MARGIN * 2);
const hallHeight = Math.ceil(maxY - minY + MARGIN * 2);

const levels = drafts.map((d) => ({
  name: d.name,
  outline: d.outline,
  seats: d.seats,
  label: d.label,
}));

function shiftPath(d) {
  let i = 0;
  return d.replace(/-?\d+\.\d+/g, (n) => {
    const v = Number(n) + (i % 2 === 0 ? ox : oy);
    i += 1;
    return v.toFixed(1);
  });
}
for (const level of levels) {
  level.outline = shiftPath(level.outline);
  for (const s of level.seats) {
    s.x_coord = Number((s.x_coord + ox).toFixed(2));
    s.y_coord = Number((s.y_coord + oy).toFixed(2));
  }
  level.label.x = Number((level.label.x + ox).toFixed(2));
  level.label.y = Number((level.label.y + oy).toFixed(2));
}

function tangentDeg(ang) {
  let deg = (Math.atan2(Math.cos(ang), -Math.sin(ang)) * 180) / Math.PI;
  while (deg > 180) deg -= 360;
  while (deg < -180) deg += 360;
  return deg;
}

function sectorGlyphs(text, fontSize, cx, cy, r, mid, seats, dir) {
  const chars = [...text];
  const gap = fontSize * 0.82;
  let radius = r;
  const build = (useR) => {
    const dAng = gap / useR;
    const span = (chars.length - 1) * dAng;
    const glyphs = chars.map((ch, i) => {
      const ang = mid - span / 2 + i * dAng;
      let rot = tangentDeg(ang);
      return {
        text: ch,
        x: Number((cx + useR * Math.cos(ang)).toFixed(2)),
        y: Number((cy + useR * Math.sin(ang)).toFixed(2)),
        fontSize,
        rotate: Number(rot.toFixed(1)),
      };
    });
    const a = glyphs[0];
    const b = glyphs[glyphs.length - 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const backward = Math.abs(dx) >= Math.abs(dy) ? dx < 0 : dy < 0;
    if (backward) {
      const xs = glyphs.map((g) => g.x);
      const ys = glyphs.map((g) => g.y);
      const rots = glyphs.map((g) => g.rotate);
      const n = glyphs.length;
      glyphs.forEach((g, i) => {
        g.x = xs[n - 1 - i];
        g.y = ys[n - 1 - i];
        g.rotate = rots[n - 1 - i];
      });
    }
    const midG = glyphs[Math.floor((glyphs.length - 1) / 2)];
    if (Math.abs(midG.rotate) > 90) {
      for (const g of glyphs) {
        let rr = g.rotate + 180;
        while (rr > 180) rr -= 360;
        while (rr < -180) rr += 360;
        g.rotate = Number(rr.toFixed(1));
      }
    }
    return glyphs;
  };
  let glyphs = build(radius);
  const clear = (gs) =>
    gs.every((g) => seats.every((s) => Math.hypot(g.x - s.x_coord, g.y - s.y_coord) >= fontSize));
  for (let k = 0; k < 8 && !clear(glyphs); k += 1) {
    radius += dir * 4;
    glyphs = build(radius);
  }
  return glyphs;
}

const stageCx = cx0 + ox;
const stageCy = cy0 + oy;
const hallplan = {
  source: 'profticket company 53 show 10362 event 3799',
  hallWidth,
  hallHeight,
  stage: {
    x_coord: Number((stageCx - 16).toFixed(2)),
    y_coord: Number((stageCy - 4).toFixed(2)),
    width: 32,
    height: 8,
  },
  levels: levels.map(({ name, outline, seats, label }) => ({ name, outline, seats, label })),
};

for (const level of hallplan.levels) {
  const d = drafts.find((x) => x.name === level.name);
  const fontSize = 11;
  const r = d.band === 'in' ? d.rmin - 32 : d.rmax + 32;
  level.label.glyphs = sectorGlyphs(
    level.name,
    fontSize,
    stageCx,
    stageCy,
    r,
    d.mid,
    level.seats,
    d.band === 'in' ? -1 : 1,
  );
  level.label.radial = false;
}

const probe = hallplan.levels.find((l) => l.name === 'партер правая сторона');
const hit = probe.seats.some((s) => s.row === '11' && s.place === '69');
console.log('places', places.length, 'scale', scale.toFixed(4), 'hall', hallWidth, hallHeight);
console.log('offer seat 11/69', hit);
for (const l of hallplan.levels) console.log(l.name, l.seats.length, 'label', l.label.x, l.label.y);
if (!hit) throw new Error('место 11/69 не найдено в партере справа');

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(hallplan)}\n`);
console.log('wrote', OUT);
