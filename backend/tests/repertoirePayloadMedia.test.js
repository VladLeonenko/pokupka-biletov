import assert from 'node:assert/strict';
import test from 'node:test';
import { extractPosterPageUrlFromRepertoirePayload } from '../services/repertoirePayloadMedia.js';

test('SiteUrl', () => {
  const u = extractPosterPageUrlFromRepertoirePayload({
    Name: 'X',
    SiteUrl: 'https://mxat.ru/play/test',
  });
  assert.equal(u, 'https://mxat.ru/play/test');
});

test('nested Place', () => {
  const u = extractPosterPageUrlFromRepertoirePayload({
    Place: { SiteUrl: 'https://example.org/a' },
  });
  assert.equal(u, 'https://example.org/a');
});
