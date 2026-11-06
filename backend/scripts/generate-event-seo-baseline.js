#!/usr/bin/env node
/**
 * Базовый SEO на ВСЕ опубликованные события (title/desc/keywords/h1/h2).
 * Без OpenRouter: shortTitle + жанр + venue + дата + hot-keywords.
 * Потом поверх — ручной прогон Wordstat/SERP (Safari) правит seo_*_manual.
 *
 *   node scripts/generate-event-seo-baseline.js [--force] [--limit=50] [--dry]
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ticketPool from '../ticketDb.js';
import { classifyEventTitle, shortEventTitle } from '../services/eventTitleHeuristics.js';
import {
  composeAutoTicketDescription,
  composeAutoTicketTitle,
  parseEventDateParts,
} from '../lib/seo-ticket-meta-catalog.js';
import { invalidateGetbiletEventsHttpCache } from '../services/getbiletEventsHttpCache.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const force = process.argv.includes('--force');
const dry = process.argv.includes('--dry');
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const limit = limitArg ? Math.min(Math.max(Number(limitArg.split('=')[1]) || 500, 1), 2000) : 2000;

function pick(obj, keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return null;
}

function buildKeywords(title, genre, venue) {
  const short = shortEventTitle(title, 40);
  const g = (genre || 'билеты').toLowerCase();
  const v = venue ? shortEventTitle(venue, 28) : 'москва';
  const parts = [
    `${short} билеты`,
    `купить билеты ${short}`,
    `${short} ${v}`,
    `${g} ${short}`,
    `${short} афиша`,
  ];
  return [...new Set(parts.map((p) => p.replace(/\s+/g, ' ').trim().toLowerCase()))]
    .slice(0, 6)
    .join(', ');
}

function buildH2(title, genre, venue) {
  const short = shortEventTitle(title, 48);
  const g = genre || 'Событие';
  const v = venue ? shortEventTitle(venue, 36) : '';
  return v ? `${g} «${short}» — ${v}` : `${g} «${short}»: схема зала и билеты онлайн`;
}

async function main() {
  const emptySeo = force
    ? 'TRUE'
    : `(e.seo_title_manual IS NULL OR trim(e.seo_title_manual) = '')`;

  const r = await ticketPool.query(
    `SELECT e.id, e.getbilet_external_id, e.title_manual, e.venue_manual, e.venue_address_manual,
            e.description_manual, e.seo_title_manual,
            c.payload_json,
            (SELECT MIN(NULLIF(trim(o->>'EventDateTime'),''))
               FROM jsonb_array_elements(COALESCE(oc.payload_json->'ResultData','[]'::jsonb)) o
            ) AS begin_iso
     FROM getbilet_events e
     LEFT JOIN getbilet_catalog_cache c ON c.repertoire_external_id = e.getbilet_external_id
     LEFT JOIN getbilet_repertoire_offers_cache oc ON oc.repertoire_external_id = e.getbilet_external_id
     WHERE COALESCE(e.is_published, TRUE) = TRUE
       AND COALESCE(e.storefront_hidden, FALSE) = FALSE
       AND NULLIF(trim(COALESCE(e.title_manual,'')), '') IS NOT NULL
       AND ${emptySeo}
     ORDER BY e.id ASC
     LIMIT $1`,
    [limit],
  );

  console.log(`SEO baseline: ${r.rows.length} events (force=${force} dry=${dry})`);
  let ok = 0;
  for (const row of r.rows) {
    const title = String(row.title_manual).trim();
    const p = row.payload_json && typeof row.payload_json === 'object' ? row.payload_json : {};
    const venue =
      (row.venue_manual && String(row.venue_manual).trim()) ||
      pick(p, ['PlaceName', 'placeName', 'StageName', 'Venue']) ||
      null;
    const begin =
      row.begin_iso ||
      pick(p, ['EventDateTime', 'beginDateTime', 'BeginDateTime']) ||
      null;
    const genreApi = pick(p, ['GenreName', 'genreName', 'Genre', 'genre']);
    const { categoryLabel } = classifyEventTitle(title, { genre: genreApi || undefined });
    const genreLabel = categoryLabel === 'Мероприятие' ? null : categoryLabel;

    const seoTitle = composeAutoTicketTitle({
      displayTitle: title,
      venueLabel: venue,
      beginDateTime: begin,
      genreLabel,
    });
    const seoDesc = composeAutoTicketDescription({
      displayTitle: title,
      venueLabel: venue,
      beginDateTime: begin,
      genreLabel,
      lead: row.description_manual || pick(p, ['ShortDescription', 'Description']) || null,
    });
    const h1 = shortEventTitle(title, 72);
    const h2 = buildH2(title, genreLabel || categoryLabel, venue);
    const keywords = buildKeywords(title, genreLabel || categoryLabel, venue);
    const parts = begin ? parseEventDateParts(begin) : null;

    if (dry) {
      console.log(`DRY ${row.getbilet_external_id}`);
      console.log(`  title: ${seoTitle}`);
      console.log(`  desc:  ${seoDesc}`);
      console.log(`  h1: ${h1} | h2: ${h2}`);
      console.log(`  kw: ${keywords}${parts?.when ? ` | when ${parts.when}` : ''}`);
    } else {
      await ticketPool.query(
        `UPDATE getbilet_events SET
           seo_title_manual = $2,
           seo_description_manual = $3,
           seo_keywords_manual = $4,
           seo_h1_manual = $5,
           seo_h2_manual = $6,
           updated_at = NOW()
         WHERE id = $1`,
        [row.id, seoTitle, seoDesc, keywords, h1, h2],
      );
    }
    ok += 1;
  }
  if (!dry) invalidateGetbiletEventsHttpCache();
  console.log(`Done: ${ok}`);
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
