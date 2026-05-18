/**
 * Сопоставление cx/cy ↔ tickets r[].s[].x/y и обогащение circle data-sector/row/seat.
 */

import fs from 'node:fs';

import { extractPbiletTicketsSeatGeodesy } from './luzhnikiPbiletGeodesyExtract.js';
import { escSvgAttr } from './luzhnikiPilotSeatSvg.js';
import { buildFullStadiumLabeledSeats } from './luzhnikiStadiumFullGeodesy.js';
import { labelSectorDots } from './luzhnikiGrayDotsLabeler.js';
import { extractPbiletCoordinatesSeatDots } from './luzhnikiPbiletGeodesyExtract.js';
import { buildSectorDotIndex } from './hallSeatGeodesyFromDots.js';
import { extractPbiletTicketSectorPaths } from './luzhnikiPbiletGeodesyExtract.js';
import { normalizeSectorLabel } from './ticketHallSectorNormalize.js';

export const LUZHNIKI_GRAY_CLOUD_LAYER_ID = 'luzhniki-gray-cloud-coordinates';
export const DEFAULT_HALL_W = 11413;
export const DEFAULT_HALL_H = 9676;

function seatLabelFromPbilet(seat) {
  const raw = seat?.i ?? seat?.k?.x ?? seat?.k?.i;
  const s = String(raw ?? '').trim();
  return s || String(seat?.seat ?? '').trim();
}

/** Все места из tickets.json с абсолютными x,y (r[].s[] + ложи seat_x/y). */
export function collectTicketSeatsAbsolute(ticketsPayload, hallWidth, hallHeight) {
  const w = hallWidth;
  const h = hallHeight;
  const fromExtract = extractPbiletTicketsSeatGeodesy(ticketsPayload, w, h);
  const out = fromExtract.map((s) => ({
    sector: s.sector,
    row: s.row,
    seat: s.seat,
    x: (s.xPct / 100) * w,
    y: (s.yPct / 100) * h,
    source: 'strict',
  }));

  const seen = new Set(out.map((s) => `${s.sector}|${s.row}|${s.seat}`.toLowerCase()));
  const sectors = Array.isArray(ticketsPayload?.sectors) ? ticketsPayload.sectors : [];
  for (const sector of sectors) {
    const sectorLabel = String(sector?.i ?? '').trim();
    if (!sectorLabel) continue;
    for (const row of sector.r || []) {
      for (const seat of row.s || []) {
        const x = Number(seat?.x);
        const y = Number(seat?.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        const rowLabel = String(row?.i ?? '').trim();
        const seatId = seatLabelFromPbilet(seat);
        const key = `${sectorLabel}|${rowLabel}|${seatId}`.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({
          sector: sectorLabel,
          row: rowLabel,
          seat: seatId,
          x,
          y,
          source: 'strict',
          seatUuid: seat?.d ?? null,
        });
      }
    }
  }
  return out;
}

function coordBucketKey(x, y, prec = 500) {
  return `${Math.round(x * prec)}:${Math.round(y * prec)}`;
}

export function buildCoordinateSeatBuckets(seats, prec = 500) {
  const buckets = new Map();
  for (const s of seats) {
    const k = coordBucketKey(s.x, s.y, prec);
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(s);
  }
  return buckets;
}

export function lookupSeatByCoordinates(buckets, cx, cy, tolPx = 1.5, prec = 500) {
  let best = null;
  let bestD = tolPx;
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      const k = coordBucketKey(cx + dx / prec, cy + dy / prec, prec);
      const list = buckets.get(k);
      if (!list) continue;
      for (const c of list) {
        const d = Math.hypot(c.x - cx, c.y - cy);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
    }
  }
  return best;
}

export function seatCircleDataAttrs(seat, extra = {}) {
  const sector = escSvgAttr(seat.sector);
  const row = escSvgAttr(seat.row);
  const place = escSvgAttr(seat.seat);
  const source = escSvgAttr(seat.source ?? 'strict');
  const parts = [
    `place-name="${sector}"`,
    `row="${row}"`,
    `place="${place}"`,
    `data-sector="${sector}"`,
    `data-row="${row}"`,
    `data-seat="${place}"`,
    `data-source="${source}"`,
  ];
  if (seat.seatUuid) parts.push(`data-seat-uuid="${escSvgAttr(seat.seatUuid)}"`);
  for (const [k, v] of Object.entries(extra)) {
    if (v != null) parts.push(`${k}="${escSvgAttr(v)}"`);
  }
  return parts.join(' ');
}

/**
 * @param {object} opts
 * @param {unknown} opts.ticketsPayload
 * @param {unknown} opts.coordinatesPayload
 * @param {string} [opts.svgMarkup]
 * @param {number} [opts.hallWidth]
 * @param {number} [opts.hallHeight]
 * @param {number} [opts.matchTolPx]
 * @param {boolean} [opts.useFullStadiumFallback]
 * @param {boolean} [opts.useLabeledDotsFallback]
 */
