/**
 * Большой: ручной предзаказ по зонам только у Щелкунчика
 * (карточка «Новогодний балет Чайковского»).
 * Остальные спектакли той же схемы — как другие залы: saleable места из офферов,
 * остальные места схемы серые (non-saleable).
 */

const ZONE_PREORDER_IDS = new Set(['novogodniy-balet-chaykovskogo-2026-12']);

/** @param {unknown} repertoireId */
export function isBolshoiZonePreorderRepertoire(repertoireId) {
  const id = String(repertoireId || '').trim().toLowerCase();
  if (!id) return false;
  if (ZONE_PREORDER_IDS.has(id)) return true;
  return /щелкун|schelkunch|shelkunch|nutcracker/.test(id);
}

/** @param {unknown} layout */
export function isBolshoiStageLayout(layout) {
  if (!layout || typeof layout !== 'object') return false;
  const lj = /** @type {Record<string, unknown>} */ (layout);
  if (lj.bolshoiHistorical || lj.bolshoiNewStage) return true;
  const sectorMode = lj.sectorMode;
  const src =
    sectorMode && typeof sectorMode === 'object'
      ? String(/** @type {Record<string, unknown>} */ (sectorMode).source || '')
      : '';
  return src === 'bolshoi-historical-sellable-tz' || src === 'bolshoi-new-stage-parter-mid';
}

/**
 * Не мутирует layout из БД: на один stage_map сидят и Щелкунчик, и остальные спектакли.
 * @param {unknown} layout
 * @param {unknown} repertoireId
 */
export function layoutForBolshoiRepertoire(layout, repertoireId) {
  if (!layout || typeof layout !== 'object') return layout;
  if (!isBolshoiStageLayout(layout)) return layout;
  const lj = /** @type {Record<string, unknown>} */ (layout);
  if (isBolshoiZonePreorderRepertoire(repertoireId)) {
    return {
      ...lj,
      hallPreviewSectorCheckout: true,
      seatSelectionDisabled: true,
      hideSeatList: true,
      bolshoiSeatCheckout: false,
    };
  }
  return {
    ...lj,
    hallPreviewSectorCheckout: false,
    seatSelectionDisabled: false,
    hideSeatList: false,
    bolshoiSeatCheckout: true,
  };
}
