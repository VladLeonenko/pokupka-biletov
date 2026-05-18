import { buildLabeledSeatIndex, lookupLabeledSeat } from './hallSeatSeatLookup';

export type OfferLike = {
  Id?: string;
  Sector?: string;
  Row?: string;
  SeatList?: string[];
};

export type SvgNativeSeat = {
  sector: string;
  row: string;
  seat: string;
  xPct: number;
  yPct: number;
};

export type HallLayoutDiagnostics = {
  totalSvgSeats: number;
  matchedSeats: number;
  unmatchedSvgCount: number;
  unmatchedOfferSeats: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function cleanString(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function parsePct(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value ?? '').replace('%', ''));
  if (!Number.isFinite(n)) return null;
  if (n >= 0 && n <= 1) return n * 100;
  if (n >= 0 && n <= 100) return n;
  return null;
}

function layoutSeatArray(layout: unknown): unknown[] {
  const root = asRecord(layout);
  if (!root) return [];
  for (const key of ['seats', 'seatPositions', 'places', 'points']) {
    const value = root[key];
    if (Array.isArray(value)) return value;
  }
  const native = asRecord(root.nativeSeatLayout) || asRecord(root.seatLayout) || asRecord(root.map);
  if (!native) return [];
  for (const key of ['seats', 'seatPositions', 'places', 'points']) {
    const value = native[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

/** Явные координаты мест из layout_json: seats / seatPositions [{ sector,row,seat,xPct,yPct }]. */
export function parseLayoutSeatPositions(layout: unknown): SvgNativeSeat[] {
  const rawSeats = layoutSeatArray(layout);
  const seats: SvgNativeSeat[] = [];
  const seen = new Set<string>();

  for (const item of rawSeats) {
    const row = asRecord(item);
    if (!row) continue;

    const sector = cleanString(
      row.sector ?? row.Sector ?? row.placeName ?? row.place_name ?? row['place-name'],
    );
    const rowLabel = cleanString(row.row ?? row.Row ?? row.r);
    const seat = cleanString(row.seat ?? row.Seat ?? row.place ?? row.Place ?? row.number ?? row.n);
    const xPct = parsePct(row.xPct ?? row.x_percent ?? row.xPercent ?? row.left ?? row.x);
    const yPct = parsePct(row.yPct ?? row.y_percent ?? row.yPercent ?? row.top ?? row.y);
    if (!sector || !rowLabel || !seat || xPct == null || yPct == null) continue;

    const key = seatMapKey(sector, rowLabel, seat);
    if (seen.has(key)) continue;
    seen.add(key);
    seats.push({ sector, row: rowLabel, seat, xPct, yPct });
  }

  return seats;
}

/**
 * Если true — брать координаты только из layout_json (seats / seatPositions), даже при наличии circle в SVG.
 * По умолчанию при ошибочном или тестовом массиве в JSON геометрия перетирала парсинг SVG и на экран шёл сырой SVG
 * без подрезки viewBox — ломало карты (МХТ: цены не там, «балкон у сцены», огромные круги).
 */
export function parsePreferLayoutSeatPositions(layout: unknown): boolean {
  const r = asRecord(layout);
  return r?.preferLayoutSeatPositions === true;
}

function normToken(s: string): string {
  return s
    .replace(/\u00a0/g, ' ')
    .replace(/ё/g, 'е')
    .replace(/Ё/g, 'е')
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Ряд в API и в SVG часто отличаются («10» vs «10 ряд»). */
function normRow(s: string): string {
  return normToken(s.replace(/ряд/gi, ' '));
}

/** Ключ для сопоставления схемы и GetBilet (сектор / ряд / место). */
export function seatMapKey(sector: string, row: string, seat: string): string {
  return `${normToken(sector)}|${normToken(row)}|${normToken(seat)}`;
}

function parseMatrix(transform: string | null): [number, number, number, number, number, number] | null {
  if (!transform || !transform.includes('matrix')) return null;
  const m = transform.match(/matrix\(\s*([^)]+)\)/i);
  if (!m) return null;
  const parts = m[1].split(/[\s,]+/).map((x) => Number.parseFloat(x.trim()));
  if (parts.length !== 6 || parts.some((n) => !Number.isFinite(n))) return null;
  return [parts[0], parts[1], parts[2], parts[3], parts[4], parts[5]];
}

function applyMatrix(
  cx: number,
  cy: number,
  m: [number, number, number, number, number, number],
): { x: number; y: number } {
  const [a, b, c, d, e, f] = m;
  return {
    x: a * cx + c * cy + e,
    y: b * cx + d * cy + f,
  };
}

function parseDataReplacedSeat(value: string | null): { sector: string; row: string; seat: string } | null {
  const text = value?.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  const rowMatch = text.match(/(?:^|[,;])\s*ряд\s+([^,;]+)/i);
  const seatMatch = text.match(/(?:^|[,;])\s*место\s+([^,;]+)/i);
  if (!rowMatch || !seatMatch) return null;
  const row = rowMatch[1]?.trim() ?? '';
  const seat = seatMatch[1]?.trim() ?? '';
  const sector = text
    .slice(0, rowMatch.index ?? 0)
    .replace(/[,;]\s*$/g, '')
    .trim();
  if (!sector || !row || !seat) return null;
  return { sector, row, seat };
}

function readSvgSize(svg: SVGSVGElement): { w: number; h: number } {
  const vb = svg.getAttribute('viewBox');
  if (vb) {
    const p = vb.trim().split(/[\s,]+/).map(Number.parseFloat);
    if (p.length >= 4 && p.every((n) => Number.isFinite(n)) && p[2] > 0 && p[3] > 0) {
      return { w: p[2], h: p[3] };
    }
  }
  const w = Number.parseFloat(svg.getAttribute('width') || '') || 100;
  const h = Number.parseFloat(svg.getAttribute('height') || '') || 100;
  return { w, h };
}

/**
 * Извлекает центры мест из SVG (circle с place-name / row / place или data-replaced), с учётом matrix на предке.
 * @deprecated Используйте {@link processHallSvgForNative} — там же подрезка viewBox под контент.
 */
export function parseSvgNativeSeatLayout(html: string): { seats: SvgNativeSeat[]; vbW: number; vbH: number } | null {
  const r = processHallSvgForNative(html);
  if (!r) return null;
  const doc = new DOMParser().parseFromString(r.svgHtml, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) return null;
  const { w: vbW, h: vbH } = readSvgSize(svg as SVGSVGElement);
  return { seats: r.seats, vbW, vbH };
}

/**
 * Подготовка нативной SVG-схемы: подрезка viewBox по кругам мест (схема по центру, без «пустого поля»),
 * проценты для оверлея в тех же координатах, что и отрисованный SVG.
 */
export function processHallSvgForNative(html: string): { seats: SvgNativeSeat[]; svgHtml: string } | null {
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') return null;
  const trimmed = html?.trim();
  if (!trimmed || !trimmed.includes('<svg')) return null;

  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(trimmed, 'image/svg+xml');
    if (doc.querySelector('parsererror')) {
      doc = new DOMParser().parseFromString(trimmed, 'text/html');
    }
  } catch {
    return null;
  }
  const svg = doc.querySelector('svg');
  if (!svg) return null;

  const circles = Array.from(svg.querySelectorAll('circle[place-name], circle[data-replaced]'));
  if (circles.length < 2) return null;

  let matrix: [number, number, number, number, number, number] | null = null;
  const panG = svg.querySelector('g.svg-pan-zoom_viewport') || svg.querySelector('g[transform*="matrix"]');
  if (panG) {
    matrix = parseMatrix(panG.getAttribute('transform'));
  }

  type Raw = { sector: string; row: string; seat: string; x: number; y: number };
  const raw: Raw[] = [];

  for (const c of circles) {
    const replaced = parseDataReplacedSeat(c.getAttribute('data-replaced'));
    const sector = c.getAttribute('place-name')?.trim() || replaced?.sector || '';
    const row = (c.getAttribute('row') ?? c.getAttribute('data-row') ?? replaced?.row ?? '').trim();
    const seat = (c.getAttribute('place') ?? c.getAttribute('data-place') ?? replaced?.seat ?? '').trim();
    if (!sector || !row || !seat) continue;

    const cx = Number.parseFloat(c.getAttribute('cx') || '');
    const cy = Number.parseFloat(c.getAttribute('cy') || '');
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) continue;

    const { x, y } = matrix ? applyMatrix(cx, cy, matrix) : { x: cx, y: cy };
    raw.push({ sector, row, seat, x, y });
  }

  if (raw.length < 2) return null;

  /** Минимальное расстояние между центрами разных мест — чтобы r не раздувался до перекрытий (театры с плотной сеткой). */
  let minCenterDist = Infinity;
  for (let i = 0; i < raw.length; i++) {
    for (let j = i + 1; j < raw.length; j++) {
      const dx = raw[i].x - raw[j].x;
      const dy = raw[i].y - raw[j].y;
      const d = Math.hypot(dx, dy);
      if (d > 1e-4) minCenterDist = Math.min(minCenterDist, d);
    }
  }
  const densityRadiusCap =
    Number.isFinite(minCenterDist) && minCenterDist < Infinity ? minCenterDist * 0.46 : null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of raw) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }

  /* Только границы по кругам мест. Union с полным viewBox SVG давал гигантский кадр
   * (широкий лист/экспорт) — схема сжималась в «точку» в углу. Сцена/подпись — за счёт pad снизу. */
  const spanW = maxX - minX;
  const spanH = maxY - minY;
  const padXY = Math.max(14, Math.max(spanW, spanH) * 0.055);
  const padBottom = Math.max(padXY, spanH * 0.22);
  const originX = minX - padXY;
  const originY = minY - padXY;
  const vbW = spanW + 2 * padXY;
  const vbH = spanH + padXY + padBottom;
  if (!(vbW > 0 && vbH > 0)) return null;

  const seats: SvgNativeSeat[] = raw.map((p) => ({
    sector: p.sector,
    row: p.row,
    seat: p.seat,
    xPct: ((p.x - originX) / vbW) * 100,
    yPct: ((p.y - originY) / vbH) * 100,
  }));

  svg.removeAttribute('style');
  svg.setAttribute('viewBox', `${originX} ${originY} ${vbW} ${vbH}`);
  svg.setAttribute('width', String(vbW));
  svg.setAttribute('height', String(vbH));
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  /** Цвета «доступности» в исходном SVG не совпадают с GetBilet — все места-серые, цена только в оверлее. */
  const seatCircles = Array.from(svg.querySelectorAll('circle[place-name], circle[data-replaced]'));
  const radii = seatCircles
    .map((c) => Number.parseFloat(c.getAttribute('r') || ''))
    .filter((n) => Number.isFinite(n) && n > 0);
  const medianR =
    radii.length > 0 ? [...radii].sort((a, b) => a - b)[Math.floor(radii.length / 2)] : 3.5;
  const medianClamped = Math.min(4.2, Math.max(1.35, medianR));
  let rUniform =
    densityRadiusCap != null ? Math.min(medianClamped, densityRadiusCap) : medianClamped;
  rUniform = Math.max(0.26, Math.min(rUniform, 4.2));

  for (const c of seatCircles) {
    c.setAttribute('r', String(rUniform));
    c.setAttribute('fill', '#d0d0d0');
    c.removeAttribute('stroke');
    c.removeAttribute('stroke-width');
    c.setAttribute('stroke', 'none');
  }

  const ser = new XMLSerializer().serializeToString(svg);
  return { seats, svgHtml: ser };
}

