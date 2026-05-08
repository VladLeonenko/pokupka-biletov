/**
 * Извлечение полной геодезии зала из снимков pbilet (без запросов в рантайме биллинга).
 * Офферы GetBilet могут содержать только доступные места — координаты всего чаша задаём здесь.
 */

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
