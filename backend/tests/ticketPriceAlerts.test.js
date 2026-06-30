import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeOffersSnapshot,
  detectAlertReasons,
} from '../services/ticketPriceAlerts.js';

const samplePayload = {
  ResultData: [
    { Sector: 'Партер', AgentPrice: 5000, SeatList: ['1', '2'] },
    { Sector: 'Балкон', AgentPrice: 3000, SeatList: ['10'] },
  ],
};

test('computeOffersSnapshot counts seats and min price', () => {
  const snap = computeOffersSnapshot(samplePayload, {});
  assert.equal(snap.totalSeats, 3);
  assert.equal(snap.minPrice, 3000);
});

test('computeOffersSnapshot respects max_price_rub', () => {
  const snap = computeOffersSnapshot(samplePayload, { max_price_rub: 3500 });
  assert.equal(snap.totalSeats, 1);
  assert.equal(snap.minPrice, 3000);
});

test('detectAlertReasons — appeared', () => {
  const curr = { totalSeats: 2, minPrice: 3000 };
  const reasons = detectAlertReasons({ totalSeats: 0 }, curr, {});
  assert.deepEqual(reasons, ['appeared']);
});

test('detectAlertReasons — price_drop', () => {
  const prev = { totalSeats: 2, minPrice: 5000 };
  const curr = { totalSeats: 2, minPrice: 2800 };
  const reasons = detectAlertReasons(prev, curr, { max_price_rub: 3000 });
  assert.ok(reasons.includes('price_drop'));
});