export function buildOfferSeatIndex(offers: OfferLike[]): Map<string, { offer: OfferLike; seat: string }[]> {
  const m = new Map<string, { offer: OfferLike; seat: string }[]>();
  for (const o of offers) {
    const sector = String(o.Sector ?? '');
    const row = String(o.Row ?? '');
    const list = Array.isArray(o.SeatList) ? o.SeatList.map(String) : [];
    for (const seat of list) {
      const k = seatMapKey(sector, row, seat);
      const arr = m.get(k) ?? [];
      arr.push({ offer: o, seat });
      m.set(k, arr);
    }
  }
  return m;
}

/** Без скобок с уточнениями — для «Балкон … (ограниченный обзор)» vs «Балкон …». */
function normSectorLoose(s: string): string {
  return normToken(s.replace(/\([^)]*\)/g, ' '));
}

/** Код трибуны из GetBilet: «сектор c140» → c140, «C-235» → c235. */
export function extractSectorCode(s: string): string | null {
  let t = normToken(s).replace(/^сектор\s+/, '').replace(/^sector\s+/, '');
  t = t.replace(/[-_\s]+/g, '');
  const m = t.match(/^([a-z])(\d{1,4})$/i);
  if (m) return `${m[1].toLowerCase()}${m[2]}`;
  const embedded = normToken(s).match(/\b([a-z])\s*[-_]?\s*(\d{2,4})\b/i);
  if (embedded) return `${embedded[1].toLowerCase()}${embedded[2]}`;
  return null;
}

