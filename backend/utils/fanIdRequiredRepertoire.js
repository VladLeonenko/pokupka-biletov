/** Синхронно с frontend/src/utils/fanIdRequiredEvents.ts (repertoire ids). */

const DEFAULT_FAN_ID_REPERTOIRE_IDS = new Set(['6a05d17b46a4d000309ecf4e']);

function parseEnvIds() {
  const raw = process.env.FAN_ID_REPERTOIRE_IDS?.trim();
  if (!raw) return new Set();
  return new Set(
    raw
      .split(/[,;\s]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** @param {string | null | undefined} repertoireId */
export function isFanIdRequiredForRepertoire(repertoireId) {
  const id = String(repertoireId || '').trim().toLowerCase();
  if (!id) return false;
  if (DEFAULT_FAN_ID_REPERTOIRE_IDS.has(id)) return true;
  return parseEnvIds().has(id);
}
