/**
 * Enriched SVG + POST /svg для редакторов залов (тот же UI, что Лужники).
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

import { buildHallEnrichedSvg } from './buildHallEnrichedSvg.js';
import { extractLabeledSeatsFromSvgMarkup } from './luzhnikiExtractSeatsFromEnrichedSvg.js';

/**
 * @param {{
 *   repoRoot: string;
 *   stageId: string;
 *   stageIdAliases?: string[];
 *   bundlePath: string;
 *   enrichedPublicRel: string;
 *   loadStageMapRow: () => Promise<{ svg_markup?: string; layout_json?: object } | null>;
 *   readBundleFile: () => { exists?: boolean; seats?: object[] };
 *   mergeSeatsOntoBackground: (layout: object, manualSeats: object[]) => { seats: object[]; hallW: number; hallH: number };
 *   backupExistingFile: (p: string) => string | null;
 *   editorMode: string;
 * }} cfg
 */
export function createHallSvgEditorHandlers(cfg) {
  const enrichedPublicAbs = path.join(cfg.repoRoot, 'frontend/public/tools', path.basename(cfg.enrichedPublicRel));
  const stageIds = [...new Set([cfg.stageId, ...(cfg.stageIdAliases || [])].filter(Boolean))];

  async function buildEnrichedSvgMarkup() {
    const row = await cfg.loadStageMapRow();
    if (!row?.svg_markup) throw new Error('stage map not in DB');
    const layout = row.layout_json && typeof row.layout_json === 'object' ? row.layout_json : {};
    const bundle = cfg.readBundleFile();
    const layoutSeats = Array.isArray(layout.seats) ? layout.seats : [];
    const labeledSeats =
      bundle.exists && Array.isArray(bundle.seats) && bundle.seats.length ? bundle.seats : layoutSeats;
    const pb = layout?.pbilet && typeof layout.pbilet === 'object' ? layout.pbilet : {};
    const hallW = Number(pb.hallWidth);
    const hallH = Number(pb.hallHeight);
    return buildHallEnrichedSvg(row.svg_markup, {
      hallW: Number.isFinite(hallW) && hallW > 0 ? hallW : undefined,
      hallH: Number.isFinite(hallH) && hallH > 0 ? hallH : undefined,
      allSeatCoordinates: Array.isArray(layout.allSeatCoordinates) ? layout.allSeatCoordinates : [],
      labeledSeats,
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

    const { seats, hallW, hallH } = cfg.mergeSeatsOntoBackground(layout, manualSeats);
    const nextLayout = {
      ...layout,
      layoutMode: 'svgNative',
      preferLayoutSeatPositions: true,
      maxZoomMultiplier: layout.maxZoomMultiplier ?? 2,
      sectorFocusZoomMultiplier: layout.sectorFocusZoomMultiplier ?? 2,
      hallKind: layout.hallKind ?? 'theater',
      seats,
    };

    fs.mkdirSync(path.dirname(cfg.bundlePath), { recursive: true });
    fs.mkdirSync(path.dirname(enrichedPublicAbs), { recursive: true });
    const backup = cfg.backupExistingFile(cfg.bundlePath);
    const enrichedBackup = cfg.backupExistingFile(enrichedPublicAbs);

    fs.writeFileSync(enrichedPublicAbs, xml, 'utf8');
    fs.writeFileSync(`${enrichedPublicAbs}.gz`, zlib.gzipSync(xml, { level: 9 }));

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
       SET layout_json = $2::jsonb,
           notes_internal = COALESCE(notes_internal, '') || $3,
           updated_at = NOW()
       WHERE stage_external_id = ANY($1::text[])`,
      [
        stageIds,
        JSON.stringify(nextLayout),
        `\n[${bundlePayload.builtAt}] editor SVG save: ${seats.length} seats`,
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
