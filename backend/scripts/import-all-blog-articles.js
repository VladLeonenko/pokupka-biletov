#!/usr/bin/env node
/**
 * Импорт всех статей блога из data/*.html
 * Использование: node scripts/import-all-blog-articles.js [--prod]
 * Для прода: передать --prod чтобы использовать .env.prod
 */

import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '../../data');
const SLUG_MAP = {
  'vremya-na-sayte-snizhenie-otkazov.html': 'vremya-na-sayte-snizhenie-otkazov',
  'skolko-stoit-sayt-pod-klyuch-moskva-2026.html': 'skolko-stoit-sayt-pod-klyuch-moskva-2026',
  'trendy-veb-razrabotki-2026-maloy-biznes.html': 'trendy-veb-razrabotki-2026-maloy-biznes',
  'vremya-na-sayte-otkazy-70-30.html': 'vremya-na-sayte-otkazy-70-30',
  'reputaciya-otzyvy-maloy-biznes.html': 'reputaciya-otzyvy-maloy-biznes',
  'salony-krasoty-onlayn-zapis.html': 'salony-krasoty-onlayn-zapis',
  'kafe-restorany-yandex-eda-sklad.html': 'kafe-restorany-yandex-eda-sklad',
  'avtoservisy-lichnyy-kabinet.html': 'avtoservisy-lichnyy-kabinet',
  'ecommerce-sayt-marketplejsy-sklad.html': 'ecommerce-sayt-marketplejsy-sklad',
  'pwa-horeca-bez-app-store.html': 'pwa-horeca-bez-app-store',
};

const files = readdirSync(dataDir).filter((f) => f.endsWith('.html') && SLUG_MAP[f]);
const prod = process.argv.includes('--prod');

console.log(`Импорт ${files.length} статей...${prod ? ' (prod)' : ''}`);

for (const file of files) {
  const slug = SLUG_MAP[file];
  const path = join(dataDir, file);
  const result = spawnSync('node', ['scripts/import-blog-article.js', path, '--slug', slug, ...(prod ? ['--prod'] : [])], {
    cwd: join(__dirname, '..'),
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    console.error(`Ошибка: ${file}`);
    process.exit(1);
  }
}

console.log('\nГотово. Все статьи импортированы.');
