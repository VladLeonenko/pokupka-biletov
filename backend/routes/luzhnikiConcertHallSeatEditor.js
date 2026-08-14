/**
 * Редактор координат/разметки мест — Лужники концерт (luzhniki-concert).
 * Тот же UI, что театры/стадионы: /tools/luzhniki-gray-cloud-enriched-hover.html?hallApi=luzhniki-concert-seats
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
import {
  luzhnikiSectorLookupNorms,
  normalizeSectorLabel,
  sectorNormsMatch,
} from '../utils/ticketHallSectorNormalize.js';
import { createHallSvgEditorHandlers } from '../utils/hallSeatEditorSvgRoutes.js';
import { LUZHNIKI_CONCERT_STAGE_MAP_KEY } from '../utils/luzhnikiConcertRepertoires.js';
import { LUZHNIKI_FOOTBALL_STAGE_MAP_KEY } from '../services/luzhnikiFootballStageMap.js';
import { LUZHNIKI_FOOTBALL_VIEWBOX } from '../utils/luzhnikiConcertToFootballTransform.js';
import {
  LUZHNIKI_PILOT_SEATS_REL_PATH,
  resetLuzhnikiSeatIndexCache,
} from '../utils/luzhnikiSeatIndexCache.js';
import { buildHallEnrichedSvg } from '../utils/buildHallEnrichedSvg.js';
import { isLuzhnikiConcertFreeZoneSector } from '../utils/luzhnikiConcertFreeZoneSeats.js';
import { isLuzhnikiConcertKeepSectorLabel } from '../utils/luzhnikiConcertSectorFilter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const STAGE_ID = LUZHNIKI_CONCERT_STAGE_MAP_KEY;
const BUNDLE_PATH = path.join(
  REPO_ROOT,
  'backend/data/luzhniki-geodesy/hand/luzhniki-concert-seats.bundle.json',
);
/** Разметка спорта — те же координаты/сектора, что совпадают с концертом. */
const SPORT_LABELED_BUNDLE_PATH = path.join(
  REPO_ROOT,
  'backend/data/luzhniki-geodesy/hand/bundle-luzhniki-gray-cloud-labeled-seats.json',
);
/** Sidecar для checkout (getLuzhnikiLabeledSeatIndex), отдельно от football pilot. */
const CONCERT_PILOT_REL = 'data/luzhniki-geodesy/hand/bundle-luzhniki-concert-pilot-seats.json';
const CONCERT_PILOT_ABS = path.join(REPO_ROOT, 'backend', CONCERT_PILOT_REL);
const SVG_PUBLIC = '/hall-maps/luzhniki-concert-football-space.svg';
const ENRICHED_SVG_PUBLIC = 'luzhniki-concert-enriched.svg';
const DEFAULT_HALL_W = LUZHNIKI_FOOTBALL_VIEWBOX.width;
const DEFAULT_HALL_H = LUZHNIKI_FOOTBALL_VIEWBOX.height;

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

function parseLayout(row) {
  let layout = row?.layout_json;
  if (typeof layout === 'string') {
    try {
      layout = JSON.parse(layout);
    } catch {
      layout = {};
    }
  }
  return layout && typeof layout === 'object' ? { ...layout } : {};
}

