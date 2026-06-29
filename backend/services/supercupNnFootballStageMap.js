import ticketPool from '../ticketDb.js';
import { SUPERKUP_NN_STAGE_MAP_KEY } from '../utils/footballStadiumRepertoires.js';

export { SUPERKUP_NN_STAGE_MAP_KEY };

export async function loadSupercupNnFootballStageMapRow() {
  const r = await ticketPool.query(
    `SELECT stage_external_id, place_external_id, title, svg_markup, layout_json, external_plan_url
     FROM getbilet_stage_maps WHERE stage_external_id = $1`,
    [SUPERKUP_NN_STAGE_MAP_KEY],
  );
  return r.rows[0] || null;
}
