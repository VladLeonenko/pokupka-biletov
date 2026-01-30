import pool from '../db.js';

async function checkContent() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT slug, title, LEFT(body, 200) as body_preview, length(body) as body_len FROM pages WHERE slug = \'/\' LIMIT 1');
    console.log('Page data:', result.rows[0]);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkContent();



