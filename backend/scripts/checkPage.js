import pool from './db.js';

async function check() {
  const r = await pool.query('SELECT slug, title, is_published FROM pages WHERE slug = \'/\' LIMIT 1');
  console.log('Page with slug="/":', r.rows[0] || 'Not found');
  const r2 = await pool.query('SELECT slug, title FROM pages ORDER BY slug LIMIT 5');
  console.log('First 5 pages:', r2.rows.map(x => ({ slug: x.slug, published: x.is_published })));
  await pool.end();
}

check();



