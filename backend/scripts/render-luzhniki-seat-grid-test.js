#!/usr/bin/env node
/**
 * Офлайн HTML: сетка рядов (красная) и колонн (синяя) на весь стадион.
 * По умолчанию — серая чаша luzhniki.txt (~77k точек), кластеризация по секторам.
 *
 *   cd backend && npm run render:luzhniki-seat-grid
 *   open data/luzhniki-geodesy/hand/grid-diagnostic.html
 *
 *   # только сектор (подписанные tickets.json):
 *   node scripts/render-luzhniki-seat-grid-test.js --source tickets --sector "Сектор D 230"
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

import {
  extractPbiletCoordinateCategoriesSectorPaths,
  extractPbiletCoordinatesSeatDots,
  extractPbiletTicketsSeatGeodesy,
  extractPbiletTicketSectorPaths,
  mergeSectorMetaPreferTickets,
} from '../utils/luzhnikiPbiletGeodesyExtract.js';
import { buildGrayCloudRowColumnGrid } from '../utils/luzhnikiGrayCloudRowColumnGrid.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const outDir = path.join(repoRoot, 'backend/data/luzhniki-geodesy/hand');
const outPath = path.join(outDir, 'grid-diagnostic.html');
/** Копия в public → dist/tools/ (robots.txt: Disallow /tools/) */
const publicOutPath = path.join(repoRoot, 'frontend/public/tools/luzhniki-grid-diagnostic.html');

function parseArgs() {
  const args = process.argv.slice(2);
  const sectorIdx = args.indexOf('--sector');
  const sourceIdx = args.indexOf('--source');
  return {
    sector: sectorIdx >= 0 ? args[sectorIdx + 1] : '',
    source: sourceIdx >= 0 ? args[sourceIdx + 1] : 'cloud',
    ticketsPath: path.join(repoRoot, 'tickets.json'),
    coordsPath: path.join(repoRoot, 'luzhniki.txt'),
    maxGrayDots: 12000,
  };
}

