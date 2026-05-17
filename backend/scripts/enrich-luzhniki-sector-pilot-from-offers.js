#!/usr/bin/env node
/**
 * Добавить в пилотный SVG круги для живых офферов GetBilet (координаты из layout.seats).
 *
 * tickets.json для D230 — только ряды 26–32; офферы часто 24, 22… — без кругов цвет не появится.
 *
 *   cd backend
 *   REPERTOIRE_ID=6a05d17b46a4d000309ecf4e \
 *   PILOT_BUNDLE=data/luzhniki-geodesy/hand/bundle-sector-d-230-pilot.json \
 *   node scripts/enrich-luzhniki-sector-pilot-from-offers.js
 *
 * Затем: node scripts/apply-luzhniki-sector-pilot-svg.js --bundle …
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

import cheerio from 'cheerio';
import dotenv from 'dotenv';

import ticketPool from '../ticketDb.js';
import { getPublicOffersForRepertoire } from '../services/getbiletOffersPublic.js';
import { normalizeHallSvgDataIds } from '../utils/normalizeHallSvgDataIds.js';
import {
  buildLabeledSeatIndex,
  lookupLabeledSeat,
} from '../utils/hallSeatGeodesyMatch.js';
import { parseSvgNativeSeatCircles } from '../utils/hallSeatGeodesyFromSvgCircles.js';
import {
  LUZHNIKI_PILOT_SEATS_LAYER_ID,
  pilotSeatCircleMarkup,
} from '../utils/luzhnikiPilotSeatSvg.js';
import { normalizeSectorLabel, strictSeatKey } from '../utils/ticketHallSectorNormalize.js';
import { LUZHNIKI_FOOTBALL_STAGE_MAP_KEY } from '../services/luzhnikiFootballStageMap.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

dotenv.config({ path: path.join(__dirname, '../.env') });

function requiredFile(relOrAbs) {
  const candidates = path.isAbsolute(relOrAbs)
    ? [relOrAbs]
    : [
        path.resolve(repoRoot, relOrAbs),
        path.resolve(repoRoot, 'backend', relOrAbs),
        path.resolve(process.cwd(), relOrAbs),
      ];
  const abs = candidates.find((p) => fs.existsSync(p));
  if (!abs) throw new Error(`Файл не найден: ${relOrAbs}`);
  return abs;
}

function parseLayoutSeats(layout) {
  const raw = layout?.seats;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const sector = String(item.sector ?? item.Sector ?? '').trim();
      const row = String(item.row ?? item.Row ?? '').trim();
      const seat = String(item.seat ?? item.Seat ?? item.place ?? '').trim();
      const xPct = Number(item.xPct ?? item.x_pct);
      const yPct = Number(item.yPct ?? item.y_pct);
      if (!sector || !row || !seat || !Number.isFinite(xPct) || !Number.isFinite(yPct)) return null;
      return { sector, row, seat, xPct, yPct };
    })
    .filter(Boolean);
}

function buildBundleSeatIndex(bundle, hallWidth, hallHeight) {
  const canonicalSector = bundle.sectors?.[0]?.label || bundle.seats?.[0]?.sector || 'Сектор D 230';
  const w = Number(hallWidth) || 11413;
  const h = Number(hallHeight) || 9676;
  const raw = Array.isArray(bundle.seats) ? bundle.seats : [];
  const labeled = raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = String(item.row ?? '').trim();
      const seat = String(item.seat ?? item.place ?? '').trim();
      let xPct;
      let yPct;
      if (item.xPct != null && item.yPct != null) {
        xPct = Number(item.xPct);
        yPct = Number(item.yPct);
      } else if (item.x != null && item.y != null) {
        xPct = (Number(item.x) / w) * 100;
        yPct = (Number(item.y) / h) * 100;
      }
      if (!row || !seat || !Number.isFinite(xPct) || !Number.isFinite(yPct)) return null;
      return { sector: canonicalSector, row, seat, xPct, yPct };
    })
    .filter(Boolean);
  return buildLabeledSeatIndex(labeled);
}

function lookupSeatCoords(layoutIndex, bundleIndex, sector, row, seat) {
  return (
    lookupLabeledSeat(layoutIndex, sector, row, seat) ||
    lookupLabeledSeat(bundleIndex, sector, row, seat)
  );
}

async function main() {
  const repertoireId = process.env.REPERTOIRE_ID?.trim();
  if (!repertoireId) throw new Error('REPERTOIRE_ID обязателен');

  const sectorNorm = normalizeSectorLabel(process.env.PILOT_SECTOR_NORM || 'd230');
  const bundlePath = requiredFile(
    process.env.PILOT_BUNDLE || 'data/luzhniki-geodesy/hand/bundle-sector-d-230-pilot.json',
  );
  const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
  const w = Number(bundle.hallWidth) || 11413;
  const h = Number(bundle.hallHeight) || 9676;
  let svgMarkup = String(bundle.svgMarkup ?? '').trim();

  const mapRow = await ticketPool.query(
    `SELECT layout_json FROM getbilet_stage_maps WHERE stage_external_id = $1`,
    [LUZHNIKI_FOOTBALL_STAGE_MAP_KEY],
  );
  const layout = mapRow.rows[0]?.layout_json ?? {};
  const canonicalSector =
    bundle.sectors?.[0]?.label || bundle.seats?.[0]?.sector || 'Сектор D 230';
  const layoutSeats = parseLayoutSeats(layout);
  const layoutIndex = buildLabeledSeatIndex(layoutSeats);
  const bundleIndex = buildBundleSeatIndex(bundle, w, h);

  const existing = parseSvgNativeSeatCircles(svgMarkup, w, h);
  const existingKeys = new Set(existing.map((s) => strictSeatKey(s.sector, s.row, s.seat)));

  const { payload } = await getPublicOffersForRepertoire(repertoireId, { forceRefresh: true });
  const offerRows = Array.isArray(payload?.ResultData) ? payload.ResultData : [];

  const skippedNoCoords = [];
  const toAdd = [];
  for (const offer of offerRows) {
    const sector = String(offer.Sector ?? '');
    if (normalizeSectorLabel(sector) !== sectorNorm) continue;
    const row = String(offer.Row ?? '');
    const list = Array.isArray(offer.SeatList) ? offer.SeatList.map(String) : [];
    for (const seat of list) {
      if (!seat.trim()) continue;
      const key = strictSeatKey(canonicalSector, row, seat);
      if (existingKeys.has(key)) continue;
      const hit = lookupSeatCoords(layoutIndex, bundleIndex, sector, row, seat);
      if (!hit) {
        if (skippedNoCoords.length < 12) skippedNoCoords.push({ row, seat });
        continue;
      }
      existingKeys.add(key);
      toAdd.push({
        row,
        seat,
        xPct: hit.xPct,
        yPct: hit.yPct,
      });
    }
  }

  if (toAdd.length < 1) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          added: 0,
          message: 'Новых кругов не нужно или нет координат (layout.seats / bundle.seats)',
          existingCircles: existing.length,
          skippedNoCoords,
        },
        null,
        2,
      ),
    );
    return;
  }

  const $ = cheerio.load(svgMarkup, { xml: true });
  const svg = $('svg').first();
  $(`#luzhniki-pilot-sector`).remove();
  let g = $(`#${LUZHNIKI_PILOT_SEATS_LAYER_ID}`);
  if (!g.length) {
    g = $(`<g id="${LUZHNIKI_PILOT_SEATS_LAYER_ID}" fill="none"/>`);
    svg.append(g);
  }

  for (const s of toAdd) {
    const cx = (s.xPct / 100) * w;
    const cy = (s.yPct / 100) * h;
    g.append(
      pilotSeatCircleMarkup(canonicalSector, s.row, s.seat, cx, cy, w, h, 'data-source="live-offer"'),
    );
  }

  svgMarkup = normalizeHallSvgDataIds($.xml ? $.xml() : $.html());
  const outBundle = { ...bundle, svgMarkup };
  fs.writeFileSync(bundlePath, `${JSON.stringify(outBundle, null, 2)}\n`, 'utf8');

  const svgPath = bundlePath.replace(/bundle-/, 'sector-').replace(/\.json$/, '.svg');
  if (fs.existsSync(svgPath)) {
    fs.writeFileSync(svgPath, svgMarkup, 'utf8');
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        added: toAdd.length,
        totalCircles: existing.length + toAdd.length,
        sampleAdded: toAdd.slice(0, 5),
        bundlePath,
        next: 'node scripts/apply-luzhniki-sector-pilot-svg.js --bundle ' + bundlePath,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
