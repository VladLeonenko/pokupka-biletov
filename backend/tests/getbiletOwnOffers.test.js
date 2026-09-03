import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isOwnOfferRow,
  markupRuleForOwnOffer,
  sanitizePublicOffersPayload,
  getOwnMarkupReductionPoints,
} from '../services/getbiletOwnOffers.js';

describe('getbiletOwnOffers', () => {
  it('isOwnOfferRow matches GETBILET_USER_ID', () => {
    const prev = process.env.GETBILET_USER_ID;
    process.env.GETBILET_USER_ID = 'kppr';
    try {
      assert.equal(isOwnOfferRow({ AgentId: 'kppr' }), true);
      assert.equal(isOwnOfferRow({ AgentId: 'other' }), false);
      assert.equal(isOwnOfferRow({ ManualOffer: true }), true);
    } finally {
      if (prev == null) delete process.env.GETBILET_USER_ID;
      else process.env.GETBILET_USER_ID = prev;
    }
  });

  it('markupRuleForOwnOffer subtracts 25 points from 70% → 45%', () => {
    const prev = process.env.GETBILET_OWN_MARKUP_REDUCTION_PERCENT;
    delete process.env.GETBILET_OWN_MARKUP_REDUCTION_PERCENT;
    try {
      assert.equal(getOwnMarkupReductionPoints(), 25);
      const own = markupRuleForOwnOffer({ markup_kind: 'percent', markup_value: 70 });
      assert.equal(own?.markup_value, 45);
    } finally {
      if (prev == null) delete process.env.GETBILET_OWN_MARKUP_REDUCTION_PERCENT;
      else process.env.GETBILET_OWN_MARKUP_REDUCTION_PERCENT = prev;
    }
  });

  it('sanitizePublicOffersPayload strips AgentId and sets OwnOffer', () => {
    const prev = process.env.GETBILET_USER_ID;
    process.env.GETBILET_USER_ID = 'kppr';
    try {
      const out = sanitizePublicOffersPayload({
        ResultData: [
          { Id: '1', AgentId: 'kppr', Sector: 'партер' },
          { Id: '2', AgentId: 'rival', Sector: 'партер' },
        ],
      });
      assert.equal(out.ResultData[0].OwnOffer, true);
      assert.equal(out.ResultData[0].AgentId, undefined);
      assert.equal(out.ResultData[1].OwnOffer, undefined);
      assert.equal(out.ResultData[1].AgentId, undefined);
    } finally {
      if (prev == null) delete process.env.GETBILET_USER_ID;
      else process.env.GETBILET_USER_ID = prev;
    }
  });
});
