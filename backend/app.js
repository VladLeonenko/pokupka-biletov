import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Загружаем переменные окружения из .env файла ДО всех остальных импортов
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import pagesRouter from './routes/pages.js';
import imagesRouter from './routes/images.js';
import exerciseImagesRouter from './routes/exerciseImages.js';
import partialsRouter from './routes/partials.js';
import blogCategoriesRouter from './routes/blogCategories.js';
import carouselsRouter from './routes/carousels.js';
import publicCarouselsRouter from './routes/publicCarousels.js';
import metricsRouter from './routes/metrics.js';
import seoSuggestRouter from './routes/seoSuggest.js';
import seoOgImageRouter from './routes/seoOgImage.js';
import authRouter from './routes/auth.js';
import { requireAuth } from './middleware/auth.js';
import aiRouter from './routes/ai.js';
import blogRouter from './routes/blog.js';
import casesRouter from './routes/cases.js';
import productsRouter from './routes/products.js';
import promotionsRouter from './routes/promotions.js';
import formsRouter from './routes/forms.js';
import funnelsRouter from './routes/funnels.js';
import tasksRouter from './routes/tasks.js';
import paymentsRouter from './routes/payments.js';
import documentsRouter from './routes/documents.js';
import notificationsRouter from './routes/notifications.js';
import paymentRemindersRouter from './routes/paymentReminders.js';
import taskExecutorRouter from './routes/taskExecutor.js';
import cartRouter from './routes/cart.js';
import wishlistRouter from './routes/wishlist.js';
import searchRouter from './routes/search.js';
import ordersRouter from './routes/orders.js';
import productAnalyticsRouter from './routes/productAnalytics.js';
import parsingRouter from './routes/parsing.js';
import seoToolsRouter from './routes/seoTools.js';
import clientsRouter from './routes/clients.js';
import chatRouter from './routes/chat.js';
import chatbotRouter from './routes/chatbot.js';
import reviewsRouter from './routes/reviews.js';
import awardsRouter from './routes/awards.js';
import teamRouter from './routes/team.js';
import emailCampaignsRouter from './routes/emailCampaigns.js';
import sitesRouter from './routes/sites.js';
import plannerRouter from './routes/planner.js';
import aiAssistantRouter from './routes/aiAssistant.js';
import aiChatRouter from './routes/aiChat.js';
import readingBooksRouter from './routes/readingBooks.js';
import consentsRouter from './routes/consents.js';
import sitemapRouter from './routes/sitemap.js';
import seoOptimizeRouter from './routes/seoOptimize.js';
import competitorAnalysisRouter from './routes/competitorAnalysis.js';
import seoPositionMonitoringRouter from './routes/seoPositionMonitoring.js';
import structuredDataRouter from './routes/structuredData.js';
import internalLinkingRouter from './routes/internalLinking.js';
import imageOptimizationRouter from './routes/imageOptimization.js';
import { cachePublicRouter, cacheAdminRouter } from './routes/cache.js';
import aiTeamRouter from './routes/aiTeam.js';
import projectsRouter from './routes/projects.js';
import commercialProposalsRouter from './routes/commercialProposals.js';
import donorsRouter from './routes/donors.js';
import socialProofsRouter from './routes/socialProofs.js';
import quizRouter from './routes/quiz.js';

const app = express();

app.use(cors({ 
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173', 'http://localhost:3000'], 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id']
}));

