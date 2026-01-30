import pool from '../db.js';

function stripIncludes(html) {
  return html
    .replace(/<!--\s*@@include\([^)]*\)\s*-->/g, '')
    .replace(/@@include\([^)]*\)/g, '');
}

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT slug, body FROM pages');
    for (const r of rows) {
      const cleaned = stripIncludes(r.body || '');
      if (cleaned !== r.body) {
        await client.query('UPDATE pages SET body=$1, updated_at=NOW() WHERE slug=$2', [cleaned, r.slug]);
        console.log('Cleaned includes in', r.slug);
      }
    }
    await client.query('COMMIT');
    console.log('Done.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Cleanup failed:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();




