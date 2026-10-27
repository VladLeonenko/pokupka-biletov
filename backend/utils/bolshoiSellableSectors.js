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
    /** Ложа = 8 мест: ряд 1 — 1/3/5, ряд 2 — 2/4/6, ряд 3 — 7/8. */
    maxQty: 8,
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

  /**
   * VIP только из подписей (ряд А / Б). Нельзя переименовывать геометрический
   * первый ряд Партера в «А» — это съедало ряд 1 (30 мест → «28» VIP).
   */
  for (const s of out) {
    if (detail(s) !== 'Партер') continue;
    const row = String(s.row || '').trim();
    if (row === 'А') s._vipRowA = true;
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
/** Выпуклая оболочка (Andrew monotone chain), обход против часовой. */
function convexHull(pts) {
  const p = [...pts].sort((a, b) => (a.x - b.x) || (a.y - b.y));
  if (p.length < 3) return p;
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const build = (src) => {
    const h = [];
    for (const q of src) {
      while (h.length >= 2 && cross(h[h.length - 2], h[h.length - 1], q) <= 0) h.pop();
      h.push(q);
    }
    h.pop();
    return h;
  };
  return [...build(p), ...build([...p].reverse())];
}

/** Главные оси набора точек: u — вдоль зоны, v — через ряды. */
function principalAxes(pts) {
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (const p of pts) {
    const dx = p.x - cx;
    const dy = p.y - cy;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }
  const th = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const u = { x: Math.cos(th), y: Math.sin(th) };
  const v = { x: -u.y, y: u.x };
  let extU = 0;
  let extV = 0;
  for (const p of pts) {
    extU = Math.max(extU, Math.abs((p.x - cx) * u.x + (p.y - cy) * u.y));
    extV = Math.max(extV, Math.abs((p.x - cx) * v.x + (p.y - cy) * v.y));
  }
  return { cx, cy, u, v, extU, extV };
}

/**
 * Сумма Минковского выпуклой оболочки с кругом радиуса pad: отрезки по рёбрам
 * плюс дуги на вершинах. Сдвиг самих вершин по бисектрисе на узких зонах
 * (ложа — всего 30×26 px при pad 20) даёт шипы и самопересечение.
 */
function inflatedHullPath(poly, pad) {
  const n = poly.length;
  let area = 0;
  for (let i = 0; i < n; i += 1) {
    const q = poly[(i + 1) % n];
    area += poly[i].x * q.y - q.x * poly[i].y;
  }
  const sign = area > 0 ? 1 : -1;
  const sweep = area > 0 ? 1 : 0;
  const normals = poly.map((p, i) => {
    const q = poly[(i + 1) % n];
    const len = Math.hypot(q.x - p.x, q.y - p.y) || 1;
    return { x: (sign * (q.y - p.y)) / len, y: (-sign * (q.x - p.x)) / len };
  });
  const f = (v) => v.toFixed(1);
  const r = pad.toFixed(1);
  let d = '';
  for (let i = 0; i < n; i += 1) {
    const p = poly[i];
    const q = poly[(i + 1) % n];
    const nv = normals[i];
    const nn = normals[(i + 1) % n];
    d += `${i === 0 ? 'M' : ' L'} ${f(p.x + nv.x * pad)} ${f(p.y + nv.y * pad)}`;
    d += ` L ${f(q.x + nv.x * pad)} ${f(q.y + nv.y * pad)}`;
    d += ` A ${r} ${r} 0 0 ${sweep} ${f(q.x + nn.x * pad)} ${f(q.y + nn.y * pad)}`;
  }
  return `${d} Z`;
}

/** Замкнутый контур с мягкими углами (радиус r, не больше трети ребра). */
function roundedPolygonPath(poly, r) {
  const f = (n) => n.toFixed(1);
  const n = poly.length;
  const toward = (from, to, dist) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    const k = Math.min(dist, len / 3) / len;
    return { x: from.x + dx * k, y: from.y + dy * k };
  };
  let d = '';
  for (let i = 0; i < n; i += 1) {
    const prev = poly[(i - 1 + n) % n];
    const cur = poly[i];
    const next = poly[(i + 1) % n];
    const a = toward(cur, prev, r);
    const b = toward(cur, next, r);
    d += i === 0 ? `M ${f(a.x)} ${f(a.y)}` : ` L ${f(a.x)} ${f(a.y)}`;
    d += ` Q ${f(cur.x)} ${f(cur.y)} ${f(b.x)} ${f(b.y)}`;
  }
  return `${d} Z`;
}

/**
 * Контур зоны по самим местам, а не по bbox: ложи и дуги балконов лежат на
 * эллипсе, и осевой прямоугольник захватывал соседние ярусы и пустой воздух.
 *
 * Вытянутая зона (ряд партера, полоса балкона, цепочка лож по дуге) — полоса
 * по самим местам: у оболочки здесь почти нулевая толщина, а bbox накрывал бы
 * пустоту. Компактная зона (ложа целиком, блок партера) — раздутая оболочка.
 */
function sectorZonePath(pts, pad, hallWidth, hallHeight) {
  const clamp = (val, max) => Math.min(max, Math.max(0, val));
  const fit = (p) => ({ x: clamp(p.x, hallWidth), y: clamp(p.y, hallHeight) });
  if (pts.length < 2) return null;
  const ax = principalAxes(pts);

  if (ax.extU > ax.extV * 3) {
    const half = Math.max(pad, ax.extV + 6);
    const line = [...pts].sort(
      (a, b) => (a.x - ax.cx) * ax.u.x + (a.y - ax.cy) * ax.u.y
        - ((b.x - ax.cx) * ax.u.x + (b.y - ax.cy) * ax.u.y),
    );
    const last = line.length - 1;
    const left = [];
    const right = [];
    for (let i = 0; i <= last; i += 1) {
      const a = line[Math.max(0, i - 1)];
      const b = line[Math.min(last, i + 1)];
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const tx = (b.x - a.x) / len;
      const ty = (b.y - a.y) / len;
      /** Концы полосы отодвигаем вдоль ряда, чтобы крайние места не торчали. */
      const out = i === 0 ? -pad : i === last ? pad : 0;
      const x = line[i].x + tx * out;
      const y = line[i].y + ty * out;
      left.push(fit({ x: x - ty * half, y: y + tx * half }));
      right.push(fit({ x: x + ty * half, y: y - tx * half }));
    }
    return roundedPolygonPath([...left, ...right.reverse()], half * 0.8);
  }

  const hull = convexHull(pts);
  if (hull.length < 3) return null;
  return inflatedHullPath(hull.map(fit), pad);
}

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
    const pad = rule.box ? 20 : 15;
    x1 = Math.max(0, x1 - pad);
    y1 = Math.max(0, y1 - pad);
    x2 = Math.min(hallWidth, x2 + pad);
    y2 = Math.min(hallHeight, y2 + pad);
    const bboxPath = `M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)} L ${x1.toFixed(1)} ${y2.toFixed(1)} Z`;
    const vp = viewPointForPreviewUrl(rule.previewImageUrl);
    sectors.push({
      id: rule.id,
      label: rule.label,
      path: sectorZonePath(pts, pad, hallWidth, hallHeight) || bboxPath,
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
