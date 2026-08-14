/**
 * Редактор мест МХТ им. Чехова (основной зал) — тот же UI, что Лужники/Вахтангов.
 * hallApi: mht-chekhov-hall-seats
 */

import { createTheaterHallSeatEditorRouter } from '../utils/createTheaterHallSeatEditorRouter.js';

const STAGE_ID = process.env.MHT_STAGE_EXTERNAL_ID?.trim() || '603ad33813cd03003015d811';

export default createTheaterHallSeatEditorRouter({
  stageId: STAGE_ID,
  stageIdAliases: [STAGE_ID, '603ad33813cd03003015d811', '639c4a4cd6cfc5004d20dcfb'],
  bundleRelPath: 'backend/data/mht-geodesy/hand/mht-chekhov-main-hall-seats.bundle.json',
  svgPublicPath: '/hall-maps/mht-chekhov-osnovnoy-zal-native.svg',
  enrichedPublicFileName: 'mht-chekhov-main-hall-enriched.svg',
  defaultHallW: 822,
  defaultHallH: 770,
  editorMode: 'mht-chekhov-luzhniki-editor',
  seedHint: 'npm run seed:mht-stage-map',
});
