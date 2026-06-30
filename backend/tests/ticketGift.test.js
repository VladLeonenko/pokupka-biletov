import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTicketGiftFromCheckoutBody, extractGiftFromPaymentMeta } from '../utils/ticketGift.js';

test('parseTicketGiftFromCheckoutBody returns null when not gift', () => {
  assert.equal(parseTicketGiftFromCheckoutBody({ email: 'a@b.c' }), null);
});

test('parseTicketGiftFromCheckoutBody validates recipient email', () => {
  assert.throws(() => parseTicketGiftFromCheckoutBody({ gift: { isGift: true, recipientEmail: 'bad' } }));
});

test('parseTicketGiftFromCheckoutBody builds gift meta', () => {
  const g = parseTicketGiftFromCheckoutBody({
    gift: { isGift: true, recipientEmail: 'friend@example.com', recipientName: 'Anna', message: 'Hi' },
  });
  assert.ok(g);
  assert.equal(g.recipientEmail, 'friend@example.com');
  assert.equal(g.recipientName, 'Anna');
  assert.ok(g.viewToken);
});

test('extractGiftFromPaymentMeta', () => {
  const g = extractGiftFromPaymentMeta({ gift: { isGift: true, recipientEmail: 'x@y.z' } });
  assert.equal(g.recipientEmail, 'x@y.z');
});
