#!/usr/bin/env node
/**
 * Шаблон якорей сектора из tickets.json (4 угла row/seat) для sector-row-anchors.json.
 *
 *   node scripts/print-luzhniki-sector-anchors.js --sector "Сектор D 230"
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

import { extractPbiletTicketsSeatGeodesy } from '../utils/luzhnikiPbiletGeodesyExtract.js';
import { inferCornerAnchors } from '../utils/luzhnikiSeatWarp.js';
import { normalizeSectorLabel } from '../utils/ticketHallSectorNormalize.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

function main() {
  const idx = process.argv.indexOf('--sector');
  const query = idx >= 0 ? process.argv[idx + 1] : '';
  if (!query) throw new Error('--sector "Сектор D 230"');

  const tickets = JSON.parse(fs.readFileSync(path.join(repoRoot, 'tickets.json'), 'utf8'));
  const seats = extractPbiletTicketsSeatGeodesy(tickets, 11413, 9676);
  const norm = normalizeSectorLabel(query);
  const sectorSeats = seats.filter((s) => normalizeSectorLabel(s.sector) === norm);
  const corners = inferCornerAnchors(sectorSeats);

  const template = {
    [norm]: corners
      ? {
          rowCurve: 0.3,
          anchors: [
            { row: String(corners.p00.row), seat: String(corners.p00.seat), xPct: corners.p00.xPct, yPct: corners.p00.yPct, role: 'nearLeft' },
            { row: String(corners.p10.row), seat: String(corners.p10.seat), xPct: corners.p10.xPct, yPct: corners.p10.yPct, role: 'farLeft' },
            { row: String(corners.p01.row), seat: String(corners.p01.seat), xPct: corners.p01.xPct, yPct: corners.p01.yPct, role: 'nearRight' },
            { row: String(corners.p11.row), seat: String(corners.p11.seat), xPct: corners.p11.xPct, yPct: corners.p11.yPct, role: 'farRight' },
          ],
        }
      : { _error: `Мало подписанных мест (${sectorSeats.length}), нужен polarGrid или ручные anchors` },
  };

  console.log(JSON.stringify(template, null, 2));
}

main();
