/**
 * Танцпол / фан-зона: офферы без координат в pilot → точки в bbox sectorMode (кликабельно).
 */

import { normalizeSectorLabel, sectorNormsMatch } from './ticketHallSectorNormalize.js';

const FREE_ZONE_NORMS = new Set([
  normalizeSectorLabel('танцпол'),
  normalizeSectorLabel('фан-зона'),
  normalizeSectorLabel('fan-zone'),
]);

function isFreeZoneSector(sector) {
  return luzhnikiFreeZoneNorms(sector).some((n) => FREE_ZONE_NORMS.has(n));
}

function luzhnikiFreeZoneNorms(sector) {
  const n = normalizeSectorLabel(sector);
  const out = new Set([n]);
  if (n === normalizeSectorLabel('фан-зона') || n === normalizeSectorLabel('fan-zone')) {
    out.add(normalizeSectorLabel('фан-зона'));
    out.add(normalizeSectorLabel('fan-zone'));
  }
  return [...out];
}

/** Грубый bbox из SVG path `d` (достаточно для сетки стоячих зон). */
export function bboxPctFromSvgPath(pathD, hallW = 11413, hallH = 9676) {
  const nums = String(pathD || '').match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi);
  if (!nums || nums.length < 4) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = Number(nums[i]);
    const y = Number(nums[i + 1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  if (!Number.isFinite(minX) || maxX <= minX || maxY <= minY) return null;
  const padX = (maxX - minX) * 0.12;
  const padY = (maxY - minY) * 0.12;
  return {
    minXPct: ((minX + padX) / hallW) * 100,
    maxXPct: ((maxX - padX) / hallW) * 100,
    minYPct: ((minY + padY) / hallH) * 100,
    maxYPct: ((maxY - padY) / hallH) * 100,
  };
}

function findSectorBbox(sectorMode, sectorLabel, hallW, hallH) {
  const sectors = Array.isArray(sectorMode?.sectors) ? sectorMode.sectors : [];
  const hit = sectors.find((s) => sectorNormsMatch(s?.label, sectorLabel));
  if (!hit?.path) return null;
  return bboxPctFromSvgPath(hit.path, hallW, hallH);
}

/**
 * @param {Record<string, unknown>} layout
 * @param {{ Sector?: string, Row?: string, SeatList?: string[] }[]} offers
 * @param {{ sector: string, row: string, seat: string }[]} [alreadyMatched]
 */
export function buildConcertFreeZoneSellableSeats(layout, offers, alreadyMatched = []) {
  const matchedKeys = new Set(
    alreadyMatched.map((s) => `${normalizeSectorLabel(s.sector)}|${s.row}|${s.seat}`),
  );
  const hallW = Number(layout?.pbilet?.hallWidth || layout?.geodesy?.hallWidth) || 11413;
  const hallH = Number(layout?.pbilet?.hallHeight || layout?.geodesy?.hallHeight) || 9676;
  const bboxByNorm = new Map();

  const seats = [];
  for (const offer of offers) {
    const sector = String(offer?.Sector ?? '');
    if (!isFreeZoneSector(sector)) continue;
    const row = String(offer?.Row ?? '');
    const list = Array.isArray(offer?.SeatList) ? offer.SeatList.map(String) : [];
    const norms = luzhnikiFreeZoneNorms(sector);
    let bbox = null;
    for (const n of norms) {
      if (bboxByNorm.has(n)) {
        bbox = bboxByNorm.get(n);
        break;
      }
    }
    if (!bbox) {
      bbox = findSectorBbox(layout?.sectorMode, sector, hallW, hallH);
      for (const n of norms) bboxByNorm.set(n, bbox);
    }
    if (!bbox) continue;

    const tokens = list.filter((s) => s.trim());
    const n = Math.max(tokens.length, 1);
    const cols = Math.max(4, Math.ceil(Math.sqrt(n)));
    const rows = Math.max(1, Math.ceil(n / cols));

    tokens.forEach((seat, i) => {
      const key = `${normalizeSectorLabel(sector)}|${row}|${seat}`;
      if (matchedKeys.has(key)) return;
      matchedKeys.add(key);
      const col = i % cols;
      const r = Math.floor(i / cols);
      const xPct =
        bbox.minXPct + ((col + 0.5) / cols) * Math.max(0.01, bbox.maxXPct - bbox.minXPct);
      const yPct =
        bbox.minYPct + ((r + 0.5) / rows) * Math.max(0.01, bbox.maxYPct - bbox.minYPct);
      seats.push({
        sector,
        row,
        seat,
        xPct,
        yPct,
        geodesySource: 'concertFreeZoneGrid',
      });
    });
  }

  return seats;
}

export function isLuzhnikiConcertFreeZoneSector(sector) {
  return isFreeZoneSector(sector);
}
