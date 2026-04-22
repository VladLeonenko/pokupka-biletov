import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { probePosterImages } from '../services/posterPageProbe.js';

describe('posterPageProbe', () => {
  let prevFetch;
  let prevAllow;

  beforeEach(() => {
    prevFetch = global.fetch;
    prevAllow = process.env.POSTER_PAGE_ALLOWLIST_HOSTS;
    process.env.POSTER_PAGE_ALLOWLIST_HOSTS = '';
  });

  afterEach(() => {
    global.fetch = prevFetch;
    process.env.POSTER_PAGE_ALLOWLIST_HOSTS = prevAllow;
  });

  it('берёт og:image и размеры', async () => {
    const html = `<!DOCTYPE html><html><head>
      <meta property="og:image" content="https://cdn.example/poster.jpg" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="800" />
    </head><body></body></html>`;

    global.fetch = async () => ({
      ok: true,
      url: 'https://theatre.example/show',
      arrayBuffer: () => new TextEncoder().encode(html).buffer,
    });

    const r = await probePosterImages('https://theatre.example/show');
    assert.equal(r.bestUrl, 'https://cdn.example/poster.jpg');
    assert.ok(r.candidates.some((c) => c.source === 'og:image'));
  });
});
