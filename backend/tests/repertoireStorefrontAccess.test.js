import test from 'node:test';
import assert from 'node:assert/strict';
import { isManualRepertoireKey } from '../utils/repertoireRouteKey.js';
import {
  isFanIdRequiredForRepertoire,
  isValidFanId,
  normalizeFanId,
  repertoireIdForTicketSlug,
} from '../utils/fanIdRequiredEvents.js';
import { isBlockedRepertoireSlug } from '../services/repertoireStorefrontAccess.js';

test('isManualRepertoireKey', () => {
  assert.equal(isManualRepertoireKey('final-kubka-rossii-po-futbolu-2026'), true);
  assert.equal(isManualRepertoireKey('6a05d17b46a4d000309ecf4e'), false);
});

test('fan id required for superfinal repertoire', () => {
  assert.equal(isFanIdRequiredForRepertoire('6a05d17b46a4d000309ecf4e'), true);
  assert.equal(isFanIdRequiredForRepertoire('other-id'), false);
});

test('ticket slug alias for superfinal → supercup NN', () => {
  assert.equal(
    repertoireIdForTicketSlug('superfinal-fonbet-kubka-rossii-spartak-krasnodar'),
    '6a46656d46a4d000309ed0a2',
  );
});

test('ticket slug alias for basta-guf concert', () => {
  assert.equal(repertoireIdForTicketSlug('basta-guf'), '69ac1c5246a4d000309ecd5c');
  assert.equal(repertoireIdForTicketSlug('basta-i-guf'), '69ac1c5246a4d000309ecd5c');
});

test('ticket slug alias for kabala-svyatosh', () => {
  assert.equal(repertoireIdForTicketSlug('kabala-svyatosh'), '686cd69c58f79d0030278b9d');
});

test('blocked test slugs', () => {
  assert.equal(isBlockedRepertoireSlug('final-kubka-rossii-po-futbolu-2026'), true);
  assert.equal(isBlockedRepertoireSlug('superfinal-fonbet-kubka-rossii-spartak-krasnodar'), false);
});

test('fan id validation', () => {
  assert.equal(normalizeFanId(' ab 12cd '), 'AB12CD');
  assert.equal(isValidFanId('AB12CD34'), true);
  assert.equal(isValidFanId('short'), false);
});
