import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distLegacyPath = path.join(__dirname, '../../frontend/dist/legacy');
const publicLegacyPath = path.join(__dirname, '../../frontend/public/legacy');

const testPath = '/img/cases/fitnes-treker-2/cover.png';

console.log('Тестирую пути для:', testPath);
console.log('');

const distPath = path.join(distLegacyPath, testPath);
const publicPath = path.join(publicLegacyPath, testPath);

console.log('distLegacyPath:', distLegacyPath);
console.log('distPath:', distPath);
console.log('Существует dist:', fs.existsSync(distPath));
console.log('');

console.log('publicLegacyPath:', publicLegacyPath);
console.log('publicPath:', publicPath);
console.log('Существует public:', fs.existsSync(publicPath));
console.log('');

if (fs.existsSync(publicPath)) {
  const stats = fs.statSync(publicPath);
  console.log('Размер файла:', stats.size, 'байт');
  console.log('Это файл:', stats.isFile());
}

