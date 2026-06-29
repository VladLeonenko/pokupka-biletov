#!/usr/bin/env node
/**
 * Генерирует frontend/public/favicon.ico (16 + 32 + 48) из дизайна favicon.svg.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, '../frontend/public/favicon.ico');

function pixelColor(x, y, size) {
  const X = ((x + 0.5) / size) * 40;
  const Y = ((y + 0.5) / size) * 40;
  const bg = { r: 17, g: 17, b: 17, a: 255 };
  const ticket = { r: 255, g: 78, b: 24, a: 255 };
  const hole = { r: 17, g: 17, b: 17, a: 230 };

  const inTicket = X >= 9 && X <= 31 && Y >= 13 && Y <= 27;
  const inHole = X >= 17 && X <= 23 && Y >= 16 && Y <= 24;
  if (inTicket && inHole) return hole;
  if (inTicket) return ticket;
  return bg;
}

function bitmap(size) {
  const header = Buffer.alloc(40);
  header.writeInt32LE(40, 0);
  header.writeInt32LE(size, 4);
  header.writeInt32LE(size * 2, 8);
  header.writeInt16LE(1, 12);
  header.writeInt16LE(32, 14);
  header.writeInt32LE(0, 16);
  header.writeInt32LE(size * size * 4, 20);

  const pixels = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const srcY = size - 1 - y;
      const { r, g, b, a } = pixelColor(x, srcY, size);
      const i = (y * size + x) * 4;
      pixels[i] = b;
      pixels[i + 1] = g;
      pixels[i + 2] = r;
      pixels[i + 3] = a;
    }
  }
  return Buffer.concat([header, pixels]);
}

function packIco(sizes) {
  const count = sizes.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  const entries = [];
  const images = [];
  let offset = 6 + count * 16;

  for (const size of sizes) {
    const img = bitmap(size);
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(img.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    images.push(img);
    offset += img.length;
  }

  return Buffer.concat([header, ...entries, ...images]);
}

const ico = packIco([16, 32, 48]);
fs.writeFileSync(outPath, ico);
console.log('Wrote', outPath, `(${ico.length} bytes)`);
