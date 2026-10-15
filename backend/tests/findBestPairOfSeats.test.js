import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  findBestPairOfSeats,
  findRankedAdjacentPairs,
  pairForWorkerIndex,
  pickDisjointPairs,
} from '../utils/findBestPairOfSeats.js';

describe('findBestPairOfSeats', () => {
  it('returns null for empty / single / no adjacent', () => {
    assert.equal(findBestPairOfSeats([]), null);
    assert.equal(findBestPairOfSeats([{ id: 'a', row: 1, seatNum: 1, x: 0 }]), null);
    assert.equal(
      findBestPairOfSeats([
        { id: 'a', row: 1, seatNum: 1, x: 0 },
        { id: 'b', row: 1, seatNum: 3, x: 10 },
        { id: 'c', row: 2, seatNum: 2, x: 5 },
      ]),
      null,
    );
  });

  it('picks same-row neighbours with |seatNum| diff 1', () => {
    const pair = findBestPairOfSeats([
      { id: 'r1-1', row: 1, seatNum: 1, x: 0 },
      { id: 'r1-2', row: 1, seatNum: 2, x: 10 },
    ]);
    assert.deepEqual(
      pair.map((s) => s.id),
      ['r1-1', 'r1-2'],
    );
  });

  it('prefers the pair whose midpoint X is closest to (minX+maxX)/2', () => {
    // minX=0, maxX=40 → center=20. Edge pair midpoint=5, center pair=20.
    const pair = findBestPairOfSeats([
      { id: 'edge-1', row: 'A', seatNum: 1, x: 0 },
      { id: 'edge-2', row: 'A', seatNum: 2, x: 10 },
      { id: 'mid-5', row: 'B', seatNum: 5, x: 18 },
      { id: 'mid-6', row: 'B', seatNum: 6, x: 22 },
      { id: 'far-9', row: 'C', seatNum: 9, x: 39 },
      { id: 'far-10', row: 'C', seatNum: 10, x: 40 },
    ]);
    assert.deepEqual(
      pair.map((s) => s.id),
      ['mid-5', 'mid-6'],
    );
  });

  it('uses the full array for center, including seats that are not in any pair', () => {
    // Lone seat at x=100 pulls center to 50. Pair at 0/10 (mid=5) loses to pair at 48/52.
    const pair = findBestPairOfSeats([
      { id: 'a1', row: 1, seatNum: 1, x: 0 },
      { id: 'a2', row: 1, seatNum: 2, x: 10 },
      { id: 'b1', row: 2, seatNum: 1, x: 48 },
      { id: 'b2', row: 2, seatNum: 2, x: 52 },
      { id: 'lonely', row: 9, seatNum: 1, x: 100 },
    ]);
    assert.deepEqual(
      pair.map((s) => s.id),
      ['b1', 'b2'],
    );
  });

  it('coerces string seatNum/x and keeps original row type', () => {
    const pair = findBestPairOfSeats([
      { id: 1, row: '12', seatNum: '4', x: '1' },
      { id: 2, row: '12', seatNum: '5', x: '3' },
    ]);
    assert.equal(pair[0].row, '12');
    assert.equal(pair[0].seatNum, 4);
    assert.equal(pair[1].seatNum, 5);
  });

  it('is deterministic on equal distance (lower rowKey, then seatNum)', () => {
    const pair = findBestPairOfSeats([
      { id: 'z1', row: 'Z', seatNum: 1, x: 10 },
      { id: 'z2', row: 'Z', seatNum: 2, x: 10 },
      { id: 'a1', row: 'A', seatNum: 8, x: 10 },
      { id: 'a2', row: 'A', seatNum: 9, x: 10 },
    ]);
    assert.deepEqual(
      pair.map((s) => s.id),
      ['a1', 'a2'],
    );
  });

  it('findRankedAdjacentPairs is center-first', () => {
    const ranked = findRankedAdjacentPairs([
      { id: 'edge-1', row: 'A', seatNum: 1, x: 0 },
      { id: 'edge-2', row: 'A', seatNum: 2, x: 10 },
      { id: 'mid-5', row: 'B', seatNum: 5, x: 18 },
      { id: 'mid-6', row: 'B', seatNum: 6, x: 22 },
      { id: 'far-9', row: 'C', seatNum: 9, x: 39 },
      { id: 'far-10', row: 'C', seatNum: 10, x: 40 },
    ]);
    assert.deepEqual(
      ranked.map((r) => r.pair.map((s) => s.id)),
      [
        ['mid-5', 'mid-6'],
        ['edge-1', 'edge-2'],
        ['far-9', 'far-10'],
      ],
    );
  });

  it('pickDisjointPairs skips overlapping neighbours on the same row', () => {
    // row of 1-2-3-4: ranked overlaps on seat 2/3. Disjoint → (2,3) center then (none left that is free)... 
    // seats x: 1=0, 2=10, 3=20, 4=30 → center=15. Pairs: (2,3) mid=15, (1,2) mid=5, (3,4) mid=25.
    const ranked = findRankedAdjacentPairs([
      { id: 's1', row: 1, seatNum: 1, x: 0 },
      { id: 's2', row: 1, seatNum: 2, x: 10 },
      { id: 's3', row: 1, seatNum: 3, x: 20 },
      { id: 's4', row: 1, seatNum: 4, x: 30 },
    ]);
    const disjoint = pickDisjointPairs(ranked);
    assert.deepEqual(
      disjoint.map((p) => p.map((s) => s.id)),
      [['s2', 's3']],
    );
  });

  it('pairForWorkerIndex gives distinct disjoint pairs', () => {
    const seats = [
      { id: 's1', row: 1, seatNum: 1, x: 0 },
      { id: 's2', row: 1, seatNum: 2, x: 10 },
      { id: 's3', row: 1, seatNum: 3, x: 20 },
      { id: 's4', row: 1, seatNum: 4, x: 30 },
      { id: 't1', row: 2, seatNum: 1, x: 0 },
      { id: 't2', row: 2, seatNum: 2, x: 10 },
    ];
    const w0 = pairForWorkerIndex(seats, 0);
    const w1 = pairForWorkerIndex(seats, 1);
    assert.deepEqual(
      w0.map((s) => s.id),
      ['s2', 's3'],
    );
    assert.deepEqual(
      w1.map((s) => s.id),
      ['t1', 't2'],
    );
    const ids = [...w0, ...w1].map((s) => s.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(pairForWorkerIndex(seats, 2), null);
  });
});
