#!/usr/bin/env node
/**
 * Растр серой чаши (luzhniki.txt) — один PNG вместо ~77k точек в JSON на клиенте.
 * Визуал совпадает с canvas-rects в TicketHallInteractiveBlock (dense hall).
 *
 *   node scripts/render-luzhniki-gray-bowl-png.js
 *   node scripts/render-luzhniki-gray-bowl-png.js --out ../frontend/public/hall-maps/luzhniki-football-gray-bowl.png
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { extractPbiletCoordinatesSeatDots } from '../utils/luzhnikiPbiletGeodesyExtract.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

const HALL_W = 11413;
const HALL_H = 9676;
const OUT_W = Number(process.env.LUZHNIKI_BOWL_PNG_WIDTH) || 2282;

function parseArgs() {
  const outIdx = process.argv.indexOf('--out');
  const out =
    outIdx >= 0 && process.argv[outIdx + 1]
      ? path.resolve(process.cwd(), process.argv[outIdx + 1])
      : path.join(repoRoot, 'frontend/public/hall-maps/luzhniki-football-gray-bowl.png');
  const coordsPath =
    process.env.LUZHNIKI_PBILET_COORDINATES_JSON?.trim() || path.join(repoRoot, 'luzhniki.txt');
  return { out, coordsPath };
}

function paintRect(buf, w, h, x0, y0, x1, y1, rgba) {
  const cx0 = Math.max(0, x0);
  const cy0 = Math.max(0, y0);
  const cx1 = Math.min(w - 1, x1);
  const cy1 = Math.min(h - 1, y1);
  for (let y = cy0; y <= cy1; y += 1) {
    let i = (y * w + cx0) * 4;
    for (let x = cx0; x <= cx1; x += 1) {
      buf[i] = rgba[0];
      buf[i + 1] = rgba[1];
      buf[i + 2] = rgba[2];
      buf[i + 3] = rgba[3];
      i += 4;
    }
  }
}

async function main() {
  const { out, coordsPath } = parseArgs();
  if (!fs.existsSync(coordsPath)) {
    console.error(JSON.stringify({ ok: false, error: 'missing_coords', coordsPath }));
    process.exit(1);
  }

  const payload = JSON.parse(fs.readFileSync(coordsPath, 'utf8'));
  const dots = extractPbiletCoordinatesSeatDots(payload, HALL_W, HALL_H);
  if (dots.length < 1000) {
    console.error(JSON.stringify({ ok: false, error: 'too_few_dots', count: dots.length }));
    process.exit(1);
  }

  const outH = Math.max(1, Math.round((HALL_H / HALL_W) * OUT_W));
  const scalePx = OUT_W / HALL_W;
  const r = Math.max(0.5, Math.min(1.75, scalePx * 3.6));
  const rgba = [148, 163, 184, 183];

  const buf = Buffer.alloc(OUT_W * outH * 4, 0);
  for (const dot of dots) {
    const cx = (dot.xPct / 100) * OUT_W;
    const cy = (dot.yPct / 100) * outH;
    const half = r * 0.5;
    paintRect(buf, OUT_W, outH, Math.floor(cx - half), Math.floor(cy - half), Math.ceil(cx + half), Math.ceil(cy + half), rgba);
  }

  fs.mkdirSync(path.dirname(out), { recursive: true });
  await sharp(buf, { raw: { width: OUT_W, height: outH, channels: 4 } })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(out);

  const stat = fs.statSync(out);
  console.log(
    JSON.stringify({
      ok: true,
      out,
      dots: dots.length,
      width: OUT_W,
      height: outH,
      bytes: stat.size,
    }),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
