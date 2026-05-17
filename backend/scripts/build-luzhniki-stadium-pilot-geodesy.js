#!/usr/bin/env node
/**
 * Geodesy-круги (#luzhniki-pilot-seats) — mapping как D230 для всех секторов с офферами.
 *
 * tickets.json r[].s[] + interpolatePbiletSeatGeodesy;
 * сектора без r[] → якоря из layout.seats; vipc138 ↔ c138.
 *
 *   REPERTOIRE_ID=6a05d17b46a4d000309ecf4e npm run build:luzhniki-stadium-pilot
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
  LUZHNIKI_PILOT_SEATS_LAYER_ID,
  pilotSeatCircleMarkup,
} from '../utils/luzhnikiPilotSeatSvg.js';
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

async function loadLayoutSeatIndex() {
  const r = await ticketPool.query(
    `SELECT layout_json FROM getbilet_stage_maps WHERE stage_external_id = $1`,
    [LUZHNIKI_FOOTBALL_STAGE_MAP_KEY],
  );
  let layout = r.rows[0]?.layout_json ?? {};
  if (typeof layout === 'string') layout = JSON.parse(layout);
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

function addOfferSeatsFromPbilet({ circles, keys, anchors, label, sectorOffers, stats }) {
  for (const o of sectorOffers) {
    const row = String(o.Row ?? '');
    const list = Array.isArray(o.SeatList) ? o.SeatList.map(String) : [];
    for (const seat of list) {
      if (!seat.trim()) continue;
      const hit = interpolatePbiletSeatGeodesy(anchors, label, row, seat);
      if (!hit) continue;
      if (
        pushCircle(circles, keys, {
          sector: label,
          row,
          seat,
          xPct: hit.xPct,
          yPct: hit.yPct,
          source: 'live-offer',
        })
      ) {
        stats.fromOffers += 1;
      }
    }
  }
}

async function main() {
  const repertoireId = process.env.REPERTOIRE_ID?.trim();
  if (!repertoireId) throw new Error('REPERTOIRE_ID обязателен');

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

    addOfferSeatsFromPbilet({ circles, keys, anchors, label, sectorOffers, stats });

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

  const circleXml = circles
    .map((s) => {
      const cx = (s.xPct / 100) * w;
      const cy = (s.yPct / 100) * h;
      const extra = s.source === 'live-offer' ? 'data-source="live-offer"' : '';
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
    source: 'stadium-pilot-d230-mapping',
    repertoireId,
    builtAt: new Date().toISOString(),
    svgMarkup,
    sectorCount: sectorStats.length,
    circleCount: circles.length,
    sectorStats,
    skipped,
  };

  fs.writeFileSync(bundlePath, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outDir, 'sector-luzhniki-stadium-pilot.svg'), svgMarkup, 'utf8');

  console.log(
    JSON.stringify(
      {
        ok: true,
        circleCount: circles.length,
        sectorCount: sectorStats.length,
        skippedCount: skipped.length,
        a101: sectorStats.find((s) => s.norm === 'a101'),
        vipc138: sectorStats.find((s) => s.norm === 'vipc138'),
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
