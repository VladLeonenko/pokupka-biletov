import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterUpcomingCatalogActions,
  isUpcomingCatalogAction,
} from '../services/getbiletPublicCatalogFilter.js';

test('isUpcomingCatalogAction: past april hidden, may24 shown', () => {
  const today = new Date('2026-05-15T12:00:00');
  assert.equal(
    isUpcomingCatalogAction({ EventDateTime: '2026-04-23T19:30' }, today),
    false,
  );
  assert.equal(
    isUpcomingCatalogAction({ EventDateTime: '2026-05-24T18:00' }, today),
    true,
  );
});

test('isUpcomingCatalogAction: no date → hidden on public vitrine', () => {
  assert.equal(isUpcomingCatalogAction({ Name: 'Без даты' }), false);
});

test('filterUpcomingCatalogActions', () => {
  const today = new Date('2026-05-15T12:00:00');
  const out = filterUpcomingCatalogActions([
    { Id: '1', EventDateTime: '2026-04-01T19:00' },
    { Id: '2', EventDateTime: '2026-05-20T19:00' },
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].Id, '2');
});
