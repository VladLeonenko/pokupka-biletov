/**
 * Редактор координат/разметки мест — Суперкубок NN (pbilet layout 488).
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
import { normalizeSectorLabel, sectorNormsMatch } from '../utils/ticketHallSectorNormalize.js';
import { createHallSvgEditorHandlers } from '../utils/hallSeatEditorSvgRoutes.js';
import { buildHallEnrichedSvg } from '../utils/buildHallEnrichedSvg.js';
import { pathBBox } from '../utils/hallSeatGeodesyFromDots.js';
import { SUPERKUP_NN_STAGE_MAP_KEY } from '../utils/footballStadiumRepertoires.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const STAGE_ID = SUPERKUP_NN_STAGE_MAP_KEY;
const BUNDLE_PATH = path.join(
  REPO_ROOT,
  'backend/data/supercup-nn/hand/supercup-nn-football-seats.bundle.json',
);
const SVG_PUBLIC = '/hall-maps/supercup-nn-football.svg';
const ENRICHED_SVG_PUBLIC = 'supercup-nn-football-enriched.svg';
const ENRICHED_SVG_PUBLIC_ABS = path.join(REPO_ROOT, 'frontend/public/tools', ENRICHED_SVG_PUBLIC);
const ENRICHED_SVG_HAND_ABS = path.join(
  REPO_ROOT,
  'backend/data/supercup-nn/hand/supercup-nn-football-enriched.svg',
);
const DEFAULT_HALL_W = 8943;
const DEFAULT_HALL_H = 7326;

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
    hallW:
      Number(pb.coordinateWidth) ||
      Number(pb.hallWidth) ||
      DEFAULT_HALL_W,
    hallH:
      Number(pb.coordinateHeight) ||
      Number(pb.hallHeight) ||
      DEFAULT_HALL_H,
  };
}

function mergeSeatsOntoBackground(layout, manualSeats) {
  const { hallW, hallH } = hallDimensions(layout);
  const existing = Array.isArray(layout?.seats) ? layout.seats : [];
  const bg = Array.isArray(layout?.allSeatCoordinates) ? layout.allSeatCoordinates : [];

  /** @type {Map<string, object>} */
  const manualBySeat = new Map();
  /** @type {Map<string, object>} */
  const manualByCoord = new Map();
  for (const s of manualSeats) {
    manualBySeat.set(seatKey(s.sector, s.row, s.seat), s);
    manualByCoord.set(`${Number(s.xPct).toFixed(4)}|${Number(s.yPct).toFixed(4)}`, s);
  }

  const out = [];
  const seenKeys = new Set();

  // Сохраняем pbilet/прошлые места; manual перекрывает по sector|row|seat.
  for (const s of existing) {
    const sk = seatKey(s.sector, s.row, s.seat);
    const manual = manualBySeat.get(sk);
    if (manual) {
      if (!seenKeys.has(sk)) {
        seenKeys.add(sk);
        out.push(manual);
      }
      manualBySeat.delete(sk);
      manualByCoord.delete(`${Number(manual.xPct).toFixed(4)}|${Number(manual.yPct).toFixed(4)}`);
      continue;
    }
    const ck = `${Number(s.xPct).toFixed(4)}|${Number(s.yPct).toFixed(4)}`;
    if (manualByCoord.has(ck)) continue;
    if (!seenKeys.has(sk)) {
      seenKeys.add(sk);
      out.push(s);
    }
  }

  // Новые manual на точках облака (не было в existing).
  for (const pt of bg) {
    const xPct = Number(pt?.xPct ?? pt?.x);
    const yPct = Number(pt?.yPct ?? pt?.y);
    if (!Number.isFinite(xPct) || !Number.isFinite(yPct)) continue;
    const ck = `${xPct.toFixed(4)}|${yPct.toFixed(4)}`;
    const labeled = manualByCoord.get(ck);
    if (!labeled) continue;
    const sk = seatKey(labeled.sector, labeled.row, labeled.seat);
    if (seenKeys.has(sk)) {
      manualByCoord.delete(ck);
      manualBySeat.delete(sk);
      continue;
    }
    seenKeys.add(sk);
    out.push(labeled);
    manualByCoord.delete(ck);
    manualBySeat.delete(sk);
  }

  for (const s of manualBySeat.values()) {
    const sk = seatKey(s.sector, s.row, s.seat);
    if (seenKeys.has(sk)) continue;
    seenKeys.add(sk);
    out.push(s);
  }

  return { seats: out, hallW, hallH };
}

