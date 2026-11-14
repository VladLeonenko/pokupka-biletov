/**
 * Редактор мест — Большой Московский цирк, Манеж.
 * hallApi: big-circus-hall-seats
 */

import { createTheaterHallSeatEditorRouter } from '../utils/createTheaterHallSeatEditorRouter.js';

const STAGE_ID = process.env.BIG_CIRCUS_STAGE_EXTERNAL_ID?.trim() || '656b3e2f3bd226003014fde6';

export default createTheaterHallSeatEditorRouter({
  stageId: STAGE_ID,
  bundleRelPath: 'backend/data/big-circus/hand/big-circus-manezh-seats.bundle.json',
  svgPublicPath: '/hall-maps/big-circus-manezh.svg',
  enrichedPublicFileName: 'big-circus-manezh-enriched.svg',
  defaultHallW: 2167,
  defaultHallH: 2166,
  editorMode: 'big-circus-luzhniki-editor',
  seedHint: 'npm run seed:big-circus-stage-map',
});
