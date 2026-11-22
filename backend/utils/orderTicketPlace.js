import { parsePaymentMetadata } from './orderFanId.js';

function asText(value, max) {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text) return null;
  return text.slice(0, max);
}

/**
 * «балкон, левая сторона, 5 ряд, место 3» → сектор / ряд / место.
 * Сектор может содержать запятые, поэтому ряд ищется с конца.
 * @param {unknown} label
 */
export function parseSeatLabel(label) {
  const raw = String(label ?? '').trim();
  if (!raw) return null;
  const withRow = raw.match(/^(.*),\s*([^,]+?)\s+ряд,\s*место\s+(.+)$/i);
  if (withRow) {
    return {
      sector: withRow[1].trim() || null,
      row: withRow[2].trim() || null,
      seat: withRow[3].trim() || null,
      label: raw,
    };
  }
  return { sector: null, row: null, seat: null, label: raw };
}

/**
 * Места билетного заказа из payment_metadata. Без цен, промо и id поставщика.
 * @param {Record<string, unknown> | null | undefined} row
 */
export function extractTicketPlaceFromOrder(row) {
  const meta = parsePaymentMetadata(row?.payment_metadata);
  if (!meta) return null;

  const labels = Array.isArray(meta.seatLabels)
    ? meta.seatLabels.map((s) => String(s).trim()).filter(Boolean).slice(0, 20)
    : [];
  const seatNumbers = Array.isArray(meta.seats)
    ? meta.seats.map((s) => String(s).trim()).filter(Boolean).slice(0, 20)
    : [];

  const seats = labels.length
    ? labels.map(parseSeatLabel).filter(Boolean)
    : seatNumbers.map((seat) => ({
        sector: null,
        row: null,
        seat,
        label: `место ${seat}`,
      }));

  const eventTitle = asText(meta.eventTitle, 300);
  const venueLabel = asText(meta.venueLabel, 300);
  const sessionLabel = asText(meta.sessionLabel, 200);
  const repertoireId = asText(meta.repertoireId, 80);
  const isTicket = meta.ticketCheckout === true || eventTitle || seats.length > 0;
  if (!isTicket) return null;
  if (!eventTitle && !venueLabel && !sessionLabel && seats.length === 0) return null;

  return { eventTitle, venueLabel, sessionLabel, repertoireId, seats };
}
