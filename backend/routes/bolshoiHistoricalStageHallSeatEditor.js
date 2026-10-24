/**
 * Редактор мест — Большой театр, Историческая сцена.
 * hallApi: bolshoi-historical-stage-seats
 */

import { createTheaterHallSeatEditorRouter } from '../utils/createTheaterHallSeatEditorRouter.js';

const STAGE_ID =
  process.env.BOLSHOI_HISTORICAL_STAGE_EXTERNAL_ID?.trim() || 'bolshoi-historical-stage';

export default createTheaterHallSeatEditorRouter({
  stageId: STAGE_ID,
  stageIdAliases: [STAGE_ID],
  bundleRelPath: 'backend/data/bolshoi-geodesy/hand/bolshoi-historical-stage-seats.bundle.json',
  svgPublicPath: '/hall-maps/bolshoi-historical-stage.svg',
  enrichedPublicFileName: 'bolshoi-historical-stage-enriched.svg',
  defaultHallW: 1500,
  defaultHallH: 1190,
  editorMode: 'bolshoi-historical-stage-editor',
  seedHint: 'npm run seed:bolshoi-historical-stage-map',
  defaultHallKind: 'theater',
  /** Save редактора не должен сбрасывать предзаказ по секторам. */
  forceHallPreviewSectorCheckout: true,
});
