import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyGetbiletMarkupToOfferPayload,
  applyGetbiletMarkupToSupplierUnit,
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
});
