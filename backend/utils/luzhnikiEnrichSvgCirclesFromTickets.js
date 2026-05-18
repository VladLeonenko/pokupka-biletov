/**
 * Сопоставление cx/cy ↔ tickets r[].s[].x/y и обогащение circle data-sector/row/seat.
 */

import fs from 'node:fs';

import { extractPbiletTicketsSeatGeodesy } from './luzhnikiPbiletGeodesyExtract.js';
import { escSvgAttr } from './luzhnikiPilotSeatSvg.js';
import { buildCanonicalLabeledSeatsForLookup } from './luzhnikiGrayDotsLabeler.js';

export const LUZHNIKI_GRAY_CLOUD_LAYER_ID = 'luzhniki-gray-cloud-coordinates';
export const DEFAULT_HALL_W = 11413;
export const DEFAULT_HALL_H = 9676;

/** Встраивается в enriched SVG — hover при открытии file://…/*.svg (без document.body). */
export const GRAY_CLOUD_SVG_HOVER_SCRIPT = `<![CDATA[
(function () {
  var svg = document.documentElement;
  if (!svg || svg.localName !== 'svg') return;
  var NS = 'http://www.w3.org/2000/svg';
  var layer = document.getElementById('${LUZHNIKI_GRAY_CLOUD_LAYER_ID}');
  if (!layer) return;

  svg.setAttribute('style', 'display:block;width:100%;height:auto;background:#0a0a0a');

  var tipG = document.getElementById('gray-cloud-hover-tip');
  if (!tipG) {
    tipG = document.createElementNS(NS, 'g');
    tipG.setAttribute('id', 'gray-cloud-hover-tip');
    tipG.setAttribute('pointer-events', 'none');
    var tipBg = document.createElementNS(NS, 'rect');
    tipBg.setAttribute('id', 'gray-cloud-hover-tip-bg');
    tipBg.setAttribute('rx', '8');
    tipBg.setAttribute('fill', 'rgba(15,23,42,0.92)');
    tipBg.setAttribute('stroke', '#64748b');
    var tipText = document.createElementNS(NS, 'text');
    tipText.setAttribute('id', 'gray-cloud-hover-tip-text');
    tipText.setAttribute('fill', '#f8fafc');
    tipText.setAttribute('font-size', '42');
    tipText.setAttribute('font-family', 'system-ui,sans-serif');
    tipG.appendChild(tipBg);
    tipG.appendChild(tipText);
    svg.appendChild(tipG);
  }
  var tipBg = document.getElementById('gray-cloud-hover-tip-bg');
  var tipText = document.getElementById('gray-cloud-hover-tip-text');

  layer.querySelectorAll('circle[data-unlabeled="1"]').forEach(function (c) {
    c.setAttribute('fill', '#991b1b');
  });

  var lastHl = null;
  function hideTip() {
    tipG.setAttribute('visibility', 'hidden');
    if (lastHl) {
      lastHl.removeAttribute('class');
      lastHl.setAttribute('fill', lastHl.getAttribute('data-unlabeled') === '1' ? '#991b1b' : '#c8ccd4');
      lastHl = null;
    }
  }
  function showTip(circle) {
    var sector = circle.getAttribute('data-sector') || circle.getAttribute('place-name') || '';
    var row = circle.getAttribute('data-row') || circle.getAttribute('row') || '';
    var seat = circle.getAttribute('data-seat') || circle.getAttribute('place') || '';
    var src = circle.getAttribute('data-source') || '';
    var cx = Number(circle.getAttribute('cx'));
    var cy = Number(circle.getAttribute('cy'));
    var label;
    if (circle.getAttribute('data-unlabeled') === '1' || !sector) {
      label = 'без разметки  cx=' + cx + ' cy=' + cy;
    } else {
      label = sector + '  ·  ряд ' + row + '  ·  место ' + seat + (src ? '  (' + src + ')' : '');
    }
    tipText.textContent = label;
    var pad = 16;
    var estW = label.length * 22 + pad * 2;
    var estH = 56;
    tipBg.setAttribute('x', String(cx + 12));
    tipBg.setAttribute('y', String(cy - estH - 12));
    tipBg.setAttribute('width', String(estW));
    tipBg.setAttribute('height', String(estH));
    tipText.setAttribute('x', String(cx + 12 + pad));
    tipText.setAttribute('y', String(cy - 12 - pad));
    tipG.setAttribute('visibility', 'visible');
  }

  layer.addEventListener(
    'mousemove',
    function (e) {
      var t = e.target;
      if (!t || t.localName !== 'circle') {
        hideTip();
        return;
      }
      if (lastHl && lastHl !== t) {
        lastHl.removeAttribute('class');
        lastHl.setAttribute('fill', lastHl.getAttribute('data-unlabeled') === '1' ? '#991b1b' : '#c8ccd4');
      }
      t.setAttribute('class', 'hl');
      t.setAttribute('fill', '#f59e0b');
      lastHl = t;
      showTip(t);
    },
    false,
  );
  svg.addEventListener('mouseleave', hideTip, false);
})();
]]>`;

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

  const canonicalSeats = [];
  if (opts.useCanonicalCloudLabels !== false) {
    for (const s of buildCanonicalLabeledSeatsForLookup()) {
      canonicalSeats.push({
        sector: s.sector,
        row: s.row,
        seat: s.seat,
        x: (s.xPct / 100) * w,
        y: (s.yPct / 100) * h,
        source: s.geodesySource ?? 'canonicalCloud',
      });
    }
  }
  const canonicalBuckets = buildCoordinateSeatBuckets(canonicalSeats);

  return {
    ticketBuckets,
    fullBuckets: canonicalBuckets,
    labeledBuckets: canonicalBuckets,
    w,
    h,
  };
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
    else if (hit) matchedFull += 1;
    else unmatched += 1;

    const attrs = hit
      ? seatCircleDataAttrs(hit)
      : 'data-unlabeled="1" data-source="cloud"';
    lines.push(`<circle cx="${cx.toFixed(3)}" cy="${cy.toFixed(3)}" r="${rDot.toFixed(3)}" fill="#c8ccd4" stroke="none" ${attrs}/>`);
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">
  <style><![CDATA[
    circle { pointer-events: all; cursor: crosshair; }
    circle.hl { stroke: #fff; stroke-width: 2px; }
  ]]></style>
  <g id="${LUZHNIKI_GRAY_CLOUD_LAYER_ID}" data-dot-count="${lines.length}">
${lines.join('\n')}
  </g>
  <script xmlns="http://www.w3.org/1999/xhtml">${GRAY_CLOUD_SVG_HOVER_SCRIPT}</script>
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
