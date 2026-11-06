#!/usr/bin/env node
/**
 * Заполняет venue_manual / venue_address_manual / card_subtitle_manual из catalog_cache.
 *   node scripts/backfill-event-venues-from-catalog.js [--dry]
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ticketPool from '../ticketDb.js';
import { invalidateGetbiletEventsHttpCache } from '../services/getbiletEventsHttpCache.js';
import { parseEventDateParts } from '../lib/seo-ticket-meta-catalog.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });
const dry = process.argv.includes('--dry');

function pick(obj, keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return null;
}

function subtitleFromPayload(p) {
  const begin = pick(p, ['EventDateTime', 'beginDateTime', 'BeginDateTime', 'DateTime']);
  const age = pick(p, ['Age', 'age']);
  const parts = [];
  if (begin) {
    const d = parseEventDateParts(begin);
    if (d.dateShort) parts.push(d.dateShort.replace(/^,\s*/, ''));
    if (d.time) parts.push(d.time);
  }
  if (age) parts.push(age);
  return parts.length ? parts.join(' · ') : null;
}

async function main() {
  const r = await ticketPool.query(
    `SELECT e.id, e.getbilet_external_id, e.venue_manual, e.venue_address_manual, e.card_subtitle_manual,
            c.payload_json
     FROM getbilet_events e
     JOIN getbilet_catalog_cache c ON c.repertoire_external_id = e.getbilet_external_id
     WHERE COALESCE(e.is_published, TRUE) = TRUE
       AND COALESCE(e.storefront_hidden, FALSE) = FALSE
       AND (
         e.venue_manual IS NULL OR trim(e.venue_manual) = ''
         OR e.venue_address_manual IS NULL OR trim(e.venue_address_manual) = ''
         OR e.card_subtitle_manual IS NULL OR trim(e.card_subtitle_manual) = ''
       )`,
  );

  let ok = 0;
  for (const row of r.rows) {
    const p = row.payload_json && typeof row.payload_json === 'object' ? row.payload_json : {};
    const venue = pick(p, ['PlaceName', 'placeName', 'StageName', 'stageName', 'Venue', 'venue']);
    const address = pick(p, ['PlaceAddress', 'placeAddress', 'Address', 'address']);
    const sub = subtitleFromPayload(p);
    const nextVenue = (row.venue_manual && String(row.venue_manual).trim()) || venue;
    const nextAddr =
      (row.venue_address_manual && String(row.venue_address_manual).trim()) || address;
    const nextSub =
      (row.card_subtitle_manual && String(row.card_subtitle_manual).trim()) || sub;
    if (!nextVenue && !nextAddr && !nextSub) continue;
    if (
      nextVenue === (row.venue_manual || null) &&
      nextAddr === (row.venue_address_manual || null) &&
      nextSub === (row.card_subtitle_manual || null)
    ) {
      continue;
    }
    if (dry) {
      console.log(`DRY ${row.getbilet_external_id} → venue=${nextVenue} addr=${nextAddr} sub=${nextSub}`);
    } else {
      await ticketPool.query(
        `UPDATE getbilet_events
         SET venue_manual = COALESCE(NULLIF(trim(venue_manual), ''), $2),
             venue_address_manual = COALESCE(NULLIF(trim(venue_address_manual), ''), $3),
             card_subtitle_manual = COALESCE(NULLIF(trim(card_subtitle_manual), ''), $4),
             updated_at = NOW()
         WHERE id = $1`,
        [row.id, nextVenue, nextAddr, nextSub],
      );
    }
    ok += 1;
  }
  if (!dry) invalidateGetbiletEventsHttpCache();
  console.log(`${dry ? 'DRY ' : ''}updated ${ok} / scanned ${r.rows.length}`);
}

main()
  .then(async () => {
    await ticketPool.end();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    try {
      await ticketPool.end();
    } catch {
      /* ignore */
    }
    process.exit(1);
  });
