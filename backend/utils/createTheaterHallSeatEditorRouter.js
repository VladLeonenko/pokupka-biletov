/**
 * Unified theater/hall seat editor API — тот же UI, что Лужники
 * (`luzhniki-gray-cloud-enriched-hover.html?hallApi=…`).
 *
 * Новая схема: один вызов createTheaterHallSeatEditorRouter + app.use + запись в stage-map-editors.
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
} from './hallMapSaveToken.js';
import { pathBBox } from './hallSeatGeodesyFromDots.js';
import { normalizeSectorLabel, sectorNormsMatch } from './ticketHallSectorNormalize.js';
import { createHallSvgEditorHandlers } from './hallSeatEditorSvgRoutes.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const ALLOWED_TOOL_ORIGIN_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

/**
 * @param {{
 *   stageId: string;
 *   stageIdAliases?: string[];
 *   bundleRelPath: string;
 *   svgPublicPath: string;
 *   enrichedPublicFileName: string;
 *   defaultHallW?: number;
 *   defaultHallH?: number;
 *   editorMode: string;
 *   seedHint?: string;
 *   stadiumSectorCloud?: boolean;
 *   defaultHallKind?: string | null;
 * }} opts
 */
export function createTheaterHallSeatEditorRouter(opts) {
  const stageId = String(opts.stageId || '').trim();
  const stageIdAliases = [...new Set([stageId, ...(opts.stageIdAliases || [])].filter(Boolean))];
  const bundlePath = path.join(REPO_ROOT, opts.bundleRelPath);
  const svgPublic = opts.svgPublicPath;
  const enrichedPublic = opts.enrichedPublicFileName;
  const defaultHallW = Number(opts.defaultHallW) || 1494;
  const defaultHallH = Number(opts.defaultHallH) || 1292;
  const editorMode = opts.editorMode || 'theater-hall-editor';
  const seedHint = opts.seedHint || 'seed stage map';
  const stadiumSectorCloud = opts.stadiumSectorCloud === true;
  const hasDefaultHallKind = Object.prototype.hasOwnProperty.call(opts, 'defaultHallKind');

  const router = express.Router();

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

  function parseSvgHallSize(svgMarkup) {
    const m = String(svgMarkup || '').match(/viewBox=["']([^"']+)["']/i);
    if (!m) return null;
    const p = m[1].trim().split(/[\s,]+/).map(Number);
    if (p.length >= 4 && p[2] > 0 && p[3] > 0) return { hallW: p[2], hallH: p[3] };
    return null;
  }

  function hallDimensions(layout, svgMarkup) {
    const pb = layout?.pbilet && typeof layout.pbilet === 'object' ? layout.pbilet : {};
    const fromPbW = Number(pb.hallWidth) || Number(pb.coordinateWidth);
    const fromPbH = Number(pb.hallHeight) || Number(pb.coordinateHeight);
    if (fromPbW > 0 && fromPbH > 0) return { hallW: fromPbW, hallH: fromPbH };
    const fromSvg = parseSvgHallSize(svgMarkup);
    if (fromSvg) return fromSvg;
    return {
      hallW: defaultHallW,
      hallH: defaultHallH,
    };
  }

  function layoutSectors(layout) {
    return layout?.sectorMode && typeof layout.sectorMode === 'object' && Array.isArray(layout.sectorMode.sectors)
      ? layout.sectorMode.sectors
      : [];
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

  function filterCloudForSector(allCoords, sectorQuery, sectors, hallW, hallH, labeledSeats) {
    const meta = resolveSectorMeta(sectors, sectorQuery);
    const inHall = (pt) => {
      const xPct = Number(pt?.xPct);
      const yPct = Number(pt?.yPct);
      return Number.isFinite(xPct) && Number.isFinite(yPct) && xPct >= 0 && yPct >= 0 && xPct <= 102 && yPct <= 102;
    };
    const byPath = () => {
      if (!meta?.path) return [];
      const bb = pathBBox(meta.path);
      if (!bb) return [];
      const margin = 120;
      return (allCoords || []).filter((pt) => {
        if (!inHall(pt)) return false;
        const x = (Number(pt.xPct) / 100) * hallW;
        const y = (Number(pt.yPct) / 100) * hallH;
        return (
          x >= bb.minX - margin &&
          x <= bb.maxX + margin &&
          y >= bb.minY - margin &&
          y <= bb.maxY + margin
        );
      });
    };
    let coords = byPath();
    if (coords.length < 20 && Array.isArray(labeledSeats) && labeledSeats.length) {
      const sectorLabeled = labeledSeats.filter((s) => sectorNormsMatch(s?.sector, sectorQuery));
      if (sectorLabeled.length >= 2) {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const s of sectorLabeled) {
          minX = Math.min(minX, Number(s.xPct));
          minY = Math.min(minY, Number(s.yPct));
          maxX = Math.max(maxX, Number(s.xPct));
          maxY = Math.max(maxY, Number(s.yPct));
        }
        const pad = 1.8;
        const near = (allCoords || []).filter((pt) => {
          if (!inHall(pt)) return false;
          return (
            pt.xPct >= minX - pad &&
            pt.xPct <= maxX + pad &&
            pt.yPct >= minY - pad &&
            pt.yPct <= maxY + pad
          );
        });
        if (near.length > coords.length) coords = near;
      }
    }
    return { coords, sectorLabel: meta?.label || sectorQuery };
  }

  function filterLabeledSeatsForSector(labeledSeats, sectorQuery) {
    const q = String(sectorQuery || '').trim();
    if (!q) return labeledSeats || [];
    return (labeledSeats || []).filter((s) => sectorNormsMatch(s?.sector, q));
  }

  function mergeSeatsOntoBackground(layout, manualSeats) {
    const { hallW, hallH } = hallDimensions(layout);
    let incoming = manualSeats;
    if (stadiumSectorCloud) {
      const existing = (Array.isArray(layout?.seats) ? layout.seats : [])
        .map(normalizeSeatRow)
        .filter(Boolean);
      const touched = new Set(manualSeats.map((s) => normalizeSectorLabel(s.sector)));
      const kept = existing.filter((s) => !touched.has(normalizeSectorLabel(s.sector)));
      incoming = [...kept, ...manualSeats];
    }
    const bg = Array.isArray(layout?.allSeatCoordinates) ? layout.allSeatCoordinates : [];
    const byCoord = new Map();
    for (const s of incoming) {
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
    /** Нет фона-облака: сохраняем все ручные/извлечённые места. */
    if (bg.length < 1 && out.length < 1) {
      for (const s of incoming) {
        const sk = seatKey(s.sector, s.row, s.seat);
        if (seenKeys.has(sk)) continue;
        seenKeys.add(sk);
        out.push(s);
      }
    }
    return { seats: out, hallW, hallH };
  }

  async function loadStageMapRow() {
    const r = await ticketPool.query(
      `SELECT id, stage_external_id, title, svg_markup, layout_json, updated_at
       FROM getbilet_stage_maps
       WHERE stage_external_id = ANY($1::text[])
       ORDER BY CASE stage_external_id WHEN $2 THEN 0 ELSE 1 END, updated_at DESC NULLS LAST
       LIMIT 1`,
      [stageIdAliases, stageId],
    );
    return r.rows[0] || null;
  }

  function readBundleFile() {
    if (!fs.existsSync(bundlePath)) {
      return { exists: false, seats: [], labeledSeatCount: 0, builtAt: null, mtime: null };
    }
    const stat = fs.statSync(bundlePath);
    try {
      const raw = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
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
    stageId,
    stageIdAliases,
    bundlePath,
    enrichedPublicRel: enrichedPublic,
    loadStageMapRow,
    readBundleFile,
    mergeSeatsOntoBackground,
    backupExistingFile,
    editorMode,
    ...(hasDefaultHallKind ? { defaultHallKind: opts.defaultHallKind } : {}),
  });

  router.get('/status', async (_req, res) => {
    try {
      const row = await loadStageMapRow();
      const bundle = readBundleFile();
      const layout = row?.layout_json && typeof row.layout_json === 'object' ? row.layout_json : {};
      const layoutSeats = Array.isArray(layout.seats) ? layout.seats : [];
      /** @type {Record<string, number>} */
      const sectorNormCounts = {};
      for (const s of bundle.seats.length ? bundle.seats : layoutSeats) {
        const n = normalizeSectorLabel(s?.sector);
        if (!n) continue;
        sectorNormCounts[n] = (sectorNormCounts[n] || 0) + 1;
      }
      const { hallW, hallH } = hallDimensions(layout, row?.svg_markup);
      return res.json({
        ok: true,
        stageId,
        title: row?.title ?? null,
        hasStageMap: Boolean(row),
        layoutSeatCount: layoutSeats.length,
        backgroundDotCount: Array.isArray(layout.allSeatCoordinates) ? layout.allSeatCoordinates.length : 0,
        hallWidth: hallW,
        hallHeight: hallH,
        bundle: { ...bundle, sectorNormCounts },
        svgUrl: svgPublic,
        saveTokenRequired: isHallMapSaveTokenRequired(),
        stadiumSectorCloud,
        checkoutHint:
          'Checkout: координаты из layout_json.seats (preferLayoutSeatPositions). Цены/наличие — GetBilet.',
      });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.get('/bundle', async (_req, res) => {
    try {
      const row = await loadStageMapRow();
      if (!row) {
        return res.status(404).json({ ok: false, error: `stage map not seeded — ${seedHint}` });
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
      const { hallW, hallH } = hallDimensions(layout, row.svg_markup);
      return res.json({
        ok: true,
        stageId,
        title: row.title,
        hallWidth: hallW,
        hallHeight: hallH,
        svgUrl: svgPublic,
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
      let xml;
      if (stadiumSectorCloud) {
        const row = await loadStageMapRow();
        if (!row?.svg_markup) throw new Error('stage map not in DB');
        const layout = row.layout_json && typeof row.layout_json === 'object' ? row.layout_json : {};
        const bundle = readBundleFile();
        const layoutSeats = Array.isArray(layout.seats) ? layout.seats : [];
        const labeledSeats =
          bundle.exists && Array.isArray(bundle.seats) && bundle.seats.length ? bundle.seats : layoutSeats;
        const sectors = layoutSectors(layout);
        const { hallW, hallH } = hallDimensions(layout, row.svg_markup);
        const cloudAll = Array.isArray(layout.allSeatCoordinates) ? layout.allSeatCoordinates : [];
        const sectorQ = typeof req.query.sector === 'string' ? req.query.sector.trim() : '';
        const includeFullCloud = req.query.full === '1' || req.query.full === 'true';
        const cloudForSvg = sectorQ
          ? filterCloudForSector(cloudAll, sectorQ, sectors, hallW, hallH, labeledSeats).coords
          : includeFullCloud
            ? cloudAll.filter((pt) => {
                const xPct = Number(pt?.xPct);
                const yPct = Number(pt?.yPct);
                return Number.isFinite(xPct) && Number.isFinite(yPct) && xPct >= 0 && yPct >= 0 && xPct <= 102 && yPct <= 102;
              })
            : [];
        const labeledForSvg = sectorQ ? filterLabeledSeatsForSector(labeledSeats, sectorQ) : labeledSeats;
        xml = await svgEditor.buildEnrichedSvgMarkup({
          hallW,
          hallH,
          allSeatCoordinates: cloudForSvg,
          labeledSeats: labeledForSvg,
          denseCloud: cloudForSvg.length > 12000,
        });
        if (sectorQ) res.setHeader('X-Hall-Editor-Sector', sectorQ);
      } else {
        xml = await svgEditor.buildEnrichedSvgMarkup();
      }
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

      const hallKind =
        layout.hallKind || (hasDefaultHallKind ? opts.defaultHallKind : 'theater');
      const pb = layout.pbilet && typeof layout.pbilet === 'object' ? { ...layout.pbilet } : {};
      if (!Number(pb.hallWidth)) pb.hallWidth = hallW;
      if (!Number(pb.hallHeight)) pb.hallHeight = hallH;
      const nextLayout = {
        ...layout,
        layoutMode: 'svgNative',
        preferLayoutSeatPositions: true,
        ...(stadiumSectorCloud ? {} : { showSeatsAtOverview: true }),
        maxZoomMultiplier: layout.maxZoomMultiplier ?? 2,
        sectorFocusZoomMultiplier: layout.sectorFocusZoomMultiplier ?? 2,
        ...(hallKind ? { hallKind } : {}),
        pbilet: pb,
        seats,
      };

      fs.mkdirSync(path.dirname(bundlePath), { recursive: true });
      const backup = backupExistingFile(bundlePath);
      const bundlePayload = {
        builtAt: new Date().toISOString(),
        mode: editorMode,
        stageId,
        hallWidth: hallW,
        hallHeight: hallH,
        seatCount: seats.length,
        labeledSeatCount: seats.length,
        seats,
      };
      fs.writeFileSync(bundlePath, `${JSON.stringify(bundlePayload, null, 2)}\n`, 'utf8');

      await ticketPool.query(
        `UPDATE getbilet_stage_maps
         SET layout_json = $2::jsonb,
             notes_internal = COALESCE(notes_internal, '') || $3,
             updated_at = NOW()
         WHERE stage_external_id = ANY($1::text[])`,
        [
          stageIdAliases,
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
        paths: { bundle: bundlePath },
      });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  });

  return router;
}
