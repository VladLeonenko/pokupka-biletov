import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Скрипт для скачивания изображений из Figma
 * 
 * Инструкция:
 * 1. Откройте Figma в браузере с включенным DevTools
 * 2. В дизайне кейса MADEO найдите изображения (image 37, image 35)
 * 3. Экспортируйте их как PNG и сохраните в папку frontend/public/legacy/img/cases/madeo-case/
 * 4. Переименуйте файлы:
 *    - image 37 (ноутбук) → laptop.png
 *    - image 35 (телефон) → phone.png
 * 
 * Или используйте Figma API для автоматической загрузки.
 */

const madeoCaseDir = path.join(__dirname, '../../frontend/public/legacy/img/cases/madeo-case');

async function checkImages() {
  try {
    await fs.access(madeoCaseDir);
    const files = await fs.readdir(madeoCaseDir);
    
    console.log('📁 Файлы в папке madeo-case:');
    files.forEach(file => console.log(`   - ${file}`));
    
    const requiredImages = ['laptop.png', 'phone.png'];
    const missing = requiredImages.filter(img => !files.includes(img));
    
    if (missing.length > 0) {
      console.log('\n⚠️  Отсутствуют изображения:');
      missing.forEach(img => console.log(`   - ${img}`));
      console.log('\n📝 Инструкция:');
      console.log('1. Откройте Figma: https://www.figma.com/design/WbnXvlmGpqmVAC4mGs15yD/...');
      console.log('2. Найдите изображения в секции "Задачи и Решение"');
      console.log('3. Экспортируйте их как PNG');
      console.log(`4. Сохраните в: ${madeoCaseDir}/`);
      console.log('5. Переименуйте: image 37 → laptop.png, image 35 → phone.png');
    } else {
      console.log('\n✅ Все необходимые изображения на месте!');
    }
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

checkImages();
