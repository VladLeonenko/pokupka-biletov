/**
 * Репертуары, для которых схема зала всегда берётся из getbilet_stage_maps.luzhniki-football
 * (GetBilet StageId в API — другой mongo id).
 */

import { LUZHNIKI_FOOTBALL_STAGE_MAP_KEY } from '../services/luzhnikiFootballStageMap.js';

const DEFAULT_LUZHNIKI_FOOTBALL_REPERTOIRE_IDS = new Set([
  '6a05d17b46a4d000309ecf4e', // Суперфинал Кубка России — Лужники
]);

function parseEnvRepertoireIds() {
  const raw = process.env.GETBILET_LUZHNIKI_FOOTBALL_REPERTOIRE_IDS?.trim();
  if (!raw) return new Set();
  return new Set(
    raw
      .split(/[,;\s]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** @param {string | null | undefined} repertoireId */
export function isLuzhnikiFootballRepertoire(repertoireId) {
  const id = String(repertoireId || '').trim().toLowerCase();
  if (!id) return false;
  if (DEFAULT_LUZHNIKI_FOOTBALL_REPERTOIRE_IDS.has(id)) return true;
  return parseEnvRepertoireIds().has(id);
}

/**
 * @param {string | null | undefined} repertoireId
 * @returns {string | null} stage_external_id в getbilet_stage_maps
 */
export function luzhnikiFootballStageMapKeyForRepertoire(repertoireId) {
  return isLuzhnikiFootballRepertoire(repertoireId) ? LUZHNIKI_FOOTBALL_STAGE_MAP_KEY : null;
}
