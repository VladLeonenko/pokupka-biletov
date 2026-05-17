/**
 * Извлечение полной геодезии зала из снимков pbilet (без запросов в рантайме биллинга).
 * Офферы GetBilet могут содержать только доступные места — координаты всего чаша задаём здесь.
 */

import { lookupLabeledSeat } from './hallSeatGeodesyMatch.js';
import { luzhnikiSectorLookupNorms, normalizeSectorLabel } from './ticketHallSectorNormalize.js';

function normalizeText(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function seatLabel(seat) {
  const raw = seat?.i ?? seat?.k?.x ?? seat?.k?.i;
  const s = normalizeText(raw);
  return s || normalizeText(seat?.k?.seat ?? seat?.seat);
}

/**
 * Плоские места с процентами — то же, что ждёт layout_json.seats на фронте.
 * @param {unknown} ticketsPayload тело GET api.pbilet.net/public/v2/tickets (sectors[].r[].s[])
 * @param {number} width
 * @param {number} height
 */
export function extractPbiletTicketsSeatGeodesy(ticketsPayload, width, height) {
  const out = [];
  const seen = new Set();
  const sectors = Array.isArray(ticketsPayload?.sectors) ? ticketsPayload.sectors : [];

  for (const sector of sectors) {
    const sectorLabel = normalizeText(sector?.i);
    if (!sectorLabel) continue;

    const rows = Array.isArray(sector?.r) ? sector.r : [];

    /** Одиночные ложи / сектора без рядов: координаты на уровне сектора (pbilet). */
    if (rows.length === 0) {
      const x = Number(sector?.seat_x);
      const y = Number(sector?.seat_y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      const rowLabel = '—';
      const seatId = '1';
      const key = `${sectorLabel.toLowerCase()}|${rowLabel.toLowerCase()}|${seatId.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        sector: sectorLabel,
        row: rowLabel,
        seat: seatId,
        xPct: (x / width) * 100,
        yPct: (y / height) * 100,
      });
      continue;
    }

    for (const row of rows) {
      const rowLabel = normalizeText(row?.i);
      const seats = Array.isArray(row?.s) ? row.s : [];
      if (!rowLabel || seats.length === 0) continue;

      for (const seat of seats) {
        const seatId = seatLabel(seat);
        const x = Number(seat?.x);
        const y = Number(seat?.y);
        if (!seatId || !Number.isFinite(x) || !Number.isFinite(y)) continue;
        const key = `${sectorLabel.toLowerCase()}|${rowLabel.toLowerCase()}|${seatId.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({
          sector: sectorLabel,
          row: rowLabel,
          seat: seatId,
          xPct: (x / width) * 100,
          yPct: (y / height) * 100,
        });
      }
    }
  }

  return out;
}

/**
 * Якоря рядов из layout.seats (система координат pbilet) для interpolatePbiletSeatGeodesy.
 */
export function collectLayoutSectorPbiletSeats(layoutIndex, lookupNorms, canonicalLabel = '') {
  const norms = new Set((lookupNorms || []).map((n) => normalizeSectorLabel(n)).filter(Boolean));
  const out = [];
  const seen = new Set();
  for (const s of layoutIndex.values()) {
    if (!norms.has(normalizeSectorLabel(s.sector))) continue;
    const row = normalizeText(s.row);
    const seat = normalizeText(s.seat);
    if (!row || !seat) continue;
    const key = `${row.toLowerCase()}|${seat.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      sector: canonicalLabel || s.sector,
      row,
      seat,
      xPct: s.xPct,
      yPct: s.yPct,
    });
  }
  return out;
}

export function countPbiletRowAnchors(seats) {
  const rows = new Set();
  for (const s of seats) {
    const n = parseRowNum(s.row);
    if (n != null) rows.add(n);
  }
  return rows.size;
}

function parseRowNum(value) {
  const n = Number.parseInt(String(value ?? '').replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

function parseSeatNum(value) {
  const n = Number.parseInt(String(value ?? '').replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

function seatAtRow(pbiletSeats, rowNum, seatNum) {
  const rowSeats = pbiletSeats.filter((s) => parseRowNum(s.row) === rowNum);
  if (rowSeats.length < 1) return null;
  const exact = rowSeats.find((s) => parseSeatNum(s.seat) === seatNum);
  if (exact) return exact;
  return rowSeats.reduce((best, s) => {
    const sn = parseSeatNum(s.seat);
    if (sn == null) return best;
    if (!best) return s;
    const bn = parseSeatNum(best.seat);
    if (bn == null) return s;
    return Math.abs(sn - seatNum) < Math.abs(bn - seatNum) ? s : best;
  }, null);
}

function lerpSeat(a, b, t, row, seat, sector) {
  return {
    sector: sector || a.sector,
    row: String(row),
    seat: String(seat),
    xPct: a.xPct + t * (b.xPct - a.xPct),
    yPct: a.yPct + t * (b.yPct - a.yPct),
    geodesySource: 'pbiletLerp',
  };
}

export function snapFieldGridSeat(fieldGridIndex, sectorLabel, row, seat) {
  if (!fieldGridIndex?.size) return null;
  const targetRow = parseRowNum(row);
  const seatNum = parseSeatNum(seat);
  if (targetRow == null || seatNum == null) return null;

  const exact = lookupLabeledSeat(fieldGridIndex, sectorLabel, row, seat);
  if (exact) {
    return {
      sector: sectorLabel,
      row: String(row),
      seat: String(seat),
      xPct: exact.xPct,
      yPct: exact.yPct,
      geodesySource: 'fieldGridSnap',
    };
  }

  const lookupNorms = new Set(luzhnikiSectorLookupNorms(sectorLabel));
  const rowSeats = [];
  for (const s of fieldGridIndex.values()) {
    if (!lookupNorms.has(normalizeSectorLabel(s.sector))) continue;
    if (parseRowNum(s.row) !== targetRow) continue;
    const sn = parseSeatNum(s.seat);
    if (sn == null) continue;
    rowSeats.push({ sn, xPct: s.xPct, yPct: s.yPct });
  }
  if (rowSeats.length < 1) return null;

  rowSeats.sort((a, b) => a.sn - b.sn);

  if (rowSeats.length >= 2) {
    let lower = rowSeats[0];
    let upper = rowSeats[rowSeats.length - 1];
    for (let i = 0; i < rowSeats.length - 1; i += 1) {
      if (rowSeats[i].sn <= seatNum && rowSeats[i + 1].sn >= seatNum) {
        lower = rowSeats[i];
        upper = rowSeats[i + 1];
        break;
      }
    }
    if (seatNum <= rowSeats[0].sn) {
      lower = rowSeats[0];
      upper = rowSeats[1];
    } else if (seatNum >= rowSeats[rowSeats.length - 1].sn) {
      lower = rowSeats[rowSeats.length - 2];
      upper = rowSeats[rowSeats.length - 1];
    }
    const span = upper.sn - lower.sn;
    const t = span !== 0 ? (seatNum - lower.sn) / span : 0;
    return {
      sector: sectorLabel,
      row: String(row),
      seat: String(seat),
      xPct: lower.xPct + t * (upper.xPct - lower.xPct),
      yPct: lower.yPct + t * (upper.yPct - lower.yPct),
      geodesySource: 'fieldGridRow',
    };
  }

  const only = rowSeats[0];
  return {
    sector: sectorLabel,
    row: String(row),
    seat: String(seat),
    xPct: only.xPct,
    yPct: only.yPct,
    geodesySource: 'fieldGridSnap',
  };
}

/**
 * Координаты места: snap к LMR fieldGrid (если index передан), иначе tickets + интерполяция.
 * @param {Map<string, { sector: string, row: string, seat: string, xPct: number, yPct: number }>} [fieldGridIndex]
 */
export function interpolatePbiletSeatGeodesy(pbiletSeats, sectorLabel, row, seat, fieldGridIndex = null) {
  const lookupNorms = new Set(luzhnikiSectorLookupNorms(sectorLabel));
  const targetRow = parseRowNum(row);
  const seatNum = parseSeatNum(seat);
  if (targetRow == null || seatNum == null) return null;

  const gridHit = snapFieldGridSeat(fieldGridIndex, sectorLabel, row, seat);
  if (gridHit) return gridHit;

  const sectorSeats = pbiletSeats.filter((s) => lookupNorms.has(normalizeSectorLabel(s.sector)));
  if (sectorSeats.length < 1) return null;

  const exact = seatAtRow(sectorSeats, targetRow, seatNum);
  if (exact) return { ...exact, row: String(row), seat: String(seat) };

  const rowNums = [...new Set(sectorSeats.map((s) => parseRowNum(s.row)).filter((n) => n != null))].sort(
    (a, b) => a - b,
  );
  if (rowNums.length < 2) return null;

  let lower = null;
  let upper = null;
  for (const r of rowNums) {
    if (r <= targetRow) lower = r;
    if (r >= targetRow && upper == null) upper = r;
  }

  if (lower != null && upper != null && lower !== upper) {
    const p0 = seatAtRow(sectorSeats, lower, seatNum);
    const p1 = seatAtRow(sectorSeats, upper, seatNum);
    if (p0 && p1) {
      const t = (targetRow - lower) / (upper - lower);
      return lerpSeat(p0, p1, t, row, seat, sectorLabel);
    }
  }

  if (targetRow < rowNums[0]) {
    const r0 = rowNums[0];
    const r1 = rowNums[1];
    const p0 = seatAtRow(sectorSeats, r0, seatNum);
    const p1 = seatAtRow(sectorSeats, r1, seatNum);
    if (p0 && p1) {
      const t = (targetRow - r0) / (r1 - r0);
      return lerpSeat(p0, p1, t, row, seat, sectorLabel);
    }
  }

  if (targetRow > rowNums[rowNums.length - 1]) {
    const r0 = rowNums[rowNums.length - 2];
    const r1 = rowNums[rowNums.length - 1];
    const p0 = seatAtRow(sectorSeats, r0, seatNum);
    const p1 = seatAtRow(sectorSeats, r1, seatNum);
    if (p0 && p1) {
      const t = (targetRow - r1) / (r1 - r0);
      return lerpSeat(p0, p1, t, row, seat, sectorLabel);
    }
  }

  return null;
}

/**
 * Сектора с path для sectorMode (как в import-pbilet-stage-map).
 * @param {unknown} ticketsPayload
 */
export function extractPbiletTicketSectorPaths(ticketsPayload) {
  const sectors = Array.isArray(ticketsPayload?.sectors) ? ticketsPayload.sectors : [];
  return sectors
    .map((sector) => {
      const label = normalizeText(sector?.i);
      const id = normalizeText(sector?.d);
      const path = normalizeText(sector?.o);
      if (!label || !id || !path) return null;
      const rows = Array.isArray(sector?.r) ? sector.r : [];
      let seatCount = 0;
      const prices = [];
      if (
        rows.length === 0 &&
        Number.isFinite(Number(sector?.seat_x)) &&
        Number.isFinite(Number(sector?.seat_y))
      ) {
        seatCount = 1;
      }
      for (const row of rows) {
        for (const seat of Array.isArray(row?.s) ? row.s : []) {
          seatCount += 1;
          const price = Number(seat?.p ?? seat?.k?.p);
          if (Number.isFinite(price)) prices.push(price);
        }
      }
      return {
        id,
        label,
        path,
        totalSeats: Number.isFinite(Number(sector?.all)) ? Number(sector.all) : null,
        availableSeats: seatCount,
        minPrice: prices.length ? Math.min(...prices) : null,
        maxPrice: prices.length ? Math.max(...prices) : null,
      };
    })
    .filter(Boolean);
}

/**
 * Подложки секторов из coordinates.categories если в tickets нет path у части зон.
 * @param {unknown} coordinatesPayload
 */
export function extractPbiletCoordinateCategoriesSectorPaths(coordinatesPayload) {
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
 * Точки из `coordinates.coordinates` (pbilet hall-layouts/…/coordinates) без сектор/ряд/место.
 * На фронте уходит в `layout_json.allSeatCoordinates` — полная чаша серым фоном поверх подложки.
 */
export function extractPbiletCoordinatesSeatDots(coordinatesPayload, width, height) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return [];
  const coordinates = Array.isArray(coordinatesPayload?.coordinates) ? coordinatesPayload.coordinates : [];
  const out = [];
  for (const item of coordinates) {
    const x = Number(item?.x);
    const y = Number(item?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    out.push({
      xPct: (x / width) * 100,
      yPct: (y / height) * 100,
    });
  }
  return out;
}

/** Объединить сектора по id (приоритет tickets — есть цены/места). */
export function mergeSectorMetaPreferTickets(ticketSectors, categorySectors) {
  const byId = new Map();
  for (const s of categorySectors || []) {
    if (s?.id) byId.set(s.id, { ...s });
  }
  for (const s of ticketSectors || []) {
    if (s?.id) byId.set(s.id, { ...(byId.get(s.id) || {}), ...s });
  }
  return [...byId.values()].filter((s) => s.path && s.label && s.id);
}
