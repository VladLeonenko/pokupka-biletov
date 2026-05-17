#!/usr/bin/env node
/**
 * Офлайн HTML: сетка рядов (красная) и колонн (синяя).
 *
 *   npm run render:luzhniki-seat-grid          # fieldGrid + калибровка A → /tools/luzhniki-grid-diagnostic.html
 *   node scripts/render-luzhniki-seat-grid-test.js --source strict
 *   node scripts/render-luzhniki-seat-grid-test.js --source cloud   # legacy → luzhniki-grid-diagnostic-cloud.html
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
import { buildSeatRowColumnGrid } from '../utils/luzhnikiSeatGridLines.js';
import { analyzeSeatGridQuality } from '../utils/luzhnikiSeatRowColumnGrid.js';
import { buildFullStadiumLabeledSeats } from '../utils/luzhnikiStadiumFullGeodesy.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const outDir = path.join(repoRoot, 'backend/data/luzhniki-geodesy/hand');
const outPath = path.join(outDir, 'grid-diagnostic.html');
const publicOutPath = path.join(repoRoot, 'frontend/public/tools/luzhniki-grid-diagnostic.html');
const distOutPath = path.join(repoRoot, 'frontend/dist/tools/luzhniki-grid-diagnostic.html');
const cloudLegacyPath = path.join(repoRoot, 'frontend/public/tools/luzhniki-grid-diagnostic-cloud.html');
const cloudDistPath = path.join(repoRoot, 'frontend/dist/tools/luzhniki-grid-diagnostic-cloud.html');

function parseArgs() {
  const args = process.argv.slice(2);
  const sectorIdx = args.indexOf('--sector');
  const sourceIdx = args.indexOf('--source');
  const outIdx = args.indexOf('--out');
  return {
    sector: sectorIdx >= 0 ? args[sectorIdx + 1] : '',
    source: sourceIdx >= 0 ? args[sourceIdx + 1] : 'fieldGrid',
    out: outIdx >= 0 ? args[outIdx + 1] : '',
    ticketsPath: path.join(repoRoot, 'tickets.json'),
    coordsPath: path.join(repoRoot, 'luzhniki.txt'),
    maxGrayDots: 8000,
  };
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

function polyline(points, stroke, width, dash, opacity = 0.85) {
  const pts = points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  return `<polyline fill="none" stroke="${stroke}" stroke-width="${width}" stroke-opacity="${opacity}" ${dash ? `stroke-dasharray="${dash}"` : ''} points="${pts}"/>`;
}

function sampleGrayDots(cloud, w, h, maxDots) {
  const n = cloud.length;
  if (n <= maxDots) {
    return cloud.map(
      (d) =>
        `<circle cx="${((d.xPct / 100) * w).toFixed(1)}" cy="${((d.yPct / 100) * h).toFixed(1)}" r="1" fill="#64748b" opacity="0.22"/>`,
    );
  }
  const step = Math.ceil(n / maxDots);
  const out = [];
  for (let i = 0; i < n; i += step) {
    const d = cloud[i];
    out.push(
      `<circle cx="${((d.xPct / 100) * w).toFixed(1)}" cy="${((d.yPct / 100) * h).toFixed(1)}" r="1" fill="#64748b" opacity="0.22"/>`,
    );
  }
  return out;
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function verdictBadge(verdict) {
  const colors = {
    grid_ok: '#2e7d32',
    grid_crooked: '#c62828',
    grid_ok_svg_suspect: '#f9a825',
  };
  const bg = colors[verdict] || '#555';
  return `<span style="background:${bg};color:#fff;padding:2px 8px;border-radius:4px;font-weight:600">${escHtml(verdict)}</span>`;
}

function buildHtml(params) {
  let sourceLi = '';
  if (params.source === 'fieldGrid') {
    sourceLi =
      '<li><strong>Якорная сетка</strong> — углы из <code>sector-row-anchors.json</code> (bilinear + rowCurve), как A 108 VIP; иначе spatial sort по оси сектора.</li>';
  } else if (params.source === 'strict') {
    sourceLi = '<li><strong>strict</strong> — 6132 места <code>tickets.json</code>.</li>';
  } else {
    sourceLi = '<li><strong>cloud</strong> — сырая чаша (зигзаг ожидаем).</li>';
  }

  return `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"/>
<meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex"/>
<meta name="googlebot" content="noindex, nofollow"/>
<title>Лужники — сетка ${escHtml(params.modeLabel)}</title>
<style>body{margin:0;background:#111;color:#eee;font-family:system-ui,sans-serif}
.wrap{max-width:min(96vw,1600px);margin:0 auto;padding:12px}
h1{font-size:18px} p,li{font-size:14px;opacity:.9;line-height:1.45}
.stage{background:#000;border:1px solid #333}
.stage svg{width:100%;height:auto;display:block}
.legend{display:flex;flex-wrap:wrap;gap:12px;margin:8px 0}
.legend span{display:inline-flex;align-items:center;gap:6px}
.sw{width:28px;height:3px;display:inline-block}
.quality{margin:10px 0;padding:10px;border:1px solid #444;border-radius:6px;background:#1a1a1a}
a{color:#90caf9}
</style></head><body><div class="wrap">
<h1>Сетка рядов / колонн — ${escHtml(params.modeLabel)}</h1>
<div class="legend">
<span><i class="sw" style="background:#64748b"></i> серая чаша (фон)</span>
<span><i class="sw" style="background:#e53935"></i> ряд</span>
<span><i class="sw" style="background:#1e88e5;border-bottom:1px dashed #1e88e5"></i> колонна</span>
</div>
<p>Секторов: <strong>${params.sectorCount}</strong> · точек: <strong>${params.dotCount.toLocaleString('ru-RU')}</strong>${params.cloudDotCount ? ` · чаша: <strong>${params.cloudDotCount.toLocaleString('ru-RU')}</strong>` : ''} · рядов: <strong>${params.rowCount}</strong> · колонн: <strong>${params.colCount}</strong></p>
<div class="quality">
<p>Качество: ${verdictBadge(params.quality.verdict)} · откл. рядов <strong>${params.quality.maxRowChordDeviationPct}%</strong> · колонн <strong>${params.quality.maxColumnChordDeviationPct}%</strong> · пересеч. рядов <strong>${params.quality.rowLineCrossings}</strong> · колонн <strong>${params.quality.columnLineCrossings}</strong></p>
<p>${escHtml(params.quality.verdictHint)}</p>
</div>
<ul>
${sourceLi}
${params.colHiddenNote || ''}
<li><a href="/test/luzhniki-seat-grid?mode=fieldGrid">Интерактив</a> · <a href="/tools/luzhniki-grid-diagnostic-d230.html">D230</a> · <a href="/tools/luzhniki-grid-diagnostic-cloud.html">cloud (legacy)</a></li>
</ul>
<p style="opacity:.6;font-size:12px">source=${escHtml(params.source)} · ${escHtml(params.builtAt)}</p>
<div class="stage"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${params.w} ${params.h}">${params.bgInner}${params.overlay}</svg></div>
</div></body></html>`;
}

function main() {
  const { sector, source, out, ticketsPath, coordsPath, maxGrayDots } = parseArgs();
  const tickets = JSON.parse(fs.readFileSync(ticketsPath, 'utf8'));
  const coords = JSON.parse(fs.readFileSync(coordsPath, 'utf8'));
  const w = Number(coords.width) || 11413;
  const h = Number(coords.height) || 9676;
  const builtAt = new Date().toISOString();

  const cloud = extractPbiletCoordinatesSeatDots(coords, w, h);
  const grayLayer = sampleGrayDots(cloud, w, h, maxGrayDots).join('\n');
  const cloudDotCount = cloud.length;

  let bgInner = '';
  const bgUrl = typeof coords.bg === 'string' ? coords.bg : coords.bg?.url;
  if (bgUrl && String(bgUrl).startsWith('http')) {
    bgInner = `<image href="${bgUrl}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`;
  }

  if (source === 'cloud') {
    const sectorPaths = mergeSectorMetaPreferTickets(
      extractPbiletTicketSectorPaths(tickets),
      extractPbiletCoordinateCategoriesSectorPaths(coords),
    );
    const cloudGrid = buildGrayCloudRowColumnGrid({
      allSeatCoordinates: cloud,
      sectorPaths,
      hallWidth: w,
      hallHeight: h,
      sectorFilter: sector,
    });
    const html = buildHtml({
      modeLabel: sector.trim() ? `серая чаша (legacy) · ${sector}` : 'серая чаша (legacy)',
      w,
      h,
      bgInner,
      overlay: [
        grayLayer,
        ...cloudGrid.rowLines.map((l) => polyline(l.points, '#e53935', 1.1, false, 0.7)),
        ...cloudGrid.columnLines.map((l) => polyline(l.points, '#1e88e5', 0.9, '5 4', 0.6)),
      ].join('\n'),
      sectorCount: cloudGrid.sectorCount,
      dotCount: cloudGrid.dotCount,
      cloudDotCount,
      rowCount: cloudGrid.rowLines.length,
      colCount: cloudGrid.columnLines.length,
      quality: {
        verdict: 'grid_crooked',
        verdictHint: 'Cloud без row/seat — только сравнение со старым зигзагом.',
        maxRowChordDeviationPct: '—',
        maxColumnChordDeviationPct: '—',
        rowLineCrossings: '—',
        columnLineCrossings: '—',
      },
      source: 'cloud',
      builtAt,
    });
    fs.mkdirSync(path.dirname(cloudLegacyPath), { recursive: true });
    fs.writeFileSync(cloudLegacyPath, html, 'utf8');
    fs.mkdirSync(path.dirname(cloudDistPath), { recursive: true });
    fs.writeFileSync(cloudDistPath, html, 'utf8');
    if (out) fs.writeFileSync(out, html, 'utf8');
    console.log(JSON.stringify({ ok: true, source: 'cloud', cloudLegacyPath }, null, 2));
    return;
  }

  let seats = [];
  let modeLabel;

  let sectorPaths = mergeSectorMetaPreferTickets(
    extractPbiletTicketSectorPaths(tickets),
    extractPbiletCoordinateCategoriesSectorPaths(coords),
  );

  if (source === 'fieldGrid' || source === 'fieldgrid') {
    const built = buildFullStadiumLabeledSeats({
      ticketsPayload: tickets,
      coordinatesPayload: coords,
      svgMarkup: '',
    });
    seats = built.seats.filter((s) => {
      if (!sectorMatches(s.sector, sector)) return false;
      const row = String(s.row ?? '').trim();
      const seat = String(s.seat ?? '').trim();
      return row && row !== '—' && seat;
    });
    modeLabel = sector.trim()
      ? `якорная сетка + fieldGrid · ${sector}`
      : 'якорная сетка (sector-row-anchors) · весь стадион';
  } else if (source === 'strict' || source === 'tickets') {
    seats = extractPbiletTicketsSeatGeodesy(tickets, w, h).filter((s) =>
      sectorMatches(s.sector, sector),
    );
    modeLabel = sector.trim() ? `strict · ${sector}` : 'strict · весь стадион';
  } else {
    throw new Error(`Unknown --source ${source}; use fieldGrid | strict | cloud`);
  }

  const gridBuilt = buildSeatRowColumnGrid(seats, {
    sector,
    hallWidth: w,
    hallHeight: h,
    sectorPaths,
    preferAnchorMesh: true,
  });
  const { rowLines, columnLines, sectorCount, dotCount, anchorSectorCount, spatialSectorCount } =
    gridBuilt;

  const showColumns = dotCount <= 12_000;
  const isFieldGrid = source === 'fieldGrid' || source === 'fieldgrid';
  const mostlyAnchors = anchorSectorCount >= spatialSectorCount;
  const quality = analyzeSeatGridQuality(
    rowLines,
    showColumns ? columnLines : [],
    { curvedRows: isFieldGrid && !mostlyAnchors, anchorMesh: mostlyAnchors },
  );

  let strictQualityNote = '';
  if (isFieldGrid) {
    const strictSeats = extractPbiletTicketsSeatGeodesy(tickets, w, h).filter((s) =>
      sectorMatches(s.sector, sector),
    );
    const sg = buildSeatRowColumnGrid(strictSeats, { sector, hallWidth: w, hallHeight: h });
    const sq = analyzeSeatGridQuality(sg.rowLines, sg.columnLines);
    strictQualityNote = `<li>Эталон <strong>strict</strong> (${strictSeats.length} мест): ${verdictBadge(sq.verdict)} — линии fieldGrid для полноты ~${dotCount.toLocaleString('ru-RU')} мест.</li>`;
  }

  const overlay = [
    grayLayer,
    ...rowLines.map((l) => polyline(l.points, '#e53935', 2, false)),
    ...(showColumns
      ? columnLines.map((l) => polyline(l.points, '#1e88e5', 1.5, '6 4', 0.55))
      : []),
  ].join('\n');

  const html = buildHtml({
    modeLabel,
    w,
    h,
    bgInner,
    overlay,
    sectorCount,
    dotCount,
    cloudDotCount,
    rowCount: rowLines.length,
    colCount: columnLines.length,
    quality,
    source: source === 'fieldGrid' || source === 'fieldgrid' ? 'fieldGrid' : 'strict',
    builtAt,
    colHiddenNote: [
      strictQualityNote,
      showColumns
        ? ''
        : '<li>Колонны скрыты на полном стадионе — только ряды; пересборка: <code>--sector \"Сектор D 230\"</code>.</li>',
    ].join('\n'),
  });

  if (out) {
    const outAbs = path.resolve(repoRoot, out);
    fs.mkdirSync(path.dirname(outAbs), { recursive: true });
    fs.writeFileSync(outAbs, html, 'utf8');
    if (outAbs.includes(`${path.sep}public${path.sep}tools${path.sep}`)) {
      const distMirror = outAbs.replace(
        `${path.sep}public${path.sep}tools${path.sep}`,
        `${path.sep}dist${path.sep}tools${path.sep}`,
      );
      fs.mkdirSync(path.dirname(distMirror), { recursive: true });
      fs.writeFileSync(distMirror, html, 'utf8');
    }
    console.log(
      JSON.stringify(
        {
          ok: true,
          out: path.resolve(repoRoot, out),
          source,
          sector: sector || '(весь стадион)',
          sectorCount,
          dotCount,
          rows: rowLines.length,
          cols: columnLines.length,
          quality,
        },
        null,
        2,
      ),
    );
    return;
  }

  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(path.dirname(publicOutPath), { recursive: true });
  fs.mkdirSync(path.dirname(distOutPath), { recursive: true });
  fs.writeFileSync(outPath, html, 'utf8');
  fs.writeFileSync(publicOutPath, html, 'utf8');
  fs.writeFileSync(distOutPath, html, 'utf8');

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
        rows: rowLines.length,
        cols: columnLines.length,
        anchorSectorCount,
        spatialSectorCount,
        quality,
      },
      null,
      2,
    ),
  );
}

main();
