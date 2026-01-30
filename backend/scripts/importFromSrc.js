import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.resolve(__dirname, '../../src');
const IMG_DIR = path.join(SRC_DIR, 'img');
const PARTIALS_DIR = path.join(SRC_DIR, 'html');

function readHtmlFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'html') continue; // partials грузим отдельно
      files.push(...readHtmlFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(full);
    }
  }
  return files;
}

function filePathToSlug(filePath) {
  const rel = path.relative(SRC_DIR, filePath);
  const name = rel.replace(/\\/g, '/');
  if (name === 'index.html') return '/';
  const base = path.basename(name, '.html');
  return `/${base}`;
}

function extractTitle(html) {
  // Try to extract from @@include('html/head.html', { "title": "...", ... })
  const headIncludeMatch = html.match(/@@include\s*\(\s*['"]html\/head\.html['"]\s*,\s*\{\s*['"]title['"]\s*:\s*['"]([^'"]+)['"]/);
  if (headIncludeMatch) {
    return headIncludeMatch[1];
  }
  // Fallback: try standard <title> tag
  const m = html.match(/<title>(.*?)<\/title>/i);
  return (m?.[1] || '').trim();
}

function stripIncludes(html) {
  // remove @@include('...') and commented includes
  return html
    .replace(/<!--\s*@@include\([^)]*\)\s*-->/g, '')
    .replace(/@@include\([^)]*\)/g, '');
}

function extractBodyContent(html) {
  // Extract only the content inside <body> tags, or return full HTML if no body tags
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    let bodyContent = bodyMatch[1];
    // Remove @@include directives for header/footer (they'll be added separately)
    // But keep everything else, including container divs and actual content
    bodyContent = bodyContent
      .replace(/@@include\s*\(\s*['"]html\/header\.html['"]\s*\)/gi, '')
      .replace(/@@include\s*\(\s*['"]html\/footer\.html['"]\s*\)/gi, '')
      .replace(/<!--\s*@@include\s*\(\s*['"]html\/header\.html['"]\s*\)\s*-->/gi, '')
      .replace(/<!--\s*@@include\s*\(\s*['"]html\/footer\.html['"]\s*\)\s*-->/gi, '');
    // Keep all other content
    return bodyContent.trim();
  }
  // If no body tags, assume the entire file is body content (already processed HTML)
  // Remove any html/head/body tags that might be there
  return html
    .replace(/<\!DOCTYPE[^>]*>/gi, '')
    .replace(/<\/?html[^>]*>/gi, '')
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
    .replace(/<\/?body[^>]*>/gi, '')
    .trim();
}

async function upsertPage(client, { slug, title, body }) {
  await client.query(
    `INSERT INTO pages (slug, title, body)
     VALUES ($1, $2, $3)
     ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, body = EXCLUDED.body, updated_at = NOW()`,
    [slug, title, body]
  );
}

async function importPages() {
  const files = readHtmlFiles(SRC_DIR);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const file of files) {
      const raw = fs.readFileSync(file, 'utf8');
      // First extract body content (before stripping includes)
      const bodyContentRaw = extractBodyContent(raw);
      // Then strip remaining @@include directives from body content only
      const bodyContent = stripIncludes(bodyContentRaw);
      const slug = filePathToSlug(file);
      // Extract title from original HTML (before processing)
      const title = extractTitle(raw) || slug.replace('/', '').toUpperCase();
      await upsertPage(client, { slug, title, body: bodyContent });
      console.log('Imported page:', slug, `(content length: ${bodyContent.length}, title: ${title})`);
    }
    await client.query('COMMIT');
    console.log('Import completed');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Import pages failed:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
  }
}

async function importPartials() {
  if (!fs.existsSync(PARTIALS_DIR)) return;
  const names = ['head', 'header', 'footer'];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const name of names) {
      const file = path.join(PARTIALS_DIR, `${name}.html`);
      if (!fs.existsSync(file)) continue;
      const html = fs.readFileSync(file, 'utf8');
      await client.query(
        `INSERT INTO partials(name, html) VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET html = EXCLUDED.html`,
        [name, html]
      );
      console.log('Imported partial:', name);
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Import partials failed:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
  }
}

function copyImages() {
  if (!fs.existsSync(IMG_DIR)) return;
  const destRoot = path.resolve(__dirname, '../uploads');
  fs.mkdirSync(destRoot, { recursive: true });

  const entries = fs.readdirSync(IMG_DIR, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(IMG_DIR, entry.name);
    const destPath = path.join(destRoot, entry.name);
    if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function registerImages() {
  const destRoot = path.resolve(__dirname, '../uploads');
  if (!fs.existsSync(destRoot)) return;
  const files = fs.readdirSync(destRoot).filter((f) => fs.statSync(path.join(destRoot, f)).isFile());
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const f of files) {
      const url = `/uploads/${f}`;
      await client.query('INSERT INTO images (url) VALUES ($1) ON CONFLICT DO NOTHING', [url]);
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Register images failed:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

async function run() {
  await importPartials();
  await importPages();
  copyImages();
  await registerImages();
  console.log('Import completed');
}

run();


