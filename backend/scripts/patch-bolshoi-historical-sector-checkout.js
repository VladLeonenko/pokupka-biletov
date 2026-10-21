#!/usr/bin/env node
/**
 * Включает hallPreviewSectorCheckout на bolshoi-historical-stage (и опционально new-stage).
 * Не трогает SVG/seats — только флаги layout_json.
 *
 *   node scripts/patch-bolshoi-historical-sector-checkout.js
 *   PATCH_NEW_STAGE=1 node scripts/patch-bolshoi-historical-sector-checkout.js
 */
import ticketPool from '../ticketDb.js';

const HISTORICAL = process.env.BOLSHOI_HISTORICAL_STAGE_EXTERNAL_ID?.trim() || 'bolshoi-historical-stage';
const NEW_STAGE = process.env.BOLSHOI_NEW_STAGE_EXTERNAL_ID?.trim() || 'bolshoi-new-stage';
const patchNew = process.env.PATCH_NEW_STAGE === '1' || process.env.PATCH_NEW_STAGE === 'true';

async function patchStage(stageId) {
  const r = await ticketPool.query(
    `SELECT layout_json FROM getbilet_stage_maps WHERE stage_external_id = $1`,
    [stageId],
  );
  const lj = r.rows[0]?.layout_json;
  if (!lj || typeof lj !== 'object') {
    console.warn(`[patch] no layout for ${stageId}`);
    return false;
  }
  lj.hallPreviewSectorCheckout = true;
  lj.seatSelectionDisabled = true;
  lj.hideSeatList = true;
  if (!lj.categoryCheckoutDefaults || typeof lj.categoryCheckoutDefaults !== 'object') {
    lj.categoryCheckoutDefaults = {
      previewImageUrl: '/hall-maps/bolshoi-views/view-parter-a.jpg',
    };
  }
  if (lj.sectorMode && typeof lj.sectorMode === 'object') {
    lj.sectorMode.enabled = true;
  }
  await ticketPool.query(
    `UPDATE getbilet_stage_maps SET layout_json = $1::jsonb, updated_at = NOW() WHERE stage_external_id = $2`,
    [JSON.stringify(lj), stageId],
  );
  const secs = Array.isArray(lj.sectorMode?.sectors) ? lj.sectorMode.sectors.length : 0;
  console.log(
    JSON.stringify({
      patched: stageId,
      hallPreviewSectorCheckout: true,
      seatSelectionDisabled: true,
      hideSeatList: true,
      sectorCount: secs,
    }),
  );
  return true;
}

async function main() {
  await patchStage(HISTORICAL);
  if (patchNew) await patchStage(NEW_STAGE);
}

main()
  .then(async () => {
    await ticketPool.end();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    try {
      await ticketPool.end();
    } catch {
      /* ignore */
    }
    process.exit(1);
  });
