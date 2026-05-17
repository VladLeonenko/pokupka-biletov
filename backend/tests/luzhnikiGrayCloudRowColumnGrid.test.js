import test from 'node:test';
import assert from 'node:assert/strict';

import { buildGrayCloudRowColumnGrid } from '../utils/luzhnikiGrayCloudRowColumnGrid.js';

test('buildGrayCloudRowColumnGrid: прямоугольная сетка в одном секторе', () => {
  const sectorPaths = [
    {
      label: 'Сектор TEST',
      path: 'M 1000 1000 L 3000 1000 L 3000 3000 L 1000 3000 Z',
    },
  ];
  const allSeatCoordinates = [];
  for (let row = 0; row < 5; row += 1) {
    for (let seat = 0; seat < 8; seat += 1) {
      allSeatCoordinates.push({
        xPct: 10 + seat * 1.6,
        yPct: 12 + row * 2.2,
      });
    }
  }

  const { rowLines, columnLines } = buildGrayCloudRowColumnGrid({
    allSeatCoordinates,
    sectorPaths,
    hallWidth: 11413,
    hallHeight: 9676,
    rowClusterEps: 0.2,
  });

  assert.ok(rowLines.length >= 1);
  assert.ok(columnLines.length >= 1);
});
