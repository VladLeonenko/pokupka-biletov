/**
 * Новая сцена: один продаваемый сектор под офферы seed (Партер середина).
 * Импорт Afisha/редактор часто снова раскладывает левую/правую — схлопываем обратно.
 * Highlight path = кривые level.outline левой+правой (union), НЕ AABB-прямоугольник.
 *
 * Storefront visual (как Историческая): белые сектора + цветные sellable-точки,
 * без solid rose path fill. Editor может подсвечивать иначе.
 */

export const BOLSHOI_NEW_STAGE_PARTER_LABEL = 'Партер (середина)';
export const BOLSHOI_NEW_STAGE_PARTER_ID = 'parter_mid';
/** @deprecated Public map no longer uses solid rose wash; kept for legacy SVG/DB cleanup. */
export const BOLSHOI_NEW_STAGE_PARTER_FILL = '#e0c9bb';
/** Public / checkout sector fill — white like other zones (Historical sellable style). */
export const BOLSHOI_NEW_STAGE_SECTOR_FILL = '#ffffff';
/** Colored sellable dots + mid remap: Партер rows 1–8 only (9+ stay gray). */
export const BOLSHOI_NEW_STAGE_PARTER_SELLABLE_ROW_MAX = 8;

/** @param {unknown} row */
export function normalizeBolshoiNewStageParterRow(row) {
  const n = Number.parseInt(String(row ?? '').trim().replace(/[^\d].*$/, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** @param {unknown} row */
export function isBolshoiNewStageParterSellableRow(row) {
  const n = normalizeBolshoiNewStageParterRow(row);
  return n != null && n >= 1 && n <= BOLSHOI_NEW_STAGE_PARTER_SELLABLE_ROW_MAX;
}

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

/** Ось-выровненный прямоугольник из 4 L/M — residual sale bbox. */
export function isAxisAlignedRectPath(pathStr) {
  const d = String(pathStr || '').trim();
  if (!d) return false;
  if (/[CcQqSsAa]/.test(d)) return false;
  const subpaths = (d.match(/M/gi) || []).length;
  if (subpaths > 1) return false;
  const nums = d.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)?.map(Number) ?? [];
  if (nums.length < 8 || nums.length > 12) return false;
  const pts = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    pts.push([nums[i], nums[i + 1]]);
  }
  if (pts.length < 4) return false;
  const xs = new Set(pts.map((p) => p[0].toFixed(1)));
  const ys = new Set(pts.map((p) => p[1].toFixed(1)));
  return xs.size <= 2 && ys.size <= 2;
}

function curvedParterUnion(sectors, savedPaths) {
  const fromSaved = (Array.isArray(savedPaths) ? savedPaths : [])
    .map((p) => String(p || '').trim())
    .filter((p) => p && !isAxisAlignedRectPath(p));
  if (fromSaved.length) return { path: fromSaved.join(' '), saved: fromSaved };

  const leftRight = sectors.filter((s) =>
    /^партер\s+(левая|правая)\s+сторона$/i.test(String(s?.label || '').trim()),
  );
  if (leftRight.length >= 1) {
    const paths = leftRight
      .map((s) => String(s?.path || '').trim())
      .filter((p) => p && !isAxisAlignedRectPath(p));
    if (paths.length) return { path: paths.join(' '), saved: paths };
  }

  const mid = sectors.find(
    (s) => String(s?.label || '').trim() === BOLSHOI_NEW_STAGE_PARTER_LABEL,
  );
  const midPath = String(mid?.path || '').trim();
  if (midPath && !isAxisAlignedRectPath(midPath)) {
    const parts = midPath.split(/(?=M)/).map((p) => p.trim()).filter(Boolean);
    return { path: midPath, saved: parts.length ? parts : [midPath] };
  }

  const anyParter = sectors.filter((s) => /^партер/i.test(String(s?.label || '')));
  const curved = anyParter
    .map((s) => String(s?.path || '').trim())
    .filter((p) => p && !isAxisAlignedRectPath(p));
  if (curved.length) return { path: curved.join(' '), saved: curved };

  return null;
}

function bboxFallbackPath(sectors) {
  let x1 = Infinity;
  let y1 = Infinity;
  let x2 = -Infinity;
  let y2 = -Infinity;
  for (const s of sectors) {
    const bb = pathBBox(s.path);
    if (!bb) continue;
    x1 = Math.min(x1, bb.minX);
    y1 = Math.min(y1, bb.minY);
    x2 = Math.max(x2, bb.maxX);
    y2 = Math.max(y2, bb.maxY);
  }
  if (!Number.isFinite(x1)) return null;
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)} L ${x1.toFixed(1)} ${y2.toFixed(1)} Z`;
}

function publicSectorFill(fill) {
  const f = String(fill || '').trim().toLowerCase();
  if (!f || f === BOLSHOI_NEW_STAGE_PARTER_FILL) return BOLSHOI_NEW_STAGE_SECTOR_FILL;
  return f;
}

/**
 * Layout seats «Партер левая/правая» rows 1–8 → sale label (geometry unchanged).
 * Rows 9+ stay original left/right (or restore sectorDetail if previously collapsed to mid).
 * @param {unknown} seats
 */
export function remapBolshoiNewStageParterSeatsToMid(seats) {
  if (!Array.isArray(seats)) return seats;
  return seats.map((s) => {
    if (!s || typeof s !== 'object') return s;
    const sector = String(s.sector || '').trim();
    if (!/^партер/i.test(sector)) return s;
    const sellableRow = isBolshoiNewStageParterSellableRow(s.row);
    if (sellableRow) {
      if (sector === BOLSHOI_NEW_STAGE_PARTER_LABEL) return s;
      return {
        ...s,
        sectorDetail: s.sectorDetail || sector,
        sector: BOLSHOI_NEW_STAGE_PARTER_LABEL,
      };
    }
    /** Rows 9+: undo prior mid collapse if we still know left/right. */
    if (sector === BOLSHOI_NEW_STAGE_PARTER_LABEL) {
      const detail = String(s.sectorDetail || '').trim();
      if (
        detail &&
        detail !== BOLSHOI_NEW_STAGE_PARTER_LABEL &&
        /^партер/i.test(detail)
      ) {
        const { sectorDetail: _drop, ...rest } = s;
        return { ...rest, sector: detail };
      }
    }
    return s;
  });
}

/**
 * Seat label belongs to New Stage sale «Партер (середина)» (left/right / mid).
 */
export function isBolshoiNewStageParterSaleSeatSector(seatSector) {
  const s = String(seatSector || '').trim();
  if (!s) return false;
  if (s === BOLSHOI_NEW_STAGE_PARTER_LABEL) return true;
  return /^партер\s+(левая|правая)\s+сторона$/i.test(s) || /^партер$/i.test(s);
}

/**
 * True when rows 1–8 are mid and rows 9+ are not mid (or mid without restoreable detail).
 * @param {unknown} seats
 */
export function bolshoiNewStageParterSeatRemapLooksDone(seats) {
  if (!Array.isArray(seats) || !seats.length) return true;
  let midSellable = 0;
  for (const s of seats) {
    if (!s || typeof s !== 'object') continue;
    const sector = String(s.sector || '').trim();
    if (!/^партер/i.test(sector)) continue;
    const sellableRow = isBolshoiNewStageParterSellableRow(s.row);
    if (sellableRow) {
      if (sector !== BOLSHOI_NEW_STAGE_PARTER_LABEL) return false;
      midSellable += 1;
      continue;
    }
    if (sector === BOLSHOI_NEW_STAGE_PARTER_LABEL) {
      const detail = String(s.sectorDetail || '').trim();
      if (
        detail &&
        detail !== BOLSHOI_NEW_STAGE_PARTER_LABEL &&
        /^партер/i.test(detail)
      ) {
        return false;
      }
    }
  }
  return midSellable > 0;
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

  const prevMeta =
    lj.bolshoiNewStage && typeof lj.bolshoiNewStage === 'object' ? lj.bolshoiNewStage : {};
  const curved = curvedParterUnion(parter, prevMeta.parterOutlinePaths);
  const unionPath = curved?.path || bboxFallbackPath(parter);
  if (!unionPath) {
    return { layout: lj, changed: false, reason: 'parter-bbox-empty' };
  }

  const fill0 = publicSectorFill(secs[0]?.fill);
  const seatsOk = bolshoiNewStageParterSeatRemapLooksDone(lj.seats);
  const metaOk =
    Number(prevMeta.parterSellableRowMax) === BOLSHOI_NEW_STAGE_PARTER_SELLABLE_ROW_MAX;
  const already =
    secs.length === 1 &&
    String(secs[0]?.label || '') === BOLSHOI_NEW_STAGE_PARTER_LABEL &&
    String(secs[0]?.id || '') === BOLSHOI_NEW_STAGE_PARTER_ID &&
    String(secs[0]?.path || '').trim() === unionPath &&
    !isAxisAlignedRectPath(String(secs[0]?.path || '')) &&
    fill0 === BOLSHOI_NEW_STAGE_SECTOR_FILL &&
    String(secs[0]?.fill || '').toLowerCase() !== BOLSHOI_NEW_STAGE_PARTER_FILL &&
    lj.hallPreviewSectorCheckout === true &&
    lj.seatSelectionDisabled === true &&
    lj.hideSeatList === true &&
    String(lj.hallViewportBackground || '').toLowerCase() === '#f5f5f5' &&
    seatsOk &&
    metaOk;

  lj.sectorMode = {
    enabled: true,
    source: 'bolshoi-new-stage-parter-mid',
    sectors: [
      {
        id: BOLSHOI_NEW_STAGE_PARTER_ID,
        label: BOLSHOI_NEW_STAGE_PARTER_LABEL,
        path: unionPath,
        maxQuantity: 8,
        totalSeats: 8,
        /** White like Historical — availability = colored seat dots, not solid wash. */
        fill: BOLSHOI_NEW_STAGE_SECTOR_FILL,
        accent: BOLSHOI_NEW_STAGE_SECTOR_FILL,
        previewImageUrl:
          String(secs[0]?.previewImageUrl || '').trim() ||
          '/hall-maps/bolshoi-views/view-parter-a.jpg',
      },
    ],
  };
  lj.hallPreviewSectorCheckout = true;
  lj.seatSelectionDisabled = true;
  lj.hideSeatList = true;
  lj.hallViewportBackground = '#f5f5f5';
  if (Array.isArray(lj.seats)) {
    lj.seats = remapBolshoiNewStageParterSeatsToMid(lj.seats);
  }
  lj.bolshoiNewStage = {
    ...prevMeta,
    parterSellableRowMax: BOLSHOI_NEW_STAGE_PARTER_SELLABLE_ROW_MAX,
    ...(curved?.saved?.length ? { parterOutlinePaths: curved.saved } : null),
  };
  if (!lj.categoryCheckoutDefaults || typeof lj.categoryCheckoutDefaults !== 'object') {
    lj.categoryCheckoutDefaults = {
      previewImageUrl: '/hall-maps/bolshoi-views/view-parter-a.jpg',
    };
  }

  const midCount = Array.isArray(lj.seats)
    ? lj.seats.filter(
        (s) =>
          s &&
          String(s.sector || '').trim() === BOLSHOI_NEW_STAGE_PARTER_LABEL &&
          isBolshoiNewStageParterSellableRow(s.row),
      ).length
    : 0;

  return {
    layout: lj,
    changed: !already,
    reason: already
      ? 'already'
      : curved
        ? `collapsed-curved-rows1-${BOLSHOI_NEW_STAGE_PARTER_SELLABLE_ROW_MAX}`
        : 'collapsed-bbox-fallback',
    midSellableSeats: midCount,
  };
}
