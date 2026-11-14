/**
 * Редактор мест — Театр Наций, Малая сцена.
 * hallApi: nations-small-hall-seats
 */

import { createTheaterHallSeatEditorRouter } from '../utils/createTheaterHallSeatEditorRouter.js';

const STAGE_ID = process.env.NATIONS_SMALL_STAGE_EXTERNAL_ID?.trim() || '6052f80413cd03003015deb6';

export default createTheaterHallSeatEditorRouter({
  stageId: STAGE_ID,
  bundleRelPath: 'backend/data/theatre-nations/hand/nations-small-stage-seats.bundle.json',
  svgPublicPath: '/hall-maps/nations-small-stage.svg',
  enrichedPublicFileName: 'nations-small-stage-enriched.svg',
  defaultHallW: 520,
  defaultHallH: 190,
  editorMode: 'nations-small-luzhniki-editor',
  seedHint: 'npm run seed:nations-small-stage-map',
});
