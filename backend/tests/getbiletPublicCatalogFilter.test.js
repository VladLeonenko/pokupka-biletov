import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterUpcomingCatalogActions,
  isUpcomingCatalogAction,
  startOfMoscowDayMs,
} from '../services/getbiletPublicCatalogFilter.js';

test('isUpcomingCatalogAction: past april hidden, may24 shown', () => {
  // 15 мая 12:00 MSK
  const today = new Date('2026-05-15T09:00:00.000Z');
  assert.equal(
    isUpcomingCatalogAction({ EventDateTime: '2026-04-23T19:30' }, today),
    false,
  );
  assert.equal(
    isUpcomingCatalogAction({ EventDateTime: '2026-05-24T18:00' }, today),
    true,
  );
});

test('isUpcomingCatalogAction: сегодня (календарный день MSK) — показываем', () => {
  const now = new Date('2026-05-15T20:30:00.000Z'); // 15 мая 23:30 MSK
  assert.equal(
    isUpcomingCatalogAction({ EventDateTime: '2026-05-15T10:00:00+03:00' }, now),
    true,
  );
  assert.equal(
    isUpcomingCatalogAction({ EventDateTime: '2026-05-14T23:59:00+03:00' }, now),
    false,
  );
});

test('isUpcomingCatalogAction: no date → hidden on public vitrine', () => {
  assert.equal(isUpcomingCatalogAction({ Name: 'Без даты' }), false);
});

test('startOfMoscowDayMs aligns to +03:00 midnight', () => {
  const now = new Date('2026-05-15T01:30:00.000Z'); // 15 мая 04:30 MSK
  assert.equal(startOfMoscowDayMs(now), Date.parse('2026-05-15T00:00:00+03:00'));
});

test('filterUpcomingCatalogActions', () => {
  const today = new Date('2026-05-15T09:00:00.000Z');
  const out = filterUpcomingCatalogActions(
    [
      { Id: '1', EventDateTime: '2026-04-01T19:00' },
      { Id: '2', EventDateTime: '2026-05-20T19:00' },
    ],
    today,
  );
  assert.equal(out.length, 1);
  assert.equal(out[0].Id, '2');
});
