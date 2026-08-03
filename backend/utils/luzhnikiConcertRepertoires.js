/**
 * Репертуары с концертной раскладкой Лужников (фан-зона/танцпол на поле).
 * Схема: getbilet_stage_maps.luzhniki-concert (геодезия/PNG как luzhniki-football).
 */

export const LUZHNIKI_CONCERT_STAGE_MAP_KEY = 'luzhniki-concert';

const DEFAULT_LUZHNIKI_CONCERT_REPERTOIRE_IDS = new Set([
  '69ac1c5246a4d000309ecd5c', // Баста — Guf
  'basta-guf',
]);

function parseEnvRepertoireIds() {
  const raw = process.env.GETBILET_LUZHNIKI_CONCERT_REPERTOIRE_IDS?.trim();
  if (!raw) return new Set();
  return new Set(
    raw
      .split(/[,;\s]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** @param {string | null | undefined} repertoireId */
export function isLuzhnikiConcertRepertoire(repertoireId) {
  const id = String(repertoireId || '').trim().toLowerCase();
  if (!id) return false;
  if (DEFAULT_LUZHNIKI_CONCERT_REPERTOIRE_IDS.has(id)) return true;
  return parseEnvRepertoireIds().has(id);
}

/**
 * @param {string | null | undefined} repertoireId
 * @returns {string | null}
 */
export function luzhnikiConcertStageMapKeyForRepertoire(repertoireId) {
  return isLuzhnikiConcertRepertoire(repertoireId) ? LUZHNIKI_CONCERT_STAGE_MAP_KEY : null;
}
