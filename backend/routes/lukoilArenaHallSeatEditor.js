/**
 * Редактор мест Лукойл Арена — тот же UI, что Лужники/Суперкубок.
 * 47k точек: без ?sector= только уже размеченные; серые точки сектора — ?sector=c115
 * hallApi: lukoil-arena-seats
 */

import { createTheaterHallSeatEditorRouter } from '../utils/createTheaterHallSeatEditorRouter.js';

const STAGE_ID =
  process.env.LUKOIL_ARENA_STAGE_EXTERNAL_ID?.trim() || '66f16a8c09a369003081a02f';

export default createTheaterHallSeatEditorRouter({
  stageId: STAGE_ID,
  stageIdAliases: [STAGE_ID],
  bundleRelPath: 'backend/data/lukoil-arena/hand/lukoil-arena-seats.bundle.json',
  svgPublicPath: '/hall-maps/lukoil-arena.svg',
  enrichedPublicFileName: 'lukoil-arena-enriched.svg',
  defaultHallW: 9951,
  defaultHallH: 8766,
  editorMode: 'lukoil-arena-stadium-editor',
  seedHint: 'схема уже в getbilet_stage_maps (pbilet layout 333)',
  stadiumSectorCloud: true,
  defaultHallKind: null,
});
