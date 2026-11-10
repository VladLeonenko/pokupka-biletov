/**
 * Enriched SVG + POST /svg для редакторов залов (тот же UI, что Лужники).
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

import { buildHallEnrichedSvg } from './buildHallEnrichedSvg.js';
import {
  extractAllCircleCoordinatesFromSvgMarkup,
  extractLabeledSeatsFromSvgMarkup,
} from './luzhnikiExtractSeatsFromEnrichedSvg.js';

function attrFromTag(attrs, name) {
  const re = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'i');
  const m = String(attrs || '').match(re);
  return m ? m[2] : '';
}

/** Контуры секторов из SVG (`data-sector` + `d`) → layout.sectorMode.sectors[].path */
export function extractSectorContourPathsFromSvgMarkup(xml) {
  /** @type {{ label: string, path: string }[]} */
  const out = [];
  const re = /<path\b([^>]*)>/gi;
  let m;
  while ((m = re.exec(String(xml || '')))) {
    const attrs = m[1] || '';
    const label = String(attrFromTag(attrs, 'data-sector') || '').trim();
    const d = String(attrFromTag(attrs, 'd') || '').trim();
    if (!label || !d) continue;
    out.push({ label, path: d });
  }
  return out;
}

function mergeSectorModePaths(layout, contourPaths) {
  if (!Array.isArray(contourPaths) || !contourPaths.length) return layout.sectorMode;
  const prev =
    layout.sectorMode && typeof layout.sectorMode === 'object' ? { ...layout.sectorMode } : { enabled: true };
  const prevSectors = Array.isArray(prev.sectors) ? prev.sectors : [];
  const byLabel = new Map(
    prevSectors.map((s) => [String(s?.label || '').trim().toLowerCase(), { ...s }]),
  );
  for (const c of contourPaths) {
    const key = String(c.label || '').trim().toLowerCase();
    if (!key) continue;
    const existing = byLabel.get(key);
    if (existing) {
      existing.path = c.path;
      byLabel.set(key, existing);
    } else {
      const id = key
        .replace(/[^a-zа-яё0-9]+/gi, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 64) || 'sector';
      byLabel.set(key, {
        id,
        label: c.label,
        path: c.path,
        maxQuantity: 8,
      });
    }
  }
  return {
    ...prev,
    enabled: true,
    sectors: [...byLabel.values()],
  };
}

/**
 * @param {{
 *   repoRoot: string;
 *   stageId: string;
 *   stageIdAliases?: string[];
 *   bundlePath: string;
 *   enrichedPublicRel: string;
 *   svgPublicRel?: string;
 *   loadStageMapRow: () => Promise<{ svg_markup?: string; layout_json?: object } | null>;
 *   readBundleFile: () => { exists?: boolean; seats?: object[] };
 *   mergeSeatsOntoBackground: (layout: object, manualSeats: object[]) => { seats: object[]; hallW: number; hallH: number };
 *   backupExistingFile: (p: string) => string | null;
 *   editorMode: string;
 *   defaultHallKind?: string | null;
 *   syncCloudFromSvg?: boolean;
 * }} cfg
 */
