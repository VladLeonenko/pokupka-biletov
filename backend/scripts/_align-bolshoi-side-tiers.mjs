#!/usr/bin/env node
/**
 * Bolshoi Historical: align side-box tier fronts (equal stage depth) + mirror
 * missing 2 ярус right from left. KEEP Партер untouched.
 *
 *   node scripts/_align-bolshoi-side-tiers.mjs              # dry-run local rebuild
 *   APPLY=1 node scripts/_align-bolshoi-side-tiers.mjs      # write local SVG+bundle (no DB)
 *   APPLY=1 WITH_DB=1 node scripts/_align-bolshoi-side-tiers.mjs  # + prod DB
 *
 * Alignment: for each side, shift Бенуар / Бельэтаж / 1–3 ярус lozhi so
 * min(cy) of each tier equals the stage-nearest of (Бенуар, Бельэтаж).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildTheaterLayoutFromBolshoiMarkup,
  buildBolshoiHistoricalHallSvg,
} from '../utils/bolshoiHistoricalHallSvg.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const STAGE_ID = process.env.BOLSHOI_HISTORICAL_STAGE_EXTERNAL_ID?.trim() || 'bolshoi-historical-stage';
const APPLY = process.env.APPLY === '1' || process.env.APPLY === 'true';
const WITH_DB = process.env.WITH_DB === '1' || process.env.WITH_DB === 'true';

const HTML_PATH =
  process.env.STAGE_MAP_BOLSHOI_HTML_PATH ||
  path.join(REPO_ROOT, 'backend/data/bolshoi-historical/bolshoi-source.html');
const LABELED_PATH =
  process.env.STAGE_MAP_BOLSHOI_LABELED_PATH ||
  path.join(REPO_ROOT, 'backend/data/bolshoi-historical/historical-circles-labeled.svg');
const SVG_OUT =
  process.env.BOLSHOI_SVG_PATH ||
  path.join(REPO_ROOT, 'frontend/public/hall-maps/bolshoi-historical-stage.svg');
const BUNDLE_OUT =
  process.env.BOLSHOI_BUNDLE_PATH ||
  path.join(REPO_ROOT, 'backend/data/bolshoi-geodesy/hand/bolshoi-historical-stage-seats.bundle.json');

function foldLookalikes(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/a/g, 'а')
    .replace(/e/g, 'е')
    .replace(/o/g, 'о')
    .replace(/p/g, 'р')
    .replace(/c/g, 'с')
    .replace(/x/g, 'х')
    .replace(/y/g, 'у')
    .replace(/h/g, 'н')
    .replace(/k/g, 'к')
    .replace(/b/g, 'в')
    .replace(/m/g, 'м')
    .replace(/t/g, 'т');
}

function isParter(seat) {
  const raw = String(seat?.sectorDetail || seat?.sector || '');
  const n = foldLookalikes(raw);
  if (!n.includes('партер')) return false;
  if (/вип|vip|отдельн/.test(n)) return false;
  if (/ряд\s*а\s*\(вип\)/.test(n)) return false;
  return true;
}

function isUnsigned(seat) {
  const s = String(seat?.sector || seat?.section || '');
  return !s || /не\s*подписан/i.test(s) || foldLookalikes(s).includes('неподписан');
}

/** @returns {'Бенуар'|'Бельэтаж'|'1 ярус'|'2 ярус'|'3 ярус'|null} */
function sideBoxTier(sector) {
  const s = String(sector || '');
  const n = foldLookalikes(s);
  if (n.includes('балкон') && !n.includes('лож')) return null;
  if (n.includes('бенуар')) return 'Бенуар';
  if (n.includes('бельэтаж') || n.includes('бель-этаж')) return 'Бельэтаж';
  if (/^1\s*ярус/i.test(s) || n.startsWith('1ярус')) return '1 ярус';
  if (/^2\s*ярус/i.test(s) || n.startsWith('2ярус')) return '2 ярус';
  if (/^3\s*ярус/i.test(s) || n.startsWith('3ярус')) return '3 ярус';
  return null;
}

function sideOf(sector) {
  const n = foldLookalikes(sector);
  if (n.includes('прав')) return 'R';
  if (n.includes('лев')) return 'L';
  return null;
}

function xyOf(seat, hallW, hallH) {
  return {
    cx: (Number(seat.xPct) / 100) * hallW,
    cy: (Number(seat.yPct) / 100) * hallH,
  };
}

function setXy(seat, cx, cy, hallW, hallH) {
  seat.xPct = (cx / hallW) * 100;
  seat.yPct = (cy / hallH) * 100;
}

