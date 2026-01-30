import express from 'express';
import pool from '../db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { signUser } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { loginSchema, registerSchema, verifyCodeSchema } from '../utils/validation.js';

const router = express.Router();

async function ensureBootstrapUser() {
  const email = process.env.ADMIN_EMAIL;
  const pass = process.env.ADMIN_PASSWORD;
  if (!email || !pass) return;
  const existing = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
  const hash = await bcrypt.hash(pass, 10);
  if (existing.rows.length) {
    if (String(process.env.ADMIN_FORCE_RESET).toLowerCase() === 'true') {
      await pool.query('UPDATE users SET password_hash=$2, role=$3 WHERE email=$1', [email, hash, 'admin']);
    }
    return;
  }
  await pool.query('INSERT INTO users(email, password_hash, role) VALUES($1,$2,$3)', [email, hash, 'admin']);
}

// Генерация кода подтверждения
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Отправка SMS (заглушка - нужно интегрировать реальный SMS сервис)
async function sendSMS(phone, code) {
  // TODO: Интеграция с SMS сервисом (SMS.ru, Twilio и т.д.)
  return true;
}

let emailTransporter = null;

async function getEmailTransporter() {
  if (emailTransporter) {
    return emailTransporter;
  }

  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT) || 587;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !user || !pass) {
    throw new Error('Email transport is not configured. Provide EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS env variables.');
  }

  const secure = String(process.env.EMAIL_SECURE || '').toLowerCase() === 'true' || port === 465;

  emailTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });

  return emailTransporter;
}

async function sendEmail(email, code) {
  const transporter = await getEmailTransporter();
  const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  const subject = 'Код подтверждения Primecoder';
  const plainText = `Здравствуйте!\n\nВаш код подтверждения: ${code}\nКод действует 10 минут.\n\nЕсли вы не запрашивали регистрацию, проигнорируйте это сообщение.`;
  const html = `
    <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.5;">
      <h2 style="margin-bottom: 16px;">Код подтверждения Primecoder</h2>
      <p style="margin: 0 0 12px;">Здравствуйте!</p>
      <p style="margin: 0 0 12px;">Ваш код подтверждения:</p>
      <div style="display: inline-block; padding: 12px 20px; border-radius: 8px; background: #111827; color: #ffffff; font-size: 24px; letter-spacing: 6px;">
        ${code}
      </div>
      <p style="margin: 20px 0 12px;">Код действует в течение 10 минут.</p>
      <p style="margin: 0;">Если вы не запрашивали регистрацию, просто проигнорируйте это письмо.</p>
    </div>
  `;

  await transporter.sendMail({
    from: fromAddress,
    to: email,
    subject,
    text: plainText,
    html,
  });
}

// Верификация Google OAuth токена
async function verifyGoogleToken(token) {
  try {
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
    if (!response.ok) return null;
    const data = await response.json();
    return {
      id: data.sub,
      email: data.email,
      name: data.name,
      picture: data.picture,
    };
  } catch (e) {
    console.error('[Google OAuth] Error:', e);
    return null;
  }
}