// Compression middleware - сжимаем все ответы (gzip/brotli)
app.use(compression({
  level: 6, // Баланс между сжатием и скоростью
  filter: (req, res) => {
    // Сжимаем все, кроме уже сжатых файлов
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Content Security Policy configuration
const isDevelopment = process.env.NODE_ENV !== 'production';

app.use(helmet({ 
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Нужно для inline скриптов React
        "'unsafe-eval'", // Нужно для dev mode
        "https://cdn.jsdelivr.net", // GSAP
        "https://www.googletagmanager.com",
        "https://www.google-analytics.com",
        ...(isDevelopment ? ["'unsafe-eval'"] : []),
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Нужно для styled-components и inline стилей
        "https://fonts.googleapis.com",
      ],
      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "https:", // Разрешаем все HTTPS изображения
        "http://localhost:3000", // Для локальной разработки
      ],
      fontSrc: [
        "'self'",
        "data:",
        "https://fonts.gstatic.com",
        "https://cdn.jsdelivr.net",
      ],
      connectSrc: [
        "'self'",
        "https://api.openai.com",
        "http://localhost:3000",
        "http://localhost:5173",
        "ws://localhost:5173", // WebSocket для Vite HMR
      ],
      frameSrc: ["'self'", "https://www.youtube.com", "https://player.vimeo.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "https:", "data:"],
      workerSrc: ["'self'", "blob:"],
      childSrc: ["'self'", "blob:"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      baseUri: ["'self'"],
      upgradeInsecureRequests: isDevelopment ? null : [],
    },
  },
  // Отключаем X-Content-Type-Options только для legacy JS файлов (обрабатываем ниже)
  xContentTypeOptions: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  // Дополнительные настройки безопасности
  strictTransportSecurity: {
    maxAge: 31536000, // 1 год
    includeSubDomains: true,
    preload: true,
  },
  xFrameOptions: { action: 'deny' }, // Защита от clickjacking
  xXssProtection: true, // XSS защита
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
app.use(express.json({ limit: '50mb' })); // Увеличено для загрузки больших файлов
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // Для form-data

// Rate limiting configuration
// Общий лимит для всех запросов
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 минут
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // 1000 запросов на IP (для dev режима)
  message: { error: 'Слишком много запросов с вашего IP, попробуйте позже' },
  standardHeaders: true, // Отправляем RateLimit-* заголовки
  legacyHeaders: false, // Отключаем X-RateLimit-* заголовки
});

// Расширенный лимит для авторизованных пользователей
const authenticatedLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 500, // 500 запросов на IP (для авторизованных пользователей)
  message: { error: 'Слишком много запросов, попробуйте позже' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !req.headers.authorization, // Пропускаем неавторизованные запросы
});

// Строгий лимит для аутентификации (защита от brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 5, // 5 попыток входа
  message: { error: 'Слишком много попыток входа, попробуйте через 15 минут' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Считаем даже успешные попытки
});

// Лимит для форм (защита от спама)
const formsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 час
  max: 10, // 10 отправок формы в час
  message: { error: 'Слишком много отправок форм, попробуйте позже' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Применяем общий лимит ко всем API запросам
app.use('/api/', generalLimiter);

// Применяем расширенный лимит для авторизованных эндпоинтов
app.use('/api/planner', authenticatedLimiter);
app.use('/api/tasks', authenticatedLimiter);
app.use('/api/projects', authenticatedLimiter);
app.use('/api/metrics', authenticatedLimiter);
app.use('/api/ai-assistant', authenticatedLimiter);
app.use('/api/ai-team', authenticatedLimiter);

// public endpoints
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/verify', authLimiter);
app.use('/api/auth/oauth', authLimiter);
app.use('/api/auth', authRouter);
// Forms: submit/abandon are public, management is protected
app.use('/api/forms/submit', formsLimiter);
app.use('/api/forms', formsRouter);
// AI: semantic is public, generation is protected at route-level
app.use('/api/ai', aiRouter);
// Public API endpoints (no auth required)
app.use('/api/public/pages', pagesRouter);
app.use('/api/public/partials', partialsRouter);
// Blog categories must come before blog router to avoid conflict with /:slug route
app.use('/api/public/blog/categories', blogCategoriesRouter);
app.use('/api/public/blog', blogRouter);
app.use('/api/public/products', productsRouter);
app.use('/api/public/cases', casesRouter);
app.use('/api/public/promotions', promotionsRouter);
app.use('/api/public/social-proofs', socialProofsRouter);
app.use('/api/public/quiz', quizRouter);
app.use('/api/public/carousels', publicCarouselsRouter);
app.use('/api/public/search', searchRouter);
app.use('/api/public/cart', cartRouter);
app.use('/api/public/orders', ordersRouter);
app.use('/api/public/analytics', productAnalyticsRouter);
app.use('/api/public/cache', cachePublicRouter);
app.use('/api/public/seo', seoToolsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/public/awards', awardsRouter);
app.use('/api/awards', requireAuth, awardsRouter);
app.use('/api/team', teamRouter);
app.use('/api/email', emailCampaignsRouter);
app.use('/api/sites', sitesRouter);
app.use('/api/planner', plannerRouter);
app.use('/api/ai-assistant', aiAssistantRouter);
app.use('/api/ai-chat', aiChatRouter);
app.use('/api/reading-books', requireAuth, readingBooksRouter);
app.use('/api/consents', consentsRouter);
app.use('/api/ai-team', requireAuth, aiTeamRouter);
app.use('/api/projects', requireAuth, projectsRouter);

// protected admin APIs
app.use('/api/pages', requireAuth, pagesRouter);
app.use('/api/images', requireAuth, imagesRouter);
app.use('/api/exercise-images', requireAuth, exerciseImagesRouter);
app.use('/api/partials', requireAuth, partialsRouter);
// register categories BEFORE blog to avoid ":slug" catch
app.use('/api/blog/categories', requireAuth, blogCategoriesRouter);
app.use('/api/blog', requireAuth, blogRouter);
app.use('/api/cases', requireAuth, casesRouter);
app.use('/api/products', requireAuth, productsRouter);
app.use('/api/promotions', requireAuth, promotionsRouter);
app.use('/api/social-proofs', socialProofsRouter); // Публичные и админские эндпоинты
app.use('/api/quiz', quizRouter); // Публичные и админские эндпоинты

app.use('/api/carousels', requireAuth, carouselsRouter);
app.use('/api/funnels', requireAuth, funnelsRouter);
app.use('/api/tasks', requireAuth, tasksRouter);
app.use('/api/metrics', requireAuth, metricsRouter);
app.use('/api/seo', requireAuth, seoSuggestRouter);
app.use('/api/seo', requireAuth, seoOgImageRouter);
app.use('/api/seo-optimize', seoOptimizeRouter);
app.use('/api/competitor-analysis', competitorAnalysisRouter);
app.use('/api/seo-monitoring', seoPositionMonitoringRouter);
app.use('/api/structured-data', structuredDataRouter);
app.use('/api/internal-linking', internalLinkingRouter);
app.use('/api/payments', requireAuth, paymentsRouter);
app.use('/api/documents', requireAuth, documentsRouter);
app.use('/api/commercial-proposals', commercialProposalsRouter); // Public routes are handled inside
app.use('/api/donors', (req, res, next) => {
  console.log('Donors router middleware hit:', req.method, req.path);
  next();
}, donorsRouter);
app.use('/api/notifications', requireAuth, notificationsRouter);
app.use('/api/payment-reminders', paymentRemindersRouter); // No auth required for cron job
app.use('/api/task-executor', requireAuth, taskExecutorRouter);
app.use('/api/cart', cartRouter); // Публичный, но с поддержкой авторизации
app.use('/api/wishlist', wishlistRouter); // Требует авторизации
app.use('/api/orders', ordersRouter); // Публичный, но с поддержкой авторизации
app.use('/api/analytics', productAnalyticsRouter); // Публичный для трекинга, админ для просмотра
app.use('/api/clients', clientsRouter); // Требует авторизации
app.use('/api/cache', requireAuth, cacheAdminRouter);
app.use('/api/chat', chatRouter); // Публичные и админские эндпоинты
app.use('/api/chatbot', chatbotRouter); // Требует авторизации
app.use('/api/admin/parsing', requireAuth, parsingRouter); // Админский парсинг

// Sitemap (публичный, должен быть до статических файлов)
app.use('/', sitemapRouter);

app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1y',
  setHeaders: (res, filePath) => {
    // CORS заголовки для всех статических файлов
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Правильные MIME типы для изображений
    if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    } else if (filePath.endsWith('.gif')) {
      res.setHeader('Content-Type', 'image/gif');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    } else if (filePath.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    } else if (filePath.endsWith('.webp')) {
      res.setHeader('Content-Type', 'image/webp');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    } else if (filePath.endsWith('.ico')) {
      res.setHeader('Content-Type', 'image/x-icon');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    }
  }
}));