/**
 * Оценка совпадения сектора API со строкой сектора из SVG (обычно длиннее и точнее).
 * Выше = лучше. Старый boolean includes() давал ложные попадания между разными зонами зала.
 */
export function sectorMatchScore(apiSector: string, svgSector: string): number {
  const a = normToken(apiSector);
  const b = normToken(svgSector);
  if (!a || !b) return 0;
  const ca = extractSectorCode(apiSector);
  const cb = extractSectorCode(svgSector);
  if (ca && cb && ca === cb) return 88;
  if (a === b) return 100;
  const a2 = normSectorLoose(apiSector);
  const b2 = normSectorLoose(svgSector);
  if (a2 === b2) return 85;
  /* API короче: «Партер» ⊂ «Партер центральный» */
  if (b.startsWith(`${a} `) || b.startsWith(`${a},`) || b.startsWith(`${a}(`)) return 72;
  /* SVG короче подписи на схеме */
  if (a.startsWith(`${b} `) || a.startsWith(`${b},`) || a.startsWith(`${b}(`)) return 68;
  const short = a.length <= b.length ? a : b;
  const long = a.length <= b.length ? b : a;
  /* Только для достаточно длинных корней — иначе шум от общих морфем */
  if (short.length >= 7 && long.includes(short)) {
    let idx = long.indexOf(short);
    while (idx !== -1) {
      const beforeOk = idx === 0 || /[\s(,]/.test(long[idx - 1] ?? '');
      const afterOk =
        idx + short.length >= long.length || /[\s,)]/.test(long[idx + short.length] ?? '');
      if (beforeOk && afterOk) return 55;
      idx = long.indexOf(short, idx + 1);
    }
  }
  return 0;
}

