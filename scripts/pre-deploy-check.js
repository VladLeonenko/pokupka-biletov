#!/usr/bin/env node

/**
 * Скрипт проверки перед деплоем
 * Запуск: node scripts/pre-deploy-check.js
 */

const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

const rootDir = join(__dirname, '..');

const checks = {
  passed: [],
  failed: [],
  warnings: []
};

function check(name, condition, isWarning = false) {
  if (condition) {
    checks.passed.push(name);
    console.log(`✅ ${name}`);
  } else {
    if (isWarning) {
      checks.warnings.push(name);
      console.log(`⚠️  ${name}`);
    } else {
      checks.failed.push(name);
      console.log(`❌ ${name}`);
    }
  }
}

console.log('🔍 Проверка перед деплоем...\n');

// 1. Проверка файлов
console.log('📁 Проверка файлов:');
check('robots.txt существует', existsSync(join(rootDir, 'frontend/public/robots.txt')));
check('sitemap.xml существует', existsSync(join(rootDir, 'frontend/public/sitemap.xml')));
check('manifest.json существует', existsSync(join(rootDir, 'frontend/public/manifest.json')));
check('favicon.ico существует', existsSync(join(rootDir, 'frontend/public/favicon.ico')));
check('index.html существует', existsSync(join(rootDir, 'frontend/index.html')));

// 2. Проверка домена в файлах
console.log('\n🌐 Проверка домена prime-coder.ru:');
try {
  const robots = readFileSync(join(rootDir, 'frontend/public/robots.txt'), 'utf-8');
  check('Домен в robots.txt', robots.includes('prime-coder.ru'));
} catch (e) {
  check('Домен в robots.txt', false);
}

try {
  const sitemap = readFileSync(join(rootDir, 'frontend/public/sitemap.xml'), 'utf-8');
  check('Домен в sitemap.xml', sitemap.includes('prime-coder.ru'));
} catch (e) {
  check('Домен в sitemap.xml', false);
}

try {
  const sitemapJs = readFileSync(join(rootDir, 'backend/routes/sitemap.js'), 'utf-8');
  check('Домен в backend/routes/sitemap.js', sitemapJs.includes('prime-coder.ru'));
} catch (e) {
  check('Домен в backend/routes/sitemap.js', false);
}

// 3. Проверка package.json
console.log('\n📦 Проверка зависимостей:');
try {
  const backendPkg = JSON.parse(readFileSync(join(rootDir, 'backend/package.json'), 'utf-8'));
  check('Backend package.json валиден', !!backendPkg.dependencies);
  
  const frontendPkg = JSON.parse(readFileSync(join(rootDir, 'frontend/package.json'), 'utf-8'));
  check('Frontend package.json валиден', !!frontendPkg.dependencies);
  check('Frontend имеет devDependencies', !!frontendPkg.devDependencies);
} catch (e) {
  check('package.json файлы', false);
}

// 4. Проверка конфигурации
console.log('\n⚙️  Проверка конфигурации:');
check('Vite config существует', existsSync(join(rootDir, 'frontend/vite.config.ts')));
check('Backend app.js существует', existsSync(join(rootDir, 'backend/app.js')));

// 5. Проверка dist (production build)
console.log('\n🏗️  Проверка production build:');
const distExists = existsSync(join(rootDir, 'frontend/dist'));
check('Frontend dist существует', distExists);
if (distExists) {
  check('dist/index.html существует', existsSync(join(rootDir, 'frontend/dist/index.html')));
  check('dist/robots.txt существует', existsSync(join(rootDir, 'frontend/dist/robots.txt')));
  check('dist/sitemap.xml существует', existsSync(join(rootDir, 'frontend/dist/sitemap.xml')));
  check('dist/manifest.json существует', existsSync(join(rootDir, 'frontend/dist/manifest.json')));
}

// 6. Проверка безопасности
console.log('\n🔒 Проверка безопасности:');
try {
  const appJs = readFileSync(join(rootDir, 'backend/app.js'), 'utf-8');
  check('Helmet настроен', appJs.includes('helmet'));
  check('CORS настроен', appJs.includes('cors'));
  check('Rate limiting настроен', appJs.includes('rateLimit'));
  check('Compression включен', appJs.includes('compression'));
} catch (e) {
  check('Проверка безопасности', false);
}

// 7. Проверка .env.example
console.log('\n📝 Проверка переменных окружения:');
check('env.example существует', existsSync(join(rootDir, 'backend/env.example')));

// Итоги
console.log('\n' + '='.repeat(50));
console.log('📊 Итоги проверки:');
console.log(`✅ Успешно: ${checks.passed.length}`);
console.log(`❌ Ошибки: ${checks.failed.length}`);
console.log(`⚠️  Предупреждения: ${checks.warnings.length}`);

if (checks.failed.length > 0) {
  console.log('\n❌ Обнаружены ошибки:');
  checks.failed.forEach(f => console.log(`   - ${f}`));
}

if (checks.warnings.length > 0) {
  console.log('\n⚠️  Предупреждения:');
  checks.warnings.forEach(w => console.log(`   - ${w}`));
}

if (checks.failed.length === 0) {
  console.log('\n✅ Все проверки пройдены! Готово к деплою.');
  process.exit(0);
} else {
  console.log('\n❌ Требуются исправления перед деплоем.');
  process.exit(1);
}
