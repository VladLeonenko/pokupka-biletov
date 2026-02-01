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
  
  if (reactVendorPreloads.length === 0) {
    console.log('[fix-index-html] react-vendor not found in modulepreload, nothing to fix');
    process.exit(0);
  }
  
  // Находим react-vendor preload и преобразуем его в обычный script
  const reactVendorPreload = reactVendorPreloads[0];
  let reactVendorScript = '';
  
  if (reactVendorPreload) {
    // Извлекаем путь к react-vendor из modulepreload
    const hrefMatch = reactVendorPreload.match(/href="([^"]+)"/);
    if (hrefMatch && hrefMatch[1]) {
      reactVendorScript = `<script type="module" crossorigin src="${hrefMatch[1]}"></script>`;
    }
  }
  
  // Удаляем все modulepreload и script теги
  let newHtml = html.replace(modulepreloadRegex, '');
  newHtml = newHtml.replace(scriptRegex, '');
  
  // Находим позицию перед закрывающим </head>
  const headEndIndex = newHtml.indexOf('</head>');
  if (headEndIndex !== -1) {
    // Собираем правильный порядок:
    // 1. react-vendor как обычный script (синхронная загрузка)
    // 2. Основной script (который использует react-vendor)
    // 3. Остальные preload
    let toInsert = '';
    
    // ВАЖНО: react-vendor должен загружаться ПЕРВЫМ, синхронно
    if (reactVendorScript) {
      toInsert += reactVendorScript + '\n    ';
    }
    
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
  console.log('[fix-index-html] ✅ Removed react-vendor from modulepreload');
  console.log('[fix-index-html] File saved, new length:', newHtml.length);
  
  // Проверяем результат
  const checkHtml = fs.readFileSync(indexPath, 'utf-8');
  const checkPreloads = checkHtml.match(modulepreloadRegex) || [];
  const checkReactVendor = checkPreloads.filter(m => m.includes('react-vendor'));
  console.log('[fix-index-html] Verification - react-vendor preloads after fix:', checkReactVendor.length);
} catch (error) {
  console.error('[fix-index-html] ❌ Error:', error.message);
  console.error('[fix-index-html] Stack:', error.stack);
  process.exit(1);
}
