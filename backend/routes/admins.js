import express from 'express';
import pool from '../db.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

function validatePassword(password) {
  if (!password || password.length < 8) return 'Пароль минимум 8 символов';
  if (!/[a-zа-яё]/.test(password)) return 'Нужна строчная буква';
  if (!/[A-ZА-ЯЁ]/.test(password)) return 'Нужна заглавная буква';
  if (!/[0-9]/.test(password)) return 'Нужна цифра';
  return null;
}

router.get('/', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, email, name, created_at FROM users WHERE role = 'admin' ORDER BY created_at ASC`
    );
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { email, password, name } = req.body || {};
    const normEmail = (email || '').trim().toLowerCase();
    if (!normEmail) return res.status(400).json({ error: 'Email обязателен' });

    const pErr = validatePassword(password);
    if (pErr) return res.status(400).json({ error: pErr });

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [normEmail]);
    if (existing.rows.length) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    const hash = await bcrypt.hash(password, 10);
    const r = await pool.query(
      `INSERT INTO users(email, password_hash, role, name) VALUES($1,$2,'admin',$3) RETURNING id, email, name, created_at`,
      [normEmail, hash, (name || '').trim() || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

    const count = await pool.query('SELECT COUNT(*)::int AS n FROM users WHERE role = $1', ['admin']);
    if (count.rows[0].n <= 1) {
      return res.status(400).json({ error: 'Нельзя удалить последнего админа' });
    }

    const r = await pool.query(
      `UPDATE users SET role = 'user' WHERE id = $1 AND role = 'admin' RETURNING id`,
      [id]
    );
    if (r.rowCount === 0) {
      return res.status(404).json({ error: 'Админ не найден' });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id/reset-password', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { password } = req.body || {};
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

    const pErr = validatePassword(password);
    if (pErr) return res.status(400).json({ error: pErr });

    const hash = await bcrypt.hash(password, 10);
    const r = await pool.query(
      `UPDATE users SET password_hash = $2 WHERE id = $1 AND role = 'admin' RETURNING id`,
      [id, hash]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'Админ не найден' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
