/**
 * Подбор координат BOLSHOI_HALL_MAP_LABELS так, чтобы подписи ярусов не
 * налезали ни на места, ни на контуры продаваемых зон.
 *
 * Препятствия: все места зала (из /tmp/bolshoi-spec-preview.json, который
 * пишет _build-bolshoi-historical-hall.mjs) и вершины path'ов sectorMode.
 * Ищем ближайшую к исходной точку, где рамка текста отстоит от препятствий
 * не меньше чем на MARGIN. Результат печатаем готовым литералом — его руками
 * переносим в utils/bolshoiSellableSectors.js.
 *
 *   node scripts/_build-bolshoi-historical-hall.mjs && node scripts/_solve-bolshoi-hall-labels.mjs
 */
import fs from 'node:fs';

import {
  BOLSHOI_HALL_MAP_LABELS,
  buildBolshoiSellableSectorMode,
  remapBolshoiSeatsToSellableLabels,
} from '../utils/bolshoiSellableSectors.js';

const MARGIN = 11;
const preview = JSON.parse(fs.readFileSync('/tmp/bolshoi-spec-preview.json', 'utf8'));
const { hallWidth: W, hallHeight: H, seats } = preview;

const obstacles = seats.map((s) => ({ x: (s.xPct / 100) * W, y: (s.yPct / 100) * H }));
const sectorMode = buildBolshoiSellableSectorMode(
  remapBolshoiSeatsToSellableLabels(seats),
  W,
  H,
);
for (const sector of sectorMode.sectors) {
  for (const m of String(sector.path).matchAll(/(-?\d+(?:\.\d+)?)[ ,](-?\d+(?:\.\d+)?)/g)) {
    obstacles.push({ x: Number(m[1]), y: Number(m[2]) });
  }
}

/** Полуразмеры рамки текста; у повёрнутых подписей оси меняются местами. */
function halfBox(label) {
  const hw = label.text.length * label.fontSize * 0.33;
  const hh = label.fontSize * 0.62;
  return label.rotate ? { hw: hh, hh: hw } : { hw, hh };
}

function clearance(x, y, hw, hh) {
  let worst = Infinity;
  for (const o of obstacles) {
    const d = Math.max(Math.abs(o.x - x) - hw, Math.abs(o.y - y) - hh);
    if (d < worst) worst = d;
  }
  return worst;
}

const out = [];
for (const label of BOLSHOI_HALL_MAP_LABELS) {
  const { hw, hh } = halfBox(label);
  let best = null;
  for (let r = 0; r <= 200 && !best; r += 1) {
    for (const [dx, dy] of r === 0 ? [[0, 0]] : ring(r)) {
      const x = label.x + dx;
      const y = label.y + dy;
      if (x - hw < 4 || x + hw > W - 4 || y - hh < 4 || y + hh > H - 4) continue;
      if (clearance(x, y, hw, hh) >= MARGIN) {
        best = { x: Math.round(x), y: Math.round(y), moved: r };
        break;
      }
    }
  }
  out.push({ label, best });
}

/** Точки на «кольце» радиуса r: шаг по y дешевле, чем по x, поэтому он первый. */
function ring(r) {
  const pts = [];
  for (let dy = -r; dy <= r; dy += 1) {
    for (const dx of [-r, r]) pts.push([dx, dy]);
  }
  for (let dx = -r + 1; dx <= r - 1; dx += 1) {
    for (const dy of [-r, r]) pts.push([dx, dy]);
  }
  return pts.sort((a, b) => Math.abs(a[0]) - Math.abs(b[0]) || Math.abs(a[1]) - Math.abs(b[1]));
}

for (const { label, best } of out) {
  if (!best) {
    console.log(`  ✗ ${label.text} @(${label.x},${label.y}) — свободного места нет`);
    continue;
  }
  const parts = [`text: '${label.text}'`, `x: ${best.x}`, `y: ${best.y}`];
  if (label.fontSize) parts.push(`fontSize: ${label.fontSize}`);
  if (label.rotate) parts.push(`rotate: ${label.rotate}`);
  console.log(`  { ${parts.join(', ')} },${best.moved ? ` // сдвинута на ${best.moved}` : ''}`);
}