export async function buildEnrichedGrayCloudSeatIndexes(opts) {
  const w = Number(opts.hallWidth) || DEFAULT_HALL_W;
  const h = Number(opts.hallHeight) || DEFAULT_HALL_H;

  const ticketSeats = collectTicketSeatsAbsolute(opts.ticketsPayload, w, h);
  const ticketBuckets = buildCoordinateSeatBuckets(ticketSeats);

  const fullSeats = [];
  if (opts.useFullStadiumFallback !== false) {
    const built = buildFullStadiumLabeledSeats({
      ticketsPayload: opts.ticketsPayload,
      coordinatesPayload: opts.coordinatesPayload,
      svgMarkup: String(opts.svgMarkup ?? ''),
      hallWidth: w,
      hallHeight: h,
    });
    for (const s of built.seats) {
      fullSeats.push({
        sector: s.sector,
        row: s.row,
        seat: s.seat,
        x: (s.xPct / 100) * w,
        y: (s.yPct / 100) * h,
        source: s.geodesySource ?? 'fieldGrid',
      });
    }
  }
  const fullBuckets = buildCoordinateSeatBuckets(fullSeats);

  const labeledFlat = [];
  if (opts.useLabeledDotsFallback) {
    const cloud = extractPbiletCoordinatesSeatDots(opts.coordinatesPayload, w, h);
    const paths = extractPbiletTicketSectorPaths(opts.ticketsPayload);
    const byNorm = buildSectorDotIndex(cloud, paths, w, h);
    const metaPath = new URL('../data/luzhniki-geodesy/sector-label-meta.json', import.meta.url);
    let sectorIds = [];
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      sectorIds = Object.keys(meta.sectors ?? {});
    } catch {
      sectorIds = [...byNorm.keys()];
    }
    for (const sectorId of sectorIds) {
      let labeled;
      try {
        labeled = labelSectorDots(sectorId);
      } catch {
        continue;
      }
      const sectorLabel =
        paths.find((p) => normalizeSectorLabel(p.label) === sectorId)?.label ?? sectorId;
      for (const d of labeled) {
        labeledFlat.push({
          sector: sectorLabel,
          row: String(d.row),
          seat: String(d.seat),
          x: (d.x / 100) * w,
          y: (d.y / 100) * h,
          source: 'labeled-dots',
        });
      }
    }
  }
  const labeledBuckets = buildCoordinateSeatBuckets(labeledFlat);

  return { ticketBuckets, fullBuckets, labeledBuckets, w, h };
}

export function resolveSeatForGrayDot(buckets, cx, cy, tolPx) {
  return (
    lookupSeatByCoordinates(buckets.ticketBuckets, cx, cy, tolPx) ||
    lookupSeatByCoordinates(buckets.fullBuckets, cx, cy, tolPx) ||
    lookupSeatByCoordinates(buckets.labeledBuckets, cx, cy, tolPx)
  );
}

/**
 * SVG: все точки luzhniki.txt как circle с data-sector/row/seat.
 */
export function buildEnrichedGrayCloudSvg(coordinatesPayload, indexes, options = {}) {
  const w = indexes.w;
  const h = indexes.h;
  const tol = Number(options.matchTolPx) > 0 ? Number(options.matchTolPx) : 1.5;
  const rDot = Math.max(1.2, Math.min(w, h) * 0.00035);
  const coords = Array.isArray(coordinatesPayload?.coordinates) ? coordinatesPayload.coordinates : [];

  const lines = [];
  let matchedStrict = 0;
  let matchedFull = 0;
  let matchedLabeled = 0;
  let unmatched = 0;

  for (const item of coords) {
    const cx = Number(item?.x);
    const cy = Number(item?.y);
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) continue;

    const strict = lookupSeatByCoordinates(indexes.ticketBuckets, cx, cy, tol);
    const full = strict ? null : lookupSeatByCoordinates(indexes.fullBuckets, cx, cy, tol);
    const labeled = strict || full ? null : lookupSeatByCoordinates(indexes.labeledBuckets, cx, cy, tol);
    const hit = strict || full || labeled;

    if (hit?.source === 'strict') matchedStrict += 1;
    else if (hit?.source === 'labeled-dots') matchedLabeled += 1;
    else if (hit) matchedFull += 1;
    else unmatched += 1;

    const attrs = hit
      ? seatCircleDataAttrs(hit)
      : 'data-unlabeled="1" data-source="cloud"';
    lines.push(`<circle cx="${cx.toFixed(3)}" cy="${cy.toFixed(3)}" r="${rDot.toFixed(3)}" fill="#c8ccd4" stroke="none" ${attrs}/>`);
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <g id="${LUZHNIKI_GRAY_CLOUD_LAYER_ID}" data-dot-count="${lines.length}">
${lines.join('\n')}
  </g>
</svg>`;

  return {
    svg,
    stats: {
      total: lines.length,
      matchedStrict,
      matchedFull,
      matchedLabeled,
      unmatched,
      labeled: lines.length - unmatched,
    },
  };
}
