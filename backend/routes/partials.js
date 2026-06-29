import express from 'express';
import pool from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT name, html FROM partials');
    const map = Object.fromEntries(
      result.rows.map((r) => {
        let html = r.html;
        if (r.name === 'head' && typeof html === 'string') {
          html = html
            .replace(/@img\/favicon[^"']*/gi, '/favicon.ico')
            .replace(/@img\/apple-touch-icon[^"']*/gi, '/favicon.ico')
            .replace(/@img\/favicon-[^"']*/gi, '/favicon.ico')
            .replace(/\/legacy\/img\/favicon[^"']*/gi, '/favicon.ico')
            .replace(/href=["'][^"']*prime-coder[^"']*favicon[^"']*["']/gi, 'href="/favicon.ico"');
        }
        return [r.name, html];
      }),
    );
    res.json(map);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;




