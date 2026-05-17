/** Кириллические «двойники» латиницы в кодах трибун (А101 vs a101). */
const CYRILLIC_SECTOR_HOMOGLYPHS: Record<string, string> = {
  '\u0430': 'a',
  '\u0410': 'a',
  '\u0432': 'b',
  '\u0412': 'b',
  '\u0441': 'c',
  '\u0421': 'c',
  '\u0435': 'e',
  '\u0415': 'e',
  '\u043a': 'k',
  '\u041a': 'k',
  '\u043c': 'm',
  '\u041c': 'm',
  '\u043e': 'o',
  '\u041e': 'o',
  '\u0440': 'p',
  '\u0420': 'p',
  '\u0445': 'x',
  '\u0425': 'x',
  '\u0443': 'y',
  '\u0423': 'y',
  '\u0442': 't',
  '\u0422': 't',
  '\u043d': 'n',
  '\u041d': 'n',
  '\u0434': 'd',
  '\u0414': 'd',
};

export function latinizeSectorHomoglyphs(value: string): string {
  return [...value].map((ch) => CYRILLIC_SECTOR_HOMOGLYPHS[ch] ?? ch).join('');
}

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
  const stripped = latinizeSectorHomoglyphs(
    raw
      .replace(/^сектор\s*/i, '')
      .replace(/\bvip\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );

  /** GetBilet D230 / portalbilet «d 230» / layout «Сектор D 230» → d230 */
  const m = stripped.match(/^([a-z])\s*(\d{2,4})\b/i);
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
