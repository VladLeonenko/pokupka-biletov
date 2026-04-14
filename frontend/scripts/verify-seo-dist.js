#!/usr/bin/env node
/**
 * После vite build: убеждаемся, что SEO-статика из public/ попала в dist/.
 * sitemap.xml в dist не ожидается — он генерируется backend (GET /sitemap.xml).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, '../dist');

const required = ['robots.txt', 'manifest.json'];
let ok = true;

for (const name of required) {
  const p = path.join(dist, name);
  if (!fs.existsSync(p)) {
    console.error(`[verify-seo-dist] ❌ отсутствует dist/${name} (проверьте public/${name})`);
    ok = false;
  } else {
    console.log(`[verify-seo-dist] ✅ dist/${name}`);
  }
}

if (fs.existsSync(path.join(dist, 'robots.txt'))) {
  const txt = fs.readFileSync(path.join(dist, 'robots.txt'), 'utf8');
  if (!txt.includes('Sitemap:') || !txt.includes('prime-coder.ru')) {
    console.error('[verify-seo-dist] ❌ robots.txt: ожидаются Sitemap и домен prime-coder.ru');
    ok = false;
  }
}

if (fs.existsSync(path.join(dist, 'sitemap.xml'))) {
  console.warn('[verify-seo-dist] ⚠️ в dist есть sitemap.xml — обычно карта задаётся только backend; проверьте, не дублирует ли nginx/статика динамический /sitemap.xml');
}

if (!ok) process.exit(1);
console.log('[verify-seo-dist] sitemap.xml в dist не требуется (динамический URL на backend).');
