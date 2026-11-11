import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildOfferSessionsIndex,
  filterOffersPayloadBySession,
  pickDefaultOfferSession,
} from '../utils/offerSessionsIndex.js';

const sample = {
  Success: true,
  ResultData: [
    {
      Id: 'a',
      EventDateTime: '2026-12-18T09:00:00.000Z',
      AgentPrice: '70000',
      SeatList: ['1', '2'],
    },
    {
      Id: 'b',
      EventDateTime: '2026-12-18T09:00:00.000Z',
      AgentPrice: '90000',
      SeatList: ['3'],
    },
    {
      Id: 'c',
      EventDateTime: '2026-12-18T16:00:00.000Z',
      AgentPrice: '110000',
      SeatList: ['4', '5', '6'],
    },
  ],
};

test('buildOfferSessionsIndex groups by EventDateTime', () => {
  const sessions = buildOfferSessionsIndex(sample);
  assert.equal(sessions.length, 2);
  assert.equal(sessions[0].eventDateTime, '2026-12-18T09:00:00.000Z');
  assert.equal(sessions[0].minPrice, 70000);
  assert.equal(sessions[0].offerCount, 2);
  assert.equal(sessions[0].seatCount, 3);
  assert.equal(sessions[1].minPrice, 110000);
  assert.equal(sessions[1].seatCount, 3);
});

test('filterOffersPayloadBySession keeps one session', () => {
  const scoped = filterOffersPayloadBySession(sample, '2026-12-18T16:00:00.000Z');
  assert.equal(scoped.ResultData.length, 1);
  assert.equal(scoped.ResultData[0].Id, 'c');
});

test('pickDefaultOfferSession respects hint', () => {
  const sessions = buildOfferSessionsIndex(sample);
  assert.equal(
    pickDefaultOfferSession(sessions, '2026-12-18T16:00:00.000Z'),
    '2026-12-18T16:00:00.000Z',
  );
});
