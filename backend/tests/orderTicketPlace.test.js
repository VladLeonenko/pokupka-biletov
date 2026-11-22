import test from 'node:test';
import assert from 'node:assert/strict';
import { extractTicketPlaceFromOrder, parseSeatLabel } from '../utils/orderTicketPlace.js';

test('parseSeatLabel splits sector that contains commas', () => {
  assert.deepEqual(parseSeatLabel('балкон, левая сторона, 5 ряд, место 3'), {
    sector: 'балкон, левая сторона',
    row: '5',
    seat: '3',
    label: 'балкон, левая сторона, 5 ряд, место 3',
  });
});

test('parseSeatLabel keeps zone-only labels intact', () => {
  assert.deepEqual(parseSeatLabel('Партер — 2 за билет'), {
    sector: null,
    row: null,
    seat: null,
    label: 'Партер — 2 за билет',
  });
});

test('extractTicketPlaceFromOrder reads checkout metadata', () => {
  const ticket = extractTicketPlaceFromOrder({
    payment_metadata: {
      ticketCheckout: true,
      eventTitle: 'Кабала святош',
      venueLabel: 'МХТ им. Чехова',
      sessionLabel: 'пн, 21 декабря · 19:00',
      repertoireId: '686cd69c58f79d0030278b9d',
      seats: ['3', '4'],
      seatLabels: [
        'балкон, левая сторона, 5 ряд, место 3',
        'балкон, левая сторона, 5 ряд, место 4',
      ],
      promoCode: 'SECRET',
      supplierRub: 1000,
    },
  });
  assert.equal(ticket.eventTitle, 'Кабала святош');
  assert.equal(ticket.seats.length, 2);
  assert.equal(ticket.seats[1].row, '5');
  assert.equal(ticket.seats[1].seat, '4');
  assert.equal(ticket.seats[0].sector, 'балкон, левая сторона');
  assert.equal('promoCode' in ticket, false);
});

test('extractTicketPlaceFromOrder falls back to seat numbers', () => {
  const ticket = extractTicketPlaceFromOrder({
    payment_metadata: { ticketCheckout: true, eventTitle: 'Спектакль', seats: ['12'] },
  });
  assert.deepEqual(ticket.seats[0], { sector: null, row: null, seat: '12', label: 'место 12' });
});

test('extractTicketPlaceFromOrder ignores non-ticket orders', () => {
  assert.equal(extractTicketPlaceFromOrder({ payment_metadata: { fanId: 'ABC' } }), null);
  assert.equal(extractTicketPlaceFromOrder({ payment_metadata: null }), null);
});
