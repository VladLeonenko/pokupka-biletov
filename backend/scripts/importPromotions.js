import pool from '../db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const migrationPath = path.join(__dirname, '../migrations/006_create_promotions.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
  await pool.query(migrationSql);
  console.log('Migration completed');
}

async function importPromotions() {
  const srcPath = path.join(__dirname, '../../src/promotion.html');
  if (!fs.existsSync(srcPath)) {
    console.error('File not found:', srcPath);
    process.exit(1);
  }

  const html = fs.readFileSync(srcPath, 'utf-8');
  
  // Extract promotions from HTML
  const promotionMatches = html.matchAll(/<div class="promotion-item([^"]*)">([\s\S]*?)<\/div>\s*<\/div>/g);
  
  const promotions = [];
  
  for (const match of promotionMatches) {
    const [, classes, content] = match;
    const isActive = !classes.includes('no-active-promotion');
    
    const titleMatch = content.match(/<h3>(.*?)<\/h3>/s);
    const title = titleMatch ? titleMatch[1].replace(/<br\s*\/?>/gi, ' ').trim() : '';
    
    const descMatch = content.match(/<p>(.*?)<\/p>/s);
    const description = descMatch ? descMatch[1].trim() : '';
    
    const dateMatch = content.match(/<h5>(.*?)<\/h5>/);
    const dateText = dateMatch ? dateMatch[1].trim() : '';
    
    const buttonMatch = content.match(/class="([^"]*order[^"]*)"/);
    const formId = buttonMatch ? buttonMatch[1].replace('-order', '-input') : null;
    
    // Parse date if it's a date format
    let expiryDate = null;
    let expiryText = dateText;
    
    if (dateText && dateText !== 'Всегда') {
      // Try to parse "До 10.01.24" format
      const dateMatch2 = dateText.match(/До\s+(\d{2})\.(\d{2})\.(\d{2})/);
      if (dateMatch2) {
        const [, day, month, year] = dateMatch2;
        const fullYear = year.length === 2 ? `20${year}` : year;
        expiryDate = `${fullYear}-${month}-${day}`;
        expiryText = null;
      }
    }
    
    if (dateText === 'Всегда') {
      expiryText = 'Всегда';
      expiryDate = null;
    }
    
    promotions.push({
      title,
      description,
      expiryDate,
      expiryText: expiryText || null,
      buttonText: 'Получить скидку',
      formId,
      isActive,
      sortOrder: promotions.length,
    });
  }
  
  // Insert promotions
  for (const promo of promotions) {
    try {
      await pool.query(
        `INSERT INTO promotions (title, description, expiry_date, expiry_text, button_text, form_id, is_active, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          promo.title,
          promo.description,
          promo.expiryDate || null,
          promo.expiryText || null,
          promo.buttonText,
          promo.formId || null,
          promo.isActive,
          promo.sortOrder,
        ]
      );
      console.log(`Imported: ${promo.title}`);
    } catch (err) {
      if (err.code === '23505') {
        console.log(`Already exists: ${promo.title}`);
      } else {
        console.error(`Error importing ${promo.title}:`, err.message);
      }
    }
  }
  
  console.log(`Imported ${promotions.length} promotions`);
  await pool.end();
}

async function main() {
  try {
    await runMigration();
    await importPromotions();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

main();



