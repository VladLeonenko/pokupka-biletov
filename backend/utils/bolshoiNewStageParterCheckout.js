/**
 * Новая сцена: один продаваемый сектор под офферы seed (Партер середина).
 * Импорт Afisha/редактор часто снова раскладывает левую/правую — схлопываем обратно.
 */

export const BOLSHOI_NEW_STAGE_PARTER_LABEL = 'Партер (середина)';
export const BOLSHOI_NEW_STAGE_PARTER_ID = 'parter_mid';

function pathBBox(pathStr) {
  const nums = String(pathStr || '')
    .match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)
    ?.map(Number) ?? [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = nums[i];
    const y = nums[i + 1];
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  if (!Number.isFinite(minX)) return null;
  return { minX, minY, maxX, maxY };
}

/**
 * @param {Record<string, unknown>} layoutJson
 * @returns {{ layout: Record<string, unknown>, changed: boolean, reason?: string }}
 */
export function collapseBolshoiNewStageToParterMid(layoutJson) {
  if (!layoutJson || typeof layoutJson !== 'object') {
    return { layout: layoutJson, changed: false, reason: 'no-layout' };
  }
  const lj = { ...layoutJson };
  const prev = lj.sectorMode && typeof lj.sectorMode === 'object' ? lj.sectorMode : null;
  const secs = Array.isArray(prev?.sectors) ? prev.sectors : [];
  const parter = secs.filter((s) => /^партер/i.test(String(s?.label || '')));
  if (!parter.length) {
    return { layout: lj, changed: false, reason: 'no-parter-sectors' };
  }

  let x1 = Infinity;
  let y1 = Infinity;
  let x2 = -Infinity;
  let y2 = -Infinity;
  for (const s of parter) {
    const bb = pathBBox(s.path);
    if (!bb) continue;
    x1 = Math.min(x1, bb.minX);
    y1 = Math.min(y1, bb.minY);
    x2 = Math.max(x2, bb.maxX);
    y2 = Math.max(y2, bb.maxY);
  }
  if (!Number.isFinite(x1)) {
    return { layout: lj, changed: false, reason: 'parter-bbox-empty' };
  }

  const already =
    secs.length === 1 &&
    String(secs[0]?.label || '') === BOLSHOI_NEW_STAGE_PARTER_LABEL &&
    String(secs[0]?.id || '') === BOLSHOI_NEW_STAGE_PARTER_ID &&
    lj.hallPreviewSectorCheckout === true &&
    lj.seatSelectionDisabled === true &&
    lj.hideSeatList === true;

  lj.sectorMode = {
    enabled: true,
    source: 'bolshoi-new-stage-parter-mid',
    sectors: [
      {
        id: BOLSHOI_NEW_STAGE_PARTER_ID,
        label: BOLSHOI_NEW_STAGE_PARTER_LABEL,
        path: `M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)} L ${x1.toFixed(1)} ${y2.toFixed(1)} Z`,
        maxQuantity: 8,
        totalSeats: 8,
        previewImageUrl:
          String(secs[0]?.previewImageUrl || '').trim() ||
          '/hall-maps/bolshoi-views/view-parter-a.jpg',
      },
    ],
  };
  lj.hallPreviewSectorCheckout = true;
  lj.seatSelectionDisabled = true;
  lj.hideSeatList = true;
  if (!lj.categoryCheckoutDefaults || typeof lj.categoryCheckoutDefaults !== 'object') {
    lj.categoryCheckoutDefaults = {
      previewImageUrl: '/hall-maps/bolshoi-views/view-parter-a.jpg',
    };
  }

  return { layout: lj, changed: !already, reason: already ? 'already' : 'collapsed' };
}
