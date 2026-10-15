/**
 * Выбор лучших мест из JSON-схемы зала Афиши (mapi.afisha.ru/api/v21/hall/{sessionId}).
 *
 * Критерии «лучших» мест:
 *   1. N соседних мест в одном ряду (по умолчанию 2).
 *   2. Ближе к сцене: Партер → Амфитеатр → Бельэтаж → Бенуар → Балкон → Ложи/прочее.
 *   3. Внутри секции — первые ряды (меньший номер ряда = ближе к сцене).
 *   4. Внутри ряда — пары ближе к центру ряда (по координате X).
 */

/**
 * @typedef {{ id: string, number: string, x: number, y: number, price: number }} RankedSeat
 * @typedef {{ levelId: string, levelName: string, row: string, seats: RankedSeat[], totalPrice: number }} SeatPair
 */

/** Приоритет секции по названию (меньше = ближе к сцене). */
function sectionPriority(name) {
  const n = String(name || '').toLowerCase();
  if (n.includes('партер')) return 0;
  if (n.includes('амфитеатр')) return 1;
  if (n.includes('бельэтаж')) return 2;
  if (n.includes('бенуар')) return 3;
  if (n.includes('балкон')) return 4;
  if (n.includes('ложа')) return 5;
  return 6;
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

/** «511657-2200» → 2200 */
function priceFrom(seatTypeId) {
  const m = String(seatTypeId || '').match(/-(\d+)$/);
  return m ? Number(m[1]) : 0;
}

/**
 * Все соседние пары мест, ранжированные по (приоритет секции, номер ряда, близость к центру ряда).
 *
 * @param {object} hall - JSON ответ /api/v21/hall/...
 * @param {{ count?: number, limit?: number }} [opts]
 * @returns {SeatPair[]} Непересекающиеся группы мест (каждая группа — соседние места в одном ряду).
 */
export function findBestSeatPairs(hall, opts = {}) {
  const count = Math.max(1, opts.count ?? 2);
  const limit = Number.isFinite(opts.limit) ? opts.limit : 3;

  const levels = (Array.isArray(hall?.levels) ? hall.levels : []).slice().sort((a, b) => {
    const p = sectionPriority(a.name) - sectionPriority(b.name);
    if (p !== 0) return p;
    return String(a.name).localeCompare(String(b.name), 'ru');
  });

  /** @type {Array<SeatPair & { _rank: number }>} */
  const out = [];

  for (const level of levels) {
    const rows = (level.rows || []).slice().sort((a, b) => {
      const an = toNum(a.number);
      const bn = toNum(b.number);
      if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
      return String(a.number).localeCompare(String(b.number), 'ru', { numeric: true });
    });

    for (const row of rows) {
      const available = (row.seats || [])
        .filter((s) => s && s.isAvailable)
        .map((s) => ({ id: s.id, number: s.number, x: Number(s.x), y: Number(s.y), price: priceFrom(s.seatTypeId), seatNum: toNum(s.number) }))
        .filter((s) => Number.isFinite(s.seatNum) && Number.isFinite(s.x));

      if (available.length < count) continue;

      available.sort((a, b) => a.seatNum - b.seatNum);

      const minX = Math.min(...available.map((s) => s.x));
      const maxX = Math.max(...available.map((s) => s.x));
      const centerX = (minX + maxX) / 2;

      /** @type {Array<{ seats: RankedSeat[], dist: number, totalPrice: number }>} */
      const pairs = [];
      for (let i = 0; i + count - 1 < available.length; i++) {
        const seg = available.slice(i, i + count);
        if (seg[count - 1].seatNum - seg[0].seatNum !== count - 1) continue; // только подряд
        const mid = (seg[0].x + seg[count - 1].x) / 2;
        pairs.push({
          seats: seg.map((s) => ({ id: s.id, number: s.number, row: row.number, x: s.x, y: s.y, price: s.price })),
          dist: Math.abs(mid - centerX),
          totalPrice: seg.reduce((sum, s) => sum + s.price, 0),
        });
      }
      pairs.sort((a, b) => a.dist - b.dist);

      const rowNum = toNum(row.number);
      for (const pair of pairs) {
        out.push({
          levelId: level.id,
          levelName: level.name,
          row: row.number,
          seats: pair.seats,
          totalPrice: pair.totalPrice,
          _rank: rowNum,
        });
      }
    }
  }

  // Убираем пересечения по id мест: каждое место отдаём только одной группе.
  const taken = new Set();
  const disjoint = [];
  for (const pair of out) {
    if (disjoint.length >= limit) break;
    if (pair.seats.some((s) => taken.has(s.id))) continue;
    pair.seats.forEach((s) => taken.add(s.id));
    const { _rank, ...clean } = pair;
    disjoint.push(clean);
  }
  return disjoint;
}

/** Краткое имя пары для логов: «Амфитеатр, ряд 5, места 1-2 (2 200 ₽ × 2)». */
export function formatSeatPair(pair) {
  const nums = pair.seats.map((s) => s.number).join('-');
  const price = pair.seats[0]?.price ?? 0;
  return `${pair.levelName}, ряд ${pair.row}, места ${nums} (${price} ₽ × ${pair.seats.length})`;
}

/**
 * Приоритет «лучших мест» для МХТ (Основная сцена, «Кабала святош») — из голосового
 * сообщения заказчика. Порядок в массиве = строгий приоритет сверху вниз.
 * Каждая запись: { level: RegExp (по названию уровня), rows: [от, до] | null, seats: [от, до] | null }.
 * rows/seats = null означает «весь диапазон». seats также задаёт «середину» для центровки.
 */
export const MHT_KABALA_PREFERENCE = [
  { level: /^партер$/i, rows: null, seats: [3, 18] },                // Партер: любые ряды, места 3–18 (без крайних 2)
  { level: /^амфитеатр$/i, rows: [1, 1], seats: null },              // Амфитеатр, 1 ряд, весь
  { level: /^бельэтаж середина$/i, rows: [1, 1], seats: null },      // Бельэтаж середина, 1 ряд
  { level: /^бельэтаж правая сторона$/i, rows: [1, 1], seats: null }, // Бельэтаж правая, 1 ряд
  { level: /^бельэтаж левая сторона$/i, rows: [1, 1], seats: null },  // Бельэтаж левая, 1 ряд
  { level: /^ложа бельэтажа/i, rows: null, seats: null },            // Ложи бельэтажа
  { level: /^балкон середина$/i, rows: [1, 1], seats: null },        // Балкон середина, 1 ряд, любые места
  { level: /^балкон правая сторона$/i, rows: [1, 1], seats: null },  // Балкон правая, 1 ряд, любые места
  { level: /^балкон левая сторона$/i, rows: [1, 1], seats: null },   // Балкон левая, 1 ряд, любые места
];

/**
 * Выбор лучших пар мест по явному приоритету (списку критериев). В отличие от
 * findBestSeatPairs (общая эвристика «ближе к сцене»), здесь приоритет полностью
 * задаётся списком: перебираем критерии по порядку, внутри ряда берём пары ближе
 * к «середине» нужного диапазона мест (по номеру места), чтобы центр (10–11)
 * был предпочтительнее краёв (3–4 / 17–18).
 *
 * @param {object} hall - JSON ответ /api/v21/hall/...
 * @param {Array<{level: RegExp, rows: [number, number]|null, seats: [number, number]|null}>} [preference]
 * @param {{ count?: number, limit?: number }} [opts]
 * @returns {SeatPair[]} Непересекающиеся группы мест.
 */
export function findBestSeatsByPreference(hall, preference = MHT_KABALA_PREFERENCE, opts = {}) {
  const count = Math.max(1, opts.count ?? 2);
  const limit = Number.isFinite(opts.limit) ? opts.limit : 30;

  const levels = Array.isArray(hall?.levels) ? hall.levels : [];
  const out = [];

  for (const pref of preference) {
    const matched = levels
      .filter((l) => pref.level.test(String(l.name || '')))
      .sort((a, b) => String(a.name).localeCompare(String(b.name), 'ru', { numeric: true }));

    for (const level of matched) {
      const rows = (level.rows || []).slice().sort((a, b) => {
        const an = toNum(a.number);
        const bn = toNum(b.number);
        if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
        return String(a.number).localeCompare(String(b.number), 'ru', { numeric: true });
      });

      for (const row of rows) {
        const rowNum = toNum(row.number);
        if (pref.rows && Number.isFinite(rowNum) && (rowNum < pref.rows[0] || rowNum > pref.rows[1])) continue;

        const available = (row.seats || [])
          .filter((s) => s && s.isAvailable)
          .map((s) => ({ id: s.id, number: s.number, x: Number(s.x), y: Number(s.y), price: priceFrom(s.seatTypeId), seatNum: toNum(s.number) }))
          .filter((s) => Number.isFinite(s.seatNum))
          .filter((s) => !pref.seats || (s.seatNum >= pref.seats[0] && s.seatNum <= pref.seats[1]));

        if (available.length < count) continue;
        available.sort((a, b) => a.seatNum - b.seatNum);

        // Центр нужного диапазона мест («середина» из голосового).
        const lo = pref.seats ? pref.seats[0] : Math.min(...available.map((s) => s.seatNum));
        const hi = pref.seats ? pref.seats[1] : Math.max(...available.map((s) => s.seatNum));
        const center = (lo + hi) / 2;

        /** @type {Array<{ seats: RankedSeat[], dist: number, totalPrice: number }>} */
        const pairs = [];
        for (let i = 0; i + count - 1 < available.length; i++) {
          const seg = available.slice(i, i + count);
          if (seg[count - 1].seatNum - seg[0].seatNum !== count - 1) continue; // только подряд
          const mid = (seg[0].seatNum + seg[count - 1].seatNum) / 2;
          pairs.push({
            seats: seg.map((s) => ({ id: s.id, number: s.number, row: row.number, x: s.x, y: s.y, price: s.price })),
            dist: Math.abs(mid - center),
            totalPrice: seg.reduce((sum, s) => sum + s.price, 0),
          });
        }
        pairs.sort((a, b) => a.dist - b.dist);

        for (const pair of pairs) {
          out.push({
            levelId: level.id,
            levelName: level.name,
            row: row.number,
            seats: pair.seats,
            totalPrice: pair.totalPrice,
            _rank: rowNum,
          });
        }
      }
    }
  }

  // Fallback: если по preference мало пар — добавляем любые пары из всего зала.
  if (out.length < limit) {
    const anyPairs = findBestSeatPairs(hall, { count, limit: limit - out.length });
    for (const p of anyPairs) out.push({ ...p, _rank: toNum(p.row) });
  }

  // Fallback на одиночные места, если совсем нет пар — чтобы не уходить с пустыми руками.
  if (out.length === 0 && count > 1) {
    const singles = findBestSeatPairs(hall, { count: 1, limit });
    for (const p of singles) out.push({ ...p, _rank: toNum(p.row) });
  }

  // Убираем пересечения по id мест: каждое место отдаём только одной группе.
  const taken = new Set();
  const disjoint = [];
  for (const pair of out) {
    if (disjoint.length >= limit) break;
    if (pair.seats.some((s) => taken.has(s.id))) continue;
    pair.seats.forEach((s) => taken.add(s.id));
    const { _rank, ...clean } = pair;
    disjoint.push(clean);
  }
  return disjoint;
}

