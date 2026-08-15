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

test('basta-guf repertoire maps to luzhniki-concert (not theater StageId)', async () => {
  const { footballStadiumStageMapKeyForRepertoire } = await import(
    '../utils/footballStadiumRepertoires.js'
  );
  assert.equal(
    footballStadiumStageMapKeyForRepertoire('69ac1c5246a4d000309ecd5c'),
    'luzhniki-concert',
  );
  assert.equal(footballStadiumStageMapKeyForRepertoire('basta-guf'), 'luzhniki-concert');
  const key = await resolveStageMapLookupExternalId(
    '6400ff2dd6cfc5004d20e9e9',
    '69ac1c5246a4d000309ecd5c',
  );
  assert.equal(key, 'luzhniki-concert');
});

test('capSvgIntrinsicRasterSize shrinks concert 11k SVG, keeps football 1k', async () => {
  const { capSvgIntrinsicRasterSize } = await import('../services/luzhnikiFootballStageMap.js');
  const concert =
    '<svg xmlns="http://www.w3.org/2000/svg" width="11413" height="9676" viewBox="0 0 11413 9676"></svg>';
  const out = capSvgIntrinsicRasterSize(concert);
  assert.match(out, /width="2048"/);
  assert.match(out, /height="1736"/);
  assert.match(out, /viewBox="0 0 11413 9676"/);
  const football =
    '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="820" viewBox="0 0 1000 820"></svg>';
  assert.equal(capSvgIntrinsicRasterSize(football), football);
});
