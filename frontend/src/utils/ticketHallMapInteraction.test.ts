import { describe, expect, it } from 'vitest';
import {
  filterPlacementsInSectorPath,
  pickPlacementAtLayerPoint,
  seatPctInSectorBBox,
} from './ticketHallMapInteraction';
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

  it('seatPctInSectorBBox maps viewBox path to percent coords', () => {
    const bbox = { minX: 100, minY: 200, maxX: 300, maxY: 400 };
    expect(seatPctInSectorBBox(20, 30, bbox, 1000, 1000, 0)).toBe(true);
    expect(seatPctInSectorBBox(5, 30, bbox, 1000, 1000, 0)).toBe(false);
  });

  it('filterPlacementsInSectorPath keeps dots inside polygon bbox', () => {
    const path = 'M 100 200 L 300 200 L 300 400 L 100 400 Z';
    const inside: SvgNativePlacement[] = [
      { ...placements[0], xPct: 20, yPct: 30, key: 'in' },
      { ...placements[1], xPct: 80, yPct: 80, key: 'out' },
    ];
    const filtered = filterPlacementsInSectorPath(inside, path, 1000, 1000);
    expect(filtered.map((p) => p.key)).toEqual(['in']);
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
