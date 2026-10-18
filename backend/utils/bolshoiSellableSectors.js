/**
 * Продаваемые зоны Исторической сцены Большого (по ТЗ заказчика).
 *
 * 1) Партер середина — ряды 1–8, центральный блок
 * 2) Бельэтаж правая, ложи 4–6, только ряд 1, места 1/3/5 (до 3 билетов)
 * 3) 1 ярус правая, ложи 5–8, только ряд 1, места 1/3/5
 * 4) Балкон 2 левая, ряд 1, до 8 мест подряд
 * 5) Балкон 3 левая, ряд 1, до 8 мест подряд
 * 6) VIP: Бельэтаж левая ложа 4 целиком (8); 1 ярус левая ложа 9 целиком (6)
 * 7) VIP-VIP: Партер ряд А
 */

export const BOLSHOI_VIEW_IMAGES = {
  parter: '/hall-maps/bolshoi-views/view-parter-a.jpg',
  amphitheater: '/hall-maps/bolshoi-views/view-amphitheater.jpg',
  tier1: '/hall-maps/bolshoi-views/view-tier1.jpg',
};

/**
 * Точки съёмки «вид из зала» (coords схемы 1500×1190, сцена снизу).
 * Иконка глаза ставится сюда, не в центр продаваемого сектора.
 */
/**
 * Точки съёмки (viewBox 1500×1190, Сцена сверху).
 * Балкон-2: центр 1 ряда балкона 2; ложа 1 яруса — зеркально на левую сторону схемы.
 */
export const BOLSHOI_VIEW_POINTS = {
  parter: {
    id: 'view-parter',
    label: 'Вид из партера',
    x: 775,
    y: 242,
    previewImageUrl: BOLSHOI_VIEW_IMAGES.parter,
    primarySectorId: 'parter_mid',
  },
  amphitheater: {
    id: 'view-balkon2',
    label: 'Вид с балкона 2 яруса',
    x: 657,
    y: 855,
    previewImageUrl: BOLSHOI_VIEW_IMAGES.amphitheater,
    primarySectorId: 'balkon2_left',
  },
  tier1: {
    id: 'view-tier1',
    label: 'Вид с 1 яруса (ложа)',
    /** Зеркало от лож 5–8 правой → левая сторона схемы. */
    x: 385,
    y: 661,
    previewImageUrl: BOLSHOI_VIEW_IMAGES.tier1,
    primarySectorId: 'lozha1_right',
  },
};

/**
 * Подписи у своих уровней (как на плане Большого).
 * viewBox 1500×1190, Сцена сверху; боковые — снаружи лож, центр — по оси зала.
 */
export const BOLSHOI_HALL_MAP_LABELS = [
  { text: 'ПРАВАЯ СТОРОНА', x: 1280, y: 26, fontSize: 12 },
  { text: 'ЛЕВАЯ СТОРОНА', x: 220, y: 26, fontSize: 12 },
  { text: 'ПАРТЕР', x: 750, y: 255, fontSize: 16 },
  { text: 'АМФИТЕАТР', x: 750, y: 487, fontSize: 14 },
  /** Правая сторона схемы = высокие X. */
  { text: 'ЛОЖИ БЕНУАРА', x: 1188, y: 242, fontSize: 11, rotate: -90 },
  { text: 'ЛОЖИ БЕНУАРА', x: 312, y: 249, fontSize: 11, rotate: 90 },
  { text: 'ЛОЖИ БЕЛЬ-ЭТАЖА', x: 1338, y: 369, fontSize: 11, rotate: -90 },
  { text: 'ЛОЖИ БЕЛЬ-ЭТАЖА', x: 170, y: 379, fontSize: 11, rotate: 90 },
  { text: '1 ЯРУС', x: 750, y: 640, fontSize: 15 },
  { text: 'БАЛКОН 2 ЯРУСА', x: 750, y: 870, fontSize: 14 },
  { text: 'БАЛКОН 3 ЯРУСА', x: 750, y: 1000, fontSize: 13 },
  { text: 'БАЛКОН 4 ЯРУСА', x: 750, y: 1125, fontSize: 12 },
];

function viewPointForPreviewUrl(url) {
  const u = String(url || '');
  for (const vp of Object.values(BOLSHOI_VIEW_POINTS)) {
    if (vp.previewImageUrl === u) return vp;
  }
  return null;
}

/** @typedef {{ id: string, label: string, previewImageUrl?: string, test: (s: object) => boolean, maxQty?: number, box?: boolean }} SellableRule */

