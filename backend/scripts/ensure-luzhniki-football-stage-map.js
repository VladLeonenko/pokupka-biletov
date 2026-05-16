#!/usr/bin/env node
/**
 * Idempotent: если в getbilet_stage_maps нет luzhniki-football — сид из tickets.json + luzhniki.txt.
 * Вызывается из deploy-via-git.sh на сервере.
 */
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import ticketPool from '../ticketDb.js';
import { LUZHNIKI_FOOTBALL_STAGE_MAP_KEY } from '../services/luzhnikiFootballStageMap.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const repoRoot = path.resolve(__dirname, '../..');
const ticketsPath = path.join(repoRoot, 'tickets.json');
const coordsPath = path.join(repoRoot, 'luzhniki.txt');

if (!fs.existsSync(ticketsPath) || !fs.existsSync(coordsPath)) {
  console.error(
    JSON.stringify({
      ok: false,
      error: 'missing_pbilet_files',
      ticketsPath,
      coordsPath,
    }),
  );
  process.exit(1);
}

const existing = await ticketPool.query(
  `SELECT stage_external_id, length(svg_markup::text) AS svg_len
   FROM getbilet_stage_maps WHERE stage_external_id = $1`,
  [LUZHNIKI_FOOTBALL_STAGE_MAP_KEY],
);

const dbName = await ticketPool.query('SELECT current_database() AS name');

if (existing.rows[0]?.svg_len > 1000) {
  console.log(
    JSON.stringify({
      ok: true,
      skipped: true,
      stage: LUZHNIKI_FOOTBALL_STAGE_MAP_KEY,
      svgLen: Number(existing.rows[0].svg_len),
      database: dbName.rows[0]?.name ?? null,
    }),
  );
  process.exit(0);
}

const r = spawnSync('node', ['scripts/reseed-luzhniki-geodesy-from-repo.js'], {
  cwd: path.join(repoRoot, 'backend'),
  stdio: 'inherit',
  env: {
    ...process.env,
    LUZHNIKI_GEODESY_MIN_SEATS: '4000',
    LUZHNIKI_PBILET_TICKETS_JSON: ticketsPath,
    LUZHNIKI_PBILET_COORDINATES_JSON: coordsPath,
  },
});

process.exit(r.status ?? 1);
