#!/usr/bin/env node
/**
 * Заполняет getbilet_events.public_slug.
 * Уже записанный ЧПУ без года не перетирает (FORCE_PUBLIC_SLUG=1 — пересчитать).
 *
 * node scripts/backfill-public-slugs.js
 */
import ticketPool from '../ticketDb.js';
import { buildPublicSlug, explicitPublicSlug, slugContainsDate } from '../utils/publicEventSlug.js';
import { invalidatePublicSlugCache } from '../services/publicSlugStore.js';

function payloadTitle(payload) {
  if (!payload || typeof payload !== 'object') return '';
  for (const key of ['Name', 'name', 'actionName', 'title', 'Title']) {
    const v = payload[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

function payloadVenue(payload) {
  if (!payload || typeof payload !== 'object') return '';
  for (const key of ['PlaceName', 'placeName', 'venueName', 'VenueName', 'venue', 'HallName', 'hallName']) {
    const v = payload[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

async function main() {
  const force = process.env.FORCE_PUBLIC_SLUG === '1';
  const r = await ticketPool.query(
    `SELECT e.getbilet_external_id AS id,
            e.title_manual,
            e.venue_manual,
            e.public_slug,
            c.payload_json
     FROM getbilet_events e
     LEFT JOIN getbilet_catalog_cache c
       ON c.repertoire_external_id = e.getbilet_external_id
     WHERE e.is_published IS NOT FALSE
     ORDER BY e.getbilet_external_id`,
  );

  /** @type {Map<string, string>} */
  const used = new Map();
  let kept = 0;
  let updated = 0;
  let skipped = 0;

  const planned = [];
  for (const row of r.rows) {
    const id = String(row.id || '').trim();
    const current = String(row.public_slug || '').trim().toLowerCase();
    const explicit = explicitPublicSlug(id);
    if (!force && current && !slugContainsDate(current) && (!explicit || current === explicit)) {
      used.set(current, id);
      kept += 1;
      continue;
    }
    const title = String(row.title_manual || '').trim() || payloadTitle(row.payload_json);
    const venue = String(row.venue_manual || '').trim() || payloadVenue(row.payload_json);
    const slug = buildPublicSlug({ repertoireId: id, title, venue });
    if (!slug) {
      skipped += 1;
      continue;
    }
    planned.push({ id, slug, current });
  }

  for (const item of planned) {
    let slug = item.slug;
    const owner = used.get(slug);
    if (owner && owner !== item.id) {
      let n = 2;
      while (used.has(`${item.slug}-${n}`)) n += 1;
      slug = `${item.slug}-${n}`;
    }
    used.set(slug, item.id);
    if (slug === item.current) {
      kept += 1;
      continue;
    }
    await ticketPool.query(
      `UPDATE getbilet_events
       SET public_slug = $1, updated_at = NOW()
       WHERE getbilet_external_id = $2`,
      [slug, item.id],
    );
    updated += 1;
    if (updated <= 30) console.log(`  ${item.id} → ${slug}`);
  }

  invalidatePublicSlugCache();
  console.log(`public_slug: updated=${updated} kept=${kept} skipped=${skipped} rows=${r.rows.length}`);
  await ticketPool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
