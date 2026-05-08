/**
 * Каноническая схема стадиона «Лужники» для футбольных событий GetBilet:
 * одна строка в getbilet_stage_maps (паттерн как у лукойл/МХТ-сидов), без pbilet API.
 */

import ticketPool from '../ticketDb.js';
import { classifyEventTitle } from './eventTitleHeuristics.js';

export const LUZHNIKI_FOOTBALL_STAGE_MAP_KEY =
  process.env.GETBILET_LUZHNIKI_FOOTBALL_STAGE_MAP_KEY?.trim() || 'luzhniki-football';

function normVenueText(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/ё/g, 'е')
    .replace(/Ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function looksLikeLuzhnikiVenue(...values) {
  const text = normVenueText(values.filter(Boolean).join(' '));
  if (!text) return false;
  return (
    /\bluzhniki\b/.test(text) ||
    /лужник/.test(text) ||
    /лу\s*ж\s*ник/i.test(text) ||
    /стадион\s*[«"]?\s*лужники/i.test(text) ||
    /большая\s+спортивная\s+арена/i.test(text)
  );
}

/**
 * @param {{
 *   title: string;
 *   descriptionFromPayload: string | null;
 *   genreFromPayload: string | null;
 *   venueManual: string | null;
 *   venueFromPayload: string | null;
 * }} base
 * @param {string | null} placeMapsVenue
 * @param {string | null} [stageHallLabel]
 */
export function shouldUseLuzhnikiFootballCanonicalMap(base, placeMapsVenue, stageHallLabel = null) {
  const venueHit = looksLikeLuzhnikiVenue(
    base.venueManual,
    base.venueFromPayload,
    placeMapsVenue,
    stageHallLabel,
  );
  if (!venueHit) return false;
  const { kind } = classifyEventTitle(base.title || '', {
    subtitle: base.descriptionFromPayload || '',
    genre: base.genreFromPayload || '',
  });
  return kind === 'football';
}

export async function loadLuzhnikiFootballStageMapRow() {
  const key = LUZHNIKI_FOOTBALL_STAGE_MAP_KEY;
  const r = await ticketPool.query(
    `SELECT stage_external_id, place_external_id, title, svg_markup, layout_json, external_plan_url
     FROM getbilet_stage_maps WHERE stage_external_id = $1`,
    [key],
  );
  return r.rows[0] || null;
}
