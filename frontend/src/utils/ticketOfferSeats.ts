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

/** GetBilet отдаёт ряд/сектор без номеров мест (иногда с пометкой «именной билет» в Extra). */
export function isSeatlessOfferRow(row: {
  SeatList?: string[] | string;
  seatList?: string[] | string;
}): boolean {
  return getOfferSeatList(row).length === 0;
}

export function offerExtraLabels(row: { Extra?: string[] }): string[] {
  return Array.isArray(row.Extra) ? row.Extra.map(String) : [];
}

export function isNamedTicketOfferRow(row: { Extra?: string[] }): boolean {
  return offerExtraLabels(row).some((e) => /именной/i.test(e));
}

/**
 * Оффер без SeatList нельзя положить в корзину (GetBilet MakeOrder требует SeatList).
 * Раньше «именные» строки без номеров показывали в списке с подсказкой «выберите на схеме» —
 * это выглядело как билеты в продаже, но купить из строки нельзя. Не листим seatless никогда.
 * `namedTicketUxEnabled` оставлен в сигнатуре для совместимости вызовов.
 */
export function isOfferListedOnCheckout(
  row: {
    SeatList?: string[] | string;
    seatList?: string[] | string;
    Extra?: string[];
  },
  _namedTicketUxEnabled?: boolean,
): boolean {
  return !isSeatlessOfferRow(row);
}
