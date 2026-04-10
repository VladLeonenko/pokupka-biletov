/** Сэмплы для инерции drag (px за кадр ≈ movementX) */
export type MoveSample = { dx: number; t: number };

const SAMPLE_WINDOW_MS = 140;
const MAX_SAMPLES = 8;

export function pushMoveSample(
  buf: { list: MoveSample[] },
  dx: number,
  now: number = performance.now(),
): void {
  buf.list.push({ dx, t: now });
  while (buf.list.length > MAX_SAMPLES) buf.list.shift();
  const cutoff = now - SAMPLE_WINDOW_MS;
  while (buf.list.length && buf.list[0].t < cutoff) buf.list.shift();
}

export function clearMoveSamples(buf: { list: MoveSample[] }): void {
  buf.list.length = 0;
}

/**
 * Скорость scrollLeft за кадр (~60fps) по последним движениям (резче реагирует на «флик»).
 */
export function scrollVelocityPerFrameFromSamples(buf: { list: MoveSample[] }): number {
  const list = buf.list;
  if (list.length < 2) return 0;
  const n = Math.min(5, list.length);
  const recent = list.slice(-n);
  const t0 = recent[0].t;
  const t1 = recent[recent.length - 1].t;
  const dt = t1 - t0;
  if (dt < 1) return 0;
  const sumDx = recent.reduce((s, x) => s + x.dx, 0);
  const scrollPerMs = -sumDx / dt;
  return scrollPerMs * (1000 / 60);
}
