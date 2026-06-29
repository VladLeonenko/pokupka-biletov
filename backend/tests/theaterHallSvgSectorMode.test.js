import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildTheaterHallSectorMode,
  parseTheaterHallSvgSectors,
} from '../utils/theaterHallSvgSectorMode.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const svgPath = path.join(__dirname, '../../frontend/public/hall-maps/ramt-big-stage.svg');

describe('theaterHallSvgSectorMode', () => {
  it('parses RAMT big stage sector paths', () => {
    const svg = fs.readFileSync(svgPath, 'utf8');
    const sectors = parseTheaterHallSvgSectors(svg);
    assert.equal(sectors.length, 10);
    assert.ok(sectors.some((s) => s.label === 'Партер, середина'));
    assert.ok(sectors.every((s) => s.id && s.path.startsWith('M')));
  });

  it('builds enabled sectorMode', () => {
    const svg = fs.readFileSync(svgPath, 'utf8');
    const mode = buildTheaterHallSectorMode(svg);
    assert.equal(mode.enabled, true);
    assert.equal(mode.sectors.length, 10);
  });
});
