#!/usr/bin/env node
/**
 * Idempotent: пересид Суперкубка NN если в БД старый pbilet layout 1800 (4376×3823)
 * вместо 488 (8943×7326). Вызывается из deploy-via-git.sh.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import ticketPool from '../ticketDb.js';
import {
  SUPERKUP_NN_PBILET_LAYOUT_ID,
  SUPERKUP_NN_STAGE_MAP_KEY,
} from '../utils/footballStadiumRepertoires.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, '..');
dotenv.config({ path: path.join(backendRoot, '.env') });

const EXPECT_LAYOUT = SUPERKUP_NN_PBILET_LAYOUT_ID;
const EXPECT_WIDTH = 8943;
const EXPECT_HEIGHT = 7326;

function layoutLooksCorrect(row) {
  if (!row?.svg_markup || String(row.svg_markup).length < 5000) return false;
  const lj = row.layout_json && typeof row.layout_json === 'object' ? row.layout_json : {};
  const pb = lj.pbilet && typeof lj.pbilet === 'object' ? lj.pbilet : {};
  const layoutId = String(pb.layoutId || '').trim();
  const w = Number(pb.coordinateWidth);
  const h = Number(pb.coordinateHeight);
  if (layoutId === EXPECT_LAYOUT && w === EXPECT_WIDTH && h === EXPECT_HEIGHT) return true;
  const svg = String(row.svg_markup);
  if (svg.includes(`viewBox="0 0 ${EXPECT_WIDTH} ${EXPECT_HEIGHT}"`)) return true;
  return false;
}

const existing = await ticketPool.query(
  `SELECT stage_external_id, svg_markup, layout_json
   FROM getbilet_stage_maps WHERE stage_external_id = $1`,
  [SUPERKUP_NN_STAGE_MAP_KEY],
);

const dbName = await ticketPool.query('SELECT current_database() AS name');

if (existing.rows[0] && layoutLooksCorrect(existing.rows[0])) {
  const row = existing.rows[0];
  const lj = row.layout_json && typeof row.layout_json === 'object' ? row.layout_json : {};
  if (lj.hideSeatList !== true) {
    await ticketPool.query(
      `UPDATE getbilet_stage_maps
       SET layout_json = COALESCE(layout_json, '{}'::jsonb) || '{"hideSeatList":true}'::jsonb,
           updated_at = NOW()
       WHERE stage_external_id = $1`,
      [SUPERKUP_NN_STAGE_MAP_KEY],
    );
  }
  console.log(
    JSON.stringify({
      ok: true,
      skipped: true,
      stage: SUPERKUP_NN_STAGE_MAP_KEY,
      layoutId: EXPECT_LAYOUT,
      database: dbName.rows[0]?.name ?? null,
    }),
  );
  await ticketPool.end().catch(() => {});
  process.exit(0);
}

const prev = existing.rows[0]?.layout_json?.pbilet;
console.log(
  JSON.stringify({
    ok: true,
    action: 'reseed',
    stage: SUPERKUP_NN_STAGE_MAP_KEY,
    previousLayoutId: prev?.layoutId ?? null,
    previousSize: prev ? [prev.coordinateWidth, prev.coordinateHeight] : null,
    targetLayoutId: EXPECT_LAYOUT,
    database: dbName.rows[0]?.name ?? null,
  }),
);

const r = spawnSync('node', ['scripts/seed-supercup-nn-2026-event.js'], {
  cwd: backendRoot,
  stdio: 'inherit',
  env: process.env,
});

await ticketPool.end().catch(() => {});
process.exit(r.status ?? 1);
