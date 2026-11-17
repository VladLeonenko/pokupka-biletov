import test from 'node:test';
import assert from 'node:assert/strict';
import { filterPublicOffersPayload } from '../utils/filterPublicOffersPayload.js';
import { buildOfferSessionsIndex } from '../utils/offerSessionsIndex.js';

test('empty SeatList offers are dropped and do not create a date', () => {
  const payload = {
    Success: true,
    ResultData: [
      {
        Id: 'ghost',
        EventDateTime: '2026-11-17T19:00',
        Sector: 'ложа а',
        Row: '1',
        AgentPrice: '7480',
        SeatList: [],
      },
      {
        Id: 'real',
        EventDateTime: '2026-12-28T19:00',
        Sector: 'партер',
        Row: '3',
        AgentPrice: '27200',
        SeatList: [12, 13, 14, 15],
      },
      {
        Id: 'blank',
        EventDateTime: '2026-11-17T19:00',
        AgentPrice: '1000',
        SeatList: ['', '  '],
      },
    ],
  };

  const filtered = filterPublicOffersPayload(payload, 'rep');
  assert.equal(filtered.ResultData.length, 1);
  assert.equal(filtered.ResultData[0].Id, 'real');

  const sessions = buildOfferSessionsIndex(filtered);
  assert.deepEqual(
    sessions.map((s) => s.eventDateTime),
    ['2026-12-28T19:00'],
  );
});

test('date stays when it also has numbered seats', () => {
  const payload = {
    ResultData: [
      {
        Id: 'ghost',
        EventDateTime: '2026-12-28T19:00',
        AgentPrice: '1000',
        SeatList: [],
      },
      {
        Id: 'real',
        EventDateTime: '2026-12-28T19:00',
        AgentPrice: '27200',
        SeatList: ['12'],
      },
    ],
  };
  const filtered = filterPublicOffersPayload(payload, 'rep');
  const sessions = buildOfferSessionsIndex(filtered);
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].eventDateTime, '2026-12-28T19:00');
  assert.equal(sessions[0].offerCount, 1);
  assert.equal(sessions[0].minPrice, 27200);
  assert.equal(sessions[0].seatCount, 1);
});
