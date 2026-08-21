#!/usr/bin/env node
/**
 * Растр серой чаши Лукойл Арена (pbilet layout 333, ~44k точек в viewBox).
 *
 *   node scripts/render-lukoil-arena-gray-bowl-png.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const COORDINATES_URL = 'https://tickets.api.pbilet.net/public/v1/hall-layouts/333/coordinates';
const HALL_W = 9951;
const HALL_H = 8766;
const OUT_W = Number(process.env.LUKOIL_ARENA_BOWL_PNG_WIDTH) || 1990;

function clipDots(cloud, maxPct = 102) {
  const out = [];
  for (const pt of cloud) {
    const xPct = Number(pt?.xPct);
    const yPct = Number(pt?.yPct);
    if (!Number.isFinite(xPct) || !Number.isFinite(yPct)) continue;
    if (xPct < 0 || yPct < 0 || xPct > maxPct || yPct > maxPct) continue;
    out.push({ xPct, yPct });
  }
  return out;
}
function parseArgs() {
  const outIdx = process.argv.indexOf('--out');
  const out =
    outIdx >= 0 && process.argv[outIdx + 1]
      ? path.resolve(process.cwd(), process.argv[outIdx + 1])
      : path.join(repoRoot, 'frontend/public/hall-maps/lukoil-arena-gray-bowl.png');
  return { out };
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

async function loadDotsFromPbilet() {
  const res = await fetch(COORDINATES_URL, {
    headers: { accept: 'application/json', 'user-agent': 'biletvsem-lukoil-bowl/1.0' },
  });
  if (!res.ok) throw new Error(`${res.status} ${COORDINATES_URL}`);
  const payload = await res.json();
  const width = Number(payload?.width) || HALL_W;
  const height = Number(payload?.height) || HALL_H;
  const raw = Array.isArray(payload?.coordinates) ? payload.coordinates : [];
  return clipDots(
    raw.map((item) => {
      const x = Number(item?.x);
      const y = Number(item?.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      return { xPct: (x / width) * 100, yPct: (y / height) * 100 };
    }).filter(Boolean),
  );
}

async function main() {
  const { out } = parseArgs();
  const dots = await loadDotsFromPbilet();
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
    paintDisc(buf, OUT_W, outH, (dot.xPct / 100) * OUT_W, (dot.yPct / 100) * outH, r * 0.5, rgba);
  }

  const dotsOut = out.replace(/\.png$/i, '-dots.bin');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await sharp(buf, { raw: { width: OUT_W, height: outH, channels: 4 } })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(out);
  fs.writeFileSync(dotsOut, Buffer.from(coords.buffer));

  console.log(
    JSON.stringify({
      ok: true,
      out,
      dotsOut,
      dots: dots.length,
      width: OUT_W,
      height: outH,
      bytes: fs.statSync(out).size,
      dotsBytes: fs.statSync(dotsOut).size,
    }),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
