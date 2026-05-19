/**
 * Сопоставление секторов GetBilet («сектор d227», «vip c138») с подписями на схеме («Сектор D 227»).
 * Держать в sync с backend/utils/ticketHallSectorNormalize.js
 */
import { LUZHNIKI_SECTOR_ALIAS_PAIRS, LUZHNIKI_VIP_TRIBUNE_CODES } from './luzhnikiSectorAliases';

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
  '\u0431': 'b',
  '\u0411': 'b',
};

export function latinizeSectorHomoglyphs(value: string): string {
  return [...value].map((ch) => CYRILLIC_SECTOR_HOMOGLYPHS[ch] ?? ch).join('');
}

export function decodeHtmlEntities(value: unknown): string {
  let s = String(value ?? '');
  s = s
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
  s = s.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
  s = s.replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
  return s;
}

export function normalizeSectorLabel(value: unknown): string {
  const raw = decodeHtmlEntities(value)
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
      .replace(/^сектор(?=[a-z])/i, '')
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

export function luzhnikiSectorLookupNorms(norm: unknown): string[] {
  const n = normalizeSectorLabel(norm);
  const out = new Set([n]);

  const vipBase = n.match(/^vip([a-d]\d{2,4})$/i);
  if (vipBase) out.add(vipBase[1]);

  const tribuneBase = n.match(/^([a-d]\d{2,4})$/i);
  if (tribuneBase) {
    const vipCode = `vip${tribuneBase[1]}`;
    if (LUZHNIKI_VIP_TRIBUNE_CODES.has(vipCode)) out.add(vipCode);
  }

  for (const [a, b] of LUZHNIKI_SECTOR_ALIAS_PAIRS) {
    if (n === a) out.add(b);
    if (n === b) out.add(a);
  }

  return [...out];
}

export function normalizeRowLabel(value: unknown): string {
  const raw = String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/ё/g, 'е')
    .replace(/Ё/g, 'е')
    .replace(/ряд/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  const num = Number.parseInt(raw.replace(/\D/g, ''), 10);
  return Number.isFinite(num) ? String(num) : raw;
}

export function normalizeSeatToken(value: unknown): string {
  const raw = String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/ё/g, 'е')
    .replace(/Ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  const num = Number.parseInt(raw.replace(/\D/g, ''), 10);
  return Number.isFinite(num) ? String(num) : raw;
}

export function strictSeatKey(sector: unknown, row: unknown, seat: unknown): string {
  return `${normalizeSectorLabel(sector)}|${normalizeRowLabel(row)}|${normalizeSeatToken(seat)}`;
}

export function sectorNormsMatch(a: unknown, b: unknown): boolean {
  const normsA = new Set(luzhnikiSectorLookupNorms(a));
  return luzhnikiSectorLookupNorms(b).some((x) => normsA.has(x));
}
