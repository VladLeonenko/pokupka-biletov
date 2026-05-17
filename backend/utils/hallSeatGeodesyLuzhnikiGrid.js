/**
 * Лужники: координаты sellable по правилу заказчика.
 * 1) strict / svgCircle — если есть сектор+ряд+место в tickets или circle в SVG.
 * 2) grid — каждой точке: ряд = подпись на SVG сектора, место 1…N слева в полосе.
 * Без cloud / svgRow / интерполяции по min-max офферов.
 */

import { buildSectorDotIndex } from './hallSeatGeodesyFromDots.js';
import {
  buildLabeledSeatIndex,
  buildSellableSeatGeodesy,
  labeledSeatLookupKeys,
  lookupLabeledSeat,
} from './hallSeatGeodesyMatch.js';
import { normalizeSectorLabel, strictSeatKey } from './ticketHallSectorNormalize.js';
import {
  parseSvgNativeSeatCircles,
  injectPbiletSeatsIntoSvg,
  countSvgNativeSeatCircles,
} from './hallSeatGeodesyFromSvgCircles.js';
import { parseSvgHallRowLabels } from './hallSeatGeodesyFromSvgRows.js';
import {
  findBandIndexNearestY,
  getRowLabelYPctInSector,
  pickSectorRowLabelAisle,
  sortDotsInSectorRow,
} from './hallSeatGeodesyFromSvgRows.js';
import {
  computeFieldCenterPct,
  labelSectorBandsWithSvgRowNumbers,
  maxRowInSectorFromSvg,
  resolveOfferSeatSectorNativeLayout,
  rowAxisFromSector,
  sectorPrefersSvgRowLabels,
  sortSectorRowBandsFromField,
} from './hallSeatGeodesySectorNative.js';

