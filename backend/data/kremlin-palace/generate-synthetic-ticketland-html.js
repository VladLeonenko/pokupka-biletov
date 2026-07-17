/**
 * Генерация bootstrap HTML Ticketland для Кремлёвского дворца.
 * Замените ticketland-source.html полным дампом из Network (rect.place) когда будет доступен.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, 'ticketland-source.html');

const HALL_W = 3581;
const HALL_H = 3052;

/** @type {{ sectionId: string; section: string; x0: number; y0: number; x1: number; y1: number; rows: number; cols: number }[]} */
const SECTIONS = [
  { sectionId: '759188', section: 'Партер середина', x0: 1200, y0: 520, x1: 2580, y1: 1400, rows: 28, cols: 48 },
  { sectionId: '759191', section: 'Партер левая сторона', x0: 680, y0: 520, x1: 1180, y1: 1400, rows: 28, cols: 18 },
  { sectionId: '759187', section: 'Партер правая сторона', x0: 2600, y0: 520, x1: 3060, y1: 1400, rows: 28, cols: 16 },
  { sectionId: '759192', section: 'Амфитеатр левая сторона', x0: 80, y0: 1080, x1: 520, y1: 2100, rows: 32, cols: 22 },
  { sectionId: '759189', section: 'Амфитеатр правая сторона', x0: 3360, y0: 960, x1: 3660, y1: 2100, rows: 32, cols: 18 },
  { sectionId: '759190', section: 'Амфитеатр — середина', x0: 960, y0: 1880, x1: 2620, y1: 2280, rows: 12, cols: 52 },
  { sectionId: '759197', section: 'Ложа балкона левая', x0: 480, y0: 2180, x1: 720, y1: 2380, rows: 4, cols: 12 },
  { sectionId: '759196', section: 'Ложа балкона правая', x0: 3000, y0: 2280, x1: 3660, y1: 2480, rows: 4, cols: 18 },
  { sectionId: '759194', section: 'Балкон — середина', x0: 760, y0: 2520, x1: 2620, y1: 3020, rows: 16, cols: 52 },
  { sectionId: '759195', section: 'Балкон левая сторона', x0: 300, y0: 2520, x1: 740, y1: 3020, rows: 16, cols: 14 },
  { sectionId: '759193', section: 'Балкон правая сторона', x0: 2680, y0: 2520, x1: 3420, y1: 3020, rows: 16, cols: 14 },
  { sectionId: '759199', section: 'Балкон лев.ст. откидное', x0: 180, y0: 2680, x1: 320, y1: 3020, rows: 14, cols: 3 },
  { sectionId: '759198', section: 'Балкон прав.ст. откидное', x0: 3600, y0: 2680, x1: 3660, y1: 3020, rows: 14, cols: 3 },
];

function rectsForSection(sec) {
  const dx = (sec.x1 - sec.x0) / Math.max(sec.cols - 1, 1);
  const dy = (sec.y1 - sec.y0) / Math.max(sec.rows - 1, 1);
  const lines = [];
  for (let r = 1; r <= sec.rows; r += 1) {
    for (let c = 1; c <= sec.cols; c += 1) {
      const x = Math.round(sec.x0 + (c - 1) * dx);
      const y = Math.round(sec.y0 + (r - 1) * dy);
      lines.push(
        `<rect class="place place--free" x="${x}" y="${y}" width="16" height="16" rx="6" sectionId="${sec.sectionId}" section="${sec.section}" row="${r}" seat="${c}"></rect>`,
      );
    }
  }
  return lines;
}

const labels = SECTIONS.map(
  (s) =>
    `<g transform="translate(${Math.round((s.x0 + s.x1) / 2)}, ${Math.round(s.y0 - 80)})"><text text-anchor="middle" font-size="40">${s.section}</text></g>`,
).join('\n');

const rects = SECTIONS.flatMap(rectsForSection).join('\n');

const html = `<svg xmlns="http://www.w3.org/2000/svg" id="hall-scheme-svg" width="${HALL_W}px" height="${HALL_H}px" viewBox="0 0 ${HALL_W} ${HALL_H}">
<g class="objects">
<g transform="translate(1820, 96)"><text text-anchor="middle" font-size="80">СЦЕНА</text></g>
${labels}
</g>
<g class="places" transform="translate(-8, -8)" fill="#CACED2">
${rects}
</g>
</svg>
`;

fs.writeFileSync(outPath, html, 'utf8');
console.log('wrote', outPath, 'rects', (html.match(/<rect/g) || []).length);
