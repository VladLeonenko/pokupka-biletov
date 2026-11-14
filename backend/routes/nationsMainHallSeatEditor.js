/**
 * Редактор мест — Театр Наций, Основная сцена.
 * hallApi: nations-main-hall-seats
 */

import { createTheaterHallSeatEditorRouter } from '../utils/createTheaterHallSeatEditorRouter.js';

const STAGE_ID = process.env.NATIONS_MAIN_STAGE_EXTERNAL_ID?.trim() || '6052f78013cd03003015deb0';

export default createTheaterHallSeatEditorRouter({
  stageId: STAGE_ID,
  bundleRelPath: 'backend/data/theatre-nations/hand/nations-main-stage-seats.bundle.json',
  svgPublicPath: '/hall-maps/nations-main-stage.svg',
  enrichedPublicFileName: 'nations-main-stage-enriched.svg',
  defaultHallW: 1200,
  defaultHallH: 1040,
  editorMode: 'nations-main-luzhniki-editor',
  seedHint: 'npm run seed:nations-main-stage-map',
});
