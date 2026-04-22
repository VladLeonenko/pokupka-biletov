import crypto from 'crypto';
import pool from '../db.js';

export const PURPOSE_MAGIC_LINK = 'magic_link';
export const PURPOSE_PASSWORD_RESET = 'password_reset';

export function hashLoginToken(raw) {
  return crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
}

export async function createLoginToken({
  userId = null,
  email = null,
  purpose,
  ttlMinutes = 15,
  metadata = {},
}) {
  const raw = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashLoginToken(raw);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  await pool.query(
    `INSERT INTO auth_login_tokens (token_hash, user_id, email, purpose, metadata, expires_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
    [tokenHash, userId, email, purpose, metadata, expiresAt]
  );
  return { raw, expiresAt };
}

export async function consumeLoginToken(raw, purpose) {
  const tokenHash = hashLoginToken(raw);
  const r = await pool.query(
    `SELECT * FROM auth_login_tokens
     WHERE token_hash = $1 AND purpose = $2 AND expires_at > NOW() AND used_at IS NULL`,
    [tokenHash, purpose]
  );
  const row = r.rows[0];
  if (!row) return null;
  await pool.query('UPDATE auth_login_tokens SET used_at = NOW() WHERE id = $1', [row.id]);
  return row;
}
