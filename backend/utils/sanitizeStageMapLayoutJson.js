/** Ключи массивов координат мест — совпадают с парсером фронта (`layoutSeatArray`). */
const SEAT_ARRAY_KEYS = ['seats', 'seatPositions', 'places', 'points'];

/** Вложения, где те же ключи поддерживаются для обратной совместимости. */
const NEST_LAYOUT_KEYS = ['nativeSeatLayout', 'seatLayout', 'map'];

/**
 * Считает круги мест в SVG (как в seed-mht-main-hall-stage-map.js).
 * @param {string | null | undefined} svgMarkup
 */
export function countNativeSeatCirclesInSvg(svgMarkup) {
  const s = String(svgMarkup || '');
  const placeNameCount = (s.match(/<circle\b[^>]*\bplace-name=/gi) || []).length;
  const dataReplacedCount = (s.match(/<circle\b[^>]*\bdata-replaced=/gi) || []).length;
  return placeNameCount + dataReplacedCount;
}

/**
 * @param {Record<string, unknown>} obj
 * @param {string[]} removed — пути удалённых ключей (для сообщения админу)
 * @param {string} pathPrefix
 */
function stripConflictingSeatArrays(obj, removed, pathPrefix) {
  const out = { ...obj };
  for (const key of SEAT_ARRAY_KEYS) {
    const arr = out[key];
    if (Array.isArray(arr) && arr.length >= 2) {
      delete out[key];
      removed.push(pathPrefix ? `${pathPrefix}.${key}` : key);
    }
  }
  return out;
}

/**
 * Если в SVG уже есть геометрия мест (circle), массивы координат в layout_json только мешают:
 * старый фронт брал JSON и сырой SVG → расхождение цен и «перевёрнутая» зона.
 * Удаляем конфликтующие массивы, пока явно не задано `preferLayoutSeatPositions: true`.
 *
 * @param {unknown} layoutJson
 * @param {string | null | undefined} svgMarkup
 * @returns {{ layoutJson: Record<string, unknown>, warnings: string[] }}
 */
export function sanitizeStageMapLayoutJson(layoutJson, svgMarkup) {
  const warnings = [];
  const layout =
    layoutJson && typeof layoutJson === 'object' && !Array.isArray(layoutJson)
      ? /** @type {Record<string, unknown>} */ (layoutJson)
      : {};

  if (layout.preferLayoutSeatPositions === true) {
    return { layoutJson: { ...layout }, warnings };
  }

  if (countNativeSeatCirclesInSvg(svgMarkup) < 2) {
    return { layoutJson: { ...layout }, warnings };
  }

  const removed = [];
  let out = stripConflictingSeatArrays({ ...layout }, removed, '');

  for (const nestKey of NEST_LAYOUT_KEYS) {
    const nested = out[nestKey];
    if (!nested || typeof nested !== 'object' || Array.isArray(nested)) continue;
    out = {
      ...out,
      [nestKey]: stripConflictingSeatArrays({ .../** @type {Record<string, unknown>} */ (nested) }, removed, nestKey),
    };
  }

  if (removed.length) {
    warnings.push(
      `В SVG уже есть места (circle). Из layout_json удалены конфликтующие массивы: ${removed.join(', ')} — иначе координаты расходятся с подложкой. Чтобы принудительно использовать только JSON, добавьте preferLayoutSeatPositions: true.`,
    );
  }

  return { layoutJson: out, warnings };
}
