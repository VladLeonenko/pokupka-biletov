import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractTicketRefsFromMakeData,
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

test('extractTicketRefsFromMakeData skips LocalSoftHold', () => {
  const refs = extractTicketRefsFromMakeData({
    Success: true,
    Method: 'LocalSoftHold',
    ResultData: [{ OfferId: 'o1', Seat: '1', SoftHold: true }],
  });
  assert.deepEqual(refs, []);
});

test('extractTicketRefsFromMakeData reads TicketId', () => {
  const refs = extractTicketRefsFromMakeData({
    Success: true,
    Method: 'MakeOrder',
    ResultData: [{ TicketId: 't-1', Seat: '12' }],
  });
  assert.equal(refs.length, 1);
  assert.equal(refs[0].externalTicketId, 't-1');
});