function resolveSectorMeta(sectors, sectorQuery) {
  const q = String(sectorQuery || '').trim();
  if (!q) return null;
  return (
    sectors.find(
      (s) =>
        sectorNormsMatch(s?.label, q) ||
        normalizeSectorLabel(s?.label) === normalizeSectorLabel(q),
    ) || null
  );
}

/** Точки чаши только в bbox сектора — иначе редактор падает на 43k circle. */
function filterCloudForSector(allCoords, sectorQuery, sectors, hallW, hallH) {
  const meta = resolveSectorMeta(sectors, sectorQuery);
  if (!meta?.path) return { coords: [], sectorLabel: meta?.label || sectorQuery };
  const bb = pathBBox(meta.path);
  if (!bb) return { coords: [], sectorLabel: meta.label };
  const margin = 120;
  const coords = (allCoords || []).filter((pt) => {
    const x = (Number(pt?.xPct) / 100) * hallW;
    const y = (Number(pt?.yPct) / 100) * hallH;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
    return (
      x >= bb.minX - margin &&
      x <= bb.maxX + margin &&
      y >= bb.minY - margin &&
      y <= bb.maxY + margin
    );
  });
  return { coords, sectorLabel: meta.label };
}

function filterLabeledSeatsForSector(labeledSeats, sectorQuery) {
  const q = String(sectorQuery || '').trim();
  if (!q) return labeledSeats || [];
  return (labeledSeats || []).filter((s) => sectorNormsMatch(s?.sector, q));
}

function readCachedFullEnrichedSvg() {
  for (const p of [ENRICHED_SVG_PUBLIC_ABS, ENRICHED_SVG_HAND_ABS]) {
    try {
      if (!fs.existsSync(p)) continue;
      const stat = fs.statSync(p);
      if (stat.size < 1000) continue;
      return fs.readFileSync(p, 'utf8');
    } catch {
      /* try next */
    }
  }
  return null;
}

function writeCachedFullEnrichedSvg(xml) {
  for (const p of [ENRICHED_SVG_PUBLIC_ABS, ENRICHED_SVG_HAND_ABS]) {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, xml, 'utf8');
  }
}

export async function buildSupercupEnrichedSvgMarkup(sectorQuery = '', opts = {}) {
  const row = await loadStageMapRow();
  if (!row?.svg_markup) throw new Error('stage map not in DB');
  const layout = row.layout_json && typeof row.layout_json === 'object' ? row.layout_json : {};
  const bundle = readBundleFile();
  const layoutSeats = Array.isArray(layout.seats) ? layout.seats : [];
  const labeledSeats =
    bundle.exists && Array.isArray(bundle.seats) && bundle.seats.length ? bundle.seats : layoutSeats;
  const sectors =
    layout.sectorMode && typeof layout.sectorMode === 'object' && Array.isArray(layout.sectorMode.sectors)
      ? layout.sectorMode.sectors
      : [];
  const { hallW, hallH } = hallDimensions(layout);
  const cloudAll = Array.isArray(layout.allSeatCoordinates) ? layout.allSeatCoordinates : [];
  const sectorQ = String(sectorQuery || '').trim();
  const includeFullCloud = opts.includeFullCloud === true;
  /** Без сектора — только подложка + уже размеченные места (~1.7k). Полное облако 43k — только ?sector= или ?full=1. */
  const cloudForSvg = sectorQ
    ? filterCloudForSector(cloudAll, sectorQ, sectors, hallW, hallH).coords
    : includeFullCloud
      ? cloudAll
      : [];
  const labeledForSvg = sectorQ ? filterLabeledSeatsForSector(labeledSeats, sectorQ) : labeledSeats;

  return buildHallEnrichedSvg(row.svg_markup, {
    hallW,
    hallH,
    allSeatCoordinates: cloudForSvg,
    labeledSeats: labeledForSvg,
    denseCloud: cloudForSvg.length > 12000,
  });
}

