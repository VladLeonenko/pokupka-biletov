import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isLuzhnikiFootballRepertoire,
  luzhnikiFootballStageMapKeyForRepertoire,
} from '../utils/luzhnikiFootballRepertoires.js';
import { resolveStageMapLookupExternalId } from '../services/stageMapLookup.js';

test('superfinal repertoire maps to luzhniki-football key', () => {
  assert.equal(isLuzhnikiFootballRepertoire('6a05d17b46a4d000309ecf4e'), true);
  assert.equal(luzhnikiFootballStageMapKeyForRepertoire('6a05d17b46a4d000309ecf4e'), 'luzhniki-football');
});

test('resolveStageMapLookupExternalId prefers canonical key for superfinal', async () => {
  const key = await resolveStageMapLookupExternalId(
    '6400ff2dd6cfc5004d20e9e9',
    '6a05d17b46a4d000309ecf4e',
  );
  assert.equal(key, 'luzhniki-football');
});
