import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeCompetitorOffers } from '../services/getbiletCompetitorPrices.js';

describe('getbiletCompetitorPrices', () => {
  it('analyzeCompetitorOffers counts overlap and loss vs own 45%', () => {
    const prev = process.env.GETBILET_USER_ID;
    const prevU = process.env.GETBILET_OWN_UNDERCUT_RUB;
    process.env.GETBILET_USER_ID = 'own-id';
    process.env.GETBILET_OWN_UNDERCUT_RUB = '100';
    try {
      const out = analyzeCompetitorOffers(
        {
          ResultData: [
            {
              AgentId: 'own-id',
              Sector: 'Партер',
              Row: '1',
              SeatList: ['18', '19'],
              EventDateTime: '2026-09-19T19:00:00',
              AgentPrice: '70000',
              NominalPrice: '70000',
            },
            {
              AgentId: 'rival',
              Sector: 'Партер',
              Row: '1',
              SeatList: ['18'],
              EventDateTime: '2026-09-19T19:00:00',
              AgentPrice: '60000',
              NominalPrice: '60000',
            },
          ],
        },
        { markup_kind: 'percent', markup_value: 70 },
      );
      assert.equal(out.ownSeats, 2);
      assert.equal(out.overlapSeats, 1);
      assert.equal(out.ownMinRetailRub, 101500);
      assert.equal(out.rivalMinRetailRub, 102000);
      assert.equal(out.seatsWeLose, 0);
    } finally {
      if (prev == null) delete process.env.GETBILET_USER_ID;
      else process.env.GETBILET_USER_ID = prev;
      if (prevU == null) delete process.env.GETBILET_OWN_UNDERCUT_RUB;
      else process.env.GETBILET_OWN_UNDERCUT_RUB = prevU;
    }
  });

  it('analyzeCompetitorOffers flags seats we lose when rival wholesale is lower', () => {
    const prev = process.env.GETBILET_USER_ID;
    process.env.GETBILET_USER_ID = 'own-id';
    try {
      const out = analyzeCompetitorOffers(
        {
          ResultData: [
            {
              AgentId: 'own-id',
              Sector: 'Партер',
              Row: '1',
              SeatList: ['2'],
              EventDateTime: '2026-09-19T19:00:00',
              AgentPrice: '10000',
              NominalPrice: '10000',
            },
            {
              AgentId: 'rival',
              Sector: 'Партер',
              Row: '1',
              SeatList: ['2'],
              EventDateTime: '2026-09-19T19:00:00',
              AgentPrice: '8000',
              NominalPrice: '8000',
            },
          ],
        },
        { markup_kind: 'percent', markup_value: 70 },
      );
      assert.equal(out.seatsWeLose, 1);
      assert.equal(out.ownMinRetailRub, 14500);
      assert.equal(out.rivalMinRetailRub, 13600);
      assert.ok(out.suggestedOwnMarkupPercent != null);
      assert.ok(out.suggestedOwnMarkupPercent < 45);
    } finally {
      if (prev == null) delete process.env.GETBILET_USER_ID;
      else process.env.GETBILET_USER_ID = prev;
    }
  });
});
