import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyGetbiletMarkupToOfferPayload,
  applyGetbiletMarkupToSupplierUnit,
  beatExternalFromPrice,
  resolveOfferSupplierRub,
} from '../services/getbiletMarkupPublic.js';

describe('getbiletMarkupPublic', () => {
  it('percent markup', () => {
    assert.equal(applyGetbiletMarkupToSupplierUnit(1000, { markup_kind: 'percent', markup_value: 10 }), 1100);
    assert.equal(applyGetbiletMarkupToSupplierUnit(100, { markup_kind: 'percent', markup_value: 5 }), 105);
  });

  it('fixed markup', () => {
    assert.equal(applyGetbiletMarkupToSupplierUnit(500, { markup_kind: 'fixed', markup_value: 50 }), 550);
  });

  it('null rule leaves price', () => {
    assert.equal(applyGetbiletMarkupToSupplierUnit(200, null), 200);
  });

  it('applyGetbiletMarkupToOfferPayload maps ResultData array', () => {
    const data = {
      ResultData: [{ Id: '1', AgentPrice: '100', NominalPrice: '100' }],
    };
    const out = applyGetbiletMarkupToOfferPayload(data, { markup_kind: 'percent', markup_value: 20 });
    assert.equal(out.ResultData[0].AgentPrice, '120');
    assert.equal(out.ResultData[0].NominalPrice, '120');
  });

  it('applyGetbiletMarkupToOfferPayload single ResultData object', () => {
    const data = { ResultData: { AgentPrice: '200' } };
    const out = applyGetbiletMarkupToOfferPayload(data, { markup_kind: 'fixed', markup_value: 25 });
    assert.equal(out.ResultData.AgentPrice, '225');
    assert.equal(out.ResultData.NominalPrice, '225');
  });

  it('markup base is max(agent, nominal) — номинал выше закупа', () => {
    const row = { AgentPrice: '3500', NominalPrice: '5950' };
    assert.equal(resolveOfferSupplierRub(row), 5950);
    const out = applyGetbiletMarkupToOfferPayload(
      { ResultData: [row] },
      { markup_kind: 'percent', markup_value: 70 },
    );
    assert.equal(out.ResultData[0].SupplierPrice, '5950');
    assert.equal(out.ResultData[0].NominalPrice, '10115');
  });

  it('markup base max when agent is wholesale only', () => {
    const row = { AgentPrice: '17500', NominalPrice: '5000' };
    assert.equal(resolveOfferSupplierRub(row), 17500);
    const out = applyGetbiletMarkupToOfferPayload(
      { ResultData: [row] },
      { markup_kind: 'percent', markup_value: 70 },
    );
    assert.equal(out.ResultData[0].NominalPrice, '29750');
  });

  it('own AgentId gets 25 points less percent markup (70% → 45%)', () => {
    const prev = process.env.GETBILET_USER_ID;
    process.env.GETBILET_USER_ID = 'agent-own';
    try {
      const out = applyGetbiletMarkupToOfferPayload(
        {
          ResultData: [
            { Id: 'theirs', AgentId: 'other', AgentPrice: '10000', NominalPrice: '10000' },
            { Id: 'ours', AgentId: 'agent-own', AgentPrice: '10000', NominalPrice: '10000' },
          ],
        },
        { markup_kind: 'percent', markup_value: 70 },
      );
      assert.equal(out.ResultData[0].NominalPrice, '17000');
      assert.equal(out.ResultData[1].NominalPrice, '14500');
    } finally {
      if (prev == null) delete process.env.GETBILET_USER_ID;
      else process.env.GETBILET_USER_ID = prev;
    }
  });

  it('own same seat undercuts rival retail by 100 ₽', () => {
    const prevId = process.env.GETBILET_USER_ID;
    const prevU = process.env.GETBILET_OWN_UNDERCUT_ENABLED;
    const prevR = process.env.GETBILET_OWN_UNDERCUT_RUB;
    const prevF = process.env.GETBILET_OWN_MIN_MARKUP_PERCENT;
    process.env.GETBILET_USER_ID = 'agent-own';
    process.env.GETBILET_OWN_UNDERCUT_ENABLED = '1';
    process.env.GETBILET_OWN_UNDERCUT_RUB = '100';
    process.env.GETBILET_OWN_MIN_MARKUP_PERCENT = '5';
    try {
      const out = applyGetbiletMarkupToOfferPayload(
        {
          ResultData: [
            {
              Id: 'theirs',
              AgentId: 'other',
              Sector: 'Партер',
              Row: '1',
              SeatList: ['2'],
              EventDateTime: '2026-09-19T19:00:00',
              AgentPrice: '8000',
              NominalPrice: '8000',
            },
            {
              Id: 'ours',
              AgentId: 'agent-own',
              Sector: 'Партер',
              Row: '1',
              SeatList: ['2'],
              EventDateTime: '2026-09-19T19:00:00',
              AgentPrice: '10000',
              NominalPrice: '10000',
            },
          ],
        },
        { markup_kind: 'percent', markup_value: 70 },
      );
      assert.equal(out.ResultData[0].NominalPrice, '13600');
      assert.equal(out.ResultData[1].NominalPrice, '13500');
      assert.equal(out.ResultData[1].UndercutToBeatRival, true);
    } finally {
      if (prevId == null) delete process.env.GETBILET_USER_ID;
      else process.env.GETBILET_USER_ID = prevId;
      if (prevU == null) delete process.env.GETBILET_OWN_UNDERCUT_ENABLED;
      else process.env.GETBILET_OWN_UNDERCUT_ENABLED = prevU;
      if (prevR == null) delete process.env.GETBILET_OWN_UNDERCUT_RUB;
      else process.env.GETBILET_OWN_UNDERCUT_RUB = prevR;
      if (prevF == null) delete process.env.GETBILET_OWN_MIN_MARKUP_PERCENT;
      else process.env.GETBILET_OWN_MIN_MARKUP_PERCENT = prevF;
    }
  });

  it('own undercut stops at min markup floor', () => {
    const prevId = process.env.GETBILET_USER_ID;
    const prevU = process.env.GETBILET_OWN_UNDERCUT_ENABLED;
    const prevR = process.env.GETBILET_OWN_UNDERCUT_RUB;
    const prevF = process.env.GETBILET_OWN_MIN_MARKUP_PERCENT;
    process.env.GETBILET_USER_ID = 'agent-own';
    process.env.GETBILET_OWN_UNDERCUT_ENABLED = '1';
    process.env.GETBILET_OWN_UNDERCUT_RUB = '100';
    process.env.GETBILET_OWN_MIN_MARKUP_PERCENT = '5';
    try {
      const out = applyGetbiletMarkupToOfferPayload(
        {
          ResultData: [
            {
              Id: 'theirs',
              AgentId: 'other',
              Sector: 'Партер',
              Row: '1',
              SeatList: ['2'],
              EventDateTime: '2026-09-19T19:00:00',
              AgentPrice: '5000',
              NominalPrice: '5000',
            },
            {
              Id: 'ours',
              AgentId: 'agent-own',
              Sector: 'Партер',
              Row: '1',
              SeatList: ['2'],
              EventDateTime: '2026-09-19T19:00:00',
              AgentPrice: '10000',
              NominalPrice: '10000',
            },
          ],
        },
        { markup_kind: 'percent', markup_value: 70 },
      );
      assert.equal(out.ResultData[0].NominalPrice, '8500');
      assert.equal(out.ResultData[1].NominalPrice, '10500');
    } finally {
      if (prevId == null) delete process.env.GETBILET_USER_ID;
      else process.env.GETBILET_USER_ID = prevId;
      if (prevU == null) delete process.env.GETBILET_OWN_UNDERCUT_ENABLED;
      else process.env.GETBILET_OWN_UNDERCUT_ENABLED = prevU;
      if (prevR == null) delete process.env.GETBILET_OWN_UNDERCUT_RUB;
      else process.env.GETBILET_OWN_UNDERCUT_RUB = prevR;
      if (prevF == null) delete process.env.GETBILET_OWN_MIN_MARKUP_PERCENT;
      else process.env.GETBILET_OWN_MIN_MARKUP_PERCENT = prevF;
    }
  });

  it('beatExternalFromPrice drops own cheapest to competitor from-price minus 100', () => {
    const prevId = process.env.GETBILET_USER_ID;
    const prevR = process.env.GETBILET_OWN_UNDERCUT_RUB;
    const prevF = process.env.GETBILET_OWN_MIN_MARKUP_PERCENT;
    const prevE = process.env.GETBILET_EXTERNAL_UNDERCUT_ENABLED;
    process.env.GETBILET_USER_ID = 'own';
    process.env.GETBILET_OWN_UNDERCUT_RUB = '100';
    process.env.GETBILET_OWN_MIN_MARKUP_PERCENT = '5';
    process.env.GETBILET_EXTERNAL_UNDERCUT_ENABLED = '1';
    try {
      const rows = [
        {
          Id: 'ours',
          AgentId: 'own',
          SupplierPrice: '10000',
          AgentPrice: '14500',
          NominalPrice: '14500',
        },
        { Id: 'theirs', AgentId: 'x', SupplierPrice: '10000', AgentPrice: '17000', NominalPrice: '17000' },
      ];
      const out = beatExternalFromPrice(rows, 12000);
      assert.equal(out[0].NominalPrice, '11900');
      assert.equal(out[1].NominalPrice, '17000');
    } finally {
      if (prevId == null) delete process.env.GETBILET_USER_ID;
      else process.env.GETBILET_USER_ID = prevId;
      if (prevR == null) delete process.env.GETBILET_OWN_UNDERCUT_RUB;
      else process.env.GETBILET_OWN_UNDERCUT_RUB = prevR;
      if (prevF == null) delete process.env.GETBILET_OWN_MIN_MARKUP_PERCENT;
      else process.env.GETBILET_OWN_MIN_MARKUP_PERCENT = prevF;
      if (prevE == null) delete process.env.GETBILET_EXTERNAL_UNDERCUT_ENABLED;
      else process.env.GETBILET_EXTERNAL_UNDERCUT_ENABLED = prevE;
    }
  });
});
