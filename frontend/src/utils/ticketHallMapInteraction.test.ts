import { describe, expect, it } from 'vitest';
import { pickPlacementAtLayerPoint } from './ticketHallMapInteraction';
import type { SvgNativePlacement } from './svgNativeSeatLayout';

describe('pickPlacementAtLayerPoint', () => {
  const placements: SvgNativePlacement[] = [
    {
      svgKey: 'a|1|10',
      key: 'o1',
      offerId: 'o1',
      sectorLabel: 'A',
      seat: '10',
      rowLabel: '1',
      available: ['10'],
      xPct: 50,
      yPct: 50,
      title: 'A',
      priceKey: '1000',
    },
    {
      svgKey: 'a|1|11',
      key: 'o2',
      offerId: 'o2',
      sectorLabel: 'A',
      seat: '11',
      rowLabel: '1',
      available: ['11'],
      xPct: 80,
      yPct: 50,
      title: 'A',
      priceKey: '2000',
    },
  ];

  it('picks nearest interactive placement within hit radius', () => {
    expect(pickPlacementAtLayerPoint(placements, 500, 500, 1000, 1000, 1000)?.key).toBe('o1');
    expect(pickPlacementAtLayerPoint(placements, 800, 500, 1000, 1000, 1000)?.key).toBe('o2');
  });

  it('ignores preview-only placements', () => {
    const withPreview = [
      ...placements,
      {
        ...placements[0],
        key: 'preview',
        previewOnly: true,
        xPct: 49,
        yPct: 50,
      },
    ];
    expect(pickPlacementAtLayerPoint(withPreview, 490, 500, 1000, 1000, 1000)?.key).toBe('o1');
  });
});
