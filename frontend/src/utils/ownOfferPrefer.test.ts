import { describe, expect, it } from 'vitest';
import { isOwnOfferLike, shouldReplaceMappedOffer } from './ownOfferPrefer';

describe('ownOfferPrefer', () => {
  const price = (o: { AgentPrice?: string }) => o.AgentPrice ?? '0';

  it('own replaces rival even if own is more expensive', () => {
    expect(
      shouldReplaceMappedOffer({ AgentPrice: '80000' }, { AgentPrice: '100000', OwnOffer: true }, price),
    ).toBe(true);
  });

  it('keeps own when rival is cheaper', () => {
    expect(
      shouldReplaceMappedOffer({ AgentPrice: '100000', OwnOffer: true }, { AgentPrice: '80000' }, price),
    ).toBe(false);
  });

  it('among non-own keeps more expensive (legacy map color)', () => {
    expect(shouldReplaceMappedOffer({ AgentPrice: '100' }, { AgentPrice: '200' }, price)).toBe(true);
    expect(shouldReplaceMappedOffer({ AgentPrice: '200' }, { AgentPrice: '100' }, price)).toBe(false);
  });

  it('isOwnOfferLike', () => {
    expect(isOwnOfferLike({ OwnOffer: true })).toBe(true);
    expect(isOwnOfferLike({ ManualOffer: true })).toBe(true);
    expect(isOwnOfferLike({})).toBe(false);
  });
});
