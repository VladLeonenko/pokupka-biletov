import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  isBolshoiZonePreorderRepertoire,
  layoutForBolshoiRepertoire,
} from '../utils/bolshoiCheckoutMode.js';
import {
  expandBolshoiNewStageZoneOffers,
  offersAreNewStageZonePlaceholders,
} from '../utils/bolshoiNewStageSeatOffers.js';

describe('bolshoi zone preorder', () => {
  it('keeps zone preorder only for the Nutcracker card', () => {
    assert.equal(isBolshoiZonePreorderRepertoire('novogodniy-balet-chaykovskogo-2026-12'), true);
    assert.equal(isBolshoiZonePreorderRepertoire('schelkunchik-2026-12'), true);
    assert.equal(isBolshoiZonePreorderRepertoire('bayaderka-2026-11-13'), false);
    assert.equal(isBolshoiZonePreorderRepertoire('chipollino-2026-11-06'), false);
  });

  it('switches the shared Bolshoi layout per repertoire', () => {
    const layout = {
      bolshoiHistorical: { hallWidth: 1500 },
      hallPreviewSectorCheckout: true,
      seatSelectionDisabled: true,
      hideSeatList: true,
    };
    const nut = layoutForBolshoiRepertoire(layout, 'novogodniy-balet-chaykovskogo-2026-12');
    assert.equal(nut.hallPreviewSectorCheckout, true);
    assert.equal(nut.seatSelectionDisabled, true);
    assert.equal(nut.bolshoiSeatCheckout, false);

    const bay = layoutForBolshoiRepertoire(layout, 'bayaderka-2026-11-13');
    assert.equal(bay.hallPreviewSectorCheckout, false);
    assert.equal(bay.seatSelectionDisabled, false);
    assert.equal(bay.hideSeatList, false);
    assert.equal(bay.bolshoiSeatCheckout, true);
    assert.equal(layout.hallPreviewSectorCheckout, true);
  });
});

describe('bolshoi new stage seat offers', () => {
  it('expands the zone placeholder into rows 1–8', () => {
    const offers = [
      {
        Id: 'chipollino-2026-11-06-parter_mid',
        Sector: 'Партер (середина)',
        Row: '1',
        SeatList: ['1', '2', '3', '4', '5', '6', '7', '8'],
        NominalPrice: '50000',
        EventDateTime: '2026-11-06T16:00:00.000Z',
        LocalOffer: true,
        ManualOffer: true,
      },
    ];
    assert.equal(offersAreNewStageZonePlaceholders(offers), true);
    const seats = [
      { sector: 'Партер левая сторона', row: '1', seat: '4' },
      { sector: 'Партер правая сторона', row: '1', seat: '10' },
      { sector: 'Партер левая сторона', row: '2', seat: '5' },
      { sector: 'Партер левая сторона', row: '9', seat: '1' },
      { sector: 'Бельэтаж', row: '1', seat: '1' },
    ];
    const next = expandBolshoiNewStageZoneOffers(offers, seats);
    assert.equal(next.length, 2);
    const row1 = next.find((o) => o.Row === '1');
    assert.ok(row1);
    assert.deepEqual(row1.SeatList.sort(), ['10', '4']);
    assert.equal(row1.LocalOffer, true);
    assert.equal(row1.NominalPrice, '50000');
    assert.equal(next.some((o) => o.Row === '9'), false);
    assert.equal(offersAreNewStageZonePlaceholders(next), false);
  });

  it('does not treat multi-sector historical offers as a new-stage placeholder', () => {
    assert.equal(
      offersAreNewStageZonePlaceholders([
        { Sector: 'Партер (середина)', Row: '1', EventDateTime: '2026-11-13T16:00:00.000Z' },
        { Sector: 'Бельэтаж правая ложа 4', Row: '4', EventDateTime: '2026-11-13T16:00:00.000Z' },
      ]),
      false,
    );
  });
});
