#!/usr/bin/env node
/**
 * Генерация sector-row-anchors.json для всех секторов tickets.json (канонические названия).
 * Источник координат: tickets strict → fieldGrid (full layout) → polarGrid из bbox сектора.
 *
 *   node scripts/generate-luzhniki-all-sector-anchors.js
 *   node scripts/generate-luzhniki-all-sector-anchors.js --write
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

import ticketPool from '../ticketDb.js';
import { LUZHNIKI_FOOTBALL_STAGE_MAP_KEY } from '../services/luzhnikiFootballStageMap.js';
import { extractPbiletTicketsSeatGeodesy } from '../utils/luzhnikiPbiletGeodesyExtract.js';
import { buildFullStadiumLabeledSeats } from '../utils/luzhnikiStadiumFullGeodesy.js';
import { getLuzhnikiTribuneBlock, inferCornerAnchors } from '../utils/luzhnikiSeatWarp.js';
import { normalizeSectorLabel } from '../utils/ticketHallSectorNormalize.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const OUT_PATH = path.join(__dirname, '../data/luzhniki-geodesy/sector-row-anchors.json');

const W = 11413;
const H = 9676;

function parseNum(value) {
  const n = Number.parseInt(String(value ?? '').replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

function roundPct(n) {
  return Math.round(Number(n) * 1e6) / 1e6;
}

function sectorSeatsForNorm(allSeats, norm) {
  return allSeats.filter((s) => normalizeSectorLabel(s.sector) === norm);
}

function buildAnchorsBlock(seats, rowCurve = 0.3) {
  const corners = inferCornerAnchors(seats);
  if (!corners) return null;
  return {
    rowCurve,
    anchors: [
      {
        row: String(corners.p00.row),
        seat: String(corners.p00.seat),
        xPct: roundPct(corners.p00.xPct),
        yPct: roundPct(corners.p00.yPct),
        role: 'nearLeft',
      },
      {
        row: String(corners.p10.row),
        seat: String(corners.p10.seat),
        xPct: roundPct(corners.p10.xPct),
        yPct: roundPct(corners.p10.yPct),
        role: 'farLeft',
      },
      {
        row: String(corners.p01.row),
        seat: String(corners.p01.seat),
        xPct: roundPct(corners.p01.xPct),
        yPct: roundPct(corners.p01.yPct),
        role: 'nearRight',
      },
      {
        row: String(corners.p11.row),
        seat: String(corners.p11.seat),
        xPct: roundPct(corners.p11.xPct),
        yPct: roundPct(corners.p11.yPct),
        role: 'farRight',
      },
    ],
  };
}

function buildPolarGridFromSeats(seats, sectorMeta) {
  const parsed = seats
    .map((s) => ({ ...s, rn: parseNum(s.row), sn: parseNum(s.seat) }))
    .filter((s) => s.rn != null && s.sn != null);
  if (parsed.length < 2) return null;

  const minR = Math.min(...parsed.map((s) => s.rn));
  const maxR = Math.max(...parsed.map((s) => s.rn));
  const minS = Math.min(...parsed.map((s) => s.sn));
  const maxS = Math.max(...parsed.map((s) => s.sn));

  const p00 = parsed.find((s) => s.rn === minR && s.sn === minS) || parsed[0];
  const p10 = parsed.find((s) => s.rn === maxR && s.sn === minS) || parsed[parsed.length - 1];
  const p01 = parsed.find((s) => s.rn === minR && s.sn === maxS) || parsed[Math.floor(parsed.length / 2)];

  const ox = parsed.reduce((a, s) => a + s.xPct, 0) / parsed.length;
  const oy = parsed.reduce((a, s) => a + s.yPct, 0) / parsed.length;

  const rowDx = p10.xPct - p00.xPct;
  const rowDy = p10.yPct - p00.yPct;
  const rowLen = Math.hypot(rowDx, rowDy) || 1;
  const rowDirectionDeg = (Math.atan2(rowDy, rowDx) * 180) / Math.PI;

  const seatDx = p01.xPct - p00.xPct;
  const seatDy = p01.yPct - p00.yPct;
  const seatDirectionDeg = (Math.atan2(seatDy, seatDx) * 180) / Math.PI;

  const rowSpacingPct = rowLen / Math.max(1, maxR - minR);
  const seatLen = Math.hypot(seatDx, seatDy) || rowSpacingPct;
  const seatSpacingPct = seatLen / Math.max(1, maxS - minS);

  const totalAll = Number(sectorMeta?.all);
  const maxRow =
    Number.isFinite(totalAll) && totalAll > maxR ? Math.max(maxR, Math.min(80, Math.ceil(totalAll / Math.max(1, maxS - minS + 1)))) : maxR;
  const maxSeat = maxS;

  return {
    mode: 'polarGrid',
    origin: { xPct: roundPct(ox), yPct: roundPct(oy) },
    rowDirectionDeg: roundPct(rowDirectionDeg),
    seatDirectionDeg: roundPct(seatDirectionDeg),
    rowSpacingPct: roundPct(Math.max(0.08, Math.min(2.5, rowSpacingPct))),
    seatSpacingPct: roundPct(Math.max(0.05, Math.min(1.5, seatSpacingPct))),
    rowCurve: 0.3,
    maxRow: Math.max(1, maxRow),
    maxSeat: Math.max(1, maxSeat),
  };
}

function buildSingleSeatPolar(sector) {
  const x = Number(sector?.seat_x);
  const y = Number(sector?.seat_y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return {
    mode: 'polarGrid',
    origin: { xPct: roundPct((x / W) * 100), yPct: roundPct((y / H) * 100) },
    rowDirectionDeg: 90,
    seatDirectionDeg: 180,
    rowSpacingPct: 0.2,
    seatSpacingPct: 0.15,
    rowCurve: 0.2,
    maxRow: 1,
    maxSeat: 1,
  };
}

async function main() {
  const write = process.argv.includes('--write');
  const tickets = JSON.parse(fs.readFileSync(path.join(repoRoot, 'tickets.json'), 'utf8'));
  const coords = JSON.parse(fs.readFileSync(path.join(repoRoot, 'luzhniki.txt'), 'utf8'));

  let svgMarkup = '';
  try {
    const r = await ticketPool.query(
      `SELECT svg_markup FROM getbilet_stage_maps WHERE stage_external_id = $1`,
      [LUZHNIKI_FOOTBALL_STAGE_MAP_KEY],
    );
    svgMarkup = String(r.rows[0]?.svg_markup ?? '');
  } catch {
    // local without DB
  }

  const ticketsStrict = extractPbiletTicketsSeatGeodesy(tickets, W, H);
  const { seats: gridSeats } = buildFullStadiumLabeledSeats({
    ticketsPayload: tickets,
    coordinatesPayload: coords,
    svgMarkup,
  });

  const sectors = Array.isArray(tickets?.sectors) ? tickets.sectors : [];
  const out = {
    _comment:
      'Автоген из tickets.json (канон sector.i) + layout grid. Ключ = normalizeSectorLabel. Перегенерация: npm run generate:luzhniki-sector-anchors',
  };

  const stats = { anchors: 0, polarGrid: 0, single: 0, skipped: 0 };
  const skippedList = [];

  for (const sector of sectors) {
    const label = String(sector?.i ?? '').trim();
    const norm = normalizeSectorLabel(label);
    if (!norm || norm.startsWith('_')) continue;

    const strict = sectorSeatsForNorm(ticketsStrict, norm);
    const grid = sectorSeatsForNorm(gridSeats, norm);
    const combined = [...strict];
    const strictKeys = new Set(strict.map((s) => `${s.row}|${s.seat}`));
    for (const g of grid) {
      const k = `${g.row}|${g.seat}`;
      if (!strictKeys.has(k)) combined.push(g);
    }

    let block = buildAnchorsBlock(strict.length >= 4 ? strict : combined, 0.32);
    if (block) {
      stats.anchors += 1;
      out[norm] = { ...block, sectorLabel: label };
      continue;
    }

    block = buildAnchorsBlock(combined, 0.3);
    if (block) {
      stats.anchors += 1;
      out[norm] = { ...block, sectorLabel: label };
      continue;
    }

    block = buildPolarGridFromSeats(combined, sector);
    if (block) {
      stats.polarGrid += 1;
      out[norm] = { ...block, sectorLabel: label };
      continue;
    }

    block = buildSingleSeatPolar(sector);
    if (block) {
      stats.single += 1;
      out[norm] = { ...block, sectorLabel: label };
      continue;
    }

    stats.skipped += 1;
    skippedList.push({ norm, label, tribune: getLuzhnikiTribuneBlock(norm) });
  }

  if (write) {
    fs.writeFileSync(OUT_PATH, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        wrote: write,
        path: write ? OUT_PATH : null,
        sectorCount: sectors.length,
        anchorBlocks: stats.anchors + stats.polarGrid + stats.single,
        stats,
        skipped: skippedList.slice(0, 20),
        skippedTotal: skippedList.length,
      },
      null,
      2,
    ),
  );

  await ticketPool.end().catch(() => {});
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
