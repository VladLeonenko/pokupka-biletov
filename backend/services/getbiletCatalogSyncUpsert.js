/**
 * UPSERT getbilet_events при синке — с fallback, если миграция storefront_hidden ещё не применена.
 */

/**
 * @param {import('pg').PoolClient} client
 * @param {string} repId
 * @param {string | null} title
 */
export async function upsertGetbiletEventFromCatalogSync(client, repId, title) {
  const params = [repId, title || null];
  try {
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
      params,
    );
  } catch (e) {
    if (!(e && typeof e === 'object' && 'code' in e && e.code === '42703')) throw e;
    await client.query(
      `INSERT INTO getbilet_events (getbilet_external_id, title_manual, is_published, sort_order, updated_at, last_seen_in_catalog_at)
       VALUES ($1, $2, TRUE, 0, NOW(), NOW())
       ON CONFLICT (getbilet_external_id) DO UPDATE SET
         last_seen_in_catalog_at = NOW(),
         updated_at = NOW(),
         is_published = TRUE`,
      params,
    );
  }
}