function sameSeatInList(apiSeat: string, svgSeat: string): boolean {
  if (apiSeat === svgSeat) return true;
  return normToken(apiSeat) === normToken(svgSeat);
}

/**
 * Сопоставляет круг на SVG с оффером GetBilet: сначала точный ключ, затем тот же ряд+место и «мягкое» имя сектора.
 */
export function matchSvgSeatToOffer(
  svg: SvgNativeSeat,
  offers: OfferLike[],
): { offer: OfferLike; seat: string } | null {
  const idx = buildOfferSeatIndex(offers);
  const exact = idx.get(seatMapKey(svg.sector, svg.row, svg.seat));
  if (exact?.length) return exact[0];

  type Cand = { offer: OfferLike; seat: string; score: number };
  const candidates: Cand[] = [];
  for (const o of offers) {
    const row = String(o.Row ?? '');
    if (normRow(row) !== normRow(svg.row)) continue;
    const list = Array.isArray(o.SeatList) ? o.SeatList.map(String) : [];
    const seatHit = list.find((st) => sameSeatInList(st, svg.seat));
    if (!seatHit) continue;
    const score = sectorMatchScore(String(o.Sector ?? ''), svg.sector);
    if (score <= 0) continue;
    candidates.push({ offer: o, seat: seatHit, score });
  }
  if (candidates.length === 0) return null;
  candidates.sort((x, y) => {
    if (y.score !== x.score) return y.score - x.score;
    return String(y.offer.Sector ?? '').length - String(x.offer.Sector ?? '').length;
  });
  const best = candidates[0].score;
  const top = candidates.filter((c) => c.score === best);
  top.sort((x, y) => String(y.offer.Sector ?? '').length - String(x.offer.Sector ?? '').length);
  return { offer: top[0].offer, seat: top[0].seat };
}

