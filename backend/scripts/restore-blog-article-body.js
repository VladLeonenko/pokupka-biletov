#!/usr/bin/env node
/**
 * Восстанавливает body статьи из исходного HTML.
 * Обложка (cover_image_url) не меняется.
 *
 * Использование: node scripts/restore-blog-article-body.js [--prod]
 *   SLUG=vremya-na-sayte-snizhenie-otkazov (по умолчанию)
 *   FILE=../../data/vremya-na-sayte-snizhenie-otkazov.html (по умолчанию)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envDir = path.join(__dirname, '..');
if (process.argv.includes('--prod')) {
  process.env.PROD = '1';
  dotenv.config({ path: path.join(envDir, '.env.prod') });
}
dotenv.config({ path: path.join(envDir, '.env') });

import pool from '../db.js';

const slug = process.env.SLUG || 'vremya-na-sayte-snizhenie-otkazov';
const filePath = process.env.FILE || path.join(__dirname, '../../data/vremya-na-sayte-snizhenie-otkazov.html');

function extractBody(html) {
  const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let body = '';
  if (styleMatch) body += styleMatch[0];
  if (articleMatch) body += articleMatch[1].trim();
  else if (bodyMatch) body += bodyMatch[1].trim();
  return body || html;
}

async function main() {
  if (!fs.existsSync(filePath)) {
    console.error('Файл не найден:', filePath);
    process.exit(1);
  }
  const html = fs.readFileSync(filePath, 'utf-8');
  const body = extractBody(html);

  const r = await pool.query(
    `UPDATE blog_posts SET body = $1, content_json = '{}', updated_at = NOW() WHERE slug = $2 RETURNING slug, title`,
    [body, slug]
  );

  if (r.rowCount === 0) {
    console.error('Статья не найдена:', slug);
    process.exit(1);
  }
  console.log('✅ Восстановлено:', r.rows[0].title);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