// Верификация Yandex OAuth токена
async function verifyYandexToken(token) {
  try {
    const response = await fetch('https://login.yandex.ru/info', {
      headers: { Authorization: `OAuth ${token}` },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return {
      id: data.id,
      email: data.default_email,
      name: data.display_name || data.real_name || data.first_name,
      picture: data.is_avatar_empty ? null : `https://avatars.yandex.net/get-yapic/${data.default_avatar_id}/islands-200`,
    };
  } catch (e) {
    console.error('[Yandex OAuth] Error:', e);
    return null;
  }
}

// Стандартный логин (email/password)
router.post('/login', validate({ body: loginSchema }), async (req, res) => {
  try {
    await ensureBootstrapUser();
    const { email, password } = req.body;
    const r = await pool.query('SELECT id, email, password_hash, role, name, avatar_url FROM users WHERE email=$1', [email]);
    const user = r.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = signUser(user);
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name, avatarUrl: user.avatar_url } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Валидация пароля на сервере
function validatePasswordServer(password) {
  if (password.length < 8) {
    return 'Пароль должен содержать минимум 8 символов';
  }
  if (!/[a-zа-яё]/.test(password)) {
    return 'Пароль должен содержать хотя бы одну строчную букву';
  }
  if (!/[A-ZА-ЯЁ]/.test(password)) {
    return 'Пароль должен содержать хотя бы одну заглавную букву';
  }
  if (!/[0-9]/.test(password)) {
    return 'Пароль должен содержать хотя бы одну цифру';
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return 'Пароль должен содержать хотя бы один специальный символ';
  }
  // Проверка на популярные слабые пароли
  const commonPasswords = ['password', '12345678', 'qwerty', 'admin', 'password123', '123456789'];
  if (commonPasswords.includes(password.toLowerCase())) {
    return 'Этот пароль слишком распространен, выберите другой';
  }
  return null;
}

// Регистрация через email
router.post('/register', validate({ body: registerSchema }), async (req, res) => {
  try {
    const { email, password, name, phone, agreeToTerms, agreeToPrivacy } = req.body;
    
    // Данные уже провалидированы через Zod, дополнительные проверки не нужны
    
    // Проверка существования пользователя
    const existing = await pool.query('SELECT id FROM users WHERE email=$1', [email.trim()]);
    if (existing.rows.length) {
      return res.status(400).json({ error: 'Пользователь с таким email уже зарегистрирован' });
    }
    
    // Хешируем пароль
    const hash = await bcrypt.hash(password, 12); // Увеличиваем rounds для безопасности
    
    // Генерируем код подтверждения
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 минут
    
    // Сохраняем пользователя
    const r = await pool.query(
      `INSERT INTO users(email, password_hash, name, phone, role, oauth_provider, email_verified, verification_code, verification_code_expires_at, created_at, updated_at) 
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW()) 
       RETURNING id, email, name, phone, role`,
      [
        email.trim().toLowerCase(),
        hash,
        name.trim(),
        phone && phone.trim() ? phone.trim() : null,
        'user',
        'email',
        false,
        code,
        expiresAt
      ]
    );
    
    const user = r.rows[0];

    try {
      // Отправляем код подтверждения
      await sendEmail(email.trim(), code);
    } catch (mailErr) {
      console.error('[auth] Failed to send verification email:', mailErr);
      await pool.query('DELETE FROM users WHERE id=$1', [user.id]);
      return res.status(500).json({ error: 'Не удалось отправить код подтверждения. Проверьте настройки почты и попробуйте позже.' });
    }
    
    // Автоматически создаем клиента при регистрации
    try {
      const { createDealForClient } = await import('../utils/funnelHelper.js');
      const clientResult = await pool.query(
        `INSERT INTO clients (name, email, phone, source, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING id`,
        [
          name.trim(),
          email.trim().toLowerCase(),
          phone && phone.trim() ? phone.trim() : null,
          'registration',
          'lead'
        ]
      );
      
      
      // Создаем сделку для клиента (если функция доступна)
      try {
        await createDealForClient(
          clientResult.rows[0].id,
          name.trim(),
          email.trim().toLowerCase(),
          phone && phone.trim() ? phone.trim() : null,
          'registration'
        );
      } catch (dealErr) {
        console.warn('[auth] Error creating deal for client:', dealErr.message);
        // Не критичная ошибка, продолжаем
      }
    } catch (clientErr) {
      console.error('[auth] Error creating client from registration:', clientErr);
      // Это не критичная ошибка - пользователь создан, но клиент не создан
      // В логах будет видно, что нужно создать клиента вручную
    }
    
    const token = signUser(user);
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role
      },
      requiresVerification: true
    });
  } catch (e) {
    console.error('[auth] Registration error:', e);
    res.status(500).json({ error: e.message || 'Ошибка при регистрации' });
  }
});

// Регистрация через телефон
router.post('/register-phone', async (req, res) => {
  try {
    const { phone, name } = req.body || {};
    if (!phone) return res.status(400).json({ error: 'phone required' });
    
    const existing = await pool.query('SELECT id FROM users WHERE phone=$1', [phone]);
    if (existing.rows.length) return res.status(400).json({ error: 'Phone already registered' });
    
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 минут
    
    const r = await pool.query(
      'INSERT INTO users(phone, name, role, oauth_provider, phone_verified, verification_code, verification_code_expires_at) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id, phone, name, role',
      [phone, name || null, 'user', 'phone', false, code, expiresAt]
    );
    
    await sendSMS(phone, code);
    
    const user = r.rows[0];
    res.json({ userId: user.id, requiresVerification: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Подтверждение кода (для email или телефона)
router.post('/verify', validate({ body: verifyCodeSchema }), async (req, res) => {
  try {
    const { email, phone, code } = req.body;
    
    let query, params;
    if (email) {
      query = 'SELECT id, email, name, role FROM users WHERE email=$1 AND verification_code=$2 AND verification_code_expires_at > NOW()';
      params = [email, code];
    } else if (phone) {
      query = 'SELECT id, phone, name, role FROM users WHERE phone=$1 AND verification_code=$2 AND verification_code_expires_at > NOW()';
      params = [phone, code];
    } else {
      // Этого не должно произойти из-за валидации в схеме, но на всякий случай
      return res.status(400).json({ error: 'email or phone required' });
    }
    
    const r = await pool.query(query, params);
    if (!r.rows[0]) return res.status(400).json({ error: 'Invalid or expired code' });
    
    const user = r.rows[0];
    
    // Обновляем статус верификации
    if (email) {
      await pool.query('UPDATE users SET email_verified=TRUE, verification_code=NULL, verification_code_expires_at=NULL WHERE id=$1', [user.id]);
    } else {
      await pool.query('UPDATE users SET phone_verified=TRUE, verification_code=NULL, verification_code_expires_at=NULL WHERE id=$1', [user.id]);
    }
    
    const token = signUser(user);
    res.json({ token, user: { id: user.id, email: user.email, phone: user.phone, name: user.name, role: user.role } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// OAuth Google
router.post('/oauth/google', async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ error: 'token required' });
    
    const googleUser = await verifyGoogleToken(token);
    if (!googleUser) return res.status(401).json({ error: 'Invalid token' });
    
    // Ищем пользователя по OAuth ID или email
    let r = await pool.query('SELECT id, email, name, role, avatar_url FROM users WHERE oauth_provider=$1 AND oauth_id=$2', ['google', googleUser.id]);
    let user = r.rows[0];
    
    if (!user) {
      // Проверяем, есть ли пользователь с таким email
      r = await pool.query('SELECT id FROM users WHERE email=$1', [googleUser.email]);
      if (r.rows[0]) {
        // Обновляем существующего пользователя
        await pool.query('UPDATE users SET oauth_provider=$1, oauth_id=$2, name=COALESCE(name,$3), avatar_url=COALESCE(avatar_url,$4) WHERE email=$5', 
          ['google', googleUser.id, googleUser.name, googleUser.picture, googleUser.email]);
        r = await pool.query('SELECT id, email, name, role, avatar_url FROM users WHERE email=$1', [googleUser.email]);
        user = r.rows[0];
      } else {
        // Создаем нового пользователя
        r = await pool.query(
          'INSERT INTO users(email, name, avatar_url, oauth_provider, oauth_id, role, email_verified) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id, email, name, role, avatar_url',
          [googleUser.email, googleUser.name, googleUser.picture, 'google', googleUser.id, 'user', true]
        );
        user = r.rows[0];
      }
    }
    
    const jwtToken = signUser(user);
    res.json({ token: jwtToken, user: { id: user.id, email: user.email, name: user.name, role: user.role, avatarUrl: user.avatar_url } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// OAuth Yandex
router.post('/oauth/yandex', async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ error: 'token required' });
    
    const yandexUser = await verifyYandexToken(token);
    if (!yandexUser) return res.status(401).json({ error: 'Invalid token' });
    
    // Ищем пользователя по OAuth ID или email
    let r = await pool.query('SELECT id, email, name, role, avatar_url FROM users WHERE oauth_provider=$1 AND oauth_id=$2', ['yandex', yandexUser.id]);
    let user = r.rows[0];
    
    if (!user) {
      // Проверяем, есть ли пользователь с таким email
      r = await pool.query('SELECT id FROM users WHERE email=$1', [yandexUser.email]);
      if (r.rows[0]) {
        // Обновляем существующего пользователя
        await pool.query('UPDATE users SET oauth_provider=$1, oauth_id=$2, name=COALESCE(name,$3), avatar_url=COALESCE(avatar_url,$4) WHERE email=$5', 
          ['yandex', yandexUser.id, yandexUser.name, yandexUser.picture, yandexUser.email]);
        r = await pool.query('SELECT id, email, name, role, avatar_url FROM users WHERE email=$1', [yandexUser.email]);
        user = r.rows[0];
      } else {
        // Создаем нового пользователя
        r = await pool.query(
          'INSERT INTO users(email, name, avatar_url, oauth_provider, oauth_id, role, email_verified) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id, email, name, role, avatar_url',
          [yandexUser.email, yandexUser.name, yandexUser.picture, 'yandex', yandexUser.id, 'user', true]
        );
        user = r.rows[0];
      }
    }
    
    const jwtToken = signUser(user);
    res.json({ token: jwtToken, user: { id: user.id, email: user.email, name: user.name, role: user.role, avatarUrl: user.avatar_url } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Получение текущего пользователя
router.get('/me', async (req, res) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    
    const r = await pool.query('SELECT id, email, phone, name, avatar_url, role FROM users WHERE id=$1', [payload.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'User not found' });
    
    const user = r.rows[0];
    res.json({ user: { id: user.id, email: user.email, phone: user.phone, name: user.name, avatarUrl: user.avatar_url, role: user.role } });
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;


