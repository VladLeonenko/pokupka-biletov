import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  looksLikeRamtBigStageHall,
  looksLikeRamtVenue,
  shouldUseRamtBigStageCanonicalMap,
} from '../services/ramtBigStageMap.js';

describe('ramtBigStageMap', () => {
  it('detects RAMT venue and big stage hall', () => {
    assert.equal(looksLikeRamtVenue('РАМТ'), true);
    assert.equal(looksLikeRamtBigStageHall('РАМТ', 'Большая сцена'), true);
    assert.equal(looksLikeRamtBigStageHall('РАМТ', 'Маленькая сцена'), false);
  });

  it('maps repertoire via env list', () => {
    const prev = process.env.GETBILET_RAMT_BIG_STAGE_REPERTOIRE_IDS;
    process.env.GETBILET_RAMT_BIG_STAGE_REPERTOIRE_IDS = 'abc123';
    assert.equal(
      shouldUseRamtBigStageCanonicalMap({ repertoireId: 'abc123' }, null, null),
      true,
    );
    process.env.GETBILET_RAMT_BIG_STAGE_REPERTOIRE_IDS = prev;
  });
});
