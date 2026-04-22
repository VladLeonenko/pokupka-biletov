import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPosterWebSearchQuery,
  normalizeImageUrlFromSearch,
  parsePosterWebSearchImageSites,
} from '../services/eventPosterWebSearch.js';

describe('eventPosterWebSearch', () => {
  it('normalizeImageUrlFromSearch rejects non-http', () => {
    assert.equal(normalizeImageUrlFromSearch('ftp://x'), null);
    assert.equal(normalizeImageUrlFromSearch('//cdn/x.jpg'), null);
    assert.equal(normalizeImageUrlFromSearch('https://a.example/p.jpg'), 'https://a.example/p.jpg');
  });

  it('parsePosterWebSearchImageSites splits comma list', () => {
    const prev = process.env.POSTER_WEB_SEARCH_IMAGE_SITE;
    process.env.POSTER_WEB_SEARCH_IMAGE_SITE = 'afisha.yandex.ru, portalbilet.ru ';
    try {
      assert.deepEqual(parsePosterWebSearchImageSites(), ['afisha.yandex.ru', 'portalbilet.ru']);
    } finally {
      if (prev === undefined) delete process.env.POSTER_WEB_SEARCH_IMAGE_SITE;
      else process.env.POSTER_WEB_SEARCH_IMAGE_SITE = prev;
    }
  });

  it('buildPosterWebSearchQuery appends suffix from env', () => {
    const prevS = process.env.POSTER_WEB_SEARCH_QUERY_SUFFIX;
    const prevE = process.env.POSTER_WEB_SEARCH_EXACT_PHRASE;
    process.env.POSTER_WEB_SEARCH_QUERY_SUFFIX = ' тест суффикс';
    process.env.POSTER_WEB_SEARCH_EXACT_PHRASE = '0';
    try {
      assert.match(buildPosterWebSearchQuery('Гамлет'), /Гамлет.*тест суффикс/);
    } finally {
      if (prevS === undefined) delete process.env.POSTER_WEB_SEARCH_QUERY_SUFFIX;
      else process.env.POSTER_WEB_SEARCH_QUERY_SUFFIX = prevS;
      if (prevE === undefined) delete process.env.POSTER_WEB_SEARCH_EXACT_PHRASE;
      else process.env.POSTER_WEB_SEARCH_EXACT_PHRASE = prevE;
    }
  });

  it('buildPosterWebSearchQuery wraps title in quotes by default (phrase match)', () => {
    const prevS = process.env.POSTER_WEB_SEARCH_QUERY_SUFFIX;
    const prevE = process.env.POSTER_WEB_SEARCH_EXACT_PHRASE;
    delete process.env.POSTER_WEB_SEARCH_QUERY_SUFFIX;
    delete process.env.POSTER_WEB_SEARCH_EXACT_PHRASE;
    try {
      const q = buildPosterWebSearchQuery('Гамлет  спектакль');
      assert.ok(q.startsWith('"Гамлет спектакль"'));
      assert.ok(q.includes('афиша спектакль'));
    } finally {
      if (prevS === undefined) delete process.env.POSTER_WEB_SEARCH_QUERY_SUFFIX;
      else process.env.POSTER_WEB_SEARCH_QUERY_SUFFIX = prevS;
      if (prevE === undefined) delete process.env.POSTER_WEB_SEARCH_EXACT_PHRASE;
      else process.env.POSTER_WEB_SEARCH_EXACT_PHRASE = prevE;
    }
  });
});
