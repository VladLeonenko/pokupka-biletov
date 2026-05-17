#!/usr/bin/env node
/**
 * Патч координат в getbilet_stage_maps.layout_json.seats (pbilet-интерполяция для live-offer).
 *
 *   cd backend && node scripts/patch-luzhniki-layout-seat-coords.js [repertoireId]
 *   cd backend && node scripts/patch-luzhniki-layout-seat-coords.js --write-db [repertoireId]
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import ticketPool from '../ticketDb.js';
import { getPublicOffersForRepertoire } from '../services/getbiletOffersPublic.js';
import {
  adaptLuzhnikiStageMapForLiveOffers,
  loadLuzhnikiFootballStageMapRow,
  LUZHNIKI_FOOTBALL_STAGE_MAP_KEY,
} from '../services/luzhnikiFootballStageMap.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const writeDb = process.argv.includes('--write-db');
const repertoireId =
  process.argv.filter((a) => !a.startsWith('-') && !a.endsWith('.js')).pop()?.trim() ||
  '6a05d17b46a4d000309ecf4e';

const { payload } = await getPublicOffersForRepertoire(repertoireId, { forceRefresh: false });
const offers = Array.isArray(payload?.ResultData) ? payload.ResultData : [];
const row = await loadLuzhnikiFootballStageMapRow();
if (!row) {
  console.error('Нет строки', LUZHNIKI_FOOTBALL_STAGE_MAP_KEY);
  process.exit(1);
}

const adapted = adaptLuzhnikiStageMapForLiveOffers(row, offers);
const layout = adapted.layout_json;
const sample = (layout.sellableSeats || []).filter(
  (s) => /243/i.test(String(s.sector)) && String(s.row) === '35' && ['8', '9'].includes(String(s.seat)),
);

console.log(
  JSON.stringify(
    {
      repertoireId,
      offers: offers.length,
      sellable: layout.sellableSeats?.length ?? 0,
      patched: layout.offerSeatGeodesy?.layoutSeatsPatched,
      c243r35: sample,
    },
    null,
    2,
  ),
);

if (writeDb) {
  await ticketPool.query(
    `UPDATE getbilet_stage_maps SET layout_json = $2::jsonb, updated_at = NOW() WHERE stage_external_id = $1`,
    [LUZHNIKI_FOOTBALL_STAGE_MAP_KEY, JSON.stringify(layout)],
  );
  console.log('OK: layout_json обновлён в БД');
}

await ticketPool.end();
process.exit(sample.length >= 2 && sample.every((s) => s.yPct > 1) ? 0 : 1);
