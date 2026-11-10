/**
 * Сцена GetBilet: основная сцена МХТ им. А. П. Чехова.
 * `639c4a4c…` — legacy id сида схемы (алиас).
 */
export const MHT_CHEKHOV_MAIN_STAGE_ID = '603ad33813cd03003015d811';
export const MHT_CHEKHOV_MAIN_STAGE_ID_ALIASES = [
  MHT_CHEKHOV_MAIN_STAGE_ID,
  '639c4a4cd6cfc5004d20dcfb',
] as const;

export function isMhtChekhovMainStageId(stageId: string | null | undefined): boolean {
  const s = String(stageId || '').trim();
  if (!s) return false;
  return (MHT_CHEKHOV_MAIN_STAGE_ID_ALIASES as readonly string[]).includes(s);
}
