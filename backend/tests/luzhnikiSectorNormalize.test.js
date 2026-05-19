import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeSectorLabel,
  sectorNormsMatch,
  strictSeatKey,
} from '../utils/ticketHallSectorNormalize.js';
import { getbiletSectorVariants } from '../scripts/audit-luzhniki-sector-normalize.js';

test('cyrillic а and latin a101', () => {
  assert.equal(normalizeSectorLabel('сектор а101'), 'a101');
  assert.equal(normalizeSectorLabel('Сектор A 101'), 'a101');
});

test('cyrillic б and latin b147', () => {
  assert.equal(normalizeSectorLabel('сектор б147'), 'b147');
  assert.equal(normalizeSectorLabel('Сектор B 147'), 'b147');
});

test('cheerio numeric entities (Сектор glued to b147)', () => {
  const encoded = '&#x421;&#x435;&#x43a;&#x442;&#x43e;&#x440;b147';
  assert.equal(normalizeSectorLabel(encoded), 'b147');
});

test('VIP tribune without vip in offer string', () => {
  assert.ok(sectorNormsMatch('сектор a107', 'Сектор A 107 VIP'));
  assert.ok(sectorNormsMatch('сектор c136', 'Сектор C 136 VIP'));
});

test('VIP c138 alias', () => {
  assert.ok(sectorNormsMatch('vip c138', 'Сектор C 138'));
});

test('ложа 48I not merged with tribune a101', () => {
  assert.ok(!sectorNormsMatch('Ложа 101', 'Сектор A 101'));
});

test('all anchor sectors match GetBilet variants', () => {
  const label = 'Сектор D 230';
  for (const offer of getbiletSectorVariants(label)) {
    assert.ok(sectorNormsMatch(offer, label), `${offer} vs ${label}`);
  }
});

test('strictSeatKey row numbers', () => {
  assert.equal(strictSeatKey('сектор d227', 'ряд 30', '14'), strictSeatKey('Сектор D 227', '30', '14'));
});
