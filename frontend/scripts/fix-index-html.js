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
  
  // Находим основной script
  const scriptRegex = /<script type="module"[^>]*><\/script>/g;
  const scripts = html.match(scriptRegex) || [];
  console.log('[fix-index-html] Found scripts:', scripts.length);
  
  if (modulepreloads.length === 0 || scripts.length === 0) {
    console.log('[fix-index-html] No modulepreload or scripts found');
    process.exit(0);
  }
  
  // Находим react-vendor preload и удаляем его
  const reactVendorPreloads = modulepreloads.filter(m => m.includes('react-vendor'));
  const otherPreloads = modulepreloads.filter(m => !m.includes('react-vendor'));
  console.log('[fix-index-html] react-vendor preloads:', reactVendorPreloads.length);
  console.log('[fix-index-html] other preloads:', otherPreloads.length);
  
  // ВАЖНО: В Safari modulepreload НЕ гарантирует синхронную загрузку
  // Нужно преобразовать react-vendor preload в обычный <script type="module">
  // чтобы он загружался СИНХРОННО перед main bundle
  
  if (reactVendorPreloads.length === 0) {
    console.log('[fix-index-html] react-vendor not found in modulepreload');
    console.log('[fix-index-html] This means code splitting is disabled - all in one bundle');
    console.log('[fix-index-html] No fix needed - React is in main bundle');
    process.exit(0);
  }
  
  // Извлекаем href из react-vendor preload
  const reactVendorHref = reactVendorPreloads[0].match(/href="([^"]+)"/)?.[1];
  if (!reactVendorHref) {
    console.log('[fix-index-html] Could not extract href from react-vendor preload');
    process.exit(0);
  }
  
  // Преобразуем react-vendor preload в обычный script (синхронная загрузка)
  const reactVendorScript = `<script type="module" crossorigin src="${reactVendorHref}"></script>`;
  
  // Удаляем все modulepreload и script теги
  let newHtml = html.replace(modulepreloadRegex, '');
  newHtml = newHtml.replace(scriptRegex, '');
  
  // Находим позицию перед закрывающим </head>
  const headEndIndex = newHtml.indexOf('</head>');
  if (headEndIndex !== -1) {
    // Собираем правильный порядок для Safari:
    // 1. react-vendor как ОБЫЧНЫЙ script (синхронная загрузка ПЕРЕД main)
    // 2. Основной script (который использует react-vendor)
    // 3. Остальные preload (не критичны)
    let toInsert = '';
    
    // ВАЖНО: react-vendor должен загружаться СИНХРОННО как обычный script
    toInsert += reactVendorScript + '\n    ';
    
    if (scripts[0]) {
      toInsert += scripts[0] + '\n    ';
    }
    
    // Остальные preload
    if (otherPreloads.length > 0) {
      toInsert += otherPreloads.join('\n    ') + '\n    ';
    }
    
    newHtml = newHtml.replace('</head>', toInsert + '</head>');
  }
  
  // Сохраняем измененный HTML
  fs.writeFileSync(indexPath, newHtml, 'utf-8');
  console.log('[fix-index-html] ✅ Reordered scripts: react-vendor preload FIRST for Safari compatibility');
  console.log('[fix-index-html] File saved, new length:', newHtml.length);
  
  // Проверяем результат
  const checkHtml = fs.readFileSync(indexPath, 'utf-8');
  const checkPreloads = checkHtml.match(modulepreloadRegex) || [];
  const checkReactVendor = checkPreloads.filter(m => m.includes('react-vendor'));
  console.log('[fix-index-html] Verification - react-vendor preloads after fix:', checkReactVendor.length);
  
  // Проверяем порядок - react-vendor должен быть первым
  if (checkReactVendor.length > 0) {
    const firstPreload = checkPreloads[0];
    if (firstPreload && firstPreload.includes('react-vendor')) {
      console.log('[fix-index-html] ✅ react-vendor is FIRST in modulepreload list');
    } else {
      console.log('[fix-index-html] ⚠️  WARNING: react-vendor is NOT first in modulepreload list');
    }
  }
} catch (error) {
  console.error('[fix-index-html] ❌ Error:', error.message);
  console.error('[fix-index-html] Stack:', error.stack);
  process.exit(1);
}
