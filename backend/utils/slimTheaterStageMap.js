/**
 * Обрезка театральной схемы перед отдачей на клиент.
 *
 * Историческая сцена Большого отдавала 955 КБ JSON на 2061 место: xPct/yPct
 * с полной точностью double, служебные geodesySource/sectorDetail на каждом
 * месте, allSeatCoordinates — полная копия координат seats, и 2061 <circle
 * place-name> в svg_markup. Клиент это качает, распаковывает, парсит, а круги
 * с place-name тут же удаляет (processHallSvgForNative) и рисует места на
 * canvas из layout.seats. Отсюда «схема грузится вечно».
 */

/** 2 знака = 0.15 px на схеме 1500 px. */
function round2(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : value;
}

/** Поля, которые нужны только бэкенду при remap/пересборке зала. */
const SERVER_ONLY_SEAT_FIELDS = new Set(['geodesySource', 'sectorDetail', 'id']);
const ROUNDED_SEAT_FIELDS = new Set(['xPct', 'yPct', 'cx', 'cy']);

function slimSeat(seat) {
  if (!seat || typeof seat !== 'object') return seat;
  const out = {};
  for (const [k, v] of Object.entries(seat)) {
    if (SERVER_ONLY_SEAT_FIELDS.has(k)) continue;
    out[k] = ROUNDED_SEAT_FIELDS.has(k) ? round2(v) : v;
  }
  return out;
}

const SEAT_CIRCLE_RE = /<circle\b[^>]*\bplace-name=(["'])[\s\S]*?\1[^>]*?\/?>\s*/gi;

/** Остаётся сцена, подписи и рамка — места клиент рисует из layout.seats. */
function stripSeatCircles(markup) {
  if (typeof markup !== 'string') return markup;
  const slim = markup.replace(SEAT_CIRCLE_RE, '');
  return slim.length < markup.length ? slim : markup;
}

export function slimTheaterStageMapForClient(stageRow) {
  const layout = stageRow?.layout_json;
  if (!layout || typeof layout !== 'object') return stageRow;
  const seats = Array.isArray(layout.seats) ? layout.seats : null;
  if (!seats || seats.length < 200) return stageRow;

  const next = { ...layout, seats: seats.map(slimSeat) };
  /**
   * Фон серых точек клиент собирает из seats (parseBackgroundSeatCoordinates),
   * поэтому полную копию координат не отправляем.
   */
  if (Array.isArray(layout.allSeatCoordinates) && layout.allSeatCoordinates.length <= seats.length) {
    delete next.allSeatCoordinates;
  }
  return {
    ...stageRow,
    svg_markup: stripSeatCircles(stageRow.svg_markup),
    layout_json: next,
  };
}
