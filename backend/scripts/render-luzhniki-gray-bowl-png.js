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

function paintDisc(buf, w, h, cx, cy, radius, rgba) {
  const r = Math.ceil(radius);
  const x0 = Math.max(0, Math.floor(cx - r));
  const y0 = Math.max(0, Math.floor(cy - r));
  const x1 = Math.min(w - 1, Math.ceil(cx + r));
  const y1 = Math.min(h - 1, Math.ceil(cy + r));
  const r2 = radius * radius;
  for (let y = y0; y <= y1; y += 1) {
    let i = (y * w + x0) * 4;
    for (let x = x0; x <= x1; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) {
        buf[i] = rgba[0];
        buf[i + 1] = rgba[1];
        buf[i + 2] = rgba[2];
        buf[i + 3] = rgba[3];
      }
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
  const coords = new Float32Array(dots.length * 2);
  for (let i = 0; i < dots.length; i += 1) {
    const dot = dots[i];
    coords[i * 2] = dot.xPct;
    coords[i * 2 + 1] = dot.yPct;
    const cx = (dot.xPct / 100) * OUT_W;
    const cy = (dot.yPct / 100) * outH;
    paintDisc(buf, OUT_W, outH, cx, cy, r * 0.5, rgba);
  }

  const dotsOut = out.replace(/\.png$/i, '-dots.bin');

  fs.mkdirSync(path.dirname(out), { recursive: true });
  await sharp(buf, { raw: { width: OUT_W, height: outH, channels: 4 } })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(out);
  fs.writeFileSync(dotsOut, Buffer.from(coords.buffer));

  const stat = fs.statSync(out);
  const dotsStat = fs.statSync(dotsOut);
  console.log(
    JSON.stringify({
      ok: true,
      out,
      dotsOut,
      dots: dots.length,
      width: OUT_W,
      height: outH,
      bytes: stat.size,
      dotsBytes: dotsStat.size,
    }),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
