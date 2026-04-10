/**
 * Горизонтальный скролл ленты с тачпада: wheel.deltaX + подстраховка WebKit (wheelDeltaX).
 * «Только вертикаль» — когда почти нет горизонтали (иначе горизонтальный жест с шумом dy ошибочно отбрасывался).
 */

export function scaleWheelDelta(d: number, mode: number, el: HTMLElement): number {
  if (mode === WheelEvent.DOM_DELTA_LINE) return d * 16;
  if (mode === WheelEvent.DOM_DELTA_PAGE) return d * el.clientWidth;
  return d;
}

/** Итоговый dx для scrollLeft (пиксели за событие). */
export function getHorizontalWheelDelta(e: WheelEvent, el: HTMLElement): number {
  let dx = scaleWheelDelta(e.deltaX, e.deltaMode, el);
  const dy = scaleWheelDelta(e.deltaY, e.deltaMode, el);

  if (e.shiftKey) {
    return dy;
  }

  // Chrome/Safari: иногда deltaX=0, горизонталь только в wheelDeltaX (legacy)
  const we = e as WheelEvent & { wheelDeltaX?: number };
  if (Math.abs(dx) < 0.01 && typeof we.wheelDeltaX === 'number' && Math.abs(we.wheelDeltaX) > 0.5) {
    // wheelDeltaX: обычно кратно 120; знак — как у deltaX для того же жеста
    dx = -(we.wheelDeltaX / 120) * 32;
  }

  return dx;
}

/** Жест явно «только вертикаль страницы» — не трогаем ленту. */
export function isClearlyVerticalPageScroll(e: WheelEvent, dx: number, dy: number): boolean {
  if (e.shiftKey) return false;
  // Сильный вертикальный импульс при слабом горизонтальном
  if (Math.abs(dy) < 8) return false;
  if (Math.abs(dx) > 1.5) return false;
  return Math.abs(dy) > Math.abs(dx) * 2.8;
}