function parseNum(value) {
  const n = Number.parseInt(String(value ?? '').replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Прописать каждой точке чаши в секторе: sector + row (по подписи SVG) + seat (1…N слева направо) + xPct/yPct.
 * @returns {{ sector: string, row: string, seat: string, xPct: number, yPct: number, geodesySource: 'grid' }[]}
 */
export function buildStadiumLayoutSeatsFromDotGrid({
  sectorPaths,
  allSeatCoordinates,
  svgMarkup,
  hallWidth,
  hallHeight,
  minDotsPerSector = 12,
}) {
  const w = Number(hallWidth) > 0 ? Number(hallWidth) : 11413;
  const h = Number(hallHeight) > 0 ? Number(hallHeight) : 9676;
  const fieldCenterPct = computeFieldCenterPct(allSeatCoordinates);
  const dotsBySector = buildSectorDotIndex(allSeatCoordinates, sectorPaths, w, h);
  const svgRowLabels =
    typeof svgMarkup === 'string' && svgMarkup.includes('<tspan')
      ? parseSvgHallRowLabels(svgMarkup, w, h)
      : [];

  const out = [];
  const seen = new Set();

  for (const sp of sectorPaths || []) {
    const sectorLabel = String(sp.label ?? '').trim();
    const sectorPath = String(sp.path ?? '').trim();
    const norm = normalizeSectorLabel(sectorLabel);
    if (!sectorLabel || !sectorPath || !norm) continue;

    const sectorDots = dotsBySector.get(norm);
    if (!sectorDots || sectorDots.length < minDotsPerSector) continue;

    const { bands: sortedBands } = sortSectorRowBandsFromField(
      sectorDots,
      sectorPath,
      fieldCenterPct,
      w,
      h,
    );
    if (sortedBands.length < 1) continue;

    const rowAxis = rowAxisFromSector(sectorPath, fieldCenterPct, w, h);
    const aisle = sectorPrefersSvgRowLabels(rowAxis)
      ? pickSectorRowLabelAisle(sectorPath, svgRowLabels, w, h)
      : null;
    const maxRow = aisle?.rowY?.size
      ? Math.max(...aisle.rowY.keys())
      : maxRowInSectorFromSvg(sectorPath, svgRowLabels, w, h);

    const emitBand = (band, rowLabel, rowNum) => {
      if (!band?.dots?.length) return;
      const sorted = sortDotsInSectorRow(
        Number(rowNum),
        band.dots,
        sectorPath,
        svgRowLabels,
        w,
        h,
      );
      for (let i = 0; i < sorted.length; i += 1) {
        const seatLabel = String(i + 1);
        const key = strictSeatKey(sectorLabel, rowLabel, seatLabel);
        if (seen.has(key)) continue;
        seen.add(key);
        const dot = sorted[i];
        out.push({
          sector: sectorLabel,
          row: rowLabel,
          seat: seatLabel,
          xPct: dot.xPct,
          yPct: dot.yPct,
          geodesySource: 'grid',
        });
      }
    };

    if (aisle?.rowY?.size) {
      for (let rowNum = 1; rowNum <= maxRow; rowNum += 1) {
        const targetY = getRowLabelYPctInSector(rowNum, sectorPath, svgRowLabels, w, h);
        if (targetY == null) continue;
        const bi = findBandIndexNearestY(sortedBands, targetY);
        emitBand(sortedBands[bi], String(rowNum), rowNum);
      }
    } else {
      const labeledBands = labelSectorBandsWithSvgRowNumbers(
        sortedBands,
        sectorPath,
        svgRowLabels,
        fieldCenterPct,
        w,
        h,
      );
      for (const band of labeledBands) {
        if (band.rowNum == null) continue;
        emitBand(band, String(band.rowNum), band.rowNum);
      }
    }
  }

  return out;
}

/** pbilet tickets (strict) перекрывает grid для того же ключа. */
export function mergeLayoutSeatsPreferPbiletStrict(ticketsSeats, gridSeats) {
  const byKey = new Map();
  for (const s of gridSeats || []) {
    for (const key of labeledSeatLookupKeys(s.sector, s.row, s.seat)) {
      if (!byKey.has(key)) byKey.set(key, { ...s, geodesySource: 'grid' });
    }
  }
  for (const s of ticketsSeats || []) {
    for (const key of labeledSeatLookupKeys(s.sector, s.row, s.seat)) {
      byKey.set(key, { ...s, geodesySource: 'strict' });
    }
  }
  const deduped = new Map();
  for (const s of byKey.values()) {
    const k = strictSeatKey(s.sector, s.row, s.seat);
    if (!deduped.has(k)) deduped.set(k, s);
  }
  return [...deduped.values()];
}

/**
 * Ряд/место на облаке точек сектора (взгляд с поля, место 1 — слева в полосе).
 */
export function resolveOfferSeatOnSectorGrid(
  rowNum,
  seatNum,
  sectorDots,
  sectorPath,
  svgRowLabels,
  fieldCenterPct,
  hallWidth,
  hallHeight,
) {
  return resolveOfferSeatSectorNativeLayout(
    rowNum,
    seatNum,
    sectorDots,
    sectorPath,
    svgRowLabels,
    hallWidth,
    hallHeight,
    fieldCenterPct,
  );
}

/**
 * @param {{ sector: string, row: string, seat: string, xPct: number, yPct: number }[]} layoutSeats
 */
/**
 * Sellable = lookup в layout.seats (уже с xPct/yPct). При промахе — один раз посчитать по grid.
 */
export function buildSellableSeatGeodesyLuzhniki({
  layoutSeats,
  allSeatCoordinates,
  sectorPaths,
  hallWidth,
  hallHeight,
  offers,
  svgMarkup,
}) {
  const w = Number(hallWidth) > 0 ? Number(hallWidth) : 11413;
  const h = Number(hallHeight) > 0 ? Number(hallHeight) : 9676;
  const index = buildLabeledSeatIndex(layoutSeats || []);

  const fieldCenterPct = computeFieldCenterPct(allSeatCoordinates);
  const dotsBySector = buildSectorDotIndex(allSeatCoordinates, sectorPaths, w, h);
  const sectorPathByNorm = new Map();
  for (const sp of sectorPaths || []) {
    const norm = normalizeSectorLabel(sp.label);
    const path = String(sp.path ?? '').trim();
    if (norm && path) sectorPathByNorm.set(norm, path);
  }
  const svgRowLabels =
    typeof svgMarkup === 'string' && svgMarkup.includes('<tspan')
      ? parseSvgHallRowLabels(svgMarkup, w, h)
      : [];

  const seats = [];
  const seen = new Set();
  let gridMatched = 0;
  let strictMatched = 0;
  let totalSellable = 0;
  const unmatchedSamples = [];

  for (const offer of offers) {
    const sector = String(offer.Sector ?? '');
    const row = String(offer.Row ?? '');
    const norm = normalizeSectorLabel(sector);
    const list = Array.isArray(offer.SeatList) ? offer.SeatList.map(String) : [];

    for (const seat of list) {
      if (!seat.trim()) continue;
      totalSellable += 1;
      const key = strictSeatKey(sector, row, seat);
      if (seen.has(key)) continue;

      const labeled = lookupLabeledSeat(index, sector, row, seat);
      if (labeled) {
        seen.add(key);
        const src = labeled.geodesySource === 'strict' ? 'strict' : 'grid';
        if (src === 'strict') strictMatched += 1;
        else gridMatched += 1;
        seats.push({
          sector,
          row,
          seat,
          xPct: labeled.xPct,
          yPct: labeled.yPct,
          geodesySource: src,
        });
        continue;
      }

      const rowNum = parseNum(row);
      const seatNum = parseNum(seat);
      const sectorDots = dotsBySector.get(norm);
      const sectorPath = sectorPathByNorm.get(norm);
      if (rowNum != null && seatNum != null && sectorDots?.length && sectorPath) {
        const resolved = resolveOfferSeatOnSectorGrid(
          rowNum,
          seatNum,
          sectorDots,
          sectorPath,
          svgRowLabels,
          fieldCenterPct,
          w,
          h,
        );
        if (resolved) {
          seen.add(key);
          gridMatched += 1;
          seats.push({
            sector,
            row,
            seat,
            xPct: resolved.xPct,
            yPct: resolved.yPct,
            geodesySource: 'grid',
          });
          continue;
        }
      }

      if (unmatchedSamples.length < 12) {
        unmatchedSamples.push({ sector, row, seat });
      }
    }
  }

  return {
    seats,
    matched: seats.length,
    totalSellable,
    strictMatched,
    svgCircleMatched: 0,
    sectorGridMatched: gridMatched,
    cloudMatched: 0,
    svgRowMatched: 0,
    cloudSnapMatched: 0,
    dotMatched: 0,
    anchorInterpolated: 0,
    layoutSeatCount: layoutSeats?.length ?? 0,
    unmatchedSamples,
  };
}