function selectionSeatKey(offerId: unknown, row: unknown, seat: unknown): string {
  return `${String(offerId ?? '')}|${String(row ?? '')}|${String(seat ?? '')}`;
}

/**
 * Sellable на схеме: только места из SeatList офферов GetBilet.
 * Координаты — lookup в coordSources (sellableSeats с /map, затем SVG/layout), без zip/fuzzy.
 */
export function buildSellablePlacementsFromGetbiletOffers(
  offers: OfferLike[],
  getPriceKey: (o: OfferLike) => string,
  coordSources: SvgNativeSeat[],
): SvgNativePlacement[] {
  const index = buildLabeledSeatIndex(coordSources);
  const placedKeys = new Set<string>();
  const out: SvgNativePlacement[] = [];

  for (const offer of offers) {
    const list = Array.isArray(offer.SeatList) ? offer.SeatList.map(String) : [];
    if (list.length === 0) continue;
    const oid = String(offer.Id ?? '');
    if (!oid) continue;

    for (const seat of list) {
      if (!seat.trim()) continue;
      const hit = lookupLabeledSeat(index, offer.Sector, offer.Row, seat);
      if (!hit) continue;

      const svgKey = seatMapKey(hit.sector, hit.row, hit.seat);
      if (placedKeys.has(svgKey)) continue;
      placedKeys.add(svgKey);

      const rowLabel = String(offer.Row ?? hit.row);
      const sectorLabel = String(offer.Sector ?? hit.sector);
      out.push({
        svgKey,
        key: selectionSeatKey(oid, rowLabel, seat),
        offerId: oid,
        sectorLabel,
        seat,
        rowLabel,
        available: list,
        xPct: hit.xPct,
        yPct: hit.yPct,
        title: `${sectorLabel} · ряд ${rowLabel} · место ${seat} · ${getPriceKey(offer)} ₽`,
        priceKey: getPriceKey(offer),
      });
    }
  }

  return out;
}

export type SvgNativePlacement = {
  key: string;
  svgKey: string;
  offerId: string;
  sectorLabel: string;
  seat: string;
  /** Ряд из оффера GetBilet (для подписи на схеме) */
  rowLabel: string;
  available: string[];
  xPct: number;
  yPct: number;
  title: string;
  priceKey: string;
  /** Только ориентир: без выбора и брони */
  previewOnly?: boolean;
};

function sortSeatTokens(a: string, b: string): number {
  const na = Number.parseInt(String(a).replace(/\D/g, ''), 10);
  const nb = Number.parseInt(String(b).replace(/\D/g, ''), 10);
  if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
  return String(a).localeCompare(String(b), 'ru', { numeric: true });
}

function countOfferSeats(offers: OfferLike[]): number {
  let total = 0;
  for (const offer of offers) {
    total += Array.isArray(offer.SeatList) ? offer.SeatList.length : 0;
  }
  return total;
}

function rowGroupKey(sector: string, row: string): string {
  return `${normSectorLoose(sector)}|${normRow(row)}`;
}

