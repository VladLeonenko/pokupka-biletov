import type { OrderTicketSeat } from '@/types/cms';

export function formatOrderSeatLine(seat: OrderTicketSeat): string {
  const parts = [
    seat.sector ? `сектор ${seat.sector}` : null,
    seat.row ? `ряд ${seat.row}` : null,
    seat.seat ? `место ${seat.seat}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : seat.label;
}
