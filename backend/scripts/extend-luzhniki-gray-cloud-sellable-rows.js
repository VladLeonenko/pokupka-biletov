#!/usr/bin/env node
/**
 * Добавить cloud-кружки для рядов выше max в SVG (sellable GetBilet, напр. B262 ряд 41).
 * Экстраполяция от двух верхних рядов сектора вдоль оси «поле → трибуна».
 *
 *   cd backend && node scripts/extend-luzhniki-gray-cloud-sellable-rows.js
 *   node scripts/extend-luzhniki-gray-cloud-sellable-rows.js --dry-run
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveCanonicalSectorLabel } from '../utils/luzhnikiSectorDisplayLabel.js';
import { escSvgAttr } from '../utils/luzhnikiPilotSeatSvg.js';
import { normalizeSectorLabel } from '../utils/ticketHallSectorNormalize.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '../..');
const DEFAULT_SVG = path.join(REPO, 'frontend/public/tools/luzhniki-gray-cloud-enriched.svg');
const DEFAULT_TSV = path.join(REPO, 'getbilet-seats-sorted.tsv');
const LAYER_ID = 'luzhniki-gray-cloud-coordinates';
const R = '3.387';

function parseArgs() {
  const get = (flag) => {
    const i = process.argv.indexOf(flag);
    return i >= 0 ? process.argv[i + 1] : '';
  };
  return {
    dryRun: process.argv.includes('--dry-run'),
    svgPath: get('--svg') || DEFAULT_SVG,
    tsvPath: get('--tsv') || DEFAULT_TSV,
    rowPad: Number(get('--pad')) || 2,
  };
}

function parseTsvNeeds(tsvPath) {
  const text = fs.readFileSync(tsvPath, 'utf8');
  const need = new Map();
  for (const line of text.split('\n')) {
    if (!line.trim() || /^sector\t/i.test(line) || line.startsWith('сектор\t')) continue;
    const parts = line.split('\t');
    if (parts.length < 3) continue;
    const sectorRaw = parts[0].replace(/^(?:сектор|sector)\s+/i, '').trim();
    const row = Number.parseInt(parts[1], 10);
    if (!sectorRaw || !Number.isFinite(row)) continue;
    const norm = normalizeSectorLabel(sectorRaw);
    const prev = need.get(norm) ?? 0;
    if (row > prev) need.set(norm, row);
  }
  return need;
}

function parseCircles(svg) {
  const circles = [];
  const re = /<circle\b[^>]*\/?>/gi;
  let m;
  while ((m = re.exec(svg))) {
    const tag = m[0];
    const cx = Number(tag.match(/\bcx=["']([^"']+)/i)?.[1]);
    const cy = Number(tag.match(/\bcy=["']([^"']+)/i)?.[1]);
    const sector = tag.match(/data-sector=["']([^"']+)/i)?.[1] || '';
    const row = tag.match(/data-row=["']([^"']+)/i)?.[1] || '';
    const seat = tag.match(/data-seat=["']([^"']+)/i)?.[1] || '';
    const source = tag.match(/data-source=["']([^"']+)/i)?.[1] || '';
    if (!sector || !Number.isFinite(cx) || !Number.isFinite(cy)) continue;
    if (source.startsWith('manual')) continue;
    const rn = Number.parseInt(row, 10);
    if (!Number.isFinite(rn)) continue;
    circles.push({ tag, cx, cy, sector, row: rn, seat, source });
  }
  return circles;
}

function circleMarkup({ sector, row, seat, cx, cy }) {
  const s = escSvgAttr(sector);
  const rowS = String(row);
  const seatS = String(seat);
  return (
    `<circle cx="${cx.toFixed(3)}" cy="${cy.toFixed(3)}" r="${R}" fill="#c8ccd4" stroke="none" ` +
    `place-name="${s}" row="${rowS}" place="${seatS}" data-sector="${s}" data-row="${rowS}" ` +
    `data-seat="${seatS}" data-source="cloud-extrap"/>`
  );
}

function extrapolateSector(sectorLabel, sectorCircles, targetMaxRow, rowPad) {
  const byRow = new Map();
  for (const c of sectorCircles) {
    if (!byRow.has(c.row)) byRow.set(c.row, []);
    byRow.get(c.row).push(c);
  }
  const rows = [...byRow.keys()].sort((a, b) => a - b);
  if (rows.length < 2) return [];

  const maxExisting = rows[rows.length - 1];
  if (targetMaxRow <= maxExisting) return [];

  const r2 = rows[rows.length - 1];
  const r1 = rows[rows.length - 2];
  const pts1 = byRow.get(r1);
  const pts2 = byRow.get(r2);
  if (!pts1?.length || !pts2?.length) return [];

  const c1x = pts1.reduce((s, p) => s + p.cx, 0) / pts1.length;
  const c1y = pts1.reduce((s, p) => s + p.cy, 0) / pts1.length;
  const c2x = pts2.reduce((s, p) => s + p.cx, 0) / pts2.length;
  const c2y = pts2.reduce((s, p) => s + p.cy, 0) / pts2.length;
  const rowStep = (c2x - c1x) / (r2 - r1);
  const colStep = (c2y - c1y) / (r2 - r1);

  const added = [];
  const fromRow = maxExisting + 1;
  const toRow = targetMaxRow + rowPad;

  for (let row = fromRow; row <= toRow; row += 1) {
    const dr = row - r2;
    for (const p of pts2) {
      const cx = p.cx + rowStep * dr;
      const cy = p.cy + colStep * dr;
      const seat = p.seat || String(pts2.indexOf(p) + 1);
      added.push({ sector: sectorLabel, row, seat, cx, cy });
    }
  }
  return added;
}

function main() {
  const args = parseArgs();
  const needs = parseTsvNeeds(args.tsvPath);
  const svg = fs.readFileSync(args.svgPath, 'utf8');
  const circles = parseCircles(svg);

  const bySectorLabel = new Map();
  for (const c of circles) {
    if (!bySectorLabel.has(c.sector)) bySectorLabel.set(c.sector, []);
    bySectorLabel.get(c.sector).push(c);
  }

  const newCircles = [];
  const report = [];

  for (const [norm, targetRow] of needs) {
    let sectorLabel = null;
    let sectorCircles = null;
    for (const [label, list] of bySectorLabel) {
      if (normalizeSectorLabel(label) === norm) {
        sectorLabel = label;
        sectorCircles = list;
        break;
      }
    }
    if (!sectorLabel || !sectorCircles?.length) {
      report.push({ norm, targetRow, status: 'sector-not-in-svg' });
      continue;
    }
    const maxRow = Math.max(...sectorCircles.map((c) => c.row));
    if (targetRow <= maxRow) {
      report.push({ norm, targetRow, maxRow, status: 'ok' });
      continue;
    }
    const added = extrapolateSector(sectorLabel, sectorCircles, targetRow, args.rowPad);
    newCircles.push(...added);
    report.push({
      norm,
      sector: sectorLabel,
      targetRow,
      maxRow,
      added: added.length,
      rows: [...new Set(added.map((a) => a.row))].sort((a, b) => a - b),
    });
  }

  if (!newCircles.length) {
    console.log(JSON.stringify({ ok: true, added: 0, report }, null, 2));
    return;
  }

  const markup = newCircles.map((c) => circleMarkup(c)).join('\n');
  const layerClose = svg.indexOf(`</g>\n  <script`);
  const layerCloseAlt = svg.indexOf(`</g>\n<script`);
  const insertAt = layerClose >= 0 ? layerClose : layerCloseAlt;
  if (insertAt < 0) throw new Error('gray cloud layer end not found');

  const countMatch = svg.match(
    new RegExp(`<g id="${LAYER_ID}"[^>]*data-dot-count="(\\d+)"`),
  );
  const prevCount = countMatch ? Number(countMatch[1]) : circles.length;
  const nextCount = prevCount + newCircles.length;

  let out =
    svg.slice(0, insertAt) +
    markup +
    '\n' +
    svg.slice(insertAt);
  out = out.replace(
    new RegExp(`(<g id="${LAYER_ID}"[^>]*data-dot-count=")(\\d+)(")`),
    `$1${nextCount}$3`,
  );

  if (args.dryRun) {
    console.log(JSON.stringify({ ok: true, dryRun: true, added: newCircles.length, report }, null, 2));
    return;
  }

  fs.writeFileSync(args.svgPath, out, 'utf8');
  const handPath = path.join(REPO, 'backend/data/luzhniki-geodesy/hand/luzhniki-gray-cloud-enriched.svg');
  if (handPath !== args.svgPath && fs.existsSync(path.dirname(handPath))) {
    fs.mkdirSync(path.dirname(handPath), { recursive: true });
    fs.writeFileSync(handPath, out, 'utf8');
  }

  console.log(JSON.stringify({ ok: true, added: newCircles.length, nextCount, report }, null, 2));
}

main();
