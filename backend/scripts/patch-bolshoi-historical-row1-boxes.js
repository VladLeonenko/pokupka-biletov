#!/usr/bin/env node
/**
 * Историческая сцена: правые ложи бельэтажа/1 яруса — sellable только ряд 1;
 * левые VIP (boxWhole) — все ряды; preview бельэтажа → view-beletazh.jpg.
 *
 * ВАЖНО: sectorMode.path — справа outlineTest = ряд 1 (lit 3 места);
 * слева VIP — вся ложа. Hall size 1500×1100 (не 1190).
 *
 *   node scripts/patch-bolshoi-historical-row1-boxes.js           # dry-run
 *   APPLY=1 node scripts/patch-bolshoi-historical-row1-boxes.js  # запись
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ticketPool from '../ticketDb.js';
import {
  remapBolshoiSeatsToSellableLabels,
  bolshoiSellableSeatsByRow,
  expandBolshoiOffersByRows,
  buildBolshoiSellableSectorMode,
  resolveBolshoiHistoricalHallSize,
  BOLSHOI_HALL_MAP_LABELS,
} from '../utils/bolshoiSellableSectors.js';

const APPLY = process.env.APPLY === '1' || process.env.APPLY === 'true';
const STAGE_ID = process.env.BOLSHOI_HISTORICAL_STAGE_EXTERNAL_ID?.trim() || 'bolshoi-historical-stage';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function countByLabel(seats) {
  const m = new Map();
  for (const s of seats) {
    if (!s.sellable) continue;
    const k = String(s.sector || '');
    m.set(k, (m.get(k) || 0) + 1);
  }
  return Object.fromEntries([...m.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ru')));
}

async function main() {
  const map = await ticketPool.query(
    `SELECT layout_json FROM getbilet_stage_maps WHERE stage_external_id = $1`,
    [STAGE_ID],
  );
  const lj = map.rows[0]?.layout_json;
  if (!lj || !Array.isArray(lj.seats)) throw new Error('нет layout seats');

  /** SVG/места = 1500×1100; НЕ дефолт 1190 — иначе path уезжает от точек. */
  const { hallWidth: hallW, hallHeight: hallH } = resolveBolshoiHistoricalHallSize(lj);
  const remapped = remapBolshoiSeatsToSellableLabels(lj.seats);
  /** Paths = row-1 справа / full left VIP; qty/color same. */
  const sectorMode = buildBolshoiSellableSectorMode(remapped, hallW, hallH);
  const before = countByLabel(
    (lj.seats || []).map((s) => ({ ...s, sellable: s.sellable !== false && Boolean(s.sector) })),
  );
  const after = countByLabel(remapped);

  const previewSample = (sectorMode.sectors || [])
    .filter((s) => /бель|1 ярус/i.test(s.label || ''))
    .map((s) => `${s.id}: n=${s.totalSeats} outlinePts≈pathLen=${(s.path || '').length} img=${s.previewImageUrl}`);

  console.log(JSON.stringify({ dryRun: !APPLY, beforeSellableApprox: before, afterSellable: after, previewSample }, null, 2));

  if (APPLY) {
    const bakDir = path.join(__dirname, '../data/bolshoi-geodesy/hand');
    fs.mkdirSync(bakDir, { recursive: true });
    const bakPath = path.join(
      bakDir,
      `bolshoi-historical-layout_json.${new Date().toISOString().replace(/[:.]/g, '-')}.bak.json`,
    );
    fs.writeFileSync(bakPath, JSON.stringify(lj));
    console.log(JSON.stringify({ layoutBak: bakPath }));

    const next = {
      ...lj,
      hallWidth: hallW,
      hallHeight: hallH,
      seats: remapped,
      sectorMode,
      hallMapLabels: Array.isArray(lj.hallMapLabels) && lj.hallMapLabels.length
        ? lj.hallMapLabels
        : BOLSHOI_HALL_MAP_LABELS,
      hallPreviewSectorCheckout: true,
    };
    await ticketPool.query(
      `UPDATE getbilet_stage_maps SET layout_json = $1::jsonb, updated_at = NOW() WHERE stage_external_id = $2`,
      [JSON.stringify(next), STAGE_ID],
    );
  }

  const byLabel = bolshoiSellableSeatsByRow(remapped);
  const reps = await ticketPool.query(
    `SELECT c.repertoire_external_id AS id, o.payload_json AS payload
       FROM getbilet_catalog_cache c
       JOIN getbilet_repertoire_offers_cache o USING (repertoire_external_id)
      WHERE c.stage_id = $1`,
    [STAGE_ID],
  );

  const report = [];
  for (const { id, payload } of reps.rows) {
    if (!Array.isArray(payload?.ResultData)) continue;
    const seen = new Set();
    const byDt = new Map();
    for (const off of payload.ResultData) {
      const key = `${off.Sector || ''}|${off.EventDateTime || ''}`;
      if (!off.Sector || seen.has(key)) continue;
      seen.add(key);
      const dt = off.EventDateTime || '_';
      if (!byDt.has(dt)) byDt.set(dt, []);
      byDt.get(dt).push(off);
    }
    const nextOffers = [];
    for (const [dt, offs] of byDt) {
      nextOffers.push(...expandBolshoiOffersByRows(offs, byLabel, `${id}-${String(dt).slice(0, 10)}`));
    }
    const boxSample = nextOffers
      .filter((o) => /бельэтаж правая|1 ярус правая/i.test(String(o.Sector || '')))
      .slice(0, 6)
      .map((o) => `${o.Sector} row=${o.Row} seats=${(o.SeatList || []).join(',')}`);
    report.push({ id, before: payload.ResultData.length, after: nextOffers.length, boxSample });
    if (!APPLY || !nextOffers.length) continue;
    payload.ResultData = nextOffers;
    await ticketPool.query(
      `UPDATE getbilet_repertoire_offers_cache SET payload_json = $1::jsonb, fetched_at = NOW()
        WHERE repertoire_external_id = $2`,
      [JSON.stringify(payload), id],
    );
  }

  console.log(JSON.stringify({ offers: report }, null, 2));
}

main()
  .then(() => ticketPool.end())
  .catch(async (e) => {
    console.error(e);
    await ticketPool.end().catch(() => {});
    process.exit(1);
  });
