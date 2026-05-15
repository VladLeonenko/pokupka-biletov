/**
 * Синхронизация каталога rest_v2 в БД: кэш + заготовки getbilet_events для админки.
 *
 * Строки getbilet_catalog_cache и getbilet_events здесь не удаляются: спектакль может исчезнуть из
 * ответа GetBilet и снова появиться — последний известный payload и карточка остаются в БД.
 */

import ticketPool from '../ticketDb.js';
import { restV2BuildEventsCatalog, expandCatalogActionsWithOfferSessions } from './getbiletRestV2.js';
import { extractPosterPageUrlFromRepertoirePayload } from './repertoirePayloadMedia.js';

/**
 * Тянем каталог из GetBilet, enrich, пишем в getbilet_catalog_cache и создаём строки getbilet_events (если ещё нет).
 * @returns {Promise<{ count: number, repertoireIds: string[] }>}
 */
export async function syncGetbiletCatalogFromApi() {
  const data = await restV2BuildEventsCatalog();
  const actions = data.actions || [];

  const repertoireIds = [];
  const client = await ticketPool.connect();
  try {
    await client.query('BEGIN');
    for (const row of actions) {
      const repId = String(row.Id ?? row.id ?? '').trim();
      if (!repId) continue;
      repertoireIds.push(repId);
      const stageId = row.stageId != null ? String(row.stageId) : null;
      await client.query(
        `INSERT INTO getbilet_catalog_cache (repertoire_external_id, stage_id, payload_json, synced_at)
         VALUES ($1, $2, $3::jsonb, NOW())
         ON CONFLICT (repertoire_external_id) DO UPDATE SET
           stage_id = EXCLUDED.stage_id,
           payload_json = EXCLUDED.payload_json,
           synced_at = NOW()`,
        [repId, stageId, JSON.stringify(row)],
      );
      const title = typeof row.Name === 'string' ? row.Name.trim() : typeof row.name === 'string' ? row.name.trim() : '';
      await client.query(
        `INSERT INTO getbilet_events (getbilet_external_id, title_manual, is_published, sort_order, updated_at, last_seen_in_catalog_at)
         VALUES ($1, $2, TRUE, 0, NOW(), NOW())
         ON CONFLICT (getbilet_external_id) DO UPDATE SET
           last_seen_in_catalog_at = NOW(),
           updated_at = NOW(),
           is_published = CASE
             WHEN COALESCE(getbilet_events.storefront_hidden, FALSE) THEN getbilet_events.is_published
             ELSE TRUE
           END`,
        [repId, title || null],
      );

      const derivedPage = extractPosterPageUrlFromRepertoirePayload(row);
      if (derivedPage) {
        await client.query(
          `UPDATE getbilet_events SET poster_page_url = $2, updated_at = NOW()
           WHERE getbilet_external_id = $1
             AND (poster_page_url IS NULL OR trim(poster_page_url) = '')`,
          [repId, derivedPage],
        );
      }
    }
    await client.query(
      `INSERT INTO getbilet_catalog_sync_meta (singleton, last_completed_at) VALUES (1, NOW())
       ON CONFLICT (singleton) DO UPDATE SET last_completed_at = EXCLUDED.last_completed_at`,
    );
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }

  return { count: repertoireIds.length, repertoireIds };
}

/**
 * Строки каталога из БД + тот же enrich (шаблоны, getbilet_events с постерами).
 * @returns {Promise<Record<string, unknown>[]>}
 */
export async function loadCatalogActionsFromDatabase() {
  const r = await ticketPool.query(
    `SELECT payload_json, stage_id FROM getbilet_catalog_cache ORDER BY synced_at DESC`,
  );
  const actions = [];
  for (const row of r.rows) {
    const p = row.payload_json;
    let obj = p;
    if (typeof p === 'string') {
      try {
        obj = JSON.parse(p);
      } catch {
        continue;
      }
    }
    if (!obj || typeof obj !== 'object') continue;
    const o = /** @type {Record<string, unknown>} */ ({ ...obj });
    if (row.stage_id) o.stageId = row.stage_id;
    actions.push(o);
  }
  const expanded = await expandCatalogActionsWithOfferSessions(actions);
  return enrichRestV2CatalogActions(expanded);
}

/**
 * Добавляет в ленту события из БД с «закрепом» (sort_order ≤ -400): ручные карточки вне ответа GetBilet.
 * @param {Record<string, unknown>[] | null | undefined} actionsInput
 */
export async function mergePinnedCatalogCacheIntoActions(actionsInput) {
  const actions = Array.isArray(actionsInput) ? [...actionsInput] : [];
  const seen = new Set();
  for (const a of actions) {
    const id = String(a?.Id ?? a?.id ?? '').trim();
    if (id) seen.add(id);
  }

  let r;
  try {
    r = await ticketPool.query(
      `SELECT c.payload_json, c.stage_id
       FROM getbilet_catalog_cache c
       INNER JOIN getbilet_events e ON e.getbilet_external_id = c.repertoire_external_id
       WHERE e.is_published = TRUE
         AND COALESCE(e.storefront_hidden, FALSE) = FALSE
         AND COALESCE(e.sort_order, 0) <= -400`,
    );
  } catch (e) {
    if (e && typeof e === 'object' && 'code' in e && /** @type {{ code?: string }} */ (e).code === '42P01') {
      return actions;
    }
    throw e;
  }

  for (const row of r.rows) {
    let obj = row.payload_json;
    if (typeof obj === 'string') {
      try {
        obj = JSON.parse(obj);
      } catch {
        continue;
      }
    }
    if (!obj || typeof obj !== 'object') continue;
    const repId = String(obj.Id ?? obj.id ?? '').trim();
    if (!repId || seen.has(repId)) continue;
    seen.add(repId);
    const o = /** @type {Record<string, unknown>} */ ({ ...obj });
    if (row.stage_id) o.stageId = row.stage_id;
    try {
      const expanded = await expandCatalogActionsWithOfferSessions([o]);
      const enriched = await enrichRestV2CatalogActions(expanded);
      for (const item of enriched) actions.push(item);
    } catch (err) {
      console.error(
        '[getbilet] mergePinnedCatalog: enrich failed',
        repId,
        err instanceof Error ? err.message : err,
      );
    }
  }

  return actions;
}
