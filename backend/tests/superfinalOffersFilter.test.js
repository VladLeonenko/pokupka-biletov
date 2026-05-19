import test from 'node:test';
import assert from 'node:assert/strict';
import { filterOffersForSuperfinalSession } from '../utils/superfinalOffersFilter.js';

test('superfinal filter keeps only 2026-05-24 Moscow for fan-id repertoire', () => {
  const offers = [
    { EventDateTime: '2026-05-24T18:00:00+03:00', Sector: 'A101' },
    { EventDateTime: '2026-05-19T15:00:00+03:00', Sector: 'A101' },
  ];
  const out = filterOffersForSuperfinalSession(offers, '6a05d17b46a4d000309ecf4e');
  assert.equal(out.length, 1);
  assert.match(String(out[0].EventDateTime), /2026-05-24/);
});

test('superfinal filter no-op for other repertoire', () => {
  const offers = [{ EventDateTime: '2026-05-19T15:00:00+03:00' }];
  const out = filterOffersForSuperfinalSession(offers, 'other-rep');
  assert.equal(out.length, 1);
});
