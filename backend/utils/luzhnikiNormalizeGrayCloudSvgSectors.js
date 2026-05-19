/**
 * place-name / data-sector → канон из tickets.json (регистр и «сектор» не важны).
 * Без cheerio $.xml() — он кодирует кириллицу в &#x…; и ломает lookup b147.
 */

import {
  getCachedTicketsSectorLabelByNorm,
  resolveCanonicalSectorLabel,
} from './luzhnikiSectorDisplayLabel.js';
import { decodeHtmlEntities, sectorNormsMatch } from './ticketHallSectorNormalize.js';

function readAttr(tag, name) {
  const re = new RegExp(`${name}=["']([^"']*)["']`, 'i');
  const m = tag.match(re);
  return m ? decodeHtmlEntities(m[1]) : '';
}

function writeAttr(tag, name, value) {
  const escaped = String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;');
  const re = new RegExp(`(${name}=)["'][^"']*["']`, 'i');
  if (re.test(tag)) return tag.replace(re, `$1"${escaped}"`);
  return tag.replace(/\/?>$/, ` ${name}="${escaped}"$&`);
}

/**
 * @param {string} svgMarkup
 * @returns {{ xml: string, changed: number }}
 */
export function normalizeLuzhnikiGrayCloudSvgSectorAttrs(svgMarkup) {
  const byNorm = getCachedTicketsSectorLabelByNorm();
  let changed = 0;

  const xml = svgMarkup.replace(/<circle\b[^>]*\/?>/gi, (tag) => {
    const cur = readAttr(tag, 'data-sector') || readAttr(tag, 'place-name');
    if (!cur.trim()) return tag;
    const next = resolveCanonicalSectorLabel(cur, byNorm);
    if (!next || sectorNormsMatch(cur, next)) return tag;
    changed += 1;
    let out = writeAttr(tag, 'place-name', next);
    out = writeAttr(out, 'data-sector', next);
    return out;
  });

  return { xml, changed };
}
