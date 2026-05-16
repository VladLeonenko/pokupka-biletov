import test from 'node:test';
import assert from 'node:assert/strict';
import { isManualRepertoireKey } from '../utils/repertoireRouteKey.js';
import {
  isFanIdRequiredForRepertoire,
  isValidFanId,
  normalizeFanId,
} from '../utils/fanIdRequiredEvents.js';

test('isManualRepertoireKey', () => {
  assert.equal(isManualRepertoireKey('final-kubka-rossii-po-futbolu-2026'), true);
  assert.equal(isManualRepertoireKey('6a05d17b46a4d000309ecf4e'), false);
});

test('fan id required for superfinal repertoire', () => {
  assert.equal(isFanIdRequiredForRepertoire('6a05d17b46a4d000309ecf4e'), true);
  assert.equal(isFanIdRequiredForRepertoire('other-id'), false);
});

test('fan id validation', () => {
  assert.equal(normalizeFanId(' ab 12cd '), 'AB12CD');
  assert.equal(isValidFanId('AB12CD34'), true);
  assert.equal(isValidFanId('short'), false);
});