async function loadStageMapRow() {
  const r = await ticketPool.query(
    `SELECT id, stage_external_id, title, svg_markup, layout_json, updated_at
     FROM getbilet_stage_maps WHERE stage_external_id = $1`,
    [STAGE_ID],
  );
  const row = r.rows[0] || null;
  if (!row?.layout_json || typeof row.layout_json !== 'object') return row;
  const layout = row.layout_json;
  const { hallW, hallH } = hallDimensions(layout);
  row.layout_json = {
    ...layout,
    pbilet: {
      ...(layout.pbilet && typeof layout.pbilet === 'object' ? layout.pbilet : {}),
      hallWidth: hallW,
      hallHeight: hallH,
      coordinateWidth: hallW,
      coordinateHeight: hallH,
    },
  };
  return row;
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
  editorMode: 'supercup-nn-football-editor',
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
      title: row?.title ?? 'Суперкубок NN',
      hasStageMap: Boolean(row),
      layoutSeatCount: layoutSeats.length,
      backgroundDotCount: Array.isArray(layout.allSeatCoordinates) ? layout.allSeatCoordinates.length : 0,
      hallWidth: hallW,
      hallHeight: hallH,
      bundle: { ...bundle, sectorNormCounts },
      svgUrl: SVG_PUBLIC,
      saveTokenRequired: isHallMapSaveTokenRequired(),
      editorUrl: '/tools/luzhniki-gray-cloud-enriched-hover.html?hallApi=supercup-nn-football-seats',
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/bundle', async (_req, res) => {
  try {
    const row = await loadStageMapRow();
    if (!row) {
      return res.status(404).json({ ok: false, error: 'stage map not seeded — npm run seed:supercup-nn-2026' });
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

router.get('/enriched.svg', async (req, res) => {
  try {
    const sector = typeof req.query.sector === 'string' ? req.query.sector.trim() : '';
    const fullCloud = req.query.full === '1' || req.query.full === 'true';
    let xml;
    if (fullCloud && !sector) {
      xml = readCachedFullEnrichedSvg();
      if (!xml) {
        xml = await buildSupercupEnrichedSvgMarkup('', { includeFullCloud: true });
        writeCachedFullEnrichedSvg(xml);
      }
    } else {
      xml = await buildSupercupEnrichedSvgMarkup(sector);
    }
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    if (sector) res.setHeader('X-Supercup-Editor-Sector', sector);
    return res.send(xml);
  } catch (e) {
    const cached = !req.query.sector ? readCachedFullEnrichedSvg() : null;
    if (cached) {
      res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Supercup-Editor-Fallback', 'cached-file');
      return res.send(cached);
    }
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
      maxZoomMultiplier: layout.maxZoomMultiplier ?? 12,
      sectorFocusZoomMultiplier: layout.sectorFocusZoomMultiplier ?? 12,
      stadiumMapKey: STAGE_ID,
      luzhnikiStadiumCheckout: true,
      seats,
    };

    fs.mkdirSync(path.dirname(BUNDLE_PATH), { recursive: true });
    const backup = backupExistingFile(BUNDLE_PATH);
    const bundlePayload = {
      builtAt: new Date().toISOString(),
      mode: 'supercup-nn-football-editor',
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
