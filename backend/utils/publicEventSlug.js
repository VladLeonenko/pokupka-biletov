/**
 * Публичный ЧПУ события: название + короткая площадка, без даты.
 * Дата сеанса в URL не живёт — сеансы меняются, карточка одна.
 */
import { slugify } from './eventSlug.js';
import { TICKET_SLUG_TO_REPERTOIRE } from './fanIdRequiredEvents.js';

/** Репертуар, у которого ЧПУ не выводится из названия (название ≠ поисковый запрос). */
const EXPLICIT_PUBLIC_SLUG = Object.freeze({
  'novogodniy-balet-chaykovskogo-2026-12': 'schelkunchik-bolshoy',
});

const MONTH =
  '(?:январ[а-яё]*|феврал[а-яё]*|март[а-яё]*|апрел[а-яё]*|ма[йя][а-яё]*|июн[а-яё]*|июл[а-яё]*|август[а-яё]*|сентябр[а-яё]*|октябр[а-яё]*|ноябр[а-яё]*|декабр[а-яё]*)';

const VENUE_RULES = [
  [/больш/i, 'bolshoy'],
  [/мхт|им\.?\s*чехова/i, 'mht'],
  [/вахтангов/i, 'vahtangova'],
  [/наций/i, 'teatr-natsiy'],
  [/лужники/i, 'luzhniki'],
  [/лукойл/i, 'lukoil-arena'],
  [/совкомбанк/i, 'sovkombank-arena'],
  [/втб/i, 'vtb-arena'],
  [/ленком/i, 'lenkom'],
  [/сатирикон/i, 'satirikon'],
  [/мхат/i, 'mhat'],
];

const VENUE_STOP = new Set([
  'teatr',
  'teatra',
  'im',
  'imeni',
  'na',
  'scena',
  'stsena',
  'istoricheskaya',
  'novaya',
  'osnovnaya',
  'malaya',
  'zal',
  'moskva',
  'moskve',
  'g',
]);

/** @param {string | null | undefined} slug */
export function slugContainsDate(slug) {
  const s = String(slug || '').toLowerCase();
  return /(?:^|-)(?:19|20)\d{2}(?:-|$)/.test(s);
}

/** @param {string | null | undefined} title */
export function stripDatesFromTitle(title) {
  return String(title || '')
    .replace(new RegExp(`\\d{1,2}\\s*[—–-]\\s*\\d{1,2}\\s+${MONTH}`, 'gi'), ' ')
    .replace(new RegExp(`\\d{1,2}\\s+${MONTH}`, 'gi'), ' ')
    .replace(/\b(?:19|20)\d{2}\b/g, ' ')
    .replace(/\b\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** @param {string | null | undefined} venue */
export function venueToken(venue) {
  const raw = String(venue || '').trim();
  if (!raw) return '';
  for (const [re, token] of VENUE_RULES) {
    if (re.test(raw)) return token;
  }
  const parts = slugify(raw).split('-').filter((p) => p && !VENUE_STOP.has(p));
  return parts.slice(0, 2).join('-');
}

/** @param {string | null | undefined} repertoireId */
export function explicitPublicSlug(repertoireId) {
  const id = String(repertoireId || '').trim().toLowerCase();
  return EXPLICIT_PUBLIC_SLUG[id] || '';
}

/**
 * Самый короткий рекламный ЧПУ без года, который уже смотрит на этот repertoire id.
 * @param {string} repertoireId
 */
export function preferredAliasSlug(repertoireId) {
  const id = String(repertoireId || '').trim().toLowerCase();
  if (!id) return '';
  const explicit = explicitPublicSlug(id);
  if (explicit) return explicit;
  const candidates = Object.entries(TICKET_SLUG_TO_REPERTOIRE)
    .filter(([, rep]) => String(rep).toLowerCase() === id)
    .map(([slug]) => slug)
    .filter((slug) => !slugContainsDate(slug));
  candidates.sort((a, b) => a.length - b.length || a.localeCompare(b));
  return candidates[0] || '';
}

/**
 * @param {{ repertoireId?: string; title?: string; venue?: string }} input
 * @returns {string} пустая строка, если из данных нельзя собрать ЧПУ
 */
export function buildPublicSlug(input) {
  const repertoireId = String(input?.repertoireId || '').trim();
  const preferred = preferredAliasSlug(repertoireId);
  if (preferred) return preferred;

  const fromTitle = slugify(stripDatesFromTitle(input?.title));
  let slug = fromTitle;
  if (!slug && repertoireId && !/^[a-f0-9]{24}$/i.test(repertoireId)) {
    slug = repertoireId
      .toLowerCase()
      .replace(/-(?:19|20)\d{2}(?:-\d{1,2}){0,3}$/, '')
      .replace(/-+$/g, '');
  }
  if (!slug || /^[a-f0-9]{24}$/i.test(slug)) return '';

  const token = venueToken(input?.venue);
  if (token && !slug.split('-').includes(token) && !slug.includes(token)) {
    const next = `${slug}-${token}`;
    if (next.length <= 80) slug = next;
  }
  return slug.slice(0, 80).replace(/-+$/g, '');
}
