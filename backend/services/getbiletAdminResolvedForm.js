/**
 * Значения для админ-формы: ручные поля или то, что видно на витрине (кэш каталога + пакет описания).
 */

import ticketPool from '../ticketDb.js';
import { descPackFromStoredJson } from './eventDescriptionPackStored.js';

/**
 * @param {Record<string, unknown>} p
 * @param {string[]} keys
 */
function pickPayloadString(p, keys) {
  if (!p || typeof p !== 'object') return '';
  for (const k of keys) {
    const v = p[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return '';
}

/**
 * Весь текст из сохранённого description_pack (для подстановки в «Описание» в админке).
 * @param {ReturnType<typeof descPackFromStoredJson>} pack
 */
function fullTextFromPack(pack) {
  if (!pack?.sections?.length) return '';
  const parts = [];
  for (const s of pack.sections) {
    for (const para of s.paragraphs || []) {
      if (para && String(para).trim()) parts.push(String(para).trim());
    }
  }
  return parts.join('\n\n');
}

/**
 * @param {Record<string, unknown>} row — строка getbilet_events (+ group_id опционально)
 */
export async function buildResolvedForForm(row) {
  const ext = row.getbilet_external_id != null ? String(row.getbilet_external_id).trim() : '';
  /** @type {Record<string, unknown> | null} */
  let payload = null;
  if (ext) {
    try {
      const r = await ticketPool.query(
        `SELECT payload_json FROM getbilet_catalog_cache WHERE repertoire_external_id = $1`,
        [ext],
      );
      const raw = r.rows[0]?.payload_json;
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        payload = /** @type {Record<string, unknown>} */ (raw);
      }
    } catch {
      /* нет кэша */
    }
  }

  const p = payload || {};
  const nameFromCat = pickPayloadString(p, ['Name', 'name']);
  const placeFromCat = pickPayloadString(p, ['PlaceName', 'placeName']);
  const addrFromCat = pickPayloadString(p, ['PlaceAddress', 'placeAddress']);
  const shortFromCat = pickPayloadString(p, [
    'shortDescription',
    'ShortDescription',
    'description',
    'Description',
    'HeroDescription',
    'heroDescription',
  ]);

  const pack = descPackFromStoredJson(row.description_pack_json);
  const fullPack = fullTextFromPack(pack);

  const titleM = row.title_manual != null && String(row.title_manual).trim() ? String(row.title_manual).trim() : '';
  const venueM = row.venue_manual != null && String(row.venue_manual).trim() ? String(row.venue_manual).trim() : '';
  const addrM =
    row.venue_address_manual != null && String(row.venue_address_manual).trim()
      ? String(row.venue_address_manual).trim()
      : '';
  const cardM =
    row.card_subtitle_manual != null && String(row.card_subtitle_manual).trim()
      ? String(row.card_subtitle_manual).trim()
      : '';
  const descM =
    row.description_manual != null && String(row.description_manual).trim() ? String(row.description_manual).trim() : '';

  return {
    title: titleM || nameFromCat || '',
    venue: venueM || placeFromCat || '',
    venue_address: addrM || addrFromCat || '',
    card_subtitle: cardM || shortFromCat || '',
    description: descM || fullPack || shortFromCat || '',
  };
}
