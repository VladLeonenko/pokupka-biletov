/**
 * 1 успешная бронь + 1 перебронь на ключ (сеанс). Дальше стоп.
 * Старые холды без successCount: orderId/orderOk = уже 1 успех,
 * attempt >= 2 = лимит уже сожжён.
 */
export const MAX_SUCCESSES = 2;

export function successesOf(hold) {
  if (!hold) return 0;
  const explicit = Number(hold.successCount);
  if (explicit > 0) return explicit;
  if (hold.done) return MAX_SUCCESSES;
  if (hold.orderId || hold.orderOk) {
    return Number(hold.attempt || 0) >= 2 ? MAX_SUCCESSES : 1;
  }
  return 0;
}

export function rebookBlocked(hold) {
  return successesOf(hold) >= MAX_SUCCESSES;
}

export function stampSuccess(prev, fields, rebookAfterMs) {
  const successCount = successesOf(prev) + 1;
  const done = successCount >= MAX_SUCCESSES;
  return {
    ...fields,
    successCount,
    rebookCount: Math.max(0, successCount - 1),
    done,
    orderOk: true,
    cooldownUntil: done ? 0 : Date.now() + rebookAfterMs,
  };
}
