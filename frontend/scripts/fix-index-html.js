#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadEnv } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const indexPath = path.join(__dirname, '../dist/index.html');
const projectRoot = path.join(__dirname, '..');

function siteBaseUrl() {
  const env = loadEnv('production', projectRoot, '');
  return (env.VITE_SITE_URL || 'https://biletvsem.com').replace(/\/$/, '');
}

console.log('[fix-index-html] Looking for file:', indexPath);

if (!fs.existsSync(indexPath)) {
  console.log('[fix-index-html] File not found, skipping');
  process.exit(0);
}

try {
  let html = fs.readFileSync(indexPath, 'utf-8');
  const base = siteBaseUrl();
  if (html.includes('__SITE_BASE__')) {
    html = html.split('__SITE_BASE__').join(base);
    console.log('[fix-index-html] __SITE_BASE__ →', base);
  }
  console.log('[fix-index-html] File read, length:', html.length);

  // Находим основной script module src (динамически!)
  const scriptMatch = html.match(/<script type="module"[^>]*src="([^"]*)"[^>]*><\/script>/);
  if (!scriptMatch || !scriptMatch[1]) {
    console.log('[fix-index-html] No module script found, skipping');
    process.exit(0);
  }

  const mainScriptSrc = scriptMatch[1]; // e.g. "/assets/js/index-AbCdEf.js"
  console.log('[fix-index-html] Main script src:', mainScriptSrc);

  // Находим modulepreload ссылки
  const modulepreloadRegex = /<link rel="modulepreload"[^>]*>/g;
  const modulepreloads = html.match(modulepreloadRegex) || [];
  console.log('[fix-index-html] Found modulepreloads:', modulepreloads.length);

  // Собираем href всех preloads для предзагрузки
  const preloadHrefs = modulepreloads
    .map(tag => tag.match(/href="([^"]+)"/)?.[1])
    .filter(Boolean);

  // Safari-совместимый bootstrap: динамическая загрузка скриптов
  const preloadScript = preloadHrefs.length > 0
    ? preloadHrefs.map(href => `    fetch('${href}');`).join('\n')
    : '';

  const bootstrapScript = `<script>
(function() {
  // Предзагружаем чанки
${preloadScript}
  // Загружаем основной бандл
  var s = document.createElement('script');
  s.type = 'module';
  s.src = '${mainScriptSrc}';
  s.onerror = function(e) {
    console.error('Failed to load:', '${mainScriptSrc}', e);
  };
  document.head.appendChild(s);
})();
</script>`;

  // Удаляем оригинальные modulepreload и script module теги
  let newHtml = html
    .replace(modulepreloadRegex, '')
    .replace(/<script type="module"[^>]*src="[^"]*"[^>]*><\/script>/g, '');

  // Вставляем bootstrap перед </head>
  newHtml = newHtml.replace('</head>', `${bootstrapScript}\n</head>`);

  // Убираем пустые строки подряд
  newHtml = newHtml.replace(/\n{3,}/g, '\n\n');

  fs.writeFileSync(indexPath, newHtml, 'utf-8');
  console.log('[fix-index-html] ✅ Dynamic bootstrap created');
  console.log('[fix-index-html] Main bundle:', mainScriptSrc);
  console.log('[fix-index-html] Preloads:', preloadHrefs.length);

} catch (error) {
  console.error('[fix-index-html] ❌ Error:', error.message);
  process.exit(1);
}
