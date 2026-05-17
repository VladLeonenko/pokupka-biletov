/** Палитра ценовых групп (как на portalbilet.ru — схема стадиона). */
export const TICKET_PRICE_COLORS = [
  '#FF6B00',
  '#2D5BFF',
  '#42D483',
  '#FF3B30',
  '#FDD02F',
  '#8C3BFF',
  '#00E5D1',
  '#84A900',
  '#FF3399',
  '#00B0FF',
  '#CD7F32',
  '#5856D6',
  '#009B9E',
  '#E645B0',
  '#BEED00',
  '#B34700',
  '#0E35B3',
  '#1F8A52',
  '#A6241D',
  '#A17F1A',
  '#542199',
  '#008F82',
  '#597300',
  '#B31B65',
  '#006391',
  '#8B572A',
  '#3A3891',
  '#006B6E',
  '#A32677',
  '#89AB00',
] as const;

export function colorForPriceIndex(index: number): string {
  return TICKET_PRICE_COLORS[((index % TICKET_PRICE_COLORS.length) + TICKET_PRICE_COLORS.length) % TICKET_PRICE_COLORS.length];
}

export function buildPriceColorMap(sortedPriceKeys: string[]): Map<string, string> {
  const m = new Map<string, string>();
  sortedPriceKeys.forEach((pk, i) => m.set(pk, colorForPriceIndex(i)));
  return m;
}
