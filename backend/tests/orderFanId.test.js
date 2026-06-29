import test from 'node:test';
import assert from 'node:assert/strict';
import { extractFanIdFromOrder } from '../utils/orderFanId.js';

test('extractFanIdFromOrder reads payment_metadata.fanId', () => {
  assert.equal(
    extractFanIdFromOrder({
      payment_metadata: { fanId: 'abc12345' },
      notes: '',
    }),
    'ABC12345',
  );
});

test('extractFanIdFromOrder falls back to notes', () => {
  assert.equal(
    extractFanIdFromOrder({
      payment_metadata: null,
      notes: 'Билеты: Суперфинал · FAN ID XYZ98765',
    }),
    'XYZ98765',
  );
});

test('extractFanIdFromOrder returns null when missing', () => {
  assert.equal(extractFanIdFromOrder({ payment_metadata: {}, notes: 'Билеты' }), null);
});
