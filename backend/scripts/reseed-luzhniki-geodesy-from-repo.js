#!/usr/bin/env node
/**
 * Пересидить luzhniki-football из tickets.json + luzhniki.txt в корне репо (pbilet 2564).
 * cd backend && node scripts/reseed-luzhniki-geodesy-from-repo.js
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

const env = {
  ...process.env,
  LUZHNIKI_GEODESY_MIN_SEATS: '4000',
  LUZHNIKI_PBILET_TICKETS_JSON: path.join(repoRoot, 'tickets.json'),
  LUZHNIKI_PBILET_COORDINATES_JSON: path.join(repoRoot, 'luzhniki.txt'),
  STAGE_MAP_TITLE: 'Стадион «Лужники» — футбол (геодезия)',
};

const r = spawnSync('npm', ['run', 'seed:luzhniki-football-map-partial'], {
  cwd: path.join(repoRoot, 'backend'),
  env,
  stdio: 'inherit',
});

process.exit(r.status ?? 1);
