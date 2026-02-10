#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const indexPath = path.join(__dirname, '../dist/index.html');

console.log('[fix-index-html] Looking for file:', indexPath);
console.log('[fix-index-html] File exists:', fs.existsSync(indexPath));

try {
  let html = fs.readFileSync(indexPath, 'utf-8');
  console.log('[fix-index-html] File read, length:', html.length);
  
  // Находим все modulepreload ссылки
  const modulepreloadRegex = /<link rel="modulepreload"[^>]*>/g;
  const modulepreloads = html.match(modulepreloadRegex) || [];
  console.log('[fix-index-html] Found modulepreloads:', modulepreloads.length);
  
  // Находим основной script (ИСПРАВЛЕНО: захватываем src)
  const scriptRegex = /<script type="module"[^>]*src="([^"]*)"[^>]*><\/script>/g;
  let scripts = [];
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    scripts.push(match[0]);
  }
  console.log('[fix-index-html] Found scripts:', scripts.length);
  
  if (modulepreloads.length === 0 || scripts.length === 0) {
    console.log('[fix-index-html] No modulepreload or scripts found');
    process.exit(0);
  }
  
  // Находим react-vendor preload
  const reactVendorPreloads = modulepreloads.filter(m => m.includes('react-vendor'));
  const otherPreloads = modulepreloads.filter(m => !m.includes('react-vendor'));
  console.log('[fix-index-html] react-vendor preloads:', reactVendorPreloads.length);
  console.log('[fix-index-html] other preloads:', otherPreloads.length);
  
  if (reactVendorPreloads.length === 0) {
    console.log('[fix-index-html] react-vendor not found in modulepreload');
    console.log('[fix-index-html] No fix needed - React is in main bundle');
    process.exit(0);
  }
  
  // Извлекаем href из react-vendor preload
  const reactVendorHref = reactVendorPreloads[0].match(/href="([^"]+)"/)?.[1];
  if (!reactVendorHref) {
    console.log('[fix-index-html] Could not extract href from react-vendor preload');
    process.exit(0);
  }
  
  // 🔥 SAFARI ДИНАМИЧЕСКИЙ BOOTSTRAP (БЕЗ SyntaxError)
  const mainScriptHref = scripts[0]?.match(/src="([^"]+)"/)?.[1] || '';
  // 🔥 ТОЧНОЕ имя main bundle из твоего build!
const MAIN_BUNDLE = 'index-CsnplM-C.js'; // Твой самый большой!

const bootstrapScript = `(function() {
  console.log('🔥 Admin bootstrap START');
  
  const script = document.createElement('script');
  script.src = '/assets/js/${MAIN_BUNDLE}';  // ✅ ТОЧНОЕ имя!
  script.async = true;
  script.crossOrigin = 'anonymous';
  
  script.onload = () => {
    console.log('✅ MAIN EXECUTED! 899KB loaded');
  };
  
  script.onerror = (e) => {
    console.error('❌ 404 ERROR:', e);
    document.body.innerHTML += '<div style="padding:40px;color:red;background:rgba(255,0,0,0.1);">❌ JS 404 - check Network tab</div>';
  };
  
  document.head.appendChild(script);
  console.log('🚀 Script added:', script.src);
})();

  `;
  
  // Удаляем все modulepreload и script теги
  let newHtml = html
    .replace(modulepreloadRegex, '')
    .replace(/<script type="module"[^>]*><\/script>/g, '');

  // Вставляем Safari bootstrap ПЕРЕД </head>
  newHtml = newHtml.replace('</head>', `    ${bootstrapScript}\n  </head>`);

  // Сохраняем измененный HTML
  fs.writeFileSync(indexPath, newHtml, 'utf-8');
  console.log('[fix-index-html] ✅ Safari dynamic bootstrap created');
  console.log('[fix-index-html] React vendor:', reactVendorHref);
  console.log('[fix-index-html] Main script:', mainScriptHref);
  console.log('[fix-index-html] File saved, new length:', newHtml.length);
  
} catch (error) {
  console.error('[fix-index-html] ❌ Error:', error.message);
  console.error('[fix-index-html] Stack:', error.stack);
  process.exit(1);
}
