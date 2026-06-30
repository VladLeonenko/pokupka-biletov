import test from 'node:test';
import assert from 'node:assert/strict';
import {
  selectionKeyForOfferSelections,
  TICKET_SEAT_HOLD_SECONDS,
} from '../services/ticketSeatReservation.js';

test('selectionKeyForOfferSelections is stable', () => {
  const selections = [
    { offerId: 'b', seats: ['2', '1'] },
    { offerId: 'a', seats: ['5'] },
  ];
  assert.equal(selectionKeyForOfferSelections(selections), 'a:5|b:1,2');
});

test('hold TTL defaults to 13 minutes', () => {
  assert.equal(TICKET_SEAT_HOLD_SECONDS, 13 * 60);
});
