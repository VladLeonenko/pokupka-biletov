/**
 * Нормализация атрибутов data-id в SVG схемах в стиле pbilet / «координатных» билетных фронтов:
 * data-id="385480_5a2a1bcf-..." → data-id="5a2a1bcf-..." — префикс «числа + подчёркивание» убирается,
 * чтобы id совпадали со справочником секторов после импорта (как у Лукойл/pbilet).
 *
 * Не трогает id без подчёркивания и без числового префикса.
 *
 * @param {string} svgMarkup
 * @param {{ stripNumericUnderscorePrefix?: boolean }} [options]
 * @returns {string}
 */
export function normalizeHallSvgDataIds(svgMarkup, options = {}) {
  const strip = options.stripNumericUnderscorePrefix !== false;
  if (!strip || typeof svgMarkup !== 'string') return svgMarkup;

  return svgMarkup.replace(/\bdata-id\s*=\s*(["'])(\d+)_([^"']+)\1/gi, 'data-id=$1$3$1');
}
