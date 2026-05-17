#!/usr/bin/env node
/**
 * Собрать geodesy-круги (#luzhniki-pilot-seats) для всех секторов с офферами (tickets.json + интерполяция).
 *
 *   cd backend
 *   REPERTOIRE_ID=6a05d17b46a4d000309ecf4e node scripts/build-luzhniki-stadium-pilot-geodesy.js
 *   npm run apply:luzhniki-sector-pilot -- --bundle data/luzhniki-geodesy/hand/bundle-luzhniki-stadium-pilot.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

import dotenv from 'dotenv';

import ticketPool from '../ticketDb.js';
import { getPublicOffersForRepertoire } from '../services/getbiletOffersPublic.js';
import { LUZHNIKI_FOOTBALL_STAGE_MAP_KEY } from '../services/luzhnikiFootballStageMap.js';
import {
  buildLabeledSeatIndex,
  lookupLabeledSeat,
} from '../utils/hallSeatGeodesyMatch.js';
import {
  extractPbiletTicketsSeatGeodesy,
  interpolatePbiletSeatGeodesy,
} from '../utils/luzhnikiPbiletGeodesyExtract.js';
import {
  LUZHNIKI_PILOT_SEATS_LAYER_ID,
  pilotSeatCircleMarkup,
} from '../utils/luzhnikiPilotSeatSvg.js';
import { normalizeSectorLabel, strictSeatKey } from '../utils/ticketHallSectorNormalize.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const outDir = path.join(repoRoot, 'backend/data/luzhniki-geodesy/hand');
const bundlePath = path.join(outDir, 'bundle-luzhniki-stadium-pilot.json');

dotenv.config({ path: path.join(__dirname, '../.env') });

function canonicalSectorLabel(pbiletSeats, norm, offerSector) {
  const fromPb = pbiletSeats.find((s) => normalizeSectorLabel(s.sector) === norm)?.sector;
  return fromPb || offerSector || norm;
}

function parseLayoutSeats(layout) {
  const raw = layout?.seats;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const sector = String(item.sector ?? item.Sector ?? '').trim();
      const row = String(item.row ?? item.Row ?? '').trim();
      const seat = String(item.seat ?? item.Seat ?? item.place ?? '').trim();
      const xPct = Number(item.xPct ?? item.x_pct);
      const yPct = Number(item.yPct ?? item.y_pct);
      if (!sector || !row || !seat || !Number.isFinite(xPct) || !Number.isFinite(yPct)) return null;
      return { sector, row, seat, xPct, yPct };
    })
    .filter(Boolean);
}

async function loadLayoutSeatIndex() {
  try {
    const r = await ticketPool.query(
      `SELECT layout_json FROM getbilet_stage_maps WHERE stage_external_id = $1`,
      [LUZHNIKI_FOOTBALL_STAGE_MAP_KEY],
    );
    return buildLabeledSeatIndex(parseLayoutSeats(r.rows[0]?.layout_json ?? {}));
  } catch {
    return buildLabeledSeatIndex([]);
  }
}

async function main() {
  const repertoireId = process.env.REPERTOIRE_ID?.trim();
  if (!repertoireId) throw new Error('REPERTOIRE_ID обязателен');

  const coordsPath = path.join(repoRoot, 'luzhniki.txt');
  const ticketsPath = path.join(repoRoot, 'tickets.json');
  if (!fs.existsSync(ticketsPath)) throw new Error(`Нет ${ticketsPath}`);

  const coords = JSON.parse(fs.readFileSync(coordsPath, 'utf8'));
  const tickets = JSON.parse(fs.readFileSync(ticketsPath, 'utf8'));
  const w = Number(coords.width) || 11413;
  const h = Number(coords.height) || 9676;

  const pbilet = extractPbiletTicketsSeatGeodesy(tickets, w, h);
  const layoutIndex = await loadLayoutSeatIndex();
  const { payload } = await getPublicOffersForRepertoire(repertoireId, { forceRefresh: true });
  const offers = Array.isArray(payload?.ResultData) ? payload.ResultData : [];

  const offerByNorm = new Map();
  for (const o of offers) {
    const norm = normalizeSectorLabel(o.Sector);
    if (!norm) continue;
    if (!offerByNorm.has(norm)) offerByNorm.set(norm, []);
    offerByNorm.get(norm).push(o);
  }

  const circles = [];
  const sectorStats = [];
  const skipped = [];

  for (const [norm, sectorOffers] of offerByNorm) {
    const sectorPb = pbilet.filter((s) => normalizeSectorLabel(s.sector) === norm);
    const label = canonicalSectorLabel(pbilet, norm, sectorOffers[0]?.Sector);
    const keys = new Set();
    let fromTickets = 0;
    let fromOffers = 0;
    let fromLayout = 0;

    if (sectorPb.length < 2) {
      for (const o of sectorOffers) {
        const row = String(o.Row ?? '');
        const list = Array.isArray(o.SeatList) ? o.SeatList.map(String) : [];
        for (const seat of list) {
          if (!seat.trim()) continue;
          const key = strictSeatKey(label, row, seat);
          if (keys.has(key)) continue;
          const hit = lookupLabeledSeat(layoutIndex, o.Sector ?? label, row, seat);
          if (!hit) continue;
          keys.add(key);
          fromLayout += 1;
          circles.push({
            sector: label,
            row,
            seat,
            xPct: hit.xPct,
            yPct: hit.yPct,
            source: 'layout-grid',
          });
        }
      }
      if (fromLayout > 0) {
        sectorStats.push({ norm, label, fromTickets: 0, fromOffers: 0, fromLayout, total: fromLayout });
        continue;
      }
      skipped.push({
        norm,
        reason: 'no-tickets-rows',
        offerSeats: sectorOffers.reduce((n, o) => n + (o.SeatList?.length || 0), 0),
      });
      continue;
    }

    for (const s of sectorPb) {
      const key = strictSeatKey(label, s.row, s.seat);
      if (keys.has(key)) continue;
      keys.add(key);
      fromTickets += 1;
      circles.push({
        sector: label,
        row: s.row,
        seat: s.seat,
        xPct: s.xPct,
        yPct: s.yPct,
        source: 'tickets',
      });
    }

    for (const o of sectorOffers) {
      const row = String(o.Row ?? '');
      const list = Array.isArray(o.SeatList) ? o.SeatList.map(String) : [];
      for (const seat of list) {
        if (!seat.trim()) continue;
        const key = strictSeatKey(label, row, seat);
        if (keys.has(key)) continue;
        const hit = interpolatePbiletSeatGeodesy(pbilet, label, row, seat);
        if (!hit) continue;
        keys.add(key);
        fromOffers += 1;
        circles.push({
          sector: label,
          row,
          seat,
          xPct: hit.xPct,
          yPct: hit.yPct,
          source: 'live-offer',
        });
      }
    }

    sectorStats.push({
      norm,
      label,
      fromTickets,
      fromOffers,
      fromLayout: 0,
      total: fromTickets + fromOffers,
    });
  }

  sectorStats.sort((a, b) => b.total - a.total);

  const circleXml = circles
    .map((s) => {
      const cx = (s.xPct / 100) * w;
      const cy = (s.yPct / 100) * h;
      const extra =
        s.source === 'live-offer'
          ? 'data-source="live-offer"'
          : s.source === 'layout-grid'
            ? 'data-source="layout-grid"'
            : '';
      return pilotSeatCircleMarkup(s.sector, s.row, s.seat, cx, cy, w, h, extra);
    })
    .join('');

  const svgMarkup = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <g id="${LUZHNIKI_PILOT_SEATS_LAYER_ID}" fill="none">${circleXml}</g>
</svg>`;

  fs.mkdirSync(outDir, { recursive: true });
  const bundle = {
    hallWidth: w,
    hallHeight: h,
    source: 'stadium-pilot-all-offer-sectors',
    repertoireId,
    builtAt: new Date().toISOString(),
    svgMarkup,
    sectorCount: sectorStats.length,
    circleCount: circles.length,
    sectorStats,
    skipped,
  };

  fs.writeFileSync(bundlePath, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');
  fs.writeFileSync(
    path.join(outDir, 'sector-luzhniki-stadium-pilot.svg'),
    svgMarkup,
    'utf8',
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        bundlePath,
        circleCount: circles.length,
        sectorCount: sectorStats.length,
        skippedCount: skipped.length,
        topSectors: sectorStats.slice(0, 8),
        next: 'npm run apply:luzhniki-sector-pilot -- --bundle data/luzhniki-geodesy/hand/bundle-luzhniki-stadium-pilot.json',
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
