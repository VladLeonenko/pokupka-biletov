import express from 'express';
import fs from 'fs';
import path from 'path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'url';

import { extractLabeledSeatsFromSvgMarkup } from '../utils/luzhnikiExtractSeatsFromEnrichedSvg.js';
import { resetGrayCloudLabeledIndexCache } from '../utils/luzhnikiGrayCloudLabeledIndex.js';
import { normalizeLuzhnikiGrayCloudSvgSectorAttrs } from '../utils/luzhnikiNormalizeGrayCloudSvgSectors.js';
import {
  getCachedTicketsSectorLabelByNorm,
  resolveCanonicalSectorLabel,
} from '../utils/luzhnikiSectorDisplayLabel.js';
import { normalizeSectorLabel } from '../utils/ticketHallSectorNormalize.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const HAND_SVG = path.join(REPO_ROOT, 'backend/data/luzhniki-geodesy/hand/luzhniki-gray-cloud-enriched.svg');
const PUBLIC_SVG = path.join(REPO_ROOT, 'frontend/public/tools/luzhniki-gray-cloud-enriched.svg');
const SEATS_BUNDLE = path.join(
  REPO_ROOT,
  'backend/data/luzhniki-geodesy/hand/bundle-luzhniki-gray-cloud-labeled-seats.json',
);

const router = express.Router();

function writeSvgFiles(filePath, xml) {
  fs.writeFileSync(filePath, xml, 'utf8');
  fs.writeFileSync(`${filePath}.gz`, zlib.gzipSync(xml, { level: 9 }));
}

function readBundleMeta() {
  if (!fs.existsSync(SEATS_BUNDLE)) {
    return { exists: false, seatCount: 0, labeledSeatCount: 0, mode: null, builtAt: null, mtime: null };
  }
  const stat = fs.statSync(SEATS_BUNDLE);
  try {
    const raw = JSON.parse(fs.readFileSync(SEATS_BUNDLE, 'utf8'));
    const seats = Array.isArray(raw?.seats) ? raw.seats : [];
    return {
      exists: true,
      seatCount: Number(raw.seatCount) || seats.length,
      labeledSeatCount: Number(raw.labeledSeatCount) || seats.length,
      mode: raw.mode ?? null,
      builtAt: raw.builtAt ?? null,
      mtime: stat.mtime.toISOString(),
    };
  } catch (e) {
    return {
      exists: true,
      seatCount: 0,
      labeledSeatCount: 0,
      mode: null,
      builtAt: null,
      mtime: stat.mtime.toISOString(),
      parseError: e.message,
    };
  }
}

