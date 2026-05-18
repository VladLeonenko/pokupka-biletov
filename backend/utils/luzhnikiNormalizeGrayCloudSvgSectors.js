/**
 * place-name / data-sector → канон из tickets.json (регистр и «сектор» не важны).
 */

import * as cheerio from 'cheerio';

import {
  getCachedTicketsSectorLabelByNorm,
  resolveCanonicalSectorLabel,
} from './luzhnikiSectorDisplayLabel.js';
import { sectorNormsMatch } from './ticketHallSectorNormalize.js';

/**
 * @param {string} svgMarkup
 * @returns {{ xml: string, changed: number }}
 */
export function normalizeLuzhnikiGrayCloudSvgSectorAttrs(svgMarkup) {
  const byNorm = getCachedTicketsSectorLabelByNorm();
  const $ = cheerio.load(svgMarkup, { xml: true });
  let changed = 0;

  $('circle').each((_, el) => {
    const c = $(el);
    const cur = c.attr('data-sector') || c.attr('place-name') || '';
    if (!cur.trim()) return;
    const next = resolveCanonicalSectorLabel(cur, byNorm);
    if (!next || sectorNormsMatch(cur, next)) return;
    changed += 1;
    c.attr('place-name', next);
    c.attr('data-sector', next);
  });

  return { xml: $.xml(), changed };
}