function hallDimensions(layout) {
  const pb = layout?.pbilet && typeof layout.pbilet === 'object' ? layout.pbilet : {};
  const geo = layout?.geodesy && typeof layout.geodesy === 'object' ? layout.geodesy : {};
  return {
    hallW:
      Number(pb.coordinateWidth) ||
      Number(pb.hallWidth) ||
      Number(geo.hallWidth) ||
      DEFAULT_HALL_W,
    hallH:
      Number(pb.coordinateHeight) ||
      Number(pb.hallHeight) ||
      Number(geo.hallHeight) ||
      DEFAULT_HALL_H,
  };
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

function readPilotSeatsFile(relOrAbs) {
  const candidates = [
    path.isAbsolute(relOrAbs) ? relOrAbs : path.join(REPO_ROOT, 'backend', relOrAbs),
    path.join(REPO_ROOT, 'backend', LUZHNIKI_PILOT_SEATS_REL_PATH),
  ];
  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (Array.isArray(raw) && raw.length) return raw;
    } catch {
      /* next */
    }
  }
  return [];
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

  for (const s of existing) {
    const sector = String(s?.sector ?? '').trim();
    const row = String(s?.row ?? '').trim();
    const seat = String(s?.seat ?? '').trim();
    if (!sector || !row || !seat) continue;
    const sk = seatKey(sector, row, seat);
    const hit = manualBySeat.get(sk);
    if (hit) {
      if (!seenKeys.has(sk)) {
        seenKeys.add(sk);
        out.push(hit);
      }
      continue;
    }
    if (!seenKeys.has(sk)) {
      seenKeys.add(sk);
      out.push({
        sector,
        row,
        seat,
        xPct: Number(s.xPct),
        yPct: Number(s.yPct),
        geodesySource: s.geodesySource ?? 'layout',
      });
    }
  }

  for (const pt of bg) {
    const xPct = Number(pt?.xPct ?? pt?.x);
    const yPct = Number(pt?.yPct ?? pt?.y);
    if (!Number.isFinite(xPct) || !Number.isFinite(yPct)) continue;
    const labeled = manualByCoord.get(`${xPct.toFixed(4)}|${yPct.toFixed(4)}`);
    if (!labeled) continue;
    const sk = seatKey(labeled.sector, labeled.row, labeled.seat);
    if (seenKeys.has(sk)) continue;
    seenKeys.add(sk);
    out.push(labeled);
  }

  for (const s of manualSeats) {
    const sk = seatKey(s.sector, s.row, s.seat);
    if (seenKeys.has(sk)) continue;
    seenKeys.add(sk);
    out.push(s);
  }

  return { seats: out, hallW, hallH };
}

async function loadFootballBackgroundCloud() {
  const r = await ticketPool.query(
    `SELECT layout_json FROM getbilet_stage_maps WHERE stage_external_id = $1`,
    [LUZHNIKI_FOOTBALL_STAGE_MAP_KEY],
  );
  const layout = parseLayout(r.rows[0]);
  return Array.isArray(layout.allSeatCoordinates) ? layout.allSeatCoordinates : [];
}

async function loadStageMapRow() {
  const r = await ticketPool.query(
    `SELECT id, stage_external_id, title, svg_markup, layout_json, updated_at
     FROM getbilet_stage_maps WHERE stage_external_id = $1`,
    [STAGE_ID],
  );
  const row = r.rows[0] || null;
  if (!row) return null;

  const layout = parseLayout(row);
  let seats = Array.isArray(layout.seats) ? layout.seats : [];
  if (!seats.length) {
    const fromConcertPilot = readPilotSeatsFile(CONCERT_PILOT_REL);
    const fromFootballPilot = fromConcertPilot.length
      ? []
      : readPilotSeatsFile(LUZHNIKI_PILOT_SEATS_REL_PATH);
    seats = fromConcertPilot.length ? fromConcertPilot : fromFootballPilot;
    if (seats.length) layout.seats = seats;
  }

  const cloud = Array.isArray(layout.allSeatCoordinates) ? layout.allSeatCoordinates : [];
  if (!cloud.length) {
    const footballCloud = await loadFootballBackgroundCloud();
    if (footballCloud.length) layout.allSeatCoordinates = footballCloud;
  }

  const { hallW, hallH } = hallDimensions(layout);
  layout.pbilet = {
    ...(layout.pbilet && typeof layout.pbilet === 'object' ? layout.pbilet : {}),
    hallWidth: hallW,
    hallHeight: hallH,
  };

  return { ...row, layout_json: layout };
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

/** Bundle спорта (тот же viewBox / те же сектора где совпадают). */
function readSportLabeledSeats() {
  if (!fs.existsSync(SPORT_LABELED_BUNDLE_PATH)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(SPORT_LABELED_BUNDLE_PATH, 'utf8'));
    return Array.isArray(raw?.seats) ? raw.seats : [];
  } catch {
    return [];
  }
}

/**
 * Разметка для SVG: концерт-bundle → иначе спорт-bundle → иначе layout.seats.
 * Рисуем как спорт (серые + data-*), не theater green+stroke.
 */
