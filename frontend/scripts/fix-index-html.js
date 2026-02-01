#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '../dist/index.html');

try {
  let html = fs.readFileSync(indexPath, 'utf-8');
  
  // Находим все modulepreload ссылки
  const modulepreloadRegex = /<link rel="modulepreload"[^>]*>/g;
  const modulepreloads = html.match(modulepreloadRegex) || [];
  
  // Находим основной script
  const scriptRegex = /<script type="module"[^>]*><\/script>/g;
  const scripts = html.match(scriptRegex) || [];
  
  if (modulepreloads.length === 0 || scripts.length === 0) {
    console.log('[fix-index-html] No modulepreload or scripts found');
    process.exit(0);
  }
  
  // Находим react-vendor preload и удаляем его
  const otherPreloads = modulepreloads.filter(m => !m.includes('react-vendor'));
  
  if (modulepreloads.length === otherPreloads.length) {
    console.log('[fix-index-html] react-vendor not found in modulepreload, nothing to fix');
    process.exit(0);
  }
  
  // Удаляем все modulepreload и script теги
  let newHtml = html.replace(modulepreloadRegex, '');
  newHtml = newHtml.replace(scriptRegex, '');
  
  // Находим позицию перед закрывающим </head>
  const headEndIndex = newHtml.indexOf('</head>');
  if (headEndIndex !== -1) {
    // Собираем правильный порядок:
    // 1. Основной script (который импортирует react-vendor)
    // 2. Остальные preload (БЕЗ react-vendor - он загружается синхронно через основной script)
    let toInsert = '';
    
    if (scripts[0]) {
      toInsert += scripts[0] + '\n    ';
    }
    // НЕ добавляем react-vendor preload - пусть загружается синхронно через основной script
    if (otherPreloads.length > 0) {
      toInsert += otherPreloads.join('\n    ') + '\n    ';
    }
    
    newHtml = newHtml.replace('</head>', toInsert + '</head>');
  }
  
  // Сохраняем измененный HTML
  fs.writeFileSync(indexPath, newHtml, 'utf-8');
  console.log('[fix-index-html] ✅ Removed react-vendor from modulepreload');
} catch (error) {
  console.error('[fix-index-html] ❌ Error:', error.message);
  process.exit(1);
}
