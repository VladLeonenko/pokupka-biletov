#!/usr/bin/env node

/**
 * Скрипт для первоначальной синхронизации всех файлов из backend/uploads в frontend/dist/uploads
 * 
 * Использование:
 *   node scripts/sync-uploads.js
 * 
 * Или через npm:
 *   npm run sync:uploads
 */

import FileSyncService from '../services/FileSyncService.js';

async function main() {
  console.log('🚀 Начало синхронизации uploads...\n');
  
  try {
    const result = await FileSyncService.syncAll();
    
    console.log('\n✅ Синхронизация завершена!');
    console.log(`   Синхронизировано: ${result.synced} файлов`);
    console.log(`   Ошибок: ${result.errors}`);
    
    process.exit(result.errors > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n❌ Ошибка синхронизации:', error);
    process.exit(1);
  }
}

main();
