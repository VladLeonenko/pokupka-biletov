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
const ramtSvgPath = path.join(__dirname, '../../frontend/public/hall-maps/ramt-big-stage.svg');
const bolshoiSvgPath = path.join(__dirname, '../../frontend/public/hall-maps/bolshoi-new-stage.svg');

describe('theaterHallSvgSectorMode', () => {
  it('parses RAMT big stage sector paths', () => {
    const svg = fs.readFileSync(ramtSvgPath, 'utf8');
    const sectors = parseTheaterHallSvgSectors(svg);
    assert.equal(sectors.length, 10);
    assert.ok(sectors.some((s) => s.label === 'Партер, середина'));
    assert.ok(sectors.every((s) => s.id && s.path.startsWith('M')));
  });

  it('builds enabled sectorMode', () => {
    const svg = fs.readFileSync(ramtSvgPath, 'utf8');
    const mode = buildTheaterHallSectorMode(svg);
    assert.equal(mode.enabled, true);
    assert.equal(mode.sectors.length, 10);
  });

  it('parses Bolshoi new stage sector paths', () => {
    const svg = fs.readFileSync(bolshoiSvgPath, 'utf8');
    const sectors = parseTheaterHallSvgSectors(svg);
    assert.equal(sectors.length, 17);
    assert.ok(sectors.some((s) => s.label === 'Партер левая сторона'));
    assert.ok(sectors.some((s) => s.label === 'Ложа А. Бельэтаж'));
  });
});
