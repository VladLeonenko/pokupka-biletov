#!/usr/bin/env node
/**
 * Пересобирает SeatList закэшированных офферов Большого под текущую геометрию зала.
 *
 * Зачем: офферы в getbilet_repertoire_offers_cache раскрыты по рядам один раз,
 * и после пересборки зала остаются с прежними «ряд 1, места 1–8». Например у
 * «Балкон 3 яруса левая» реальные места 21–28, поэтому точки офферов рисуются
 * у правой стены, а контур зоны — слева: зоны «плавают» по схеме.
 *
 *   node scripts/_reexpand-bolshoi-offers.mjs            # отчёт
 *   APPLY=1 node scripts/_reexpand-bolshoi-offers.mjs    # запись
 */
import ticketPool from '../ticketDb.js';
import {
  remapBolshoiSeatsToSellableLabels,
  bolshoiSellableSeatsByRow,
  expandBolshoiOffersByRows,
} from '../utils/bolshoiSellableSectors.js';

const APPLY = process.env.APPLY === '1' || process.env.APPLY === 'true';
const STAGE_ID = 'bolshoi-historical-stage';

async function main() {
  const map = await ticketPool.query(
    'SELECT layout_json->\'seats\' AS seats FROM getbilet_stage_maps WHERE stage_external_id = $1',
    [STAGE_ID],
  );
  const seats = map.rows[0]?.seats;
  if (!Array.isArray(seats) || seats.length < 50) throw new Error('нет seats в stage map');
  const byLabel = bolshoiSellableSeatsByRow(remapBolshoiSeatsToSellableLabels(seats));

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
    /** Схлопнуть предыдущий expand: один оффер-прототип на сектор+дату. */
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
    const next = [];
    for (const [dt, offs] of byDt) {
      next.push(...expandBolshoiOffersByRows(offs, byLabel, `${id}-${String(dt).slice(0, 10)}`));
    }
    report.push({
      id,
      before: payload.ResultData.length,
      after: next.length,
      sample: next.slice(0, 3).map((o) => `${o.Sector} · ряд ${o.Row} · ${o.SeatList.join(',')}`),
    });
    if (!APPLY || !next.length) continue;
    payload.ResultData = next;
    await ticketPool.query(
      `UPDATE getbilet_repertoire_offers_cache SET payload_json = $1::jsonb, fetched_at = NOW()
        WHERE repertoire_external_id = $2`,
      [JSON.stringify(payload), id],
    );
  }

  console.log(JSON.stringify({ applied: APPLY, repertoires: report }, null, 2));
}

main()
  .then(() => ticketPool.end())
  .catch(async (e) => {
    console.error(e);
    await ticketPool.end().catch(() => {});
    process.exit(1);
  });
