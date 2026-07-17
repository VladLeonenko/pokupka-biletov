#!/usr/bin/env node
/**
 * Сохранить HTML Ticketland (фрагмент #hall-scheme-svg) в ticketland-source.html
 *
 *   pbpaste | node backend/scripts/save-kremlin-ticketland-html.js
 *   curl ... | node backend/scripts/save-kremlin-ticketland-html.js
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, '../data/kremlin-palace/ticketland-source.html');

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

const raw = await readStdin();
if (!raw.trim()) {
  console.error('Пустой stdin — вставьте HTML со страницы Ticketland');
  process.exit(1);
}

let markup = raw.trim();
if (!/<svg/i.test(markup)) {
  const m = raw.match(/<svg[\s\S]*<\/svg>/i);
  if (m) markup = m[0];
}

if (!/<rect[^>]*class="[^"]*\bplace\b/i.test(markup)) {
  console.warn('warn: не найдено rect.place — проверьте, что скопирован блок places');
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, markup, 'utf8');
const rects = (markup.match(/<rect/gi) || []).length;
console.log('saved', outPath, 'rects', rects);
console.log('next: cd backend && npm run seed:kremlin-palace-map');
