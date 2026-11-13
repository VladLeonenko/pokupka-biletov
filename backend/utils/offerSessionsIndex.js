/**
 * Индекс сеансов по ResultData GetBilet — для календаря без полных SeatList.
 * @param {unknown} payload
 * @returns {{ eventDateTime: string, minPrice: number | null, offerCount: number, seatCount: number }[]}
 */
export function buildOfferSessionsIndex(payload) {
  const rows = Array.isArray(payload?.ResultData) ? payload.ResultData : [];
  /** @type {Map<string, { eventDateTime: string, minPrice: number | null, offerCount: number, seatCount: number }>} */
  const map = new Map();

  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const o = /** @type {Record<string, unknown>} */ (row);
    const dtRaw = o.EventDateTime ?? o.eventDateTime ?? o.BeginDateTime ?? o.beginDateTime;
    const eventDateTime = String(dtRaw ?? '').trim() || '_';
    const price = unitPrice(o);
    const seats = seatCount(o);
    const cur = map.get(eventDateTime);
    if (!cur) {
      map.set(eventDateTime, {
        eventDateTime,
        minPrice: price,
        offerCount: 1,
        seatCount: seats,
      });
      continue;
    }
    cur.offerCount += 1;
    cur.seatCount += seats;
    if (price != null && (cur.minPrice == null || price < cur.minPrice)) cur.minPrice = price;
  }

  const list = Array.from(map.values());
  list.sort((a, b) => {
    if (a.eventDateTime === '_') return 1;
    if (b.eventDateTime === '_') return -1;
    const ta = Date.parse(a.eventDateTime);
    const tb = Date.parse(b.eventDateTime);
    if (Number.isFinite(ta) && Number.isFinite(tb) && ta !== tb) return ta - tb;
    return a.eventDateTime.localeCompare(b.eventDateTime);
  });
  return list;
}

/**
 * @param {unknown} payload
 * @param {string | null | undefined} eventDateTime
 */
export function filterOffersPayloadBySession(payload, eventDateTime) {
  if (!payload || typeof payload !== 'object') return payload;
  const want = String(eventDateTime ?? '').trim();
  if (!want) return payload;
  const rows = Array.isArray(payload.ResultData) ? payload.ResultData : [];
  const filtered = rows.filter((row) => {
    if (!row || typeof row !== 'object') return false;
    const o = /** @type {Record<string, unknown>} */ (row);
    const dt = String(o.EventDateTime ?? o.eventDateTime ?? '').trim() || '_';
    return dt === want;
  });
  return { ...payload, ResultData: filtered };
}

/**
 * @param {{ eventDateTime: string }[]} sessions
 * @param {string | null | undefined} hint
 */
export function pickDefaultOfferSession(sessions, hint) {
  if (!Array.isArray(sessions) || sessions.length === 0) return null;
  const h = String(hint ?? '').trim();
  if (h) {
    const exact = sessions.find((s) => s.eventDateTime === h);
    if (exact) return exact.eventDateTime;
    const hMs = Date.parse(h);
    if (Number.isFinite(hMs)) {
      const near = sessions.find((s) => {
        const t = Date.parse(s.eventDateTime);
        return Number.isFinite(t) && Math.abs(t - hMs) < 120_000;
      });
      if (near) return near.eventDateTime;
    }
  }
  const now = Date.now();
  const upcoming = sessions.find((s) => {
    if (s.eventDateTime === '_') return false;
    const t = Date.parse(s.eventDateTime);
    return Number.isFinite(t) && t >= now - 3 * 3600_000;
  });
  return (upcoming || sessions[0]).eventDateTime;
}

/** @param {Record<string, unknown>} o */
function unitPrice(o) {
  for (const k of ['AgentPrice', 'agentPrice', 'NominalPrice', 'nominalPrice', 'Price', 'price']) {
    const n = Number(o[k]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

/** @param {Record<string, unknown>} o */
function seatCount(o) {
  const sl = o.SeatList ?? o.seatList;
  if (Array.isArray(sl)) return sl.length;
  const mq = Number(o.MaxQuantity ?? o.maxQuantity);
  if (Number.isFinite(mq) && mq > 0) return mq;
  return 1;
}