function resolveLabeledSeatsRaw(layout, concertBundle) {
  if (concertBundle?.exists && Array.isArray(concertBundle.seats) && concertBundle.seats.length) {
    return { seats: concertBundle.seats, source: 'concert-bundle' };
  }
  const sport = readSportLabeledSeats();
  if (sport.length) return { seats: sport, source: 'sport-bundle' };
  const layoutSeats = Array.isArray(layout?.seats) ? layout.seats : [];
  if (layoutSeats.length) return { seats: layoutSeats, source: 'layout.seats' };
  return { seats: [], source: 'none' };
}

function writeConcertPilotSeats(seats) {
  fs.mkdirSync(path.dirname(CONCERT_PILOT_ABS), { recursive: true });
  const backup = backupExistingFile(CONCERT_PILOT_ABS);
  fs.writeFileSync(CONCERT_PILOT_ABS, `${JSON.stringify(seats)}\n`, 'utf8');
  return backup;
}

async function persistCheckoutPilotFlags(seats, builtAt) {
  const row = await loadStageMapRow();
  if (!row) return;
  const layout = parseLayout(row);
  const nextLayout = {
    ...layout,
    seats,
    layoutSeatsStoredInFile: true,
    luzhnikiPilotSeatsFile: CONCERT_PILOT_REL,
    layoutSeatsCount: seats.length,
    luzhnikiPilotMergedAt: builtAt,
    stadiumMapKey: STAGE_ID,
    luzhnikiStadiumCheckout: true,
  };
  // Не тащим 77k cloud обратно в БД концерта — только для редактора в памяти.
  delete nextLayout.allSeatCoordinates;
  await ticketPool.query(
    `UPDATE getbilet_stage_maps
     SET layout_json = $2::jsonb, updated_at = NOW()
     WHERE stage_external_id = $1`,
    [STAGE_ID, JSON.stringify(nextLayout)],
  );
  resetLuzhnikiSeatIndexCache();
}