function parseOrdinal(value) {
  const n = Number.parseInt(String(value).replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : Number.NaN;
}

function compareOrdinal(a, b) {
  const na = parseOrdinal(a);
  const nb = parseOrdinal(b);
  if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
  return String(a).localeCompare(String(b), 'ru', { numeric: true });
}

function normSector(s) {
  return String(s).replace(/\s+/g, ' ').trim().toLowerCase();
}

function sectorMatches(sector, filter) {
  if (!filter?.trim()) return true;
  const f = normSector(filter);
  const s = normSector(sector);
  return s.includes(f) || f.includes(s);
}

function buildLabeledGrid(seats, sectorFilter, w, h) {
  const filtered = seats.filter((s) => sectorMatches(s.sector, sectorFilter));
  const byRow = new Map();
  const byCol = new Map();
  for (const s of filtered) {
    const rk = `${s.sector}\0${s.row}`;
    const ck = `${s.sector}\0${s.seat}`;
    if (!byRow.has(rk)) byRow.set(rk, []);
    if (!byCol.has(ck)) byCol.set(ck, []);
    byRow.get(rk).push(s);
    byCol.get(ck).push(s);
  }

  const rowLines = [];
  for (const [key, group] of byRow) {
    const [sector] = key.split('\0');
    const sorted = [...group].sort((a, b) => compareOrdinal(a.seat, b.seat));
    if (sorted.length < 2) continue;
    rowLines.push({
      sector,
      kind: 'row',
      points: sorted.map((s) => ({ x: (s.xPct / 100) * w, y: (s.yPct / 100) * h })),
    });
  }

  const columnLines = [];
  for (const [key, group] of byCol) {
    const [sector] = key.split('\0');
    const sorted = [...group].sort((a, b) => compareOrdinal(a.row, b.row));
    if (sorted.length < 2) continue;
    columnLines.push({
      sector,
      kind: 'column',
      points: sorted.map((s) => ({ x: (s.xPct / 100) * w, y: (s.yPct / 100) * h })),
    });
  }

  return {
    rowLines,
    columnLines,
    sectorCount: new Set(filtered.map((s) => s.sector)).size,
    dotCount: filtered.length,
    cloudDotCount: 0,
  };
}

function polyline(points, stroke, width, dash) {
  const pts = points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  return `<polyline fill="none" stroke="${stroke}" stroke-width="${width}" stroke-opacity="0.75" ${dash ? `stroke-dasharray="${dash}"` : ''} points="${pts}"/>`;
}

function sampleGrayDots(cloud, w, h, maxDots) {
  const n = cloud.length;
  if (n <= maxDots) {
    return cloud.map((d) => `<circle cx="${((d.xPct / 100) * w).toFixed(1)}" cy="${((d.yPct / 100) * h).toFixed(1)}" r="1.2" fill="#64748b" opacity="0.35"/>`);
  }
  const step = Math.ceil(n / maxDots);
  const out = [];
  for (let i = 0; i < n; i += step) {
    const d = cloud[i];
    out.push(
      `<circle cx="${((d.xPct / 100) * w).toFixed(1)}" cy="${((d.yPct / 100) * h).toFixed(1)}" r="1.2" fill="#64748b" opacity="0.35"/>`,
    );
  }
  return out;
}

function main() {
  const { sector, source, ticketsPath, coordsPath, maxGrayDots } = parseArgs();
  const tickets = JSON.parse(fs.readFileSync(ticketsPath, 'utf8'));
  const coords = JSON.parse(fs.readFileSync(coordsPath, 'utf8'));
  const w = Number(coords.width) || 11413;
  const h = Number(coords.height) || 9676;

  const sectorPaths = mergeSectorMetaPreferTickets(
    extractPbiletTicketSectorPaths(tickets),
    extractPbiletCoordinateCategoriesSectorPaths(coords),
  );

  let grid;
  let modeLabel;
  let grayLayer = '';

  if (source === 'tickets') {
    const seats = extractPbiletTicketsSeatGeodesy(tickets, w, h);
    grid = buildLabeledGrid(seats, sector, w, h);
    modeLabel = sector.trim()
      ? `tickets.json (подписи) · ${sector}`
      : `tickets.json (подписи) · все сектора с рядами`;
  } else {
    const cloud = extractPbiletCoordinatesSeatDots(coords, w, h);
    grid = buildGrayCloudRowColumnGrid({
      allSeatCoordinates: cloud,
      sectorPaths,
      hallWidth: w,
      hallHeight: h,
      sectorFilter: sector,
    });
    grayLayer = sampleGrayDots(cloud, w, h, maxGrayDots).join('\n');
    modeLabel = sector.trim()
      ? `серая чаша · фильтр «${sector}»`
      : 'серая чаша · весь стадион';
  }

  const { rowLines, columnLines, sectorCount, dotCount, cloudDotCount } = grid;
  const strokeRow = source === 'cloud' ? '1.1' : '2';
  const strokeCol = source === 'cloud' ? '0.9' : '1.5';

  let bgInner = '';
  const bgUrl = typeof coords.bg === 'string' ? coords.bg : coords.bg?.url;
  if (bgUrl && String(bgUrl).startsWith('http')) {
    bgInner = `<image href="${bgUrl}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`;
  }

  const overlay = [
    grayLayer,
    ...rowLines.map((l) => polyline(l.points, '#e53935', strokeRow, false)),
    ...columnLines.map((l) => polyline(l.points, '#1e88e5', strokeCol, '5 4')),
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"/>
<meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex"/>
<meta name="googlebot" content="noindex, nofollow"/>
<title>Лужники — сетка ${modeLabel}</title>
<style>body{margin:0;background:#111;color:#eee;font-family:system-ui,sans-serif}
.wrap{max-width:min(96vw,1600px);margin:0 auto;padding:12px}
h1{font-size:18px} p,li{font-size:14px;opacity:.9;line-height:1.45}
.stage{background:#000;border:1px solid #333}
.stage svg{width:100%;height:auto;display:block}
.legend{display:flex;flex-wrap:wrap;gap:12px;margin:8px 0}
.legend span{display:inline-flex;align-items:center;gap:6px}
.sw{width:28px;height:3px;display:inline-block}
</style></head><body><div class="wrap">
<h1>Сетка рядов / колонн — ${modeLabel}</h1>
<div class="legend">
<span><i class="sw" style="background:#64748b"></i> серая чаша (выборка)</span>
<span><i class="sw" style="background:#e53935"></i> ряд</span>
<span><i class="sw" style="background:#1e88e5;border-bottom:1px dashed #1e88e5"></i> колонна</span>
</div>
<p>Секторов: <strong>${sectorCount}</strong> · точек в сетке: <strong>${dotCount.toLocaleString('ru-RU')}</strong>${cloudDotCount ? ` · в чаше всего: <strong>${cloudDotCount.toLocaleString('ru-RU')}</strong>` : ''} · линий рядов: <strong>${rowLines.length}</strong> · колонн: <strong>${columnLines.length}</strong></p>
<ul>
<li><strong>Ровная сетка + кривая картинка</strong> → кривой SVG подложки (pbilet).</li>
<li><strong>Кривая сетка</strong> (зигзаг, пересечения рядов) → кластеризация / координаты чаши.</li>
</ul>
<div class="stage"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${bgInner}${overlay}</svg></div></div>
</body></html>`;

  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(path.dirname(publicOutPath), { recursive: true });
  fs.writeFileSync(outPath, html, 'utf8');
  fs.writeFileSync(publicOutPath, html, 'utf8');

  console.log(
    JSON.stringify(
      {
        ok: true,
        outPath,
        publicOutPath,
        publicUrl: 'https://biletvsem.com/tools/luzhniki-grid-diagnostic.html',
        source,
        sector: sector || '(весь стадион)',
        sectorCount,
        dotCount,
        cloudDotCount,
        rows: rowLines.length,
        cols: columnLines.length,
      },
      null,
      2,
    ),
  );
}

main();
