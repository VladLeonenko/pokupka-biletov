#!/usr/bin/env node
/**
 * Аудит sellable: доля мест вне bbox сектора из tickets.json.
 * node scripts/audit-luzhniki-sellable-bbox.js [repertoireId]
 */
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getPublicOffersForRepertoire } from '../services/getbiletOffersPublic.js';
import { buildSellableSeatGeodesyPbiletAccurate } from '../utils/luzhnikiPbiletSellableGeodesy.js';
import { loadProdLayoutSeats } from '../utils/luzhnikiProdLayoutSeats.js';
import { getSectorBboxPct } from '../utils/luzhnikiSectorBbox.js';
import { normalizeSectorLabel } from '../utils/ticketHallSectorNormalize.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const repertoireId = process.argv[2]?.trim() || '6a05d17b46a4d000309ecf4e';
const W = 11413;
const H = 9676;

const ticketsPath = path.join(__dirname, '../../tickets.json');
const ticketsPayload = JSON.parse(fs.readFileSync(ticketsPath, 'utf8'));
const { seats: layoutSeats } = loadProdLayoutSeats();
const layout = { geodesy: { hallWidth: W, hallHeight: H }, seats: layoutSeats };

const { payload } = await getPublicOffersForRepertoire(repertoireId, { forceRefresh: false });
const offers = Array.isArray(payload?.ResultData) ? payload.ResultData : [];
const geodesy = buildSellableSeatGeodesyPbiletAccurate(ticketsPayload, offers, layout);

let outside = 0;
const samples = [];

for (const s of geodesy.seats) {
  const bbox = getSectorBboxPct(ticketsPayload, s.sector, W, H);
  if (!bbox) continue;
  const ok =
    s.xPct >= bbox.minXPct &&
    s.xPct <= bbox.maxXPct &&
    s.yPct >= bbox.minYPct &&
    s.yPct <= bbox.maxYPct;
  if (!ok) {
    outside += 1;
    if (samples.length < 20) {
      samples.push({
        sector: s.sector,
        row: s.row,
        seat: s.seat,
        xPct: s.xPct,
        yPct: s.yPct,
        bbox,
        geodesySource: s.geodesySource,
      });
    }
  }
}

console.log(
  JSON.stringify(
    {
      repertoireId,
      offers: offers.length,
      sellable: geodesy.seats.length,
      matched: geodesy.matched,
      unmatched: geodesy.unmatchedSamples?.length ?? 0,
      outsideBbox: outside,
      outsidePct: geodesy.seats.length
        ? Math.round((outside / geodesy.seats.length) * 1000) / 10
        : 0,
      samples,
    },
    null,
    2,
  ),
);

process.exit(outside > 0 ? 1 : 0);
