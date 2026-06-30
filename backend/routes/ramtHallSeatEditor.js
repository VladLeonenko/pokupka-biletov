/**
 * Редактор координат/разметки мест — РАМТ, Большая сцена.
 * Аналог vakhtangov-hall-seats: серые точки из allSeatCoordinates, правка рядов в UI.
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import ticketPool from '../ticketDb.js';
import {
  checkHallMapSaveAuth,
  HALL_MAP_SAVE_CORS_HEADERS,
  isHallMapSaveTokenRequired,
} from '../utils/hallMapSaveToken.js';
import { normalizeSectorLabel } from '../utils/ticketHallSectorNormalize.js';
import { createHallSvgEditorHandlers } from '../utils/hallSeatEditorSvgRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const STAGE_ID =
  process.env.RAMT_BIG_STAGE_EXTERNAL_ID?.trim() ||
  process.env.STAGE_MAP_STAGE_ID?.trim() ||
  'ramt-big-stage';
const BUNDLE_PATH = path.join(
  REPO_ROOT,
  'backend/data/ramt-geodesy/hand/ramt-big-stage-seats.bundle.json',
);
const SVG_PUBLIC = '/hall-maps/ramt-big-stage.svg';
const ENRICHED_SVG_PUBLIC = 'ramt-big-stage-enriched.svg';
const DEFAULT_HALL_W = 930;
const DEFAULT_HALL_H = 847;

const router = express.Router();

const ALLOWED_TOOL_ORIGIN_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

router.use((req, res, next) => {
  const origin = String(req.headers.origin || '');
  if (ALLOWED_TOOL_ORIGIN_RE.test(origin) || origin === 'https://biletvsem.com') {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', HALL_MAP_SAVE_CORS_HEADERS);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
});

function checkSaveAuth(req, res) {
  return checkHallMapSaveAuth(req, res);
}

function backupExistingFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${filePath}.${stamp}.bak`;
  fs.copyFileSync(filePath, backupPath);
  return backupPath;
}

function normalizeSeatRow(item) {
  const sector = String(item?.sector ?? item?.Sector ?? '').trim();
  const row = String(item?.row ?? item?.Row ?? '').trim();
  const seat = String(item?.seat ?? item?.Seat ?? '').trim();
  const xPct = Number(item?.xPct ?? item?.x_pct);
  const yPct = Number(item?.yPct ?? item?.y_pct);
  if (!sector || !row || !seat || !Number.isFinite(xPct) || !Number.isFinite(yPct)) return null;
  return {
    sector,
    row,
    seat,
    xPct,
    yPct,
    geodesySource: item?.geodesySource ?? item?.source ?? 'manual-editor',
  };
}

function seatKey(sector, row, seat) {
  return `${normalizeSectorLabel(sector)}|${String(row).trim().toLowerCase()}|${String(seat).trim().toLowerCase()}`;
}

function hallDimensions(layout) {
  const pb = layout?.pbilet && typeof layout.pbilet === 'object' ? layout.pbilet : {};
  return {
    hallW: Number(pb.hallWidth) || DEFAULT_HALL_W,
    hallH: Number(pb.hallHeight) || DEFAULT_HALL_H,
  };
}

function mergeSeatsOntoBackground(layout, manualSeats) {
  const { hallW, hallH } = hallDimensions(layout);
  const bg = Array.isArray(layout?.allSeatCoordinates) ? layout.allSeatCoordinates : [];
  const byCoord = new Map();
  for (const s of manualSeats) {
    byCoord.set(`${s.xPct.toFixed(4)}|${s.yPct.toFixed(4)}`, s);
  }
  const out = [];
  const seenKeys = new Set();
  for (const pt of bg) {
    const xPct = Number(pt?.xPct ?? pt?.x);
    const yPct = Number(pt?.yPct ?? pt?.y);
    if (!Number.isFinite(xPct) || !Number.isFinite(yPct)) continue;
    const k = `${xPct.toFixed(4)}|${yPct.toFixed(4)}`;
    const labeled = byCoord.get(k);
    if (labeled) {
      const sk = seatKey(labeled.sector, labeled.row, labeled.seat);
      if (!seenKeys.has(sk)) {
        seenKeys.add(sk);
        out.push(labeled);
      }
      byCoord.delete(k);
    }
  }
  for (const s of byCoord.values()) {
    const sk = seatKey(s.sector, s.row, s.seat);
    if (seenKeys.has(sk)) continue;
    seenKeys.add(sk);
    out.push(s);
  }
  return { seats: out, hallW, hallH };
}

async function loadStageMapRow() {
  const r = await ticketPool.query(
    `SELECT id, stage_external_id, title, svg_markup, layout_json, updated_at
     FROM getbilet_stage_maps WHERE stage_external_id = $1`,
    [STAGE_ID],
  );
  return r.rows[0] || null;
}

function readBundleFile() {
  if (!fs.existsSync(BUNDLE_PATH)) {
    return { exists: false, seats: [], labeledSeatCount: 0, builtAt: null, mtime: null };
  }
  const stat = fs.statSync(BUNDLE_PATH);
  try {
    const raw = JSON.parse(fs.readFileSync(BUNDLE_PATH, 'utf8'));
    const seats = Array.isArray(raw?.seats) ? raw.seats : [];
    return {
      exists: true,
      seats,
      labeledSeatCount: Number(raw.labeledSeatCount) || seats.length,
      builtAt: raw.builtAt ?? null,
      mtime: stat.mtime.toISOString(),
      mode: raw.mode ?? null,
    };
  } catch (e) {
    return {
      exists: true,
      seats: [],
      labeledSeatCount: 0,
      builtAt: null,
      mtime: stat.mtime.toISOString(),
      parseError: e.message,
    };
  }
}

const svgEditor = createHallSvgEditorHandlers({
  repoRoot: REPO_ROOT,
  stageId: STAGE_ID,
  bundlePath: BUNDLE_PATH,
  enrichedPublicRel: ENRICHED_SVG_PUBLIC,
  loadStageMapRow,
  readBundleFile,
  mergeSeatsOntoBackground,
  backupExistingFile,
  editorMode: 'ramt-luzhniki-editor',
});

router.get('/status', async (_req, res) => {
  try {
    const row = await loadStageMapRow();
    const bundle = readBundleFile();
    const layout = row?.layout_json && typeof row.layout_json === 'object' ? row.layout_json : {};
    const layoutSeats = Array.isArray(layout.seats) ? layout.seats : [];
    const { hallW, hallH } = hallDimensions(layout);
    /** @type {Record<string, number>} */
    const sectorNormCounts = {};
    for (const s of bundle.seats.length ? bundle.seats : layoutSeats) {
      const n = normalizeSectorLabel(s?.sector);
      if (!n) continue;
      sectorNormCounts[n] = (sectorNormCounts[n] || 0) + 1;
    }
    return res.json({
      ok: true,
      stageId: STAGE_ID,
      title: row?.title ?? null,
      hasStageMap: Boolean(row),
      layoutSeatCount: layoutSeats.length,
      backgroundDotCount: Array.isArray(layout.allSeatCoordinates) ? layout.allSeatCoordinates.length : 0,
      hallWidth: hallW,
      hallHeight: hallH,
      bundle: { ...bundle, sectorNormCounts },
      svgUrl: SVG_PUBLIC,
      saveTokenRequired: isHallMapSaveTokenRequired(),
      editorUrl: '/tools/ramt-hall-seats-editor.html',
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/bundle', async (_req, res) => {
  try {
    const row = await loadStageMapRow();
    if (!row) {
      return res.status(404).json({ ok: false, error: 'stage map not seeded — npm run seed:ramt-big-stage-map' });
    }
    const layout = row.layout_json && typeof row.layout_json === 'object' ? row.layout_json : {};
    const fileBundle = readBundleFile();
    const layoutSeats = Array.isArray(layout.seats) ? layout.seats : [];
    const seats =
      fileBundle.exists && fileBundle.seats.length > 0 ? fileBundle.seats : layoutSeats;
    const sectors =
      layout.sectorMode && typeof layout.sectorMode === 'object' && Array.isArray(layout.sectorMode.sectors)
        ? layout.sectorMode.sectors
        : [];
    const { hallW, hallH } = hallDimensions(layout);
    return res.json({
      ok: true,
      stageId: STAGE_ID,
      title: row.title,
      hallWidth: hallW,
      hallHeight: hallH,
      svgUrl: SVG_PUBLIC,
      allSeatCoordinates: Array.isArray(layout.allSeatCoordinates) ? layout.allSeatCoordinates : [],
      seats,
      sectors,
      sectorLabels: sectors.map((s) => s.label).filter(Boolean),
      bundleSource: fileBundle.exists && fileBundle.seats.length ? 'file' : 'db',
      updatedAt: row.updated_at,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/enriched.svg', async (_req, res) => {
  try {
    const xml = await svgEditor.buildEnrichedSvgMarkup();
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.send(xml);
  } catch (e) {
    return res.status(e.message?.includes('not in DB') ? 404 : 500).json({
      ok: false,
      error: e.message,
    });
  }
});

router.post(
  '/svg',
  express.text({ type: ['image/svg+xml', 'text/xml', 'application/xml', 'text/plain', '*/*'], limit: '64mb' }),
  async (req, res) => {
    if (!checkSaveAuth(req, res)) return;
    const body = typeof req.body === 'string' ? req.body.trim() : '';
    if (!body.includes('<svg')) {
      return res.status(400).json({ ok: false, error: 'expected SVG XML in body' });
    }
    const xml = body.startsWith('<?xml') ? body : `<?xml version="1.0" encoding="UTF-8"?>\n${body}`;
    try {
      const result = await svgEditor.saveSvgMarkup(xml, ticketPool);
      return res.json({ ok: true, ...result });
    } catch (e) {
      if (e.code === 'NO_LABELED_SEATS') {
        return res.status(400).json({ ok: false, error: e.message, labeledSeats: 0, svgSaved: false });
      }
      return res.status(500).json({ ok: false, error: e.message });
    }
  },
);

router.post('/', express.json({ limit: '16mb' }), async (req, res) => {
  if (!checkSaveAuth(req, res)) return;
  try {
    const row = await loadStageMapRow();
    if (!row) {
      return res.status(404).json({ ok: false, error: 'stage map not in DB' });
    }
    const layout =
      row.layout_json && typeof row.layout_json === 'object' ? { ...row.layout_json } : {};
    const rawSeats = Array.isArray(req.body?.seats) ? req.body.seats : [];
    const manualSeats = rawSeats.map(normalizeSeatRow).filter(Boolean);
    if (manualSeats.length < 1) {
      return res.status(400).json({
        ok: false,
        error: 'Нужен массив seats[{ sector, row, seat, xPct, yPct }] — минимум 1 место',
      });
    }

    const { seats, hallW, hallH } = mergeSeatsOntoBackground(layout, manualSeats);
    /** @type {Record<string, number>} */
    const sectorNormCounts = {};
    for (const s of seats) {
      const n = normalizeSectorLabel(s.sector);
      if (!n) continue;
      sectorNormCounts[n] = (sectorNormCounts[n] || 0) + 1;
    }

    const nextLayout = {
      ...layout,
      layoutMode: 'svgNative',
      preferLayoutSeatPositions: true,
      maxZoomMultiplier: layout.maxZoomMultiplier ?? 2,
      sectorFocusZoomMultiplier: layout.sectorFocusZoomMultiplier ?? 2,
      hallKind: 'theater',
      seats,
    };

    fs.mkdirSync(path.dirname(BUNDLE_PATH), { recursive: true });
    const backup = backupExistingFile(BUNDLE_PATH);
    const bundlePayload = {
      builtAt: new Date().toISOString(),
      mode: 'ramt-hall-editor',
      stageId: STAGE_ID,
      hallWidth: hallW,
      hallHeight: hallH,
      seatCount: seats.length,
      labeledSeatCount: seats.length,
      seats,
    };
    fs.writeFileSync(BUNDLE_PATH, `${JSON.stringify(bundlePayload, null, 2)}\n`, 'utf8');

    await ticketPool.query(
      `UPDATE getbilet_stage_maps
       SET layout_json = $2::jsonb,
           notes_internal = COALESCE(notes_internal, '') || $3,
           updated_at = NOW()
       WHERE stage_external_id = $1`,
      [
        STAGE_ID,
        JSON.stringify(nextLayout),
        `\n[${bundlePayload.builtAt}] editor save: ${seats.length} seats`,
      ],
    );

    return res.json({
      ok: true,
      labeledSeats: seats.length,
      sectorNormCounts,
      builtAt: bundlePayload.builtAt,
      backup,
      paths: { bundle: BUNDLE_PATH },
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
