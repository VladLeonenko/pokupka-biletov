import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function addPortfolioPage() {
  try {
    // Читаем скомпилированный HTML
    const htmlPath = path.join(__dirname, '../../dist/portfolio.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    
    // Извлекаем body содержимое
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const body = bodyMatch ? bodyMatch[1] : '';
    
    // Проверяем, существует ли уже страница
    const checkResult = await pool.query(
      'SELECT id FROM pages WHERE slug = $1',
      ['/portfolio']
    );
    
    if (checkResult.rows.length > 0) {
      console.log('Страница уже существует. Обновляем...');
      await pool.query(
        `UPDATE pages 
         SET title = $1, body = $2, seo_title = $3, seo_description = $4, is_published = $5, updated_at = NOW()
         WHERE slug = $6`,
        [
          'Портфолио - Примеры работ веб-студии PrimeCoder',
          body,
          'Портфолио - Примеры работ веб-студии PrimeCoder',
          'Портфолио выполненных проектов веб-студии PrimeCoder. Разработка сайтов, мобильных приложений, дизайн и продвижение. Более 10 лет опыта, 100+ успешных проектов.',
          true,
          '/portfolio'
        ]
      );
      console.log('✅ Страница обновлена');
    } else {
      console.log('Создаем новую страницу...');
      await pool.query(
        `INSERT INTO pages (slug, title, body, seo_title, seo_description, is_published)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          '/portfolio',
          'Портфолио - Примеры работ веб-студии PrimeCoder',
          body,
          'Портфолио - Примеры работ веб-студии PrimeCoder',
          'Портфолио выполненных проектов веб-студии PrimeCoder. Разработка сайтов, мобильных приложений, дизайн и продвижение. Более 10 лет опыта, 100+ успешных проектов.',
          true
        ]
      );
      console.log('✅ Страница создана');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

addPortfolioPage();

