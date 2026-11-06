/** easeInOutCubic — мягче нативного `scrollIntoView({ behavior: 'smooth' })`. */
function easeInOutCubic(p: number): number {
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
}

/**
 * Плавный скролл к элементу с учётом sticky tickets-nav.
 * Длительность зависит от дистанции (длинный hero → длиннее анимация).
 */
export function smoothScrollToElement(
  el: Element,
  opts?: { offsetExtra?: number; minMs?: number; maxMs?: number },
): void {
  if (typeof window === 'undefined') return;
  const header = document.querySelector<HTMLElement>('[data-tickets-nav]');
  const headerH = header?.getBoundingClientRect().height ?? 120;
  const offset = Math.round(headerH + (opts?.offsetExtra ?? 12));
  const startY = window.scrollY;
  const targetY = Math.max(0, el.getBoundingClientRect().top + window.scrollY - offset);
  const dist = targetY - startY;
  if (Math.abs(dist) < 2) return;

  const minMs = opts?.minMs ?? 640;
  const maxMs = opts?.maxMs ?? 1400;
  // ~0.7px/ms + пол — длинный прыжок с hero не «рвётся»
  const durationMs = Math.min(maxMs, Math.max(minMs, Math.abs(dist) * 0.7));
  const t0 = performance.now();

  const step = (now: number) => {
    const p = Math.min(1, (now - t0) / durationMs);
    window.scrollTo(0, startY + dist * easeInOutCubic(p));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