function escapeXmlAttr(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

/** Концерт SVG: data-name → data-sector (редактор ищет path[data-sector]). */
function ensurePathDataSectorAttrs(svgMarkup) {
  return String(svgMarkup || '').replace(/<path\b([^>]*?)(\/?)>/gi, (full, attrs, selfClose) => {
    if (/\bdata-sector\s*=/i.test(attrs)) return full;
    const m = attrs.match(/\bdata-name\s*=\s*["']([^"']+)["']/i);
    if (!m) return full;
    return `<path data-sector="${escapeXmlAttr(m[1])}"${attrs}${selfClose}>`;
  });
}

function pathAbsBBox(pathD) {
  const nums = String(pathD || '').match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi);
  if (!nums || nums.length < 4) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = Number(nums[i]);
    const y = Number(nums[i + 1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  if (!Number.isFinite(minX) || maxX <= minX || maxY <= minY) return null;
  return { minX, minY, maxX, maxY };
}

/** Как checkout maskFieldBackgroundDots: сцена / фан / танцпол — без точек. */
function fieldMaskExcludePctBoxes(layout, hallW, hallH) {
  const masks = Array.isArray(layout?.hallMapFieldMasks) ? layout.hallMapFieldMasks : [];
  const w = Math.max(1, hallW);
  const h = Math.max(1, hallH);
  /** @type {{ x0: number, y0: number, x1: number, y1: number }[]} */
  const boxes = [];
  for (const mask of masks) {
    if (!mask || typeof mask !== 'object') continue;
    const x = Number(mask.x);
    const y = Number(mask.y);
    const mw = Number(mask.w);
    const mh = Number(mask.h);
    if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(mw) && Number.isFinite(mh) && mw > 0 && mh > 0) {
      boxes.push({
        x0: (x / w) * 100,
        y0: (y / h) * 100,
        x1: ((x + mw) / w) * 100,
        y1: ((y + mh) / h) * 100,
      });
      continue;
    }
    const path = typeof mask.path === 'string' ? mask.path : '';
    const bb = pathAbsBBox(path);
    if (!bb) continue;
    const padX = (bb.maxX - bb.minX) * 0.03;
    const padY = (bb.maxY - bb.minY) * 0.03;
    boxes.push({
      x0: ((bb.minX - padX) / w) * 100,
      y0: ((bb.minY - padY) / h) * 100,
      x1: ((bb.maxX + padX) / w) * 100,
      y1: ((bb.maxY + padY) / h) * 100,
    });
  }
  return boxes;
}

function pointInExcludeBoxes(xPct, yPct, boxes) {
  for (const b of boxes) {
    if (xPct >= b.x0 && xPct <= b.x1 && yPct >= b.y0 && yPct <= b.y1) return true;
  }
  return false;
}

/** Трибуны концертной схемы (без сцены/фан/танцпол) — только они участвуют в разметке. */
function concertTribuneSectors(layout) {
  const sectors =
    layout?.sectorMode && typeof layout.sectorMode === 'object' && Array.isArray(layout.sectorMode.sectors)
      ? layout.sectorMode.sectors
      : [];
  return sectors.filter((s) => {
    const label = String(s?.label ?? '');
    if (!isLuzhnikiConcertKeepSectorLabel(label)) return false;
    if (isLuzhnikiConcertFreeZoneSector(label)) return false;
    return Boolean(s?.path);
  });
}

function concertTribuneNormSet(tribuneSectors) {
  const norms = new Set();
  for (const s of tribuneSectors) {
    for (const n of luzhnikiSectorLookupNorms(s.label)) norms.add(n);
  }
  return norms;
}

/** Абсолютные bbox трибун (не pct) — для облака. */
function concertTribuneAbsBoxes(tribuneSectors) {
  /** @type {{ minX: number, minY: number, maxX: number, maxY: number }[]} */
  const boxes = [];
  for (const s of tribuneSectors) {
    const bb = pathAbsBBox(s.path);
    if (!bb) continue;
    const padX = (bb.maxX - bb.minX) * 0.01;
    const padY = (bb.maxY - bb.minY) * 0.01;
    boxes.push({
      minX: bb.minX - padX,
      minY: bb.minY - padY,
      maxX: bb.maxX + padX,
      maxY: bb.maxY + padY,
    });
  }
  return boxes;
}

function pointInAbsBoxes(x, y, boxes) {
  for (const b of boxes) {
    if (x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY) return true;
  }
  return false;
}

function filterSeatsForConcertEditor(seats, fieldExcludePct, tribuneNorms, tribuneAbsBoxes, hallW, hallH) {
  return seats.filter((s) => {
    if (isLuzhnikiConcertFreeZoneSector(s?.sector)) return false;
    const norms = luzhnikiSectorLookupNorms(s?.sector);
    if (!norms.some((n) => tribuneNorms.has(n))) return false;
    const xPct = Number(s?.xPct ?? s?.x);
    const yPct = Number(s?.yPct ?? s?.y);
    if (!Number.isFinite(xPct) || !Number.isFinite(yPct)) return false;
    if (pointInExcludeBoxes(xPct, yPct, fieldExcludePct)) return false;
    const x = (xPct / 100) * hallW;
    const y = (yPct / 100) * hallH;
    return pointInAbsBoxes(x, y, tribuneAbsBoxes);
  });
}

function filterCloudForConcertEditor(cloud, fieldExcludePct, tribuneAbsBoxes, hallW, hallH) {
  return cloud.filter((pt) => {
    const xPct = Number(pt?.xPct ?? pt?.x);
    const yPct = Number(pt?.yPct ?? pt?.y);
    if (!Number.isFinite(xPct) || !Number.isFinite(yPct)) return false;
    if (pointInExcludeBoxes(xPct, yPct, fieldExcludePct)) return false;
    const x = (xPct / 100) * hallW;
    const y = (yPct / 100) * hallH;
    // За сценой / B / ложи / углы вне концертных трибун — не рисуем
    return pointInAbsBoxes(x, y, tribuneAbsBoxes);
  });
}

function resolveTribuneSector(tribunes, sectorQuery) {
  const q = String(sectorQuery || '').trim();
  if (!q) return null;
  return (
    tribunes.find(
      (s) =>
        sectorNormsMatch(s?.label, q) ||
        normalizeSectorLabel(s?.label) === normalizeSectorLabel(q),
    ) || null
  );
}

/** Как Суперкубок: точки только в bbox одного сектора — иначе вкладка падает на 40k+ circle. */
function filterCloudForOneSector(cloud, sectorMeta, hallW, hallH) {
  if (!sectorMeta?.path) return [];
  const bb = pathAbsBBox(sectorMeta.path);
  if (!bb) return [];
  const margin = 80;
  return (cloud || []).filter((pt) => {
    const x = (Number(pt?.xPct ?? pt?.x) / 100) * hallW;
    const y = (Number(pt?.yPct ?? pt?.y) / 100) * hallH;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
    return (
      x >= bb.minX - margin &&
      x <= bb.maxX + margin &&
      y >= bb.minY - margin &&
      y <= bb.maxY + margin
    );
  });
}

/**
 * Полное облако как у спорта: серые точки + data-* с разметки спорта/bundle.
 * Без theater green+stroke. Режем сцену/фан/мёртвые зоны концерта.
 * @param {string} [sectorQuery]
 */
async function buildConcertEnrichedSvgMarkup(sectorQuery = '') {
  const row = await loadStageMapRow();
  if (!row?.svg_markup) throw new Error('stage map not in DB');
  const layout = row.layout_json && typeof row.layout_json === 'object' ? row.layout_json : {};
  const bundle = readBundleFile();
  const resolved = resolveLabeledSeatsRaw(layout, bundle);
  const labeledRaw = resolved.seats;
  const { hallW, hallH } = hallDimensions(layout);
  const fieldExclude = fieldMaskExcludePctBoxes(layout, hallW, hallH);
  const tribunes = concertTribuneSectors(layout);
  const tribuneNorms = concertTribuneNormSet(tribunes);
  const tribuneBoxes = concertTribuneAbsBoxes(tribunes);
  const sectorQ = String(sectorQuery || '').trim();
  const sectorMeta = resolveTribuneSector(tribunes, sectorQ);

  let cloud = filterCloudForConcertEditor(
    Array.isArray(layout.allSeatCoordinates) ? layout.allSeatCoordinates : [],
    fieldExclude,
    tribuneBoxes,
    hallW,
    hallH,
  );
  let labeledSeats = filterSeatsForConcertEditor(
    labeledRaw,
    fieldExclude,
    tribuneNorms,
    tribuneBoxes,
    hallW,
    hallH,
  );
  if (sectorQ) {
    cloud = filterCloudForOneSector(cloud, sectorMeta, hallW, hallH);
    labeledSeats = labeledSeats.filter((s) => sectorNormsMatch(s?.sector, sectorQ));
  }

  const svgMarkup = ensurePathDataSectorAttrs(row.svg_markup);
  return buildHallEnrichedSvg(svgMarkup, {
    hallW,
    hallH,
    allSeatCoordinates: cloud,
    labeledSeats,
    denseCloud: true,
  });
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
  editorMode: 'luzhniki-concert-editor',
});