// Serve static files from frontend/dist (React build assets)
app.use('/assets', express.static(path.join(__dirname, '../frontend/dist/assets'), {
  maxAge: '1y', // Кэширование на 1 год
  immutable: true, // Файлы с хешами в именах не изменяются
  setHeaders: (res, filePath) => {
    // CORS заголовки для всех статических файлов
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Агрессивное кэширование для статических ресурсов с хешами
    if (filePath.match(/\.(js|css|woff|woff2|ttf|eot|svg)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (filePath.match(/\.(png|jpg|jpeg|gif|webp|ico|svg)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    }
  }
}));

// Serve static files from frontend/dist/legacy (legacy assets)
// В dev режиме также проверяем frontend/public/legacy
const distLegacyPath = path.join(__dirname, '../frontend/dist/legacy');
const publicLegacyPath = path.join(__dirname, '../frontend/public/legacy');

// Сначала пробуем public (dev режим) - должен быть первым
if (fs.existsSync(publicLegacyPath)) {
  app.use('/legacy', express.static(publicLegacyPath, {
    maxAge: '1y',
    setHeaders: setLegacyHeaders,
  }));
}

// Затем пробуем dist (production)
if (fs.existsSync(distLegacyPath)) {
  app.use('/legacy', express.static(distLegacyPath, {
    maxAge: '1y',
    setHeaders: setLegacyHeaders,
  }));
}

function setLegacyHeaders(res, filePath) {
  // CORS заголовки для всех статических файлов
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Убираем X-Content-Type-Options для JS файлов, чтобы браузер мог их выполнить
  if (filePath.endsWith('.js')) {
    res.removeHeader('X-Content-Type-Options');
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  } else if (filePath.endsWith('.css')) {
    res.setHeader('Content-Type', 'text/css; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  } else if (filePath.endsWith('.png')) {
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  } else if (filePath.endsWith('.gif')) {
    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  } else if (filePath.endsWith('.svg')) {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  } else if (filePath.endsWith('.webp')) {
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  } else if (filePath.endsWith('.ico')) {
    res.setHeader('Content-Type', 'image/x-icon');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  } else if (filePath.endsWith('.woff') || filePath.endsWith('.woff2')) {
    res.setHeader('Content-Type', 'font/woff2');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
}

// Image optimization router (должен быть перед статическими файлами)
app.use('/api/images', imageOptimizationRouter);

// Image optimization через роутер (должен быть перед статическими файлами)
// Обрабатываем запросы к /img через роутер оптимизации
app.use('/img', (req, res, next) => {
  // Если это запрос к изображению, обрабатываем через роутер оптимизации
  if (req.path.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    // Передаем в роутер оптимизации
    req.url = `/img${req.path}`;
    return imageOptimizationRouter(req, res, next);
  }
  next();
});

// Serve images directly from frontend/dist/legacy/img (fallback)
app.use('/img', express.static(path.join(__dirname, '../frontend/dist/legacy/img'), {
  maxAge: '1y', // Кэширование на 1 год
  setHeaders: (res, filePath) => {
    // CORS заголовки для изображений
    res.setHeader('Access-Control-Allow-Origin', '*');
    // Убираем Cross-Origin-Resource-Policy для локальной разработки
    
    if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    } else if (filePath.endsWith('.gif')) {
      res.setHeader('Content-Type', 'image/gif');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    } else if (filePath.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    } else if (filePath.endsWith('.webp')) {
      res.setHeader('Content-Type', 'image/webp');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    } else if (filePath.endsWith('.ico')) {
      res.setHeader('Content-Type', 'image/x-icon');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    }
  }
}));

// Middleware для установки правильного MIME типа для CSS файлов
app.use((req, res, next) => {
  // Проверяем все пути, которые могут содержать CSS файлы
  if (req.path.endsWith('.css')) {
    res.setHeader('Content-Type', 'text/css; charset=utf-8');
  }
  next();
});

// Дублирующий роут удален - используем основной /legacy выше

// Middleware для удаления X-Content-Type-Options для JS файлов из /legacy
// Это нужно делать ПОСЛЕ express.static, так как serve-static устанавливает этот заголовок
// НО только для JS файлов, чтобы не перехватывать запросы к изображениям
app.use('/legacy', (req, res, next) => {
  // Пропускаем все, кроме JS файлов
  if (!req.path.endsWith('.js')) {
    return next();
  }
  if (req.path.endsWith('.js')) {
    // Перехватываем writeHead для удаления заголовка перед отправкой
    const originalWriteHead = res.writeHead.bind(res);
    res.writeHead = function(statusCode, statusMessage, headers) {
      if (typeof statusMessage === 'object') {
        headers = statusMessage;
        statusMessage = undefined;
      }
      if (headers) {
        // Удаляем заголовок из объекта заголовков
        Object.keys(headers).forEach(key => {
          if (key.toLowerCase() === 'x-content-type-options') {
            delete headers[key];
          }
        });
      }
      // Удаляем заголовок из response
      res.removeHeader('X-Content-Type-Options');
      res.removeHeader('x-content-type-options');
      if (statusMessage) {
        return originalWriteHead(statusCode, statusMessage, headers);
      } else if (headers) {
        return originalWriteHead(statusCode, headers);
      } else {
        return originalWriteHead(statusCode);
      }
    };
    
    // Перехватываем setHeader для блокировки установки заголовка
    const originalSetHeader = res.setHeader.bind(res);
    res.setHeader = function(name, value) {
      if (name && name.toLowerCase() === 'x-content-type-options') {
        return res;
    }
      return originalSetHeader(name, value);
    };
    
    // НЕ удаляем заголовки в событии 'finish' - к этому моменту они уже отправлены
    // Вместо этого блокируем их установку через setHeader выше
  }
  next();
});

// Serve chat files
app.use('/uploads/chat-files', express.static(path.join(__dirname, 'uploads/chat-files'), {
  setHeaders: (res, filePath) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
}));

// Serve CSS files with correct MIME type - обрабатываем все возможные пути
app.use('/css', express.static(path.join(__dirname, '../frontend/dist/legacy/css'), {
  maxAge: '1y', // Кэширование на 1 год
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    }
  }
}));

// Обработчик для CSS файлов из dist (для прямых запросов)
// Это должно быть ПЕРЕД общим express.static, но ПОСЛЕ специфичных маршрутов
app.use((req, res, next) => {
  // Если это запрос к CSS файлу, пытаемся отдать его из dist
  if (req.path.endsWith('.css') && !req.path.startsWith('/api/')) {
    // Проверяем в css подпапке (приоритет для путей вида /css/filename.css)
    if (req.path.startsWith('/css/')) {
      const cssPathAlt = path.join(__dirname, '../frontend/dist/legacy/css', path.basename(req.path));
      if (fs.existsSync(cssPathAlt)) {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        res.setHeader('Vary', 'Accept-Encoding');
        res.sendFile(path.resolve(cssPathAlt));
        return;
      }
    }
    // Проверяем прямой путь в css подпапке
    const cssPathAlt = path.join(__dirname, '../frontend/dist/legacy/css', path.basename(req.path));
    if (fs.existsSync(cssPathAlt)) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.setHeader('Vary', 'Accept-Encoding');
      res.sendFile(path.resolve(cssPathAlt));
      return;
    }
    // Проверяем прямой путь в frontend/dist/legacy
    const cssPath = path.join(__dirname, '../frontend/dist/legacy', req.path);
    if (fs.existsSync(cssPath)) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.setHeader('Vary', 'Accept-Encoding');
      res.sendFile(path.resolve(cssPath));
      return;
    }
  }
  next();
});

