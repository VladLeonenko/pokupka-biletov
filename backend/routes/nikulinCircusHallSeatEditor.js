/**
 * Редактор мест — Цирк Никулина, Основная сцена.
 * hallApi: nikulin-circus-hall-seats
 */

import { createTheaterHallSeatEditorRouter } from '../utils/createTheaterHallSeatEditorRouter.js';

const STAGE_ID = process.env.NIKULIN_CIRCUS_STAGE_EXTERNAL_ID?.trim() || '5f4d99279a3e0700303116c6';

export default createTheaterHallSeatEditorRouter({
  stageId: STAGE_ID,
  bundleRelPath: 'backend/data/nikulin-circus/hand/nikulin-circus-seats.bundle.json',
  svgPublicPath: '/hall-maps/nikulin-circus.svg',
  enrichedPublicFileName: 'nikulin-circus-enriched.svg',
  defaultHallW: 1780,
  defaultHallH: 1595,
  editorMode: 'nikulin-circus-luzhniki-editor',
  seedHint: 'npm run seed:nikulin-circus-stage-map',
});
