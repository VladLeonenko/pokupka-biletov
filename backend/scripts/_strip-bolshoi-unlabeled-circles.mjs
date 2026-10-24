#!/usr/bin/env node
/**
 * Убрать с Исторической сцены Большого точки без ряда (row=— / Не подписано).
 * Запуск на VPS: node scripts/_strip-bolshoi-unlabeled-circles.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ticketPool from '../ticketDb.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const svgPath =
  process.env.BOLSHOI_SVG_PATH ||
  path.resolve(__dirname, '../../frontend/public/hall-maps/bolshoi-historical-stage.svg');

function isBadRow(row) {
  const r = String(row ?? '').trim();
  return !r || r === '—' || r === '-' || r === '–' || r === '—';
}

let svg = fs.readFileSync(svgPath, 'utf8');
const re = /<circle\b[^>]*>/gi;
let removed = 0;
svg = svg.replace(re, (c) => {
  const m = c.match(/\brow="([^"]*)"/i);
  const row = m ? m[1] : '';
  if (isBadRow(row)) {
    removed += 1;
    return '';
  }
  return c;
});
fs.writeFileSync(svgPath, svg);
const left = (svg.match(/<circle\b/gi) || []).length;

const r = await ticketPool.query(
  `SELECT id, layout_json FROM getbilet_stage_maps WHERE stage_external_id = $1`,
  ['bolshoi-historical-stage'],
);
if (!r.rows[0]) {
  console.log({ svgRemoved: removed, svgLeft: left, db: 'no stage map' });
  process.exit(0);
}
const layout = r.rows[0].layout_json;
const before = (layout.seats || []).length;
layout.seats = (layout.seats || []).filter((s) => {
  if (isBadRow(s.row)) return false;
  if (String(s.sector || '').includes('одписан')) return false;
  return true;
});
layout.allSeatCoordinates = (layout.seats || []).map((s) => ({
  xPct: s.xPct,
  yPct: s.yPct,
}));
await ticketPool.query(
  `UPDATE getbilet_stage_maps SET layout_json = $1::jsonb, updated_at = NOW() WHERE id = $2`,
  [JSON.stringify(layout), r.rows[0].id],
);
console.log({
  svgRemoved: removed,
  svgLeft: left,
  seatsBefore: before,
  seatsAfter: layout.seats.length,
  coords: layout.allSeatCoordinates.length,
});
await ticketPool.end();
