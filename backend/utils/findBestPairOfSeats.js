/**
 * Соседние пары мест, ранжированные от центра зала к краям.
 *
 * Центр = (minX + maxX) / 2 по всей выборке.
 * Соседство = один `row`, |seatNum_a − seatNum_b| === 1.
 *
 * @typedef {{ id: string|number, row: string|number, seatNum: number|string, x: number|string }} SeatInput
 * @typedef {{ id: string|number, row: string|number, seatNum: number, x: number }} Seat
 * @typedef {{ pair: [Seat, Seat], dist: number }} RankedPair
 */

/**
 * Все соседние пары, sort по dist ASC (центр → край). Ничья — стабильный pairKey.
 *
 * @param {SeatInput[]} seats
 * @returns {RankedPair[]}
 */
export function findRankedAdjacentPairs(seats) {
  const parsed = parseSeats(seats);
  if (parsed.length < 2) return [];

  let minX = Infinity;
  let maxX = -Infinity;
  for (const s of parsed) {
    if (s.x < minX) minX = s.x;
    if (s.x > maxX) maxX = s.x;
  }
  const centerX = (minX + maxX) / 2;

  /** @type {Map<string, typeof parsed>} */
  const byRow = new Map();
  for (const s of parsed) {
    const bucket = byRow.get(s.rowKey);
    if (bucket) bucket.push(s);
    else byRow.set(s.rowKey, [s]);
  }

  /** @type {RankedPair[]} */
  const ranked = [];
  for (const rowSeats of byRow.values()) {
    rowSeats.sort((a, b) => a.seatNum - b.seatNum || a.x - b.x);
    for (let i = 0; i < rowSeats.length; i += 1) {
      for (let j = i + 1; j < rowSeats.length; j += 1) {
        const a = rowSeats[i];
        const b = rowSeats[j];
        if (b.seatNum - a.seatNum !== 1) continue;
        if (Object.is(a.id, b.id)) continue;
        ranked.push({
          pair: [toSeat(a), toSeat(b)],
          dist: Math.abs((a.x + b.x) / 2 - centerX),
        });
      }
    }
  }

  ranked.sort((p, q) => {
    const d = p.dist - q.dist;
    if (Math.abs(d) > 1e-9) return d;
    return pairKey(p.pair[0], p.pair[1]).localeCompare(pairKey(q.pair[0], q.pair[1]));
  });
  return ranked;
}

/**
 * Жадный disjoint: идём от центра, пропускаем пары, у которых место уже занято.
 * Иначе ranked[1] на ряду 5–6, 6–7 делит место с ranked[0].
 *
 * @param {RankedPair[]} ranked
 * @param {number} [limit]
 * @returns {[Seat, Seat][]}
 */
export function pickDisjointPairs(ranked, limit = Infinity) {
  const cap = Number.isFinite(limit) ? Math.max(0, limit) : Infinity;
  /** @type {[Seat, Seat][]} */
  const out = [];
  const taken = new Set();
  for (const item of ranked) {
    if (out.length >= cap) break;
    const a = String(item.pair[0].id);
    const b = String(item.pair[1].id);
    if (taken.has(a) || taken.has(b)) continue;
    taken.add(a);
    taken.add(b);
    out.push(item.pair);
  }
  return out;
}

/**
 * @param {SeatInput[]} seats
 * @returns {[Seat, Seat] | null}
 */
export function findBestPairOfSeats(seats) {
  const ranked = findRankedAdjacentPairs(seats);
  return ranked[0]?.pair ?? null;
}

/**
 * @param {SeatInput[]} seats
 * @param {number} workerIndex
 * @returns {[Seat, Seat] | null}
 */
export function pairForWorkerIndex(seats, workerIndex) {
  const i = Number(workerIndex);
  if (!Number.isInteger(i) || i < 0) return null;
  return pickDisjointPairs(findRankedAdjacentPairs(seats))[i] ?? null;
}

/** @param {SeatInput[]} seats */
function parseSeats(seats) {
  /** @type {Array<Seat & { rowKey: string }>} */
  const parsed = [];
  if (!Array.isArray(seats)) return parsed;
  for (const s of seats) {
    if (!s || s.id == null || s.id === '') continue;
    const seatNum = Number(s.seatNum);
    const x = Number(s.x);
    if (!Number.isFinite(seatNum) || !Number.isFinite(x)) continue;
    parsed.push({
      id: s.id,
      row: s.row,
      seatNum,
      x,
      rowKey: String(s.row ?? ''),
    });
  }
  return parsed;
}

/** @param {Seat & { rowKey?: string }} s @returns {Seat} */
function toSeat(s) {
  return { id: s.id, row: s.row, seatNum: s.seatNum, x: s.x };
}

/** @param {Seat} a @param {Seat} b */
function pairKey(a, b) {
  return `${a.row}\0${a.seatNum}\0${b.seatNum}\0${a.id}`;
}
