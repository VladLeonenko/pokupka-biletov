/**
 * Подбор координат BOLSHOI_HALL_MAP_LABELS.
 *
 * Требования к подписи: (1) она стоит на своём блоке — ближайшие к ней места
 * принадлежат тому сектору, который она называет, иначе получается «амфитеатр
 * в партере»; (2) она не наезжает на контуры продаваемых зон; (3) если подпись
 * без плашки — она не наезжает и на сами места.
 *
 * Боковым ложам отведены коридоры между подковами: подпись яруса ставится в
 * коридор со стороны центра зала от своего яруса. Подписи с плашкой (партер,
 * амфитеатр, балконы) стоят прямо на своих местах — там свободного коридора
 * нет, а плашка делает текст читаемым.
 *
 * Берёт /tmp/bolshoi-spec-preview.json от _build-bolshoi-historical-hall.mjs.
 * Печатает готовый литерал — переносим в utils/bolshoiSellableSectors.js.
 *
 *   node scripts/_build-bolshoi-historical-hall.mjs && node scripts/_solve-bolshoi-hall-labels.mjs
 */
import fs from 'node:fs';

import {
  BOLSHOI_HALL_MAP_LABELS,
  buildBolshoiSellableSectorMode,
  remapBolshoiSeatsToSellableLabels,
} from '../utils/bolshoiSellableSectors.js';

const SEAT_MARGIN = 10;
const ZONE_MARGIN = 7;
/** Радиус, в котором смотрим, какому сектору подпись «принадлежит». */
const OWNER_RADIUS = 45;

const preview = JSON.parse(fs.readFileSync('/tmp/bolshoi-spec-preview.json', 'utf8'));
const { hallWidth: W, hallHeight: H, seats } = preview;

/** Короткое имя блока: стороны и номера лож для принадлежности не важны. */
function blockOf(sector) {
  return String(sector).replace(/\s+(Левая|Правая)\s+сторона.*$/, '');
}

const seatPts = seats.map((s) => ({
  x: (s.xPct / 100) * W,
  y: (s.yPct / 100) * H,
  block: blockOf(s.sector),
}));
const zonePts = [];
for (const sector of buildBolshoiSellableSectorMode(
  remapBolshoiSeatsToSellableLabels(seats),
  W,
  H,
).sectors) {
  for (const m of String(sector.path).matchAll(/(-?\d+(?:\.\d+)?)[ ,](-?\d+(?:\.\d+)?)/g)) {
    zonePts.push({ x: Number(m[1]), y: Number(m[2]) });
  }
}

function halfBox(label) {
  const hw = label.text.length * label.fontSize * 0.33;
  const hh = label.fontSize * 0.62;
  return label.rotate ? { hw: hh, hh: hw } : { hw, hh };
}

function measure(label, x, y) {
  const { hw, hh } = halfBox(label);
  let seatClear = Infinity;
  let zoneClear = Infinity;
  const near = new Map();
  for (const p of seatPts) {
    const d = Math.max(Math.abs(p.x - x) - hw, Math.abs(p.y - y) - hh);
    if (d < seatClear) seatClear = d;
    if (d < OWNER_RADIUS) near.set(p.block, (near.get(p.block) || 0) + 1);
  }
  for (const p of zonePts) {
    const d = Math.max(Math.abs(p.x - x) - hw, Math.abs(p.y - y) - hh);
    if (d < zoneClear) zoneClear = d;
  }
  const owner = [...near].sort((a, b) => b[1] - a[1])[0];
  return { seatClear, zoneClear, owner: owner ? owner[0] : null, hw, hh };
}

/** Подпись называет свой блок? У «ПРАВАЯ/ЛЕВАЯ СТОРОНА» блока нет. */
function ownsBlock(label, owner) {
  if (!label.owner) return true;
  return owner === label.owner;
}

function fits(label, m) {
  return (
    m.zoneClear >= ZONE_MARGIN &&
    (label.plate || m.seatClear >= SEAT_MARGIN) &&
    ownsBlock(label, m.owner)
  );
}

/** Ближайшая к исходной точка, где подпись помещается. Шаг по x дешевле. */
function search(label) {
  for (let r = 0; r <= 90; r += 1) {
    for (let dx = -r; dx <= r; dx += 1) {
      for (const dy of r === 0 ? [0] : [r - Math.abs(dx), -(r - Math.abs(dx))]) {
        const x = label.x + dx;
        const y = label.y + dy;
        const m = measure(label, x, y);
        if (m.hw + 4 > x || x + m.hw + 4 > W || m.hh + 4 > y || y + m.hh + 4 > H) continue;
        if (fits(label, m)) return { x, y, moved: r, ...m };
      }
    }
  }
  return null;
}

let bad = 0;
for (const label of BOLSHOI_HALL_MAP_LABELS) {
  const here = measure(label, label.x, label.y);
  const best = fits(label, here) ? { x: label.x, y: label.y, moved: 0, ...here } : search(label);
  if (!best) {
    bad += 1;
    console.log(`  ✗ ${label.text} @(${label.x},${label.y}) — свободного места нет`);
    continue;
  }
  const parts = [`text: '${label.text}'`, `x: ${best.x}`, `y: ${best.y}`];
  if (label.fontSize) parts.push(`fontSize: ${label.fontSize}`);
  if (label.rotate) parts.push(`rotate: ${label.rotate}`);
  if (label.plate) parts.push('plate: true');
  if (label.owner) parts.push(`owner: '${label.owner}'`);
  console.log(
    `  { ${parts.join(', ')} },`.padEnd(104) +
      ` // места ${best.seatClear.toFixed(0)} · зоны ${best.zoneClear.toFixed(0)} · блок ${
        best.owner
      }${best.moved ? ` · сдвинута на ${best.moved}` : ''}`,
  );
}
console.log(bad === 0 ? '\nвсе подписи на своих блоках и без наездов' : `\n✗ проблемных: ${bad}`);