/**
 * Строит кликабельные точки: точное совпадение сектор/ряд/место, затем сопоставление по порядку
 * слева направо в ряду, если в GetBilet другая нумерация мест (глобальные id vs номер в SVG).
 */
export function buildSvgNativePlacements(
  svgSeats: SvgNativeSeat[],
  offers: OfferLike[],
  getPriceKey: (o: OfferLike) => string,
): {
  placements: SvgNativePlacement[];
  unmatchedSvgCount: number;
  diagnostics: HallLayoutDiagnostics;
} {
  const idx = buildOfferSeatIndex(offers);
  const uniqueSvg = new Map<string, SvgNativeSeat>();
  for (const s of svgSeats) {
    const k = seatMapKey(s.sector, s.row, s.seat);
    if (!uniqueSvg.has(k)) uniqueSvg.set(k, s);
  }

  const placedSvg = new Set<string>();
  const out: SvgNativePlacement[] = [];

  for (const s of uniqueSvg.values()) {
    const k = seatMapKey(s.sector, s.row, s.seat);
    const exact = idx.get(k);
    if (!exact?.length) continue;
    const { offer, seat } = exact[0];
    const oid = String(offer.Id ?? '');
    if (!oid) continue;
    placedSvg.add(k);
    const available = Array.isArray(offer.SeatList) ? offer.SeatList.map(String) : [];
    out.push({
      key: `${oid}-${seat}-${s.xPct.toFixed(3)}-${s.yPct.toFixed(3)}-ex`,
      svgKey: k,
      offerId: oid,
      sectorLabel: String(offer.Sector ?? s.sector ?? '').trim(),
      seat,
      rowLabel: String(offer.Row ?? s.row ?? '').trim(),
      available,
      xPct: s.xPct,
      yPct: s.yPct,
      title: `${s.sector} · ряд ${offer.Row ?? s.row} · место ${seat} · ${getPriceKey(offer)} ₽`,
      priceKey: getPriceKey(offer),
    });
  }

  const byRow = new Map<string, SvgNativeSeat[]>();
  for (const s of uniqueSvg.values()) {
    const k = seatMapKey(s.sector, s.row, s.seat);
    if (placedSvg.has(k)) continue;
    const gk = rowGroupKey(s.sector, s.row);
    const arr = byRow.get(gk) ?? [];
    arr.push(s);
    byRow.set(gk, arr);
  }

  for (const [, svgList] of byRow) {
    if (svgList.length === 0) continue;
    const first = svgList[0];
    const scored = offers
      .map((o) => ({
        offer: o,
        score: sectorMatchScore(String(o.Sector ?? ''), first.sector),
      }))
      .filter(
        ({ offer: o, score }) =>
          score > 0 && normRow(String(o.Row ?? '')) === normRow(first.row),
      );
    if (scored.length === 0) continue;
    const maxSc = Math.max(...scored.map((x) => x.score));
    const offersRow = scored.filter((x) => x.score === maxSc).map((x) => x.offer);
    if (offersRow.length !== 1) continue;
    const offer = offersRow[0];
    const list = Array.isArray(offer.SeatList) ? offer.SeatList.map(String) : [];
    if (list.length === 0) continue;
    const sortedSvg = [...svgList].sort((a, b) => a.xPct - b.xPct || a.yPct - b.yPct);
    const sortedApi = [...list].sort(sortSeatTokens);
    if (sortedSvg.length !== sortedApi.length) continue;

    const svgSeatNums = sortedSvg.map((s) =>
      Number.parseInt(String(s.seat).replace(/\D/g, ''), 10),
    );
    const apiSeatNums = sortedApi.map((s) => Number.parseInt(String(s).replace(/\D/g, ''), 10));
    const svgFinite = svgSeatNums.filter((n) => Number.isFinite(n));
    const apiFinite = apiSeatNums.filter((n) => Number.isFinite(n));
    if (
      svgFinite.length === sortedSvg.length &&
      apiFinite.length === sortedApi.length &&
      svgFinite.length > 0
    ) {
      const minSvg = Math.min(...svgFinite);
      const maxSvg = Math.max(...svgFinite);
      const minApi = Math.min(...apiFinite);
      const maxApi = Math.max(...apiFinite);
      const svgSpan = maxSvg - minSvg + 1;
      const apiSpan = maxApi - minApi + 1;
      /* Не сопоставлять по позиции, если номера в SVG и в SeatList из разных шкал (ряд 1–20 vs id 130+). */
      if (maxSvg <= 50 && minApi > maxSvg + 12) continue;
      if (apiSpan > Math.max(svgSpan * 2.2, sortedSvg.length + 8)) continue;
    }
    const oid = String(offer.Id ?? '');
    if (!oid) continue;
    for (let i = 0; i < sortedSvg.length; i++) {
      const s = sortedSvg[i];
      const seatApi = sortedApi[i];
      const sk = seatMapKey(s.sector, s.row, s.seat);
      placedSvg.add(sk);
      out.push({
        key: `${oid}-${seatApi}-${s.xPct.toFixed(3)}-${s.yPct.toFixed(3)}-zip`,
        svgKey: sk,
        offerId: oid,
        sectorLabel: String(offer.Sector ?? first.sector ?? '').trim(),
        seat: seatApi,
        rowLabel: String(offer.Row ?? first.row ?? '').trim(),
        available: list,
        xPct: s.xPct,
        yPct: s.yPct,
        title: `${first.sector} · ряд ${offer.Row ?? first.row} · место ${seatApi} · ${getPriceKey(offer)} ₽`,
        priceKey: getPriceKey(offer),
      });
    }
  }

  for (const s of uniqueSvg.values()) {
    const k = seatMapKey(s.sector, s.row, s.seat);
    if (placedSvg.has(k)) continue;
    const hit = matchSvgSeatToOffer(s, offers);
    if (!hit) continue;
    const { offer, seat } = hit;
    const oid = String(offer.Id ?? '');
    if (!oid) continue;
    placedSvg.add(k);
    const available = Array.isArray(offer.SeatList) ? offer.SeatList.map(String) : [];
    out.push({
      key: `${oid}-${seat}-${s.xPct.toFixed(3)}-${s.yPct.toFixed(3)}-fz`,
      svgKey: k,
      offerId: oid,
      sectorLabel: String(offer.Sector ?? s.sector ?? '').trim(),
      seat,
      rowLabel: String(offer.Row ?? s.row ?? '').trim(),
      available,
      xPct: s.xPct,
      yPct: s.yPct,
      title: `${s.sector} · ряд ${offer.Row ?? ''} · место ${seat} · ${getPriceKey(offer)} ₽`,
      priceKey: getPriceKey(offer),
    });
  }

  const matchedOfferSeatKeys = new Set<string>();
  for (const p of out) {
    const offer = offers.find((o) => String(o.Id ?? '') === p.offerId);
    if (!offer) continue;
    matchedOfferSeatKeys.add(seatMapKey(String(offer.Sector ?? ''), String(offer.Row ?? ''), p.seat));
  }
  const unmatchedSvgCount = uniqueSvg.size - placedSvg.size;
  return {
    placements: out,
    unmatchedSvgCount,
    diagnostics: {
      totalSvgSeats: uniqueSvg.size,
      matchedSeats: out.length,
      unmatchedSvgCount,
      unmatchedOfferSeats: Math.max(0, countOfferSeats(offers) - matchedOfferSeatKeys.size),
    },
  };
}

export type LayoutMode = 'auto' | 'grid' | 'svgNative';

export function parseLayoutMode(layout: unknown): LayoutMode {
  if (!layout || typeof layout !== 'object') return 'auto';
  const mode = (layout as Record<string, unknown>).layoutMode;
  if (mode === 'grid' || mode === 'svgNative' || mode === 'auto') return mode;
  return 'auto';
}
