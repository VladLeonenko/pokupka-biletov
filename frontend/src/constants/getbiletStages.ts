/**
 * Сцена GetBilet: основной зал МХТ им. А. П. Чехова (как в кэше каталога / ticket DB).
 * Векторная схема: public/hall-maps/mht-chekhov-osnovnoy-zal-native.svg
 */
export const MHT_CHEKHOV_MAIN_STAGE_ID = '639c4a4cd6cfc5004d20dcfb';

export const MHT_MAIN_HALL_SCHEME_SVG_PATH = '/hall-maps/mht-chekhov-osnovnoy-zal-native.svg';

export function isMhtChekhovMainHallStage(stageId: string | null | undefined): boolean {
  return Boolean(stageId?.trim() && stageId.trim() === MHT_CHEKHOV_MAIN_STAGE_ID);
}