router.get('/status', async (_req, res) => {
  try {
    const row = await loadStageMapRow();
    const bundle = readBundleFile();
    const layout = row?.layout_json && typeof row.layout_json === 'object' ? row.layout_json : {};
    const resolved = resolveLabeledSeatsRaw(layout, bundle);
    const { hallW, hallH } = hallDimensions(layout);
    /** @type {Record<string, number>} */
    const sectorNormCounts = {};
    for (const s of resolved.seats) {
      const n = normalizeSectorLabel(s?.sector);
      if (!n) continue;
      sectorNormCounts[n] = (sectorNormCounts[n] || 0) + 1;
    }
    return res.json({
      ok: true,
      stageId: STAGE_ID,
      title: 'Лужники — концерт (БСА)',
      hasStageMap: Boolean(row?.svg_markup),
      layoutSeatCount: Array.isArray(layout.seats) ? layout.seats.length : 0,
      backgroundDotCount: Array.isArray(layout.allSeatCoordinates) ? layout.allSeatCoordinates.length : 0,
      labeledSource: resolved.source,
      labeledSeatCount: resolved.seats.length,
      hallWidth: hallW,
      hallHeight: hallH,
      svgUrl: SVG_PUBLIC,
      saveTokenRequired: isHallMapSaveTokenRequired(),
      editorUrl: '/tools/luzhniki-gray-cloud-enriched-hover.html?hallApi=luzhniki-concert-seats',
      bundle: { ...bundle, sectorNormCounts },
      checkoutHint:
        'Checkout Баста/концерт: schema luzhniki-concert; sellable из pilot/layout.seats; фан/танцпол — по зоне.',
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/bundle', async (_req, res) => {
  try {
    const row = await loadStageMapRow();
    if (!row) {
      return res.status(404).json({
        ok: false,
        error: 'stage map not seeded — cd backend && npm run seed:luzhniki-concert-map',
      });
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
    const xml = await buildConcertEnrichedSvgMarkup(sector);
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    if (sector) res.setHeader('X-Luzhniki-Concert-Editor-Sector', sector);
    return res.send(xml);
  } catch (e) {
    console.error('[luzhniki-concert-seats] enriched.svg', e);
    return res.status(e.message?.includes('not in DB') ? 404 : 500).json({
      ok: false,
      error: e.message || String(e),
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
      const bundle = readBundleFile();
      const seats = bundle.seats.length ? bundle.seats : [];
      const pilotBackup = seats.length ? writeConcertPilotSeats(seats) : null;
      if (seats.length) {
        await persistCheckoutPilotFlags(seats, result.builtAt || new Date().toISOString());
      }
      return res.json({ ok: true, ...result, pilotBackup, concertPilot: CONCERT_PILOT_REL });
    } catch (e) {
      if (e.code === 'NO_LABELED_SEATS') {
        return res.status(400).json({ ok: false, error: e.message, labeledSeats: 0, svgSaved: false });
      }
      return res.status(500).json({ ok: false, error: e.message });
    }
  },
);

router.post('/', express.json({ limit: '32mb' }), async (req, res) => {
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

    const builtAt = new Date().toISOString();
    const nextLayout = {
      ...layout,
      layoutMode: 'svgNative',
      preferLayoutSeatPositions: true,
      maxZoomMultiplier: layout.maxZoomMultiplier ?? 12,
      sectorFocusZoomMultiplier: layout.sectorFocusZoomMultiplier ?? 12,
      stadiumMapKey: STAGE_ID,
      luzhnikiStadiumCheckout: true,
      seats,
      layoutSeatsStoredInFile: true,
      luzhnikiPilotSeatsFile: CONCERT_PILOT_REL,
      layoutSeatsCount: seats.length,
      luzhnikiPilotMergedAt: builtAt,
    };
    delete nextLayout.allSeatCoordinates;

    fs.mkdirSync(path.dirname(BUNDLE_PATH), { recursive: true });
    const backup = backupExistingFile(BUNDLE_PATH);
    const bundlePayload = {
      builtAt,
      mode: 'luzhniki-concert-editor',
      stageId: STAGE_ID,
      hallWidth: hallW,
      hallHeight: hallH,
      seatCount: seats.length,
      labeledSeatCount: seats.length,
      seats,
    };
    fs.writeFileSync(BUNDLE_PATH, `${JSON.stringify(bundlePayload, null, 2)}\n`, 'utf8');
    const pilotBackup = writeConcertPilotSeats(seats);

    await ticketPool.query(
      `UPDATE getbilet_stage_maps
       SET layout_json = $2::jsonb,
           notes_internal = COALESCE(notes_internal, '') || $3,
           updated_at = NOW()
       WHERE stage_external_id = $1`,
      [
        STAGE_ID,
        JSON.stringify(nextLayout),
        `\n[${builtAt}] concert editor save: ${seats.length} seats`,
      ],
    );
    resetLuzhnikiSeatIndexCache();

    return res.json({
      ok: true,
      labeledSeats: seats.length,
      sectorNormCounts,
      builtAt,
      backup,
      pilotBackup,
      concertPilot: CONCERT_PILOT_REL,
      paths: { bundle: BUNDLE_PATH, pilot: CONCERT_PILOT_ABS },
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
