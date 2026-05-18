#!/usr/bin/env node
/**
 * Диагностика A101 на сервере (без curl): код, облако, sellable для суперфинала.
 *   cd backend && node scripts/diag-luzhniki-map-a101.js
 *   GETBILET_LUZHNIKI_REPERTOIRE_ID=... node scripts/diag-luzhniki-map-a101.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import { getPublicOffersForRepertoire } from '../services/getbiletOffersPublic.js';
import {
  adaptLuzhnikiStageMapForLiveOffers,
  loadLuzhnikiFootballStageMapRow,
} from '../services/luzhnikiFootballStageMap.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

dotenv.config({ path: path.join(__dirname, '../.env') });

const REPERTOIRE_ID =
  process.env.GETBILET_LUZHNIKI_REPERTOIRE_ID?.trim() || '6a05d17b46a4d000309ecf4e';

function parseLayout(row) {
  let layout = row?.layout_json;
  if (typeof layout === 'string') {
    try {
      layout = JSON.parse(layout);
    } catch {
      layout = {};
    }
  }
  return layout && typeof layout === 'object' ? layout : {};
}

async function main() {
  const gitHead = (() => {
    try {
      return fs.readFileSync(path.join(repoRoot, '.git', 'HEAD'), 'utf8').trim();
    } catch {
      return 'no-git';
    }
  })();

  const hasCloudFile = fs.existsSync(path.join(repoRoot, 'luzhniki.txt'));
  const hasCloudRowSeat = fs.existsSync(
    path.join(repoRoot, 'backend/utils/luzhnikiSectorCloudRowSeat.js'),
  );
  const sellableHasEnsure = fs.readFileSync(
    path.join(repoRoot, 'backend/utils/luzhnikiPbiletSellableGeodesy.js'),
    'utf8',
  ).includes('ensureLuzhnikiLayoutCloud');

  console.log(
    JSON.stringify(
      {
        repoRoot,
        gitHead,
        hasCloudFile,
        hasCloudRowSeat,
        sellableHasEnsure,
        repertoireId: REPERTOIRE_ID,
      },
      null,
      2,
    ),
  );

  const row = await loadLuzhnikiFootballStageMapRow();
  if (!row) {
    console.error(JSON.stringify({ ok: false, error: 'no_luzhniki_football_row' }));
    process.exit(1);
  }

  const { payload } = await getPublicOffersForRepertoire(REPERTOIRE_ID);
  const offerRows = Array.isArray(payload?.ResultData) ? payload.ResultData : [];
  const a101Offers = offerRows.filter((o) => /a101/i.test(String(o.Sector ?? '')));

  const adapted = adaptLuzhnikiStageMapForLiveOffers(row, offerRows);
  const layout = parseLayout(adapted);
  const geo = layout.offerSeatGeodesy ?? {};
  const cloudLen = Array.isArray(layout.allSeatCoordinates) ? layout.allSeatCoordinates.length : 0;
  const sellable = Array.isArray(layout.sellableSeats) ? layout.sellableSeats : [];
  const a101Sellable = sellable.filter((s) => /a101/i.test(String(s.sector ?? '')));
  const row11 = a101Sellable.filter((s) => String(s.row) === '11');

  const sources = {};
  for (const s of a101Sellable) {
    const src = String(s.geodesySource ?? 'unknown');
    sources[src] = (sources[src] ?? 0) + 1;
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        offerRows: offerRows.length,
        a101Offers: a101Offers.length,
        cloudDotCount: cloudLen,
        offerSeatGeodesy: geo,
        a101SellableCount: a101Sellable.length,
        a101Sources: sources,
        row11Sample: row11.slice(0, 5),
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
