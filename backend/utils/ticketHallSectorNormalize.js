/**
 * Сопоставление секторов GetBilet с подписями pbilet / SVG (дублирует frontend/utils/ticketHallSectorNormalize.ts).
 */

const CYRILLIC_SECTOR_HOMOGLYPHS = {
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

export function latinizeSectorHomoglyphs(value) {
  return [...value].map((ch) => CYRILLIC_SECTOR_HOMOGLYPHS[ch] ?? ch).join('');
}

export function normalizeSectorLabel(value) {
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
      .replace(/([a-z])\s*-\s*(\d)/gi, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim(),
  );

  const m = stripped.match(/^([a-z])\s*(\d{2,4})\b/i);
  if (m) {
    const code = `${m[1]}${m[2]}`;
    return hasVip ? `vip${code}` : code;
  }

  return stripped.replace(/\s+/g, '');
}

/** GetBilet «vip c138» → tickets/layout «Сектор C 138» (c138). */
export function luzhnikiSectorLookupNorms(norm) {
  const n = normalizeSectorLabel(norm);
  if (n === 'vipc138') return ['vipc138', 'c138'];
  if (n === 'c138') return ['c138', 'vipc138'];
  return [n];
}

export function normalizeRowLabel(value) {
  const raw = String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/ё/g, 'е')
    .replace(/Ё/g, 'е')
    .replace(/ряд/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  const n = Number.parseInt(raw.replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? String(n) : raw;
}

export function normalizeSeatToken(value) {
  const raw = String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/ё/g, 'е')
    .replace(/Ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  const n = Number.parseInt(raw.replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? String(n) : raw;
}

export function strictSeatKey(sector, row, seat) {
  return `${normalizeSectorLabel(sector)}|${normalizeRowLabel(row)}|${normalizeSeatToken(seat)}`;
}
