import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildTheaterLayoutFromTicketlandMarkup,
  normalizeTicketlandSectionLabel,
  parseTicketlandPlaces,
} from '../utils/ticketlandHallSvg.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('ticketlandHallSvg', () => {
  it('normalizes section labels', () => {
    assert.equal(normalizeTicketlandSectionLabel('Балкон-середина'), 'Балкон — середина');
    assert.equal(normalizeTicketlandSectionLabel('Амфитеатр - середина'), 'Амфитеатр — середина');
  });

  it('parses rect.place from minimal markup', () => {
    const markup = `<svg width="3581px" height="3052px">
<g class="places">
<rect class="place place--free" x="100" y="200" width="16" height="16" sectionId="759191" section="Партер левая сторона" row="1" seat="1"></rect>
<rect class="place place--free" x="120" y="200" width="16" height="16" sectionId="759191" section="Партер левая сторона" row="1" seat="2"></rect>
</g></svg>`;
    const places = parseTicketlandPlaces(markup);
    assert.equal(places.length, 2);
    assert.equal(places[0].section, 'Партер левая сторона');
    assert.equal(places[0].cx, 108);
  });

  it('builds sectors and coordinates from synthetic source', () => {
    const htmlPath = path.join(__dirname, '../data/kremlin-palace/ticketland-source.html');
    if (!fs.existsSync(htmlPath)) return;
    const markup = fs.readFileSync(htmlPath, 'utf8');
    const built = buildTheaterLayoutFromTicketlandMarkup(markup);
    assert.ok(built.places.length > 100);
    assert.ok(built.sectors.length > 5);
    assert.equal(built.allSeatCoordinates.length, built.places.length);
    assert.match(built.svgMarkup, /data-type="level"/);
  });
});
