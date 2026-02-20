import jwt from 'jsonwebtoken';

// Проверка наличия JWT_SECRET при старте модуля
if (!process.env.JWT_SECRET) {
  console.error('❌ CRITICAL ERROR: JWT_SECRET environment variable is not set!');
  console.error('Please set JWT_SECRET in your .env file before starting the application.');
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET;

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

export function requireAdminOrSalesManager(req, res, next) {
  if (!req.user || !['admin', 'sales_manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Admin or Sales Manager access required' });
  }
  next();
}

export function signUser(user) {
  const payload = { id: user.id, email: user.email, role: user.role };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// Опциональная аутентификация - не требует токен, но добавляет user если токен валиден
export function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = payload;
    } catch (error) {
      // Игнорируем ошибку, просто не устанавливаем user
    }
  }
  next();
}

