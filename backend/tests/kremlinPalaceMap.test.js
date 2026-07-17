import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  isKremlinPalaceId,
  isKremlinPalaceRepertoire,
  kremlinPalaceMapKeyForRepertoire,
  KREMLIN_PALACE_MAP_KEY,
  shouldUseKremlinPalaceCanonicalMap,
} from '../services/kremlinPalaceMap.js';

describe('kremlinPalaceMap', () => {
  it('recognizes canonical map key', () => {
    assert.equal(isKremlinPalaceId(KREMLIN_PALACE_MAP_KEY), true);
    assert.equal(isKremlinPalaceId('5e81e2f2930af7003040129e'), true);
  });

  it('repertoire env override', () => {
    const prev = process.env.GETBILET_KREMLIN_PALACE_REPERTOIRE_IDS;
    process.env.GETBILET_KREMLIN_PALACE_REPERTOIRE_IDS = 'rep-kremlin-1';
    assert.equal(isKremlinPalaceRepertoire('rep-kremlin-1'), true);
    assert.equal(kremlinPalaceMapKeyForRepertoire('rep-kremlin-1'), KREMLIN_PALACE_MAP_KEY);
    process.env.GETBILET_KREMLIN_PALACE_REPERTOIRE_IDS = prev;
  });

  it('venue heuristics', () => {
    assert.equal(
      shouldUseKremlinPalaceCanonicalMap(
        { title: 'Концерт', venueManual: 'Государственный Кремлёвский дворец' },
        null,
        'Большой зал',
      ),
      true,
    );
    assert.equal(
      shouldUseKremlinPalaceCanonicalMap(
        { title: 'МХТ' },
        'Московский Художественный театр',
        'Основная сцена',
      ),
      false,
    );
  });
});
