export type TicketOfferSelection = { offerId: string; seats: string[] };

export type TicketSeatHoldState = {
  expiresAt: string;
  holdSeconds: number;
  selectionKey: string;
  repertoireId: string;
  getbiletOrderIds: string[];
  makeData: unknown;
  baseRub?: number;
};

export function buildTicketSelectionKey(input: {
  offerId: string;
  seats: string[];
  offerSelections?: TicketOfferSelection[];
}): string {
  const selections =
    input.offerSelections && input.offerSelections.length > 0
      ? input.offerSelections
      : [{ offerId: input.offerId, seats: input.seats }];
  return selections
    .map(({ offerId, seats }) => `${offerId}:${[...seats].sort().join(',')}`)
    .sort()
    .join('|');
}

export function isTicketHoldActive(hold: TicketSeatHoldState | null | undefined, nowMs = Date.now()): boolean {
  if (!hold?.expiresAt) return false;
  const t = new Date(hold.expiresAt).getTime();
  return Number.isFinite(t) && t > nowMs;
}

export function ticketHoldRemainingMs(hold: TicketSeatHoldState | null | undefined, nowMs = Date.now()): number {
  if (!hold?.expiresAt) return 0;
  const t = new Date(hold.expiresAt).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, t - nowMs);
}

export function formatHoldCountdown(remainingMs: number): string {
  const totalSec = Math.ceil(remainingMs / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