function tallySideBoxes(seats) {
  const out = {};
  for (const s of seats) {
    const t = sideBoxTier(s.sector);
    if (!t) continue;
    const side = sideOf(s.sector) || '?';
    const k = `${t}|${side}`;
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

/**
 * Front min-cy per tier|side = min cy across all lozhi seats.
 * (Compact-only skipped Lozha 1 with wide span and pushed it off-canvas after shift.)
 */
function tierFronts(seats, hallW, hallH) {
  /** @type {Record<string, number>} */
  const fronts = {};
  for (const s of seats) {
    const t = sideBoxTier(s.sector);
    const side = sideOf(s.sector);
    if (!t || !side) continue;
    if (!/лож/i.test(String(s.sector)) && t !== 'Бенуар' && t !== 'Бельэтаж') continue;
    const key = `${t}|${side}`;
    const { cy } = xyOf(s, hallW, hallH);
    if (fronts[key] == null || cy < fronts[key]) fronts[key] = cy;
  }
  return fronts;
}

function alignSideTierFronts(seats, hallW, hallH) {
  const before = tierFronts(seats, hallW, hallH);
  const shifts = {};
  for (const side of ['L', 'R']) {
    const ben = before[`Бенуар|${side}`];
    const bel = before[`Бельэтаж|${side}`];
    if (ben == null && bel == null) continue;
    const target = Math.min(ben ?? Infinity, bel ?? Infinity);
    for (const tier of ['Бенуар', 'Бельэтаж', '1 ярус', '2 ярус', '3 ярус']) {
      const key = `${tier}|${side}`;
      const front = before[key];
      if (front == null || !Number.isFinite(target)) continue;
      const dy = target - front;
      if (Math.abs(dy) < 0.5) {
        shifts[key] = { dy: 0, front, target };
        continue;
      }
      shifts[key] = { dy, front, target };
      for (const s of seats) {
        if (sideBoxTier(s.sector) !== tier) continue;
        if (sideOf(s.sector) !== side) continue;
        if (!/лож/i.test(String(s.sector)) && tier !== 'Бенуар' && tier !== 'Бельэтаж') continue;
        const { cx, cy } = xyOf(s, hallW, hallH);
        // Keep dots inside hall (stage pad ~8).
        setXy(s, cx, Math.max(8, cy + dy), hallW, hallH);
      }
    }
  }
  return { before, after: tierFronts(seats, hallW, hallH), shifts };
}

/** Mirror 2 ярус left lozhi → right when right missing. */
function mirrorTier2Right(seats, hallW, hallH) {
  const hasRight = seats.some((s) => sideBoxTier(s.sector) === '2 ярус' && sideOf(s.sector) === 'R');
  if (hasRight) return { added: 0, skipped: true };
  const left = seats.filter((s) => sideBoxTier(s.sector) === '2 ярус' && sideOf(s.sector) === 'L');
  const added = [];
  for (const s of left) {
    const { cx, cy } = xyOf(s, hallW, hallH);
    const sector = String(s.sector).replace(/Левая/gi, 'Правая');
    added.push({
      sector,
      row: String(s.row ?? ''),
      seat: String(s.seat ?? ''),
      xPct: ((hallW - cx) / hallW) * 100,
      yPct: (cy / hallH) * 100,
      _mirroredFrom: s.sector,
    });
  }
  seats.push(...added);
  return { added: added.length, skipped: false };
}

function seatsToPlaces(seats, hallWidth, hallHeight) {
  return seats.map((s, i) => {
    const cx = (Number(s.xPct) / 100) * hallWidth;
    const cy = (Number(s.yPct) / 100) * hallHeight;
    return {
      id: `${s.sector}|${s.row}|${s.seat}|${i}`,
      section: s.sector,
      row: String(s.row ?? ''),
      seat: String(s.seat ?? ''),
      cx,
      cy,
    };
  });
}

function count1Yarus(seats) {
  let n = 0;
  const by = {};
  for (const s of seats) {
    if (sideBoxTier(s.sector) !== '1 ярус') continue;
    if (!/лож/i.test(String(s.sector))) continue;
    n += 1;
    by[s.sector] = (by[s.sector] || 0) + 1;
  }
  return { total: n, by };
}

async function main() {
  const markup = fs.readFileSync(HTML_PATH, 'utf8');
  const labeledSvg = fs.readFileSync(LABELED_PATH, 'utf8');
  const built = buildTheaterLayoutFromBolshoiMarkup(markup, labeledSvg);
  const hallW = built.hallWidth;
  const hallH = built.hallHeight;

  let keepParter = [];
  let layout = null;
  let mapId = null;

  if (WITH_DB) {
    const ticketPool = (await import('../ticketDb.js')).default;
    const db = await ticketPool.query(
      `SELECT id, layout_json, length(svg_markup) AS svg_len
       FROM getbilet_stage_maps WHERE stage_external_id = $1`,
      [STAGE_ID],
    );
    if (!db.rows[0]) throw new Error(`No stage map ${STAGE_ID}`);
    mapId = db.rows[0].id;
    layout = db.rows[0].layout_json;
    const prodSeats = Array.isArray(layout.seats) ? layout.seats : [];
    keepParter = prodSeats.filter(isParter).map((s) => ({ ...s }));
    await ticketPool.end();
  } else if (fs.existsSync(BUNDLE_OUT)) {
    const bundle = JSON.parse(fs.readFileSync(BUNDLE_OUT, 'utf8'));
    const prodSeats = Array.isArray(bundle.seats) ? bundle.seats : [];
    keepParter = prodSeats.filter(isParter).map((s) => ({ ...s }));
  }

  const rebuiltNonParter = built.seats
    .filter((s) => !isParter(s) && !isUnsigned(s))
    .map((s) => ({
      sector: s.sector,
      row: String(s.row ?? ''),
      seat: String(s.seat ?? ''),
      xPct: Number(s.xPct),
      yPct: Number(s.yPct),
    }));

  const working = [...rebuiltNonParter];
  const before1 = count1Yarus(working);
  const beforeFronts = tierFronts(working, hallW, hallH);
  const beforeTally = tallySideBoxes(working);

  const mirror = mirrorTier2Right(working, hallW, hallH);
  const align = alignSideTierFronts(working, hallW, hallH);

  const merged = [...keepParter, ...working];
  const after1 = count1Yarus(working);
  const afterTally = tallySideBoxes(working);

  const report = {
    apply: APPLY,
    withDb: WITH_DB,
    hall: { w: hallW, h: hallH },
    keptParter: keepParter.length,
    nonParter: working.length,
    total: merged.length,
    mirror2Right: mirror,
    frontsBefore: beforeFronts,
    frontsAfter: align.after,
    shifts: align.shifts,
    tallyBefore: beforeTally,
    tallyAfter: afterTally,
    lozhi1Before: before1.total,
    lozhi1After: after1.total,
    lozhi1ByBoxSample: Object.fromEntries(Object.entries(after1.by).slice(0, 8)),
  };
  console.log(JSON.stringify(report, null, 2));

  if (!APPLY) {
    console.log('\nDry-run only. APPLY=1 to write SVG+bundle; WITH_DB=1 for DB.');
    return;
  }

  const places = seatsToPlaces(merged, hallW, hallH);
  const svgMarkup = buildBolshoiHistoricalHallSvg(places, [], hallW, hallH);

  fs.mkdirSync(path.dirname(SVG_OUT), { recursive: true });
  fs.writeFileSync(SVG_OUT, `${svgMarkup}\n`, 'utf8');

  const bundle = {
    builtAt: new Date().toISOString(),
    stageExternalId: STAGE_ID,
    hallWidth: hallW,
    hallHeight: hallH,
    note: 'align side-tier fronts + mirror 2ярус R; parter kept',
    seats: merged.map((s) => ({
      sector: s.sector,
      row: String(s.row ?? ''),
      seat: String(s.seat ?? ''),
      xPct: Number(s.xPct),
      yPct: Number(s.yPct),
    })),
  };
  fs.mkdirSync(path.dirname(BUNDLE_OUT), { recursive: true });
  fs.writeFileSync(BUNDLE_OUT, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');

  if (WITH_DB) {
    const ticketPool = (await import('../ticketDb.js')).default;
    const db = await ticketPool.query(
      `SELECT id, layout_json FROM getbilet_stage_maps WHERE stage_external_id = $1`,
      [STAGE_ID],
    );
    const prev = db.rows[0].layout_json || {};
    const nextLayout = {
      ...prev,
      seats: bundle.seats,
      allSeatCoordinates: bundle.seats.map((s) => ({ xPct: s.xPct, yPct: s.yPct })),
      pbilet: { ...(prev.pbilet || {}), hallWidth: hallW, hallHeight: hallH },
      bolshoiHistorical: {
        ...(prev.bolshoiHistorical || {}),
        hallWidth: hallW,
        hallHeight: hallH,
        placeCount: bundle.seats.length,
        alignedSideTiersAt: new Date().toISOString(),
        keptParterCount: keepParter.length,
        mirrored2Right: mirror.added,
        sideTierShifts: align.shifts,
      },
      note: `bolshoi align side tiers; parter=${keepParter.length}; nonParter=${working.length}; mirror2R=${mirror.added}`,
    };
    await ticketPool.query(
      `UPDATE getbilet_stage_maps
       SET svg_markup = $1, layout_json = $2::jsonb, updated_at = NOW()
       WHERE id = $3`,
      [svgMarkup, JSON.stringify(nextLayout), db.rows[0].id],
    );
    console.log(JSON.stringify({ writtenDb: true, mapId: db.rows[0].id, seats: bundle.seats.length }, null, 2));
    await ticketPool.end();
  }

  console.log(
    JSON.stringify(
      { writtenSvg: SVG_OUT, svgBytes: svgMarkup.length, bundleSeats: bundle.seats.length },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
