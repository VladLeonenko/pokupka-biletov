#!/usr/bin/env node
/**
 * Добавить hover-скрипт в уже сгенерированный luzhniki-gray-cloud-enriched.svg
 *
 *   node scripts/inject-gray-cloud-svg-hover.js path/to/luzhniki-gray-cloud-enriched.svg
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { GRAY_CLOUD_SVG_HOVER_SCRIPT } from '../utils/luzhnikiEnrichSvgCirclesFromTickets.js';

const target = process.argv[2];
if (!target) {
  console.error('Usage: node scripts/inject-gray-cloud-svg-hover.js <path.svg>');
  process.exit(1);
}

const abs = path.resolve(target);
let svg = fs.readFileSync(abs, 'utf8');
if (svg.includes('gray-cloud-hover-tip')) {
  console.log('Already has hover script:', abs);
  process.exit(0);
}

svg = svg.replace(/\s*<script[\s\S]*?<\/script>\s*(?=<\/svg>)/i, '\n');
if (!svg.includes('pointer-events: all')) {
  svg = svg.replace(
    /<svg([^>]*)>/i,
    `<svg$1>\n  <style><![CDATA[\n    circle { pointer-events: all; cursor: crosshair; }\n    circle.hl { stroke: #fff; stroke-width: 2px; }\n  ]]></style>`,
  );
}
svg = svg.replace(
  /<\/svg>\s*$/i,
  `  <script xmlns="http://www.w3.org/1999/xhtml">${GRAY_CLOUD_SVG_HOVER_SCRIPT}</script>\n</svg>\n`,
);

fs.writeFileSync(abs, svg, 'utf8');
console.log('OK:', abs);
