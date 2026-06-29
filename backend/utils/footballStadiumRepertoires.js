/**
 * Футбольные стадионы: канонические ключи getbilet_stage_maps по repertoire id.
 */

import { LUZHNIKI_FOOTBALL_STAGE_MAP_KEY } from '../services/luzhnikiFootballStageMap.js';
import {
  isLuzhnikiFootballRepertoire,
  luzhnikiFootballStageMapKeyForRepertoire,
} from './luzhnikiFootballRepertoires.js';

export const SUPERKUP_NN_REPERTOIRE_ID = 'olimpbet-superkubok-rossii';
export const SUPERKUP_NN_STAGE_MAP_KEY = 'supercup-nn-football';
/** Portalbilet Суперкубок NN 2026 — hall-layouts/488 (не 1800). */
export const SUPERKUP_NN_PBILET_LAYOUT_ID = '488';
export const SUPERKUP_NN_PBILET_EVENT_SOURCE_ID = '231463';
export const SUPERKUP_NN_PBILET_EVENT_DATE_ID = '397105';
export const SUPERKUP_NN_PBILET_SOURCE_ID = '1';

const DEFAULT_FOOTBALL_STADIUM_REPERTOIRE_IDS = new Set([SUPERKUP_NN_REPERTOIRE_ID]);

function parseEnvFootballStadiumRepertoireIds() {
  const raw = process.env.GETBILET_FOOTBALL_STADIUM_REPERTOIRE_IDS?.trim();
  if (!raw) return new Set();
  return new Set(
    raw
      .split(/[,;\s]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** @param {string | null | undefined} repertoireId */
export function isSupercupNnRepertoire(repertoireId) {
  const id = String(repertoireId || '').trim().toLowerCase();
  if (!id) return false;
  if (DEFAULT_FOOTBALL_STADIUM_REPERTOIRE_IDS.has(id)) return true;
  return parseEnvFootballStadiumRepertoireIds().has(id);
}

/** @param {string | null | undefined} repertoireId */
export function isFootballStadiumRepertoire(repertoireId) {
  return isLuzhnikiFootballRepertoire(repertoireId) || isSupercupNnRepertoire(repertoireId);
}

/**
 * @param {string | null | undefined} repertoireId
 * @returns {string | null}
 */
export function footballStadiumStageMapKeyForRepertoire(repertoireId) {
  const luzhniki = luzhnikiFootballStageMapKeyForRepertoire(repertoireId);
  if (luzhniki) return luzhniki;
  if (isSupercupNnRepertoire(repertoireId)) return SUPERKUP_NN_STAGE_MAP_KEY;
  return null;
}

export { LUZHNIKI_FOOTBALL_STAGE_MAP_KEY };
