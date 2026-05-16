#!/usr/bin/env node
/**
 * Диагностика: сколько мест из GetBilet имеют координаты в layout_json.seats (pbilet).
 * node scripts/verify-offer-seat-geodesy.js [repertoireId]
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPublicOffersForRepertoire } from '../services/getbiletOffersPublic.js';
import { loadLuzhnikiFootballStageMapRow } from '../services/luzhnikiFootballStageMap.js';
import { buildSellableSeatGeodesy } from '../utils/hallSeatGeodesyMatch.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const repertoireId = process.argv[2]?.trim() || '6a05d17b46a4d000309ecf4e';

const { payload } = await getPublicOffersForRepertoire(repertoireId, { forceRefresh: true });
const offers = Array.isArray(payload?.ResultData) ? payload.ResultData : [];
const row = await loadLuzhnikiFootballStageMapRow();
const layout = row?.layout_json && typeof row.layout_json === 'object' ? row.layout_json : {};
const baseSeats = Array.isArray(layout.seats) ? layout.seats : [];
const diag = buildSellableSeatGeodesy(baseSeats, offers);

console.log(
  JSON.stringify(
    {
      repertoireId,
      layoutSeats: baseSeats.length,
      offers: offers.length,
      sellableSeats: diag.totalSellable,
      matched: diag.matched,
      unmatched: diag.totalSellable - diag.matched,
      matchPct:
        diag.totalSellable > 0
          ? Math.round((diag.matched / diag.totalSellable) * 1000) / 10
          : 0,
      unmatchedSamples: diag.unmatchedSamples,
    },
    null,
    2,
  ),
);

process.exit(diag.totalSellable > 0 && diag.matched > 0 ? 0 : 1);
