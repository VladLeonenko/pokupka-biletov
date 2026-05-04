import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeHallSvgDataIds } from '../utils/normalizeHallSvgDataIds.js';

describe('normalizeHallSvgDataIds', () => {
  it('strips numeric underscore prefix in double quotes', () => {
    const raw =
      '<path data-id="385480_5a2a1bcf-e995-4862-8619-b5b47c03123a" d="M0 0"/>';
    assert.equal(
      normalizeHallSvgDataIds(raw),
      '<path data-id="5a2a1bcf-e995-4862-8619-b5b47c03123a" d="M0 0"/>',
    );
  });

  it('supports single quotes', () => {
    const raw = "<path data-id='12_ab-c' />";
    assert.equal(normalizeHallSvgDataIds(raw), "<path data-id='ab-c' />");
  });

  it('allows spaces around equals', () => {
    const raw = '<path data-id = "385480_uuid-here" />';
    assert.equal(normalizeHallSvgDataIds(raw), '<path data-id="uuid-here" />');
  });

  it('leaves ids without prefix unchanged', () => {
    const raw = '<path data-id="plain-id" d="M1 1"/>';
    assert.equal(normalizeHallSvgDataIds(raw), raw);
  });

  it('noop when stripNumericUnderscorePrefix false', () => {
    const raw = '<path data-id="385480_x" />';
    assert.equal(normalizeHallSvgDataIds(raw, { stripNumericUnderscorePrefix: false }), raw);
  });
});