/** Проверка: доехала ли разметка редактора до checkout (bundle на диске VPS). */
router.get('/status', (_req, res) => {
  const bundle = readBundleMeta();
  let handSvgBytes = 0;
  let publicSvgBytes = 0;
  try {
    if (fs.existsSync(HAND_SVG)) handSvgBytes = fs.statSync(HAND_SVG).size;
    if (fs.existsSync(PUBLIC_SVG)) publicSvgBytes = fs.statSync(PUBLIC_SVG).size;
  } catch {
    /* */
  }
    let manualInFile = 0;
    /** @type {Record<string, number>} */
    const sectorNormCounts = {};
    if (bundle.exists) {
      try {
        const raw = JSON.parse(fs.readFileSync(SEATS_BUNDLE, 'utf8'));
        const seats = Array.isArray(raw?.seats) ? raw.seats : [];
        manualInFile = seats.filter((s) => String(s?.geodesySource ?? '').includes('manual')).length;
        for (const s of seats) {
          const n = normalizeSectorLabel(s?.sector);
          if (!n) continue;
          sectorNormCounts[n] = (sectorNormCounts[n] || 0) + 1;
        }
      } catch {
        /* */
      }
    }

    let svgManualAttrs = 0;
    try {
      if (fs.existsSync(HAND_SVG)) {
        const svg = fs.readFileSync(HAND_SVG, 'utf8');
        svgManualAttrs = (svg.match(/data-source="manual/g) || []).length;
      }
    } catch {
      /* */
    }

    return res.json({
      ok: true,
      bundle: { ...bundle, manualEditorSeats: manualInFile, sectorNormCounts },
      svgManualAttrs,
      svg: {
      handExists: fs.existsSync(HAND_SVG),
      publicExists: fs.existsSync(PUBLIC_SVG),
      handBytes: handSvgBytes,
      publicBytes: publicSvgBytes,
    },
    checkoutHint:
      'Checkout показывает цветные точки только для мест с билетами в GetBilet; разметка редактора задаёт ряд/место/координаты.',
    saveTokenRequired: Boolean(process.env.LUZHNIKI_SVG_SAVE_TOKEN?.trim()),
  });
});

function checkSaveAuth(req, res) {
  const expected = process.env.LUZHNIKI_SVG_SAVE_TOKEN?.trim();
  if (!expected) return true;
  const got = String(req.headers['x-luzhniki-svg-save-token'] || '').trim();
  if (got === expected) return true;
  res.status(403).json({ ok: false, error: 'invalid save token' });
  return false;
}

router.post('/', express.text({ type: ['image/svg+xml', 'text/xml', 'application/xml', 'text/plain', '*/*'], limit: '64mb' }), (req, res) => {
  if (!checkSaveAuth(req, res)) return;
  const body = typeof req.body === 'string' ? req.body.trim() : '';
  if (!body.includes('<svg')) {
    return res.status(400).json({ ok: false, error: 'expected SVG XML in body' });
  }
  let xml = body.startsWith('<?xml') ? body : `<?xml version="1.0" encoding="UTF-8"?>\n${body}`;
  try {
    const sectorNorm = normalizeLuzhnikiGrayCloudSvgSectorAttrs(xml);
    xml = sectorNorm.xml;
    fs.mkdirSync(path.dirname(HAND_SVG), { recursive: true });
    fs.mkdirSync(path.dirname(PUBLIC_SVG), { recursive: true });
    writeSvgFiles(HAND_SVG, xml);
    writeSvgFiles(PUBLIC_SVG, xml);

    const extracted = extractLabeledSeatsFromSvgMarkup(xml);
    const labeledCount = extracted.labeledCount ?? extracted.seats.length;

    if (labeledCount < 1) {
      const prev = readBundleMeta();
      return res.status(400).json({
        ok: false,
        error:
          'В SVG 0 мест с data-sector + data-row + data-seat. В редакторе: 〰 линия → ▶ Применить ряд (или ✎ + Применить на точке). Bundle не тронут.',
        labeledSeats: 0,
        svgSaved: true,
        previousBundleSeatCount: prev.seatCount ?? 0,
      });
    }

    const byNorm = getCachedTicketsSectorLabelByNorm();
    const seats = extracted.seats.map((s) => ({
      ...s,
      sector: resolveCanonicalSectorLabel(s.sector, byNorm),
    }));

    const bundlePayload = {
      builtAt: new Date().toISOString(),
      mode: 'editor-svg-extract',
      hallWidth: extracted.hallWidth,
      hallHeight: extracted.hallHeight,
      seatCount: seats.length,
      labeledSeatCount: labeledCount,
      seats,
    };
    fs.mkdirSync(path.dirname(SEATS_BUNDLE), { recursive: true });
    fs.writeFileSync(SEATS_BUNDLE, `${JSON.stringify(bundlePayload, null, 2)}\n`, 'utf8');
    resetGrayCloudLabeledIndexCache();

    /** @type {Record<string, number>} */
    const sectorNormCounts = {};
    for (const s of extracted.seats) {
      const n = normalizeSectorLabel(s?.sector);
      if (!n) continue;
      sectorNormCounts[n] = (sectorNormCounts[n] || 0) + 1;
    }

    return res.json({
      ok: true,
      bytes: Buffer.byteLength(xml, 'utf8'),
      labeledSeats: labeledCount,
      builtAt: bundlePayload.builtAt,
      sectorLabelsNormalized: sectorNorm.changed,
      sectorNormCounts,
      svgManualAttrs: (xml.match(/data-source="manual/g) || []).length,
      paths: { hand: HAND_SVG, public: PUBLIC_SVG, seatsBundle: SEATS_BUNDLE },
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
