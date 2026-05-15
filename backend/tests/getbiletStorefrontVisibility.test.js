import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isStorefrontHidden,
  storefrontHiddenFromPublished,
} from '../services/getbiletStorefrontVisibility.js';

test('storefrontHiddenFromPublished', () => {
  assert.equal(storefrontHiddenFromPublished(true), false);
  assert.equal(storefrontHiddenFromPublished(false), true);
});

test('isStorefrontHidden respects storefront_hidden only', () => {
  assert.equal(isStorefrontHidden({ is_published: false }), false);
  assert.equal(isStorefrontHidden({ is_published: true, storefront_hidden: true }), true);
  assert.equal(isStorefrontHidden({ storefront_hidden: false }), false);
});
