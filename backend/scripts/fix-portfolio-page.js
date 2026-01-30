import pool from '../db.js';

async function fixPortfolioPage() {
  try {
    // Получаем текущий HTML страницы
    const result = await pool.query('SELECT body FROM pages WHERE slug = $1', ['/portfolio']);
    
    if (result.rows.length === 0) {
      console.log('❌ Страница /portfolio не найдена');
      return;
    }

    let body = result.rows[0].body;

    // Заменяем const на var
    body = body.replace(/\bconst\s+/g, 'var ');
    
    // Заменяем let на var
    body = body.replace(/\blet\s+/g, 'var ');
    
    // Заменяем стрелочные функции на обычные функции
    body = body.replace(/\(\)\s*=>\s*{/g, 'function() {');
    body = body.replace(/\(([a-zA-Z_$][a-zA-Z0-9_$]*)\)\s*=>\s*{/g, 'function($1) {');
    body = body.replace(/\(([a-zA-Z_$][a-zA-Z0-9_$]*,\s*[a-zA-Z_$][a-zA-Z0-9_$]*)\)\s*=>\s*{/g, 'function($1) {');
    
    // Заменяем setTimeout(() => на setTimeout(function() {
    body = body.replace(/setTimeout\(\(\)\s*=>/g, 'setTimeout(function()');
    
    // Заменяем опциональный оператор ?. на проверку
    // Это сложнее, но для начала просто заменим на безопасный доступ
    body = body.replace(/\?\./g, ' && ');
    
    // Заменяем nullish coalescing ?? на ||
    body = body.replace(/\?\?/g, ' || ');

    // Обновляем страницу
    await pool.query('UPDATE pages SET body = $1 WHERE slug = $2', [body, '/portfolio']);
    
    console.log('✅ Страница /portfolio обновлена - заменены const/let на var, стрелочные функции на обычные');
  } catch (error) {
    console.error('❌ Ошибка при обновлении страницы:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixPortfolioPage();








