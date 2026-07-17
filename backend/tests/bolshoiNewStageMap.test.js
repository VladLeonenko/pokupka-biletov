import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  looksLikeBolshoiNewStageHall,
  looksLikeBolshoiVenue,
  shouldUseBolshoiNewStageCanonicalMap,
} from '../services/bolshoiNewStageMap.js';

describe('bolshoiNewStageMap', () => {
  it('detects Bolshoi venue and new stage hall', () => {
    assert.equal(looksLikeBolshoiVenue('Большой театр'), true);
    assert.equal(looksLikeBolshoiNewStageHall('Большой театр', 'Новая сцена'), true);
    assert.equal(looksLikeBolshoiNewStageHall('Большой театр', 'Историческая сцена'), false);
  });

  it('maps repertoire via env list', () => {
    const prev = process.env.GETBILET_BOLSHOI_NEW_STAGE_REPERTOIRE_IDS;
    process.env.GETBILET_BOLSHOI_NEW_STAGE_REPERTOIRE_IDS = 'abc123';
    assert.equal(
      shouldUseBolshoiNewStageCanonicalMap({ repertoireId: 'abc123' }, null, null),
      true,
    );
    process.env.GETBILET_BOLSHOI_NEW_STAGE_REPERTOIRE_IDS = prev;
  });
});