export function createHallSvgEditorHandlers(cfg) {
  const enrichedPublicAbs = path.join(cfg.repoRoot, 'frontend/public/tools', path.basename(cfg.enrichedPublicRel));
  const svgPublicAbs = cfg.svgPublicRel
    ? path.join(cfg.repoRoot, 'frontend/public', cfg.svgPublicRel.replace(/^\//, ''))
    : null;
  const stageIds = [...new Set([cfg.stageId, ...(cfg.stageIdAliases || [])].filter(Boolean))];

  async function buildEnrichedSvgMarkup(overrides = {}) {
    const row = await cfg.loadStageMapRow();
    if (!row?.svg_markup) throw new Error('stage map not in DB');
    const layout = row.layout_json && typeof row.layout_json === 'object' ? row.layout_json : {};
    const bundle = cfg.readBundleFile();
    const layoutSeats = Array.isArray(layout.seats) ? layout.seats : [];
    const labeledSeats =
      overrides.labeledSeats !== undefined
        ? overrides.labeledSeats
        : bundle.exists && Array.isArray(bundle.seats) && bundle.seats.length
          ? bundle.seats
          : layoutSeats;
    const pb = layout?.pbilet && typeof layout.pbilet === 'object' ? layout.pbilet : {};
    const hallW = Number(overrides.hallW ?? pb.hallWidth);
    const hallH = Number(overrides.hallH ?? pb.hallHeight);
    const cloud =
      overrides.allSeatCoordinates !== undefined
        ? overrides.allSeatCoordinates
        : Array.isArray(layout.allSeatCoordinates)
          ? layout.allSeatCoordinates
          : [];
    return buildHallEnrichedSvg(row.svg_markup, {
      hallW: Number.isFinite(hallW) && hallW > 0 ? hallW : undefined,
      hallH: Number.isFinite(hallH) && hallH > 0 ? hallH : undefined,
      allSeatCoordinates: cloud,
      labeledSeats,
      denseCloud: overrides.denseCloud,
    });
  }

  async function saveSvgMarkup(xml, ticketPool) {
    const row = await cfg.loadStageMapRow();
    if (!row) throw new Error('stage map not in DB');

    const extracted = extractLabeledSeatsFromSvgMarkup(xml);
    const labeledCount = extracted.labeledCount ?? extracted.seats.length;
    if (labeledCount < 1) {
      const err = new Error(
        'В SVG 0 мест с data-sector + data-row + data-seat. 〰 линия → ▶ Применить ряд',
      );
      err.code = 'NO_LABELED_SEATS';
      err.labeledSeats = 0;
      throw err;
    }

    const layout = row.layout_json && typeof row.layout_json === 'object' ? { ...row.layout_json } : {};
    const manualSeats = extracted.seats.map((s) => ({
      sector: s.sector,
      row: s.row,
      seat: s.seat,
      xPct: s.xPct,
      yPct: s.yPct,
      geodesySource: String(s.geodesySource || '').includes('manual') ? 'manual-editor' : 'editor-svg-extract',
    }));

    const syncCloud = cfg.syncCloudFromSvg === true;
    const cloudFromSvg = syncCloud ? extractAllCircleCoordinatesFromSvgMarkup(xml) : null;
    const layoutForMerge =
      syncCloud && Array.isArray(cloudFromSvg) && cloudFromSvg.length >= 1
        ? { ...layout, allSeatCoordinates: cloudFromSvg }
        : layout;

    const { seats, hallW, hallH } = cfg.mergeSeatsOntoBackground(layoutForMerge, manualSeats);
    const hallKind =
      layout.hallKind ||
      ('defaultHallKind' in cfg ? cfg.defaultHallKind : 'theater');
    const contourPaths = extractSectorContourPathsFromSvgMarkup(xml);
    const nextSectorMode = mergeSectorModePaths(layout, contourPaths);
    const nextLayout = {
      ...layout,
      layoutMode: 'svgNative',
      preferLayoutSeatPositions: true,
      maxZoomMultiplier: layout.maxZoomMultiplier ?? 2,
      sectorFocusZoomMultiplier: layout.sectorFocusZoomMultiplier ?? 2,
      ...(hallKind ? { hallKind } : {}),
      ...(syncCloud && Array.isArray(cloudFromSvg) && cloudFromSvg.length >= 1
        ? { allSeatCoordinates: cloudFromSvg }
        : {}),
      ...(nextSectorMode ? { sectorMode: nextSectorMode } : {}),
      seats,
    };

    fs.mkdirSync(path.dirname(cfg.bundlePath), { recursive: true });
    fs.mkdirSync(path.dirname(enrichedPublicAbs), { recursive: true });
    const backup = cfg.backupExistingFile(cfg.bundlePath);
    const enrichedBackup = cfg.backupExistingFile(enrichedPublicAbs);
    if (svgPublicAbs) cfg.backupExistingFile(svgPublicAbs);

    fs.writeFileSync(enrichedPublicAbs, xml, 'utf8');
    fs.writeFileSync(`${enrichedPublicAbs}.gz`, zlib.gzipSync(xml, { level: 9 }));
    if (svgPublicAbs) {
      fs.mkdirSync(path.dirname(svgPublicAbs), { recursive: true });
      fs.writeFileSync(svgPublicAbs, xml, 'utf8');
    }

    const bundlePayload = {
      builtAt: new Date().toISOString(),
      mode: cfg.editorMode,
      stageId: cfg.stageId,
      hallWidth: hallW,
      hallHeight: hallH,
      seatCount: seats.length,
      labeledSeatCount: seats.length,
      seats,
    };
    fs.writeFileSync(cfg.bundlePath, `${JSON.stringify(bundlePayload, null, 2)}\n`, 'utf8');

    await ticketPool.query(
      `UPDATE getbilet_stage_maps
       SET svg_markup = $2,
           layout_json = $3::jsonb,
           notes_internal = COALESCE(notes_internal, '') || $4,
           updated_at = NOW()
       WHERE stage_external_id = ANY($1::text[])`,
      [
        stageIds,
        xml,
        JSON.stringify(nextLayout),
        `\n[${bundlePayload.builtAt}] editor SVG save: ${seats.length} seats` +
          (contourPaths.length ? `; contours=${contourPaths.length}` : ''),
      ],
    );

    /** @type {Record<string, number>} */
    const sectorNormCounts = {};
    for (const s of seats) {
      const n = String(s.sector || '').trim().toLowerCase();
      if (!n) continue;
      sectorNormCounts[n] = (sectorNormCounts[n] || 0) + 1;
    }

    return {
      labeledSeats: seats.length,
      sectorNormCounts,
      builtAt: bundlePayload.builtAt,
      backup,
      enrichedBackup,
      paths: { bundle: cfg.bundlePath, enrichedSvg: enrichedPublicAbs },
    };
  }

  return { buildEnrichedSvgMarkup, saveSvgMarkup, enrichedPublicAbs };
}
