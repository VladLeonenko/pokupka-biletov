#!/usr/bin/env node
import pool from '../ticketDb.js';
import { TICKET_SEO } from '../lib/seo-ticket-meta-catalog.js';

const pub = `COALESCE(is_published,true)=true AND COALESCE(storefront_hidden,false)=false`;

const totals = await pool.query(`SELECT COUNT(*)::int AS published FROM getbilet_events WHERE ${pub}`);

const desc = await pool.query(`
SELECT
  COUNT(*)::int AS n,
  COUNT(*) FILTER (WHERE NULLIF(trim(description_manual),'') IS NULL)::int AS no_desc,
  COUNT(*) FILTER (WHERE description_pack_json IS NULL)::int AS no_pack,
  COUNT(*) FILTER (WHERE description_manual ILIKE '%удобный выбор мест%')::int AS generic_desc,
  COUNT(*) FILTER (WHERE description_manual ILIKE '%билеты онлайн%')::int AS tickets_online,
  COUNT(*) FILTER (WHERE description_manual ILIKE '%Предзаказ по секторам%')::int AS preorder_tpl,
  COUNT(*) FILTER (WHERE length(trim(COALESCE(description_manual,''))) < 80)::int AS short_desc,
  COUNT(*) FILTER (WHERE length(trim(COALESCE(description_manual,''))) BETWEEN 80 AND 200)::int AS mid_desc,
  COUNT(*) FILTER (WHERE length(trim(COALESCE(description_manual,''))) > 200)::int AS long_desc,
  COUNT(*) FILTER (WHERE NULLIF(trim(card_subtitle_manual),'') IS NULL)::int AS no_subtitle,
  COUNT(*) FILTER (WHERE NULLIF(trim(venue_manual),'') IS NULL)::int AS no_venue,
  COUNT(*) FILTER (WHERE NULLIF(trim(title_manual),'') IS NULL)::int AS no_title
FROM getbilet_events WHERE ${pub}
`);

const patterns = await pool.query(`
SELECT left(trim(description_manual), 90) AS template, COUNT(*)::int AS c
FROM getbilet_events
WHERE ${pub} AND NULLIF(trim(description_manual),'') IS NOT NULL
GROUP BY 1
HAVING COUNT(*) >= 3
ORDER BY c DESC
LIMIT 20
`);

const packStats = await pool.query(`
SELECT
  COUNT(*) FILTER (WHERE description_pack_json ? 'sections')::int AS pack_sections,
  COUNT(*) FILTER (WHERE description_pack_json ? 'heroLead')::int AS pack_hero,
  COUNT(*) FILTER (
    WHERE description_pack_json::text ILIKE '%удобный выбор мест%'
       OR description_pack_json::text ILIKE '%билеты онлайн%'
  )::int AS pack_generic
FROM getbilet_events WHERE ${pub}
`);

const catalogIds = new Set(Object.keys(TICKET_SEO));
const events = await pool.query(`
SELECT getbilet_external_id AS id, title_manual AS title
FROM getbilet_events WHERE ${pub}
`);
let inCatalog = 0;
for (const e of events.rows) {
  if (catalogIds.has(e.id)) inCatalog += 1;
  else {
    for (const [k, v] of Object.entries(TICKET_SEO)) {
      if (Array.isArray(v.aliases) && v.aliases.includes(e.id)) {
        inCatalog += 1;
        break;
      }
    }
  }
}

const topMoney = await pool.query(`
SELECT e.getbilet_external_id AS id, e.title_manual AS title,
  left(COALESCE(e.description_manual,''), 140) AS d,
  (e.description_pack_json IS NOT NULL) AS pack,
  e.venue_manual AS venue
FROM getbilet_events e
WHERE ${pub}
ORDER BY e.sort_order NULLS LAST, e.updated_at DESC NULLS LAST
LIMIT 40
`);

console.log(JSON.stringify({
  totals: totals.rows[0],
  desc: desc.rows[0],
  packStats: packStats.rows[0],
  seoCatalogKeys: catalogIds.size,
  publishedInSeoCatalog: inCatalog,
  publishedNotInSeoCatalog: events.rows.length - inCatalog,
  repeatedTemplates: patterns.rows,
}, null, 2));

console.log('\n--- top storefront sample ---');
for (const s of topMoney.rows) {
  console.log([s.pack ? 'P' : '-', (s.title || '').slice(0, 36).padEnd(36), '|', (s.d || '∅').replace(/\s+/g, ' ').slice(0, 100)].join(' '));
}

await pool.end();
