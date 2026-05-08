/**
 * Превью схемы Лужников (футбол) для тестовой страницы: публичные API pbilet (без ключей).
 * Если заданы event_source_id + event_date_id — как production import (реальные координаты мест).
 * Иначе — подложка SVG + сектора из coordinates и синтетические точки мест внутри bbox сектора (демо).
 *
 * Режим Inkscape (`source=inkscape`): локальный SVG с группами `<g id="C248">` и path — см. buildLuzhnikiFootballStadiumInkscapePreview.
 */

import fs from 'node:fs';

import { normalizeHallSvgDataIds } from '../utils/normalizeHallSvgDataIds.js';
import { parseLuzhnikiInkscapeStadiumSvg } from '../utils/luzhnikiInkscapeSvg.js';
import { resolveFromRepo } from '../utils/projectPaths.js';

const DEFAULT_LAYOUT_ID = '1173';
const DEFAULT_SOURCE_ID = '2';
const DEFAULT_CURRENCY = 'RUB';
const DEFAULT_LANG = 'ru';

/** @param {string} path */
function pathBBox(path) {
  const nums = path.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)?.map(Number) ?? [];
  if (nums.length < 2) return null;
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
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null;
  return { minX, minY, maxX, maxY };
}

function normalizeText(value) {
  return String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function seatKey(sector, row, seat) {
  return `${sector.toLowerCase()}|${row.toLowerCase()}|${seat.toLowerCase()}`;
}

/**
 * @param {unknown} ticketsPayload
 * @param {number} width
 * @param {number} height
 */
function collectLayoutSeats(ticketsPayload, width, height) {
  const out = [];
  const seen = new Set();
  const sectors = Array.isArray(ticketsPayload?.sectors) ? ticketsPayload.sectors : [];

  for (const sector of sectors) {
    const sectorLabel = normalizeText(sector?.i);
    const rows = Array.isArray(sector?.r) ? sector.r : [];
    if (!sectorLabel || rows.length === 0) continue;

    for (const row of rows) {
      const rowLabel = normalizeText(row?.i);
      const seats = Array.isArray(row?.s) ? row.s : [];
      if (!rowLabel || seats.length === 0) continue;

      for (const seat of seats) {
        const seatLabel = normalizeText(seat?.i ?? seat?.k?.x);
        const x = Number(seat?.x);
        const y = Number(seat?.y);
        if (!seatLabel || !Number.isFinite(x) || !Number.isFinite(y)) continue;

        const key = seatKey(sectorLabel, rowLabel, seatLabel);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({
          sector: sectorLabel,
          row: rowLabel,
          seat: seatLabel,
          xPct: (x / width) * 100,
          yPct: (y / height) * 100,
        });
      }
    }
  }

  return out;
}

/**
 * @param {unknown} ticketsPayload
 */
function collectSectorMeta(ticketsPayload) {
  const sectors = Array.isArray(ticketsPayload?.sectors) ? ticketsPayload.sectors : [];
  return sectors
    .map((sector) => {
      const label = normalizeText(sector?.i);
      const id = normalizeText(sector?.d);
      const path = normalizeText(sector?.o);
      if (!label || !id) return null;
      const rows = Array.isArray(sector?.r) ? sector.r : [];
      const availableSeats = rows.reduce(
        (sum, row) => sum + (Array.isArray(row?.s) ? row.s.length : 0),
        0,
      );
      const prices = [];
      for (const row of rows) {
        for (const seat of Array.isArray(row?.s) ? row.s : []) {
          const price = Number(seat?.p ?? seat?.k?.p);
          if (Number.isFinite(price)) prices.push(price);
        }
      }
      return {
        id,
        label,
        path,
        totalSeats: Number.isFinite(Number(sector?.all)) ? Number(sector.all) : null,
        availableSeats,
        minPrice: prices.length ? Math.min(...prices) : null,
        maxPrice: prices.length ? Math.max(...prices) : null,
      };
    })
    .filter(Boolean);
}

/**
 * @param {unknown} coordinatesPayload
 */
function collectAllSeatCoordinates(coordinatesPayload, width, height) {
  const coordinates = Array.isArray(coordinatesPayload?.coordinates) ? coordinatesPayload.coordinates : [];
  return coordinates
    .map((item) => {
      const x = Number(item?.x);
      const y = Number(item?.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      return {
        xPct: (x / width) * 100,
        yPct: (y / height) * 100,
      };
    })
    .filter(Boolean);
}

/**
 * Сектора из ответа coordinates (categories), если нет tickets.sectors.
 * @param {unknown} coordinatesPayload
 */
function sectorsFromCoordinateCategories(coordinatesPayload) {
  const cats = Array.isArray(coordinatesPayload?.categories) ? coordinatesPayload.categories : [];
  return cats
    .map((c) => {
      const id = normalizeText(c?.d);
      const label = normalizeText(c?.i);
      const paths = Array.isArray(c?.paths) ? c.paths : [];
      const path = paths.map((p) => String(p || '').trim()).filter(Boolean).join(' ');
      if (!id || !label || !path) return null;
      return {
        id,
        label,
        path,
        totalSeats: null,
        availableSeats: 0,
        minPrice: null,
        maxPrice: null,
      };
    })
    .filter(Boolean);
}

/**
 * Демо-места на сетке внутри bbox сектора (пока нет живого pbilet tickets для события).
 */
function syntheticSeatsFromCategories(coordinatesPayload, width, height, seatsPerSector = 14) {
  const cats = Array.isArray(coordinatesPayload?.categories) ? coordinatesPayload.categories : [];
  const out = [];
  const seen = new Set();

  for (const c of cats) {
    const label = normalizeText(c?.i);
    const paths = Array.isArray(c?.paths) ? c.paths : [];
    const pathStr = paths.map((p) => String(p || '').trim()).filter(Boolean).join(' ');
    if (!label || !pathStr) continue;

    const bbox = pathBBox(pathStr);
    if (!bbox) continue;

    const padX = Math.max(4, (bbox.maxX - bbox.minX) * 0.08);
    const padY = Math.max(4, (bbox.maxY - bbox.minY) * 0.08);
    const innerMinX = bbox.minX + padX;
    const innerMaxX = bbox.maxX - padX;
    const innerMinY = bbox.minY + padY;
    const innerMaxY = bbox.maxY - padY;
    if (innerMaxX <= innerMinX || innerMaxY <= innerMinY) continue;

    const cols = Math.ceil(Math.sqrt(seatsPerSector));
    const rows = Math.ceil(seatsPerSector / cols);
    const demoRow = 'Демо';

    let n = 0;
    for (let r = 0; r < rows && n < seatsPerSector; r++) {
      for (let col = 0; col < cols && n < seatsPerSector; col++, n++) {
        const fx = (col + 0.5) / cols;
        const fy = (r + 0.5) / rows;
        const x = innerMinX + fx * (innerMaxX - innerMinX);
        const y = innerMinY + fy * (innerMaxY - innerMinY);
        const seatLabel = String(n + 1);
        const key = seatKey(label, demoRow, seatLabel);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({
          sector: label,
          row: demoRow,
          seat: seatLabel,
          xPct: (x / width) * 100,
          yPct: (y / height) * 100,
        });
      }
    }
  }

  return out;
}

/**
 * Группирует места в строки офферов для карты (как GetBilet: Sector / Row / SeatList).
 * @param {{ sector: string, row: string, seat: string }[]} seats
 */
export function offersFromSeatLayout(seats, eventIso, priceDefault = '9000') {
  /** @type {Map<string, { sector: string, row: string, seats: string[] }>} */
  const groups = new Map();
  for (const s of seats) {
    const key = `${s.sector}\x00${s.row}`;
    const g = groups.get(key) ?? { sector: s.sector, row: s.row, seats: [] };
    if (!g.seats.includes(s.seat)) g.seats.push(s.seat);
    groups.set(key, g);
  }
  let idx = 0;
  const offers = [];
  for (const { sector, row, seats: seatList } of groups.values()) {
    seatList.sort((a, b) => {
      const na = Number.parseInt(String(a).replace(/\D/g, ''), 10);
      const nb = Number.parseInt(String(b).replace(/\D/g, ''), 10);
      if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
      return String(a).localeCompare(String(b), 'ru', { numeric: true });
    });
    offers.push({
      Id: `luzhniki-demo-${idx++}`,
      Sector: sector,
      Row: row,
      SeatList: seatList,
      NominalPrice: priceDefault,
      AgentPrice: priceDefault,
      EventDateTime: eventIso,
    });
  }
  return offers;
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      accept: 'application/json,text/plain,*/*',
      'user-agent': 'biletvsem-luzhniki-preview/1.0',
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
  return res.json();
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      accept: 'image/svg+xml,text/plain,*/*',
      'user-agent': 'biletvsem-luzhniki-preview/1.0',
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
  return res.text();
}

const DEFAULT_INKSCAPE_REL_SVG = 'frontend/public/maps/luzhniki-go.svg';

/**
 * Превью из локального Inkscape SVG (без pbilet). Путь: env LUZHNIKI_INKSCAPE_SVG_PATH или `frontend/public/maps/luzhniki-go.svg`.
 *
 * @param {{ svgPath?: string, demoEventIso?: string, seatsPerSector?: number }} opts
 */
export async function buildLuzhnikiFootballStadiumInkscapePreview(opts = {}) {
  const rel =
    opts.svgPath?.trim() || process.env.LUZHNIKI_INKSCAPE_SVG_PATH?.trim() || DEFAULT_INKSCAPE_REL_SVG;
  const abs = resolveFromRepo(rel);
  if (!fs.existsSync(abs)) {
    throw new Error(
      `Inkscape SVG не найден: ${abs}. Сохраните экспорт как frontend/public/maps/luzhniki-go.svg или задайте LUZHNIKI_INKSCAPE_SVG_PATH.`,
    );
  }
  let svgMarkup = fs.readFileSync(abs, 'utf-8').trim();
  svgMarkup = normalizeHallSvgDataIds(svgMarkup);

  const parsed = parseLuzhnikiInkscapeStadiumSvg(svgMarkup, {
    seatsPerSector: opts.seatsPerSector,
  });

  if (parsed.sectors.length === 0) {
    throw new Error(
      'В SVG не найдено секторов: нужны группы `<g id="C248">` (буква трибуны A–D + номер, или VIP) с вложенными `path[d]`.',
    );
  }

  const demoEventIso = opts.demoEventIso?.trim() || '2026-05-24T15:00:00.000Z';
  const demoOffers = offersFromSeatLayout(parsed.seats, demoEventIso);
  const allSeatCoordinates = parsed.seats.map((s) => ({ xPct: s.xPct, yPct: s.yPct }));

  const layoutJson = {
    layoutMode: 'svgNative',
    showUnavailableSeats: false,
    seats: parsed.seats,
    allSeatCoordinates,
    sectorMode: {
      enabled: true,
      source: 'inkscape',
      sectors: parsed.sectors,
    },
    inkscape: {
      svgPath: abs,
      generatedAt: new Date().toISOString(),
    },
    note:
      'Inkscape: контуры секторов из групп id=A/B/C/D…; места синтетические по bbox до сопоставления с офферами GetBilet.',
  };

  return {
    svg_markup: parsed.svgMarkupOut,
    layout_json: layoutJson,
    demoOffers,
    meta: {
      mode: 'inkscape_synthetic',
      layoutId: 'inkscape',
      width: parsed.width,
      height: parsed.height,
      sectorCount: parsed.sectors.length,
      seatCount: parsed.seats.length,
      demoEventIso,
      svgPath: abs,
    },
  };
}

/**
 * @param {{
 *   layoutId?: string,
 *   eventSourceId?: string | null,
 *   eventDateId?: string | null,
 *   sourceId?: string,
 *   currency?: string,
 *   lang?: string,
 *   demoEventIso?: string,
 * }} opts
 */
export async function buildLuzhnikiFootballStadiumPreview(opts = {}) {
  const layoutId = String(opts.layoutId || DEFAULT_LAYOUT_ID).trim();
  const sourceId = String(opts.sourceId || DEFAULT_SOURCE_ID).trim();
  const currency = String(opts.currency || DEFAULT_CURRENCY).trim();
  const lang = String(opts.lang || DEFAULT_LANG).trim();
  const eventSourceId = opts.eventSourceId?.trim() || '';
  const eventDateId = opts.eventDateId?.trim() || '';
  const demoEventIso = opts.demoEventIso?.trim() || '2026-05-24T15:00:00.000Z';

  const coordinatesUrl = `https://tickets.api.pbilet.net/public/v1/hall-layouts/${encodeURIComponent(layoutId)}/coordinates`;
  const coordinatesPayload = await fetchJson(coordinatesUrl);
  const width = Number(coordinatesPayload?.width);
  const height = Number(coordinatesPayload?.height);
  const bgUrl = normalizeText(coordinatesPayload?.bg);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('Некорректные размеры схемы pbilet');
  }
  if (!bgUrl) throw new Error('В pbilet coordinates нет bg SVG');

  const svgMarkupRaw = (await fetchText(bgUrl)).trim();
  let svgMarkup = normalizeHallSvgDataIds(svgMarkupRaw);
  if (!svgMarkup.includes('<svg')) throw new Error('bg не похож на SVG');

  const allSeatCoordinates = collectAllSeatCoordinates(coordinatesPayload, width, height);

  let seats = [];
  let sectors = [];
  let mode = 'coordinates_demo';

  if (eventSourceId && eventDateId) {
    const ticketsUrl = `https://api.pbilet.net/public/v2/tickets?currency_code=${encodeURIComponent(currency)}&lang=${encodeURIComponent(lang)}&event_source_id=${encodeURIComponent(eventSourceId)}&event_date_id=${encodeURIComponent(eventDateId)}&source_id=${encodeURIComponent(sourceId)}`;
    try {
      const ticketsPayload = await fetchJson(ticketsUrl);
      if (ticketsPayload?.detail && typeof ticketsPayload.detail === 'string') {
        throw new Error(ticketsPayload.detail);
      }
      seats = collectLayoutSeats(ticketsPayload, width, height);
      sectors = collectSectorMeta(ticketsPayload);
      if (seats.length > 0 && sectors.length > 0) {
        mode = 'pbilet_tickets';
      }
    } catch {
      seats = [];
      sectors = [];
    }
  }

  if (seats.length === 0) {
    sectors = sectorsFromCoordinateCategories(coordinatesPayload);
    seats = syntheticSeatsFromCategories(coordinatesPayload, width, height, 14);
    mode = seats.length > 0 ? 'coordinates_synthetic_seats' : 'coordinates_sectors_only';
  }

  const demoOffers = offersFromSeatLayout(seats, demoEventIso);

  const layoutJson = {
    layoutMode: 'svgNative',
    /** Как на стадионах в проде (Лукойл и т.п.): только места из офферов, без подложки «все кресла». */
    showUnavailableSeats: false,
    seats,
    allSeatCoordinates,
    sectorMode: {
      enabled: sectors.length > 0,
      source: mode === 'pbilet_tickets' ? 'pbilet' : 'pbilet_coordinates_preview',
      sectors,
    },
    pbilet: {
      layoutId,
      previewMode: mode,
      coordinatesUrl,
      bgUrl,
      ticketsAttempted: Boolean(eventSourceId && eventDateId),
      generatedAt: new Date().toISOString(),
    },
    note:
      mode === 'pbilet_tickets'
        ? 'Данные мест из pbilet tickets (как production import).'
        : 'Демо: места синтезированы по bbox сектора из coordinates; для боевого режима задайте event_source_id и event_date_id.',
  };

  return {
    svg_markup: svgMarkup,
    layout_json: layoutJson,
    demoOffers,
    meta: {
      mode,
      layoutId,
      width,
      height,
      sectorCount: sectors.length,
      seatCount: seats.length,
      demoEventIso,
    },
  };
}