// Обработчик 404 для всех необработанных маршрутов (только для API)
// ВАЖНО: Это должно быть ПЕРЕД SPA fallback, чтобы API запросы правильно обрабатывались
app.use((req, res, next) => {
  // Если это API запрос и он не был обработан роутерами выше, возвращаем 404
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  // Для не-API маршрутов передаем дальше
  next();
});

// Отдача продакшен сборки React приложения (SPA fallback)
// Это должно быть ПОСЛЕ всех API маршрутов и 404 обработчика
app.use((req, res, next) => {
  // Пропускаем статические файлы и API
  if (req.path.startsWith('/api/') ||
      req.path.startsWith('/legacy/') || 
      req.path.startsWith('/img/') || 
      req.path.startsWith('/css/') ||
      req.path.startsWith('/assets/') ||
      req.path.startsWith('/uploads/')) {
    return next(); // Передаем управление следующему middleware
  }
  
  // Пропускаем запросы к файлам с расширениями (изображения, CSS, JS и т.д.)
  if (req.path.match(/\.(jpg|jpeg|png|gif|webp|svg|ico|css|js|woff|woff2|ttf|eot|pdf|zip|json)$/i)) {
    return next();
  }
  
  // Отдаем index.html только для GET запросов (SPA routing)
  if (req.method === 'GET') {
    const indexPath = path.join(__dirname, '../frontend/dist/index.html');
    if (fs.existsSync(indexPath)) {
      // HTML файлы кэшируем меньше, так как они могут изменяться
      res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
      res.setHeader('Vary', 'Accept-Encoding');
      res.sendFile(path.resolve(indexPath));
    } else {
      res.status(404).send('Not found');
    }
  } else {
    next();
  }
});

app.listen(3000, () => {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log('Backend started on port 3000');
  }
});
