#!/usr/bin/env node
/**
 * Фото секторов Исторической сцены. Геометрию схемы не трогает.
 *   node scripts/patch-bolshoi-historical-view-photos.js
 */
import ticketPool from '../ticketDb.js';

const STAGE = process.env.BOLSHOI_HISTORICAL_STAGE_EXTERNAL_ID?.trim() || 'bolshoi-historical-stage';

const BY_ID = {
  parter_mid: '/hall-maps/bolshoi-views/view-parter.jpg',
  vip_parter: '/hall-maps/bolshoi-views/view-parter-vip.jpg',
  balkon3_left: '/hall-maps/bolshoi-views/view-balkon3.jpg',
};

async function main() {
  const r = await ticketPool.query(
    `SELECT layout_json FROM getbilet_stage_maps WHERE stage_external_id = $1`,
    [STAGE],
  );
  const lj = r.rows[0]?.layout_json;
  if (!lj || typeof lj !== 'object') throw new Error(`no layout for ${STAGE}`);
  const sectors = lj.sectorMode?.sectors;
  if (!Array.isArray(sectors)) throw new Error('no sectorMode.sectors');

  const changed = [];
  for (const sector of sectors) {
    const next = BY_ID[sector.id];
    if (!next || sector.previewImageUrl === next) continue;
    changed.push(`${sector.id}: ${sector.previewImageUrl} -> ${next}`);
    sector.previewImageUrl = next;
  }

  const icons = lj.sectorMode?.viewIcons;
  if (Array.isArray(icons)) {
    for (const icon of icons) {
      const isParter = icon.primarySectorId === 'parter_mid' || icon.id === 'view-parter';
      if (!isParter || icon.previewImageUrl === BY_ID.parter_mid) continue;
      changed.push(`icon ${icon.id}: ${icon.previewImageUrl} -> ${BY_ID.parter_mid}`);
      icon.previewImageUrl = BY_ID.parter_mid;
    }
  }

  if (!changed.length) {
    console.log('[patch-views] already set');
  } else {
    await ticketPool.query(
      `UPDATE getbilet_stage_maps SET layout_json = $1::jsonb, updated_at = NOW() WHERE stage_external_id = $2`,
      [JSON.stringify(lj), STAGE],
    );
    console.log(changed.join('\n'));
  }
  await ticketPool.end();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await ticketPool.end();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
