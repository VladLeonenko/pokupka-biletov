/**
 * Концерт Лужники: только сектора продажи + танцпол/фан-зона. Ложи/мусор режем.
 */

import {
  luzhnikiSectorLookupNorms,
  normalizeSectorLabel,
} from './ticketHallSectorNormalize.js';
import { isLuzhnikiConcertFreeZoneSector } from './luzhnikiConcertFreeZoneSeats.js';

/** Трибуны A/C/D (+ VIP) и полевые зоны. */
export function isLuzhnikiConcertKeepSectorLabel(label) {
  if (isLuzhnikiConcertFreeZoneSector(label)) return true;
  const n = normalizeSectorLabel(label);
  if (/^(vip)?[acd]\d{2,4}$/i.test(n)) return true;
  return false;
}

/**
 * @param {{ id?: string, label?: string, path?: string }[]} sectors
 * @param {{ Sector?: string }[]} [offers]
 */
export function filterLuzhnikiConcertSectors(sectors, offers = []) {
  const list = Array.isArray(sectors) ? sectors : [];
  const offerNorms = new Set();
  for (const o of offers) {
    for (const n of luzhnikiSectorLookupNorms(o?.Sector)) offerNorms.add(n);
  }
  // полевые зоны всегда
  for (const n of luzhnikiSectorLookupNorms('танцпол')) offerNorms.add(n);
  for (const n of luzhnikiSectorLookupNorms('фан-зона')) offerNorms.add(n);
  for (const n of luzhnikiSectorLookupNorms('fan-zone')) offerNorms.add(n);

  const hasOffers = offerNorms.size > 3; // кроме трёх free-zone norms

  return list.filter((s) => {
    const label = String(s?.label ?? '');
    if (!isLuzhnikiConcertKeepSectorLabel(label)) return false;
    if (!hasOffers) return true;
    if (isLuzhnikiConcertFreeZoneSector(label)) return true;
    return luzhnikiSectorLookupNorms(label).some((n) => offerNorms.has(n));
  });
}
