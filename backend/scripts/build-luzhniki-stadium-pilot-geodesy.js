#!/usr/bin/env node
/**
 * Geodesy-круги (#luzhniki-pilot-seats) для Лужников.
 *
 * Режим full (по умолчанию): все сектора / ~77k мест (tickets strict + cloud grid по luzhniki.txt).
 * Режим offers: только сектора с live-офферами (старый пилот).
 *
 *   npm run build:luzhniki-stadium-pilot
 *   LUZHNIKI_PILOT_MODE=offers REPERTOIRE_ID=… npm run build:luzhniki-stadium-pilot
 *   npm run apply:luzhniki-sector-pilot -- --bundle data/luzhniki-geodesy/hand/bundle-luzhniki-stadium-pilot.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

import dotenv from 'dotenv';

import ticketPool from '../ticketDb.js';
import { getPublicOffersForRepertoire } from '../services/getbiletOffersPublic.js';
import { LUZHNIKI_FOOTBALL_STAGE_MAP_KEY } from '../services/luzhnikiFootballStageMap.js';
import { buildLabeledSeatIndex } from '../utils/hallSeatGeodesyMatch.js';
import {
  collectLayoutSectorPbiletSeats,
  countPbiletRowAnchors,
  extractPbiletTicketsSeatGeodesy,
  interpolatePbiletSeatGeodesy,
} from '../utils/luzhnikiPbiletGeodesyExtract.js';
import {
  applyLeftTribuneScale,
  layoutAnchorLookupRow,
  sectorAnchorPivot,
} from '../utils/luzhnikiPilotLayoutCalibrate.js';
import {
  LUZHNIKI_PILOT_SEATS_LAYER_ID,
  pilotSeatCircleMarkup,
} from '../utils/luzhnikiPilotSeatSvg.js';
import { buildFullStadiumLabeledSeats } from '../utils/luzhnikiStadiumFullGeodesy.js';
import {
  luzhnikiSectorLookupNorms,
  normalizeSectorLabel,
  strictSeatKey,
} from '../utils/ticketHallSectorNormalize.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const outDir = path.join(repoRoot, 'backend/data/luzhniki-geodesy/hand');
const bundlePath = path.join(outDir, 'bundle-luzhniki-stadium-pilot.json');

dotenv.config({ path: path.join(__dirname, '../.env') });

function canonicalSectorLabel(pbiletSeats, lookupNorms, offerSector) {
  for (const norm of lookupNorms) {
    const fromPb = pbiletSeats.find((s) => normalizeSectorLabel(s.sector) === norm)?.sector;
    if (fromPb) return fromPb;
  }
  return offerSector || lookupNorms[0] || '';
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

async function loadStageMapContext() {
  const r = await ticketPool.query(
    `SELECT layout_json, svg_markup FROM getbilet_stage_maps WHERE stage_external_id = $1`,
    [LUZHNIKI_FOOTBALL_STAGE_MAP_KEY],
  );
  let layout = r.rows[0]?.layout_json ?? {};
  if (typeof layout === 'string') layout = JSON.parse(layout);
  const svgMarkup = String(r.rows[0]?.svg_markup ?? '');
  return { layout, svgMarkup };
}

async function loadLayoutSeatIndex() {
  const { layout } = await loadStageMapContext();
  return buildLabeledSeatIndex(parseLayoutSeats(layout));
}

function filterPbiletForNorms(pbilet, lookupNorms) {
  const norms = new Set(lookupNorms.map((n) => normalizeSectorLabel(n)));
  return pbilet.filter((s) => norms.has(normalizeSectorLabel(s.sector)));
}

function resolveSectorPbiletAnchors(pbilet, layoutIndex, lookupNorms, label) {
  const fromTickets = filterPbiletForNorms(pbilet, lookupNorms).map((s) => ({
    ...s,
    sector: label || s.sector,
  }));
  if (countPbiletRowAnchors(fromTickets) >= 2) {
    return { anchors: fromTickets, mode: 'tickets' };
  }
  const fromLayout = collectLayoutSectorPbiletSeats(layoutIndex, lookupNorms, label);
  if (countPbiletRowAnchors(fromLayout) >= 2) {
    return { anchors: fromLayout, mode: 'layout-anchors' };
  }
  return { anchors: [], mode: 'none' };
}

function pushCircle(circles, keys, entry) {
  const key = strictSeatKey(entry.sector, entry.row, entry.seat);
  if (keys.has(key)) return false;
  keys.add(key);
  circles.push(entry);
  return true;
}

function addOfferSeatsFromPbilet({ circles, keys, anchors, label, norm, anchorMode, sectorOffers, stats }) {
  const pivot = sectorAnchorPivot(anchors);
  for (const o of sectorOffers) {
    const row = String(o.Row ?? '');
    const list = Array.isArray(o.SeatList) ? o.SeatList.map(String) : [];
    for (const seat of list) {
      if (!seat.trim()) continue;
      const lookupRow =
        anchorMode === 'layout-anchors' ? layoutAnchorLookupRow(norm, row) : row;
      const hit = interpolatePbiletSeatGeodesy(anchors, label, lookupRow, seat);
      if (!hit) continue;
      const scaled = applyLeftTribuneScale(norm, hit.xPct, hit.yPct, pivot, anchorMode);
      if (
        pushCircle(circles, keys, {
          sector: label,
          row,
          seat,
          xPct: scaled.xPct,
          yPct: scaled.yPct,
          source: 'live-offer',
        })
      ) {
        stats.fromOffers += 1;
      }
    }
  }
}

function circlesToSvgMarkup(circles, w, h) {
  const chunks = new Array(circles.length);
  for (let i = 0; i < circles.length; i += 1) {
    const s = circles[i];
    const cx = (s.xPct / 100) * w;
    const cy = (s.yPct / 100) * h;
    const extra = s.source ? `data-source="${s.source}"` : '';
    chunks[i] = pilotSeatCircleMarkup(s.sector, s.row, s.seat, cx, cy, w, h, extra);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <g id="${LUZHNIKI_PILOT_SEATS_LAYER_ID}" fill="none">${chunks.join('')}</g>
</svg>`;
}

async function buildOffersMode(repertoireId) {
  const coords = JSON.parse(fs.readFileSync(path.join(repoRoot, 'luzhniki.txt'), 'utf8'));
  const tickets = JSON.parse(fs.readFileSync(path.join(repoRoot, 'tickets.json'), 'utf8'));
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
    const lookupNorms = luzhnikiSectorLookupNorms(norm);
    const label = canonicalSectorLabel(pbilet, lookupNorms, sectorOffers[0]?.Sector);
    const { anchors, mode } = resolveSectorPbiletAnchors(pbilet, layoutIndex, lookupNorms, label);
    const keys = new Set();
    const stats = { fromTickets: 0, fromOffers: 0, anchorMode: mode };

    if (mode === 'none') {
      skipped.push({
        norm,
        lookupNorms,
        reason: 'no-row-anchors',
        offerSeats: sectorOffers.reduce((n, o) => n + (o.SeatList?.length || 0), 0),
      });
      continue;
    }

    if (mode === 'tickets') {
      for (const s of anchors) {
        if (
          pushCircle(circles, keys, {
            sector: label,
            row: s.row,
            seat: s.seat,
            xPct: s.xPct,
            yPct: s.yPct,
            source: 'tickets',
          })
        ) {
          stats.fromTickets += 1;
        }
      }
    }

    addOfferSeatsFromPbilet({
      circles,
      keys,
      anchors,
      label,
      norm,
      anchorMode: mode,
      sectorOffers,
      stats,
    });

    const total = stats.fromTickets + stats.fromOffers;
    if (total > 0) {
      sectorStats.push({ norm, label, lookupNorms, ...stats, total });
    } else {
      skipped.push({
        norm,
        lookupNorms,
        reason: 'no-interpolated-offers',
        anchorRows: countPbiletRowAnchors(anchors),
        offerSeats: sectorOffers.reduce((n, o) => n + (o.SeatList?.length || 0), 0),
      });
    }
  }

  sectorStats.sort((a, b) => b.total - a.total);
  return {
    mode: 'offers',
    repertoireId,
    w,
    h,
    circles,
    sectorStats,
    skipped,
    fullStats: null,
  };
}

async function enrichFullCirclesWithOffers(circles, tickets, w, h, repertoireId) {
  if (!repertoireId) return { added: 0, skipped: [] };

  const pbilet = extractPbiletTicketsSeatGeodesy(tickets, w, h);
  const layoutIndex = await loadLayoutSeatIndex();
  const { payload } = await getPublicOffersForRepertoire(repertoireId, { forceRefresh: true });
  const offers = Array.isArray(payload?.ResultData) ? payload.ResultData : [];
  const keys = new Set(circles.map((c) => strictSeatKey(c.sector, c.row, c.seat)));
  let added = 0;
  const skipped = [];

  const offerByNorm = new Map();
  for (const o of offers) {
    const norm = normalizeSectorLabel(o.Sector);
    if (!norm) continue;
    if (!offerByNorm.has(norm)) offerByNorm.set(norm, []);
    offerByNorm.get(norm).push(o);
  }

  for (const [norm, sectorOffers] of offerByNorm) {
    const lookupNorms = luzhnikiSectorLookupNorms(norm);
    const label = canonicalSectorLabel(pbilet, lookupNorms, sectorOffers[0]?.Sector);
    const { anchors, mode } = resolveSectorPbiletAnchors(pbilet, layoutIndex, lookupNorms, label);
    if (mode === 'none') {
      skipped.push({ norm, reason: 'no-row-anchors-enrich' });
      continue;
    }
    const stats = { fromOffers: 0 };
    addOfferSeatsFromPbilet({
      circles,
      keys,
      anchors,
      label,
      norm,
      anchorMode: mode,
      sectorOffers,
      stats,
    });
    added += stats.fromOffers;
  }

  return { added, skipped };
}

async function buildFullMode() {
  const coords = JSON.parse(fs.readFileSync(path.join(repoRoot, 'luzhniki.txt'), 'utf8'));
  const tickets = JSON.parse(fs.readFileSync(path.join(repoRoot, 'tickets.json'), 'utf8'));
  const { svgMarkup } = await loadStageMapContext();
  const repertoireId =
    process.env.REPERTOIRE_ID?.trim() || '6a05d17b46a4d000309ecf4e';

  const { seats, hallWidth: w, hallHeight: h, stats } = buildFullStadiumLabeledSeats({
    ticketsPayload: tickets,
    coordinatesPayload: coords,
    svgMarkup,
  });

  const circles = seats.map((s) => ({
    sector: s.sector,
    row: s.row,
    seat: s.seat,
    xPct: s.xPct,
    yPct: s.yPct,
    source:
      s.geodesySource === 'strict' ? 'strict' : s.geodesySource === 'cloudGrid' ? 'cloudGrid' : 'fieldGrid',
  }));

  const enrich = await enrichFullCirclesWithOffers(circles, tickets, w, h, repertoireId);

  return {
    mode: 'full',
    repertoireId,
    w,
    h,
    circles,
    sectorStats: [],
    skipped: enrich.skipped,
    fullStats: { ...stats, offerEnriched: enrich.added },
  };
}

async function main() {
  const pilotMode = (process.env.LUZHNIKI_PILOT_MODE?.trim() || 'full').toLowerCase();
  const repertoireId = process.env.REPERTOIRE_ID?.trim();

  if (pilotMode === 'offers' && !repertoireId) {
    throw new Error('REPERTOIRE_ID обязателен для LUZHNIKI_PILOT_MODE=offers');
  }

  const built =
    pilotMode === 'offers' ? await buildOffersMode(repertoireId) : await buildFullMode();

  const svgMarkup = circlesToSvgMarkup(built.circles, built.w, built.h);

  fs.mkdirSync(outDir, { recursive: true });
  const bundle = {
    hallWidth: built.w,
    hallHeight: built.h,
    mode: built.mode,
    source: built.mode === 'full' ? 'stadium-cloud-grid+tickets' : 'stadium-pilot-d230-mapping',
    repertoireId: built.repertoireId,
    builtAt: new Date().toISOString(),
    svgMarkup,
    seats:
      built.mode === 'full'
        ? built.circles.map((c) => ({
            sector: c.sector,
            row: c.row,
            seat: c.seat,
            xPct: c.xPct,
            yPct: c.yPct,
            geodesySource:
              c.source === 'strict'
                ? 'strict'
                : c.source === 'cloudGrid'
                  ? 'cloudGrid'
                  : c.source === 'live-offer'
                    ? 'svgCircle'
                    : 'fieldGrid',
          }))
        : undefined,
    sectorCount:
      built.mode === 'full'
        ? built.fullStats?.sectorCount ?? new Set(built.circles.map((c) => c.sector)).size
        : built.sectorStats.length,
    circleCount: built.circles.length,
    sectorStats: built.sectorStats,
    skipped: built.skipped,
    fullStats: built.fullStats,
    luzhnikiPilotFullStadium: built.mode === 'full',
  };

  const seatsSidecarPath = path.join(outDir, 'bundle-luzhniki-stadium-pilot-seats.json');
  if (built.mode === 'full' && Array.isArray(bundle.seats)) {
    fs.writeFileSync(seatsSidecarPath, `${JSON.stringify(bundle.seats)}\n`, 'utf8');
    delete bundle.seats;
  }

  fs.writeFileSync(bundlePath, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outDir, 'sector-luzhniki-stadium-pilot.svg'), svgMarkup, 'utf8');

  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: built.mode,
        circleCount: built.circles.length,
        sectorCount: bundle.sectorCount,
        skippedCount: built.skipped.length,
        fullStats: built.fullStats,
        bundlePath,
      },
      null,
      2,
    ),
  );

  await ticketPool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
