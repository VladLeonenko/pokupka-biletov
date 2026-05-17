/**
 * Сопоставление секторов GetBilet («сектор d227», «vip c138») с подписями на схеме («Сектор D 227»).
 */
export function normalizeSectorLabel(value: unknown): string {
  const raw = String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/ё/g, 'е')
    .replace(/Ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  const hasVip = /\bvip\b/i.test(raw);
  const stripped = raw
    .replace(/^сектор\s+/i, '')
    .replace(/\bvip\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const m = stripped.match(/^([a-z])\s*(\d{2,4})\b/);
  if (m) {
    const code = `${m[1]}${m[2]}`;
    return hasVip ? `vip${code}` : code;
  }

  return stripped.replace(/\s+/g, '');
}

export function normalizeRowLabel(value: unknown): string {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/ё/g, 'е')
    .replace(/Ё/g, 'е')
    .replace(/ряд/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function normalizeSeatToken(value: unknown): string {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/ё/g, 'е')
    .replace(/Ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function strictSeatKey(sector: unknown, row: unknown, seat: unknown): string {
  return `${normalizeSectorLabel(sector)}|${normalizeRowLabel(row)}|${normalizeSeatToken(seat)}`;
}
