#!/usr/bin/env node
/**
 * Проверка: все сектора из sector-row-anchors сопоставляются с типичными строками GetBilet.
 * npm run audit:luzhniki-sector-normalize
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  luzhnikiSectorLookupNorms,
  normalizeSectorLabel,
  sectorNormsMatch,
} from '../utils/ticketHallSectorNormalize.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const anchors = JSON.parse(
  readFileSync(join(root, 'data/luzhniki-geodesy/sector-row-anchors.json'), 'utf8'),
);
const labels = [...new Set(Object.values(anchors).map((a) => a.sectorLabel).filter(Boolean))];

/** Типичные варианты GetBilet (без мусора вроде «секторa» без номера). */
export function getbiletSectorVariants(layoutLabel) {
  const v = new Set();
  const tribune = layoutLabel.match(/Сектор\s+([A-Z])\s+(\d+)(\s+VIP)?/i);
  const lodge = layoutLabel.match(/Ложа\s+(\d+)([A-Z])?/i);

  if (tribune) {
    const L = tribune[1];
    const N = tribune[2];
    const vip = Boolean(tribune[3]);
    const cyr = { A: 'а', B: 'б', C: 'с', D: 'д' }[L] ?? L.toLowerCase();
    for (const letter of [L.toLowerCase(), cyr]) {
      v.add(`сектор ${letter}${N}`);
      v.add(`сектор ${letter} ${N}`);
      v.add(`сектор${letter}${N}`);
      v.add(`Сектор ${L} ${N}`);
    }
    if (vip) {
      v.add(`сектор ${L.toLowerCase()}${N}`);
      v.add(`сектор ${cyr}${N}`);
      v.add(`vip ${L.toLowerCase()} ${N}`);
    }
  }

  if (lodge) {
    const num = lodge[1];
    const suffix = lodge[2] ?? '';
    v.add(`ложа ${num}${suffix}`);
    v.add(`Ложа ${num}${suffix}`);
    v.add(`ложа ${num}${suffix ? ` ${suffix}` : ''}`.trim());
  }

  return [...v];
}

function main() {
  const failures = [];
  for (const label of labels) {
    for (const offer of getbiletSectorVariants(label)) {
      if (!sectorNormsMatch(offer, label)) {
        failures.push({
          layout: label,
          offer,
          layoutNorm: normalizeSectorLabel(label),
          offerNorm: normalizeSectorLabel(offer),
          offerNorms: luzhnikiSectorLookupNorms(offer),
        });
      }
    }
  }

  if (failures.length === 0) {
    console.log(JSON.stringify({ ok: true, sectors: labels.length }, null, 2));
    process.exit(0);
  }

  console.error(JSON.stringify({ ok: false, failures: failures.length, sample: failures.slice(0, 20) }, null, 2));
  for (const f of failures.slice(0, 30)) {
    console.error(`${f.layout} <- "${f.offer}" (${f.offerNorm} vs ${f.layoutNorm})`);
  }
  process.exit(1);
}

main();
