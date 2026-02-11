#!/usr/bin/env node
/**
 * Импорт статьи блога из standalone HTML-файла
 * Использование: node scripts/import-blog-article.js <path-to-html>
 *
 * Извлекает: title, meta description, og:image, og:url (для slug)
 * body = <style> + <article> innerHTML
 * slug из og:url (blog/marketing-pod-klyuch-300k → marketing-pod-klyuch-300k)
 * или транслитерация title
 *
 * Идемпотентный: обновляет если slug существует
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.argv.includes('--prod')) process.env.PROD = '1';
const envDir = path.join(__dirname, '..');
if (process.env.NODE_ENV === 'production' || process.env.PROD) {
  dotenv.config({ path: path.join(envDir, '.env.prod') });
}
dotenv.config({ path: path.join(envDir, '.env') });

const { Pool } = pg;
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: String(process.env.PGPASSWORD || ''),
  port: Number(process.env.PGPORT),
});

function extractFromHtml(html) {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)
    || html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i);
  const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i)
    || html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);
  const ogUrlMatch = html.match(/<meta\s+property=["']og:url["']\s+content=["']([^"']+)["']/i)
    || html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:url["']/i);
  const ogDescMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i)
    || html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:description["']/i);

  let slug = null;
  if (ogUrlMatch) {
    const url = ogUrlMatch[1];
    const m = url.match(/\/blog\/([^/?]+)/);
    if (m) slug = m[1];
  }
  if (!slug && titleMatch) {
    slug = titleMatch[1]
      .replace(/\s*[|–-]\s*PrimeCoder.*$/i, '')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase()
      .slice(0, 80);
  }
  if (!slug) slug = 'article-' + Date.now();

  const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);

  let body = '';
  if (styleMatch) body += styleMatch[0];
  if (articleMatch) {
    body += articleMatch[1].trim();
  } else if (bodyMatch) {
    body += bodyMatch[1].trim();
  }

  return {
    title: (titleMatch?.[1] || 'Без названия').trim(),
    slug: slug.trim(),
    seo_description: (descMatch?.[1] || ogDescMatch?.[1] || '').trim().slice(0, 320),
    cover_image_url: ogImageMatch?.[1]?.trim() || null,
    body: body || html,
  };
}

function transliterateSlug(s) {
  const map = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
  return s
    .toLowerCase()
    .split('')
    .map((c) => map[c] || (/\w|-/.test(c) ? c : '-'))
    .join('')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function upsertPost(data) {
  const { slug, title, body, seo_description, cover_image_url } = data;
  const seo_title = title;

  const existing = await pool.query('SELECT id FROM blog_posts WHERE slug = $1', [slug]);

  if (existing.rows.length > 0) {
    await pool.query(
      `UPDATE blog_posts SET
        title = $1, body = $2, seo_title = $3, seo_description = $4,
        cover_image_url = COALESCE($5::text, cover_image_url),
        updated_at = NOW()
       WHERE slug = $6`,
      [title, body, seo_title, seo_description || null, cover_image_url, slug]
    );
    console.log(`   Обновлено: ${slug}`);
  } else {
    await pool.query(
      `INSERT INTO blog_posts (slug, title, body, seo_title, seo_description, is_published, cover_image_url)
       VALUES ($1, $2, $3, $4, $5, TRUE, $6)`,
      [slug, title, body, seo_title, seo_description || null, cover_image_url]
    );
    console.log(`   Создано: ${slug}`);
  }
}

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const filePath = args[0];
  const forceSlug = process.argv.includes('--slug')
    ? process.argv[process.argv.indexOf('--slug') + 1]
    : null;

  if (!filePath || !fs.existsSync(filePath)) {
    console.error('Использование: node scripts/import-blog-article.js <path-to-html> [--slug <slug>] [--prod]');
    console.error('Пример: node scripts/import-blog-article.js data/marketing-pod-klyuch-300k.html --slug marketing-pod-klyuch-sayt-seo-reklama-za-300k-v-2026-godu-primecoder --prod');
    process.exit(1);
  }

  const html = fs.readFileSync(filePath, 'utf-8');
  const data = extractFromHtml(html);
  if (forceSlug) data.slug = forceSlug;

  if (!data.slug.match(/^[a-z0-9-]+$/i)) {
    data.slug = transliterateSlug(data.slug) || data.slug.replace(/[^a-z0-9-]/gi, '-');
  }

  console.log('Импорт статьи:');
  console.log('   slug:', data.slug);
  console.log('   title:', data.title?.slice(0, 60) + (data.title?.length > 60 ? '...' : ''));
  console.log('   seo_description:', (data.seo_description || '').slice(0, 60) + '...');
  console.log('   cover_image_url:', data.cover_image_url || '(нет)');
  console.log('   body length:', data.body?.length || 0);

  await upsertPost(data);
  console.log('\nГотово. Статья доступна на /blog/' + data.slug);
  console.log('llms.txt и llms-full.txt обновятся автоматически при следующем запросе.');
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