export const BOLSHOI_SELLABLE_SECTOR_RULES = [
  {
    id: 'parter_mid',
    label: 'Партер (середина)',
    previewImageUrl: BOLSHOI_VIEW_IMAGES.parter,
    maxQty: 8,
    test: (s) => {
      if (detail(s) !== 'Партер') return false;
      const row = String(s.row || '');
      if (!/^[1-8]$/.test(row)) return false;
      const seat = Number(String(s.seat).replace(/\D/g, ''));
      return Number.isFinite(seat) && seat >= 8 && seat <= 22;
    },
  },
  {
    id: 'beletazh_right',
    label: 'Бельэтаж правая (ложи 4–6)',
    previewImageUrl: BOLSHOI_VIEW_IMAGES.tier1,
    maxQty: 3,
    /** На схеме Большого ряд 1 ложи нумеруется 1/3/5 (три места спереди). */
    test: (s) =>
      /Бельэтаж\s+Правая.*Ложа\s+[456]\b/.test(detail(s)) &&
      String(s.row) === '1' &&
      ['1', '3', '5'].includes(String(s.seat)),
  },
  {
    id: 'lozha1_right',
    label: '1 ярус правая (ложи 5–8)',
    previewImageUrl: BOLSHOI_VIEW_IMAGES.tier1,
    maxQty: 3,
    test: (s) =>
      /1\s*ярус\s+Правая.*Ложа\s+[5678]\b/.test(detail(s)) &&
      String(s.row) === '1' &&
      ['1', '3', '5'].includes(String(s.seat)),
  },
  {
    id: 'balkon2_left',
    label: 'Балкон 2 яруса левая',
    previewImageUrl: BOLSHOI_VIEW_IMAGES.amphitheater,
    maxQty: 8,
    test: (s) => {
      if (!/Балкон\s+2\s+яруса\s+Левая/.test(detail(s))) return false;
      if (String(s.row) !== '1') return false;
      const seat = Number(String(s.seat).replace(/\D/g, ''));
      return Number.isFinite(seat) && seat >= 1 && seat <= 8;
    },
  },
  {
    id: 'balkon3_left',
    label: 'Балкон 3 яруса левая',
    previewImageUrl: BOLSHOI_VIEW_IMAGES.amphitheater,
    maxQty: 8,
    test: (s) => {
      if (!/Балкон\s+3\s+яруса\s+Левая/.test(detail(s))) return false;
      if (String(s.row) !== '1') return false;
      const seat = Number(String(s.seat).replace(/\D/g, ''));
      // на схеме ряд 1 часто нумеруется с 22 — берём первые 8 по порядку мест
      return Number.isFinite(seat);
    },
  },
  {
    id: 'beletazh_box',
    label: 'Ложа бельэтажа целиком (левая 4)',
    previewImageUrl: BOLSHOI_VIEW_IMAGES.tier1,
    maxQty: 8,
    box: true,
    test: (s) => /Бельэтаж\s+Левая.*Ложа\s+4\b/.test(detail(s)),
  },
  {
    id: 'lozha1_box',
    label: 'Ложа 1 яруса целиком (левая 9)',
    previewImageUrl: BOLSHOI_VIEW_IMAGES.tier1,
    maxQty: 6,
    box: true,
    test: (s) => /1\s*ярус\s+Левая.*Ложа\s+9\b/.test(detail(s)),
  },
  {
    id: 'vip_parter',
    label: 'Партер ряд А (Вип)',
    previewImageUrl: BOLSHOI_VIEW_IMAGES.parter,
    maxQty: 8,
    /** Ряд А: литера из подписей ИЛИ геометрически первый ряд партера (у сцены). */
    test: (s) => detail(s) === 'Партер' && (String(s.row || '') === 'А' || s._vipRowA === true),
  },
];

function detail(s) {
  return String(s?.sectorDetail || s?.sector || '');
}

/**
 * Remap layout seats → sellable offer labels; keep original in sectorDetail.
 * Балкон 3: после фильтра по ряду оставляем 8 мест с минимальными номерами.
 */
export function remapBolshoiSeatsToSellableLabels(seats) {
  const out = (Array.isArray(seats) ? seats : []).map((s) => ({
    ...s,
    sectorDetail: s.sectorDetail || s.sector,
    sector: s.sectorDetail || s.sector,
    sellable: false,
  }));

  /** Геометрический ряд А: минимальный yPct среди Партер. */
  const parter = out.filter((s) => detail(s) === 'Партер' && Number.isFinite(Number(s.yPct)));
  if (parter.length) {
    const minY = Math.min(...parter.map((s) => Number(s.yPct)));
    for (const s of parter) {
      if (Number(s.yPct) <= minY + 0.35) {
        s._vipRowA = true;
        s.row = 'А';
      }
    }
  }

  for (const rule of BOLSHOI_SELLABLE_SECTOR_RULES) {
    const hits = out.filter((s) => rule.test(s));
    let final = hits;
    if (rule.id === 'balkon3_left') {
      final = [...hits]
        .sort((a, b) => Number(a.seat) - Number(b.seat) || String(a.seat).localeCompare(String(b.seat)))
        .slice(0, 8);
    }
    if (rule.id === 'vip_parter') {
      /** Не пересекаться с «Партер середина» — VIP только литера А / первый ряд. */
      final = hits.filter((s) => String(s.row) === 'А' || s._vipRowA);
    }
    for (const s of final) {
      s.sector = rule.label;
      s.sellable = true;
    }
  }
  return out;
}

