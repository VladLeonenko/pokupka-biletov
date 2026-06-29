#!/usr/bin/env node
/**
 * Поиск OLIMPBET Суперкубок России в GetBilet (live + кэш БД).
 *
 *   cd backend && node scripts/find-supercup-in-catalog.js
 *   cd backend && node scripts/find-supercup-in-catalog.js --live-only
 *   cd backend && node scripts/find-supercup-in-catalog.js --place-substring=нижний
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import ticketPool from '../ticketDb.js';
import {
  restV2BuildEventsCatalog,
  restV2GetPlaceList,
  restV2GetStageListByPlaceId,
  restV2GetRepertoireListByStageId,
} from '../services/getbiletRestV2.js';
import { loadCatalogActionsFromDatabase } from '../services/getbiletCatalogSync.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const liveOnly = process.argv.includes('--live-only');
const placeSub = (() => {
  const a = process.argv.find((x) => x.startsWith('--place-substring='));
  return a ? a.slice('--place-substring='.length).trim().toLowerCase() : '';
})();

const TITLE_RE =
  /olimpbet|суперкубок\s+россии|суперкубок.*2026|zenit.*spartak|зенит.*спартак/i;

/** @param {unknown} row */
function pickId(row) {
  if (!row || typeof row !== 'object') return '';
  const r = /** @type {Record<string, unknown>} */ (row);
  return String(r.Id ?? r.id ?? r.repertoireId ?? r.RepertoireId ?? '').trim();
}

/** @param {unknown} row */
function pickName(row) {
  if (!row || typeof row !== 'object') return '';
  const r = /** @type {Record<string, unknown>} */ (row);
  return String(r.Name ?? r.name ?? r.title ?? r.Title ?? '').trim();
}

function compactHit(row, source) {
  const r = row && typeof row === 'object' ? /** @type {Record<string, unknown>} */ (row) : {};
  return {
    source,
    repertoireId: pickId(row),
    title: pickName(row),
    eventDateTime: r.EventDateTime ?? r.eventDateTime ?? r.beginDateTime ?? r.startDateTime ?? null,
    placeName: r.PlaceName ?? r.placeName ?? r.StageName ?? r.stageName ?? null,
    stageId: r.stageId ?? r.StageId ?? null,
  };
}

function matchesTitle(row) {
  const blob = JSON.stringify(row);
  return TITLE_RE.test(blob);
}

async function searchDbCache() {
  const hits = [];
  try {
    const r = await ticketPool.query(
      `SELECT getbilet_external_id, title_manual, is_published, storefront_hidden, last_seen_in_catalog_at
       FROM getbilet_events
       WHERE lower(coalesce(title_manual, '')) ~ 'olimpbet|суперкубок|зенит.*спартак'
       ORDER BY updated_at DESC
       LIMIT 50`,
    );
    for (const row of r.rows) hits.push({ source: 'getbilet_events', ...row });

    const c = await ticketPool.query(
      `SELECT repertoire_external_id, payload_json, synced_at
       FROM getbilet_catalog_cache
       WHERE lower(payload_json::text) ~ 'olimpbet|суперкубок|зенит.*спартак'
       LIMIT 50`,
    );
    for (const row of c.rows) {
      let p = row.payload_json;
      if (typeof p === 'string') {
        try {
          p = JSON.parse(p);
        } catch {
          p = null;
        }
      }
      hits.push({
        source: 'getbilet_catalog_cache',
        repertoireId: row.repertoire_external_id,
        title: pickName(p),
        syncedAt: row.synced_at,
      });
    }

    const meta = await ticketPool.query(
      'SELECT last_completed_at FROM getbilet_catalog_sync_meta WHERE singleton = 1',
    );
    return { hits, lastSync: meta.rows[0]?.last_completed_at ?? null };
  } catch (e) {
    return { hits, lastSync: null, error: e instanceof Error ? e.message : String(e) };
  }
}

async function searchLiveCatalog() {
  const data = await restV2BuildEventsCatalog();
  const actions = Array.isArray(data.actions) ? data.actions : [];
  return actions.filter(matchesTitle).map((row) => compactHit(row, 'live_catalog'));
}

async function searchNizhnyPlaces() {
  const placesData = await restV2GetPlaceList();
  const placeRows = Array.isArray(placesData.ResultData) ? placesData.ResultData : [];
  const out = [];
  for (const p of placeRows) {
    const pname = pickName(p);
    if (placeSub && !pname.toLowerCase().includes(placeSub)) continue;
    if (!placeSub && !/нижн|novgorod|совком/i.test(pname)) continue;
    const pid = pickId(p);
    if (!pid) continue;
    let stages = [];
    try {
      const sd = await restV2GetStageListByPlaceId(pid);
      stages = Array.isArray(sd.ResultData) ? sd.ResultData : [];
    } catch {
      stages = [];
    }
    const repertoires = [];
    for (const st of stages) {
      const sid = pickId(st);
      if (!sid) continue;
      try {
        const rd = await restV2GetRepertoireListByStageId(sid);
        const rows = Array.isArray(rd.ResultData) ? rd.ResultData : [];
        for (const row of rows) {
          if (matchesTitle(row)) {
            repertoires.push(compactHit({ ...row, stageId: sid }, 'live_stage_repertoire'));
          }
        }
      } catch {
        /* skip */
      }
    }
    out.push({ placeId: pid, placeName: pname, stageCount: stages.length, repertoires });
  }
  return out;
}

async function main() {
  console.log('[find-supercup] env catalogSource=%s maxPlaces=%s', process.env.GETBILET_CATALOG_SOURCE || 'live', process.env.GETBILET_V2_CATALOG_MAX_PLACES || '50(default)');

  if (!liveOnly) {
    const db = await searchDbCache();
    console.log('\n=== DB cache ===');
    console.log('last_sync:', db.lastSync);
    if (db.error) console.log('db_error:', db.error);
    console.log('hits:', db.hits.length);
    for (const h of db.hits) console.log(JSON.stringify(h));
  }

  console.log('\n=== Live GetBilet catalog ===');
  try {
    const live = await searchLiveCatalog();
    console.log('hits:', live.length);
    for (const h of live) console.log(JSON.stringify(h));
  } catch (e) {
    console.error('live_catalog_error:', e instanceof Error ? e.message : e);
  }

  console.log('\n=== Places (Nizhny / substring) ===');
  try {
    const places = await searchNizhnyPlaces();
    console.log('places:', places.length);
    for (const p of places) {
      console.log(JSON.stringify(p));
    }
  } catch (e) {
    console.error('places_error:', e instanceof Error ? e.message : e);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
