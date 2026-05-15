/** Нормализация SeatList из оффера GetBilet (как на странице checkout). */
export function getOfferSeatList(row: {
  SeatList?: string[] | string;
  seatList?: string[] | string;
}): string[] {
  const sl = row.SeatList ?? row.seatList;
  if (Array.isArray(sl)) return sl.map(String).filter(Boolean);
  if (typeof sl === 'string' && sl.trim()) {
    return sl
      .split(/[,\s;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

/** GetBilet отдаёт ряд/сектор без номеров мест (часто «именной билет»). */
export function isSeatlessOfferRow(row: {
  SeatList?: string[] | string;
  seatList?: string[] | string;
  Extra?: string[];
}): boolean {
  return getOfferSeatList(row).length === 0;
}

export function offerExtraLabels(row: { Extra?: string[] }): string[] {
  return Array.isArray(row.Extra) ? row.Extra.map(String) : [];
}