/** row → SeatList map per sellable label */
export function bolshoiSellableSeatsByRow(seats) {
  const byLabel = new Map();
  for (const rule of BOLSHOI_SELLABLE_SECTOR_RULES) {
    const byRow = new Map();
    for (const s of seats) {
      if (s.sector !== rule.label) continue;
      const r = String(s.row ?? '');
      const arr = byRow.get(r) ?? [];
      arr.push(String(s.seat));
      byRow.set(r, arr);
    }
    byLabel.set(rule.label, byRow);
  }
  return byLabel;
}

/**
 * @param {object[]} baseOffers
 * @param {Map<string, Map<string, string[]>>} byLabel
 * @param {string} repertoireId
 */
export function expandBolshoiOffersByRows(baseOffers, byLabel, repertoireId) {
  const priceBySector = new Map();
  for (const off of baseOffers || []) {
    const lab = String(off.Sector || '');
    if (lab && !priceBySector.has(lab)) priceBySector.set(lab, off);
  }
  const next = [];
  for (const rule of BOLSHOI_SELLABLE_SECTOR_RULES) {
    const byRow = byLabel.get(rule.label);
    const proto = priceBySector.get(rule.label);
    if (!byRow || !proto) continue;
    for (const [r, seatList] of byRow) {
      next.push({
        ...proto,
        Id: `${repertoireId}-${rule.id}-${r}`.replace(/\s+/g, '_'),
        Sector: rule.label,
        Row: r,
        SeatList: [...new Set(seatList)],
        MaxQuantity: rule.maxQty ?? seatList.length,
        BoxWhole: rule.box === true,
      });
    }
  }
  return next.length ? next : baseOffers;
}

/** Hull path for sectorMode from remapped seats (absolute coords). */
export function buildBolshoiSellableSectorMode(seats, hallWidth = 1500, hallHeight = 1190) {
  const sectors = [];
  for (const rule of BOLSHOI_SELLABLE_SECTOR_RULES) {
    const pts = seats
      .filter((s) => s.sector === rule.label)
      .map((s) => ({
        x: (Number(s.xPct) / 100) * hallWidth,
        y: (Number(s.yPct) / 100) * hallHeight,
      }));
    if (pts.length < 1) continue;
    let x1 = Infinity;
    let y1 = Infinity;
    let x2 = -Infinity;
    let y2 = -Infinity;
    for (const p of pts) {
      x1 = Math.min(x1, p.x);
      y1 = Math.min(y1, p.y);
      x2 = Math.max(x2, p.x);
      y2 = Math.max(y2, p.y);
    }
    const pad = rule.box ? 18 : 12;
    x1 = Math.max(0, x1 - pad);
    y1 = Math.max(0, y1 - pad);
    x2 = Math.min(hallWidth, x2 + pad);
    y2 = Math.min(hallHeight, y2 + pad);
    const vp = viewPointForPreviewUrl(rule.previewImageUrl);
    sectors.push({
      id: rule.id,
      label: rule.label,
      path: `M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)} L ${x1.toFixed(1)} ${y2.toFixed(1)} Z`,
      totalSeats: pts.length,
      previewImageUrl: rule.previewImageUrl || null,
      previewIconX: vp?.x ?? null,
      previewIconY: vp?.y ?? null,
      maxQuantity: rule.box ? pts.length : (rule.maxQty ?? pts.length),
      boxWhole: rule.box === true,
    });
  }
  return {
    enabled: sectors.length > 0,
    source: 'bolshoi-historical-sellable-tz',
    sectors,
    /** Уникальные иконки «глаз» в точках съёмки (не в центрах секторов). */
    viewIcons: Object.values(BOLSHOI_VIEW_POINTS).map((vp) => ({
      id: vp.id,
      label: vp.label,
      x: vp.x,
      y: vp.y,
      previewImageUrl: vp.previewImageUrl,
      primarySectorId: vp.primarySectorId,
    })),
  };
}
