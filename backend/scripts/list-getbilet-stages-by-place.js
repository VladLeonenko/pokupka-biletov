/**
 * Список площадок и сцен из GetBilet REST v2 (для заливки getbilet_stage_maps по одному StageId).
 *
 * Из каталога backend/:
 *   npm run list:getbilet-stages
 *
 * Фильтры (опционально):
 *   GETBILET_LIST_PLACE_ID=<mongo Place Id> — только одна площадка
 *   GETBILET_LIST_PLACE_SUBSTRING=вахтангов — подстрочный поиск по имени площадки (регистр не важен)
 *
 * Требуется в .env: GETBILET_USER_ID + GETBILET_HASH (или GETBILET_HASH_ID), GETBILET_PROTOCOL=rest_v2 при необходимости.
 */

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env'), override: true });

const { restV2GetPlaceList, restV2GetStageListByPlaceId } = await import('../services/getbiletRestV2.js');

/** @param {unknown} row */
function pickMongoId(row) {
  if (!row || typeof row !== 'object') return null;
  const id = /** @type {Record<string, unknown>} */ (row).Id ?? /** @type {Record<string, unknown>} */ (row).id;
  return id != null && id !== '' ? String(id) : null;
}

/** @param {unknown} row */
function placeName(row) {
  if (!row || typeof row !== 'object') return '';
  const nm =
    /** @type {Record<string, unknown>} */ (row).Name ??
    /** @type {Record<string, unknown>} */ (row).name;
  return typeof nm === 'string' ? nm.trim() : '';
}

/** @param {unknown} row */
function stageName(row) {
  if (!row || typeof row !== 'object') return '';
  const r = /** @type {Record<string, unknown>} */ (row);
  const nm = r.Name ?? r.name ?? r.Title ?? r.title;
  return typeof nm === 'string' ? nm.trim() : '';
}

async function main() {
  const placeIdFilter = process.env.GETBILET_LIST_PLACE_ID?.trim() || null;
  const sub =
    process.env.GETBILET_LIST_PLACE_SUBSTRING?.trim().replace(/\u00a0/g, ' ') || null;
  const subNorm = sub ? sub.toLowerCase() : null;

  const placesData = await restV2GetPlaceList();
  let placeRows = Array.isArray(placesData.ResultData) ? placesData.ResultData : [];

  const out = [];

  for (const p of placeRows) {
    const pid = pickMongoId(p);
    const pname = placeName(p);
    if (!pid) continue;
    if (placeIdFilter && pid !== placeIdFilter) continue;
    if (subNorm && !pname.toLowerCase().includes(subNorm)) continue;

    let stages = [];
    try {
      const sd = await restV2GetStageListByPlaceId(pid);
      const rows = Array.isArray(sd.ResultData) ? sd.ResultData : [];
      stages = rows
        .map((st) => {
          const sid = pickMongoId(st);
          if (!sid) return null;
          return { stageId: sid, stageName: stageName(st) || sid };
        })
        .filter(Boolean);
    } catch (e) {
      out.push({
        placeId: pid,
        placeName: pname,
        error: e instanceof Error ? e.message : String(e),
        stages: [],
      });
      continue;
    }

    out.push({
      placeId: pid,
      placeName: pname,
      stages,
    });
  }

  console.log(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        places: out,
        flatStages: out.flatMap((pl) =>
          pl.stages.map((s) => ({
            placeId: pl.placeId,
            placeName: pl.placeName,
            stageId: s.stageId,
            stageName: s.stageName,
          })),
        ),
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
