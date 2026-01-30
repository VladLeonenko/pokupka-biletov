import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { promisify } from 'util';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);
const exists = promisify(fs.exists);

// Кэш для конвертированных изображений
const conversionCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 часа

// Проверяем поддержку WebP в запросе
function acceptsWebP(req) {
  const accept = req.headers.accept || '';
  return accept.includes('image/webp');
}

// Проверяем существование файла
async function fileExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

// Конвертируем изображение в WebP
async function convertToWebP(inputPath, outputPath, options = {}) {
  const { width, height, quality = 80 } = options;
  
  try {
    let pipeline = sharp(inputPath);
    
    // Ресайз если указаны размеры
    if (width || height) {
      pipeline = pipeline.resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }
    
    // Конвертируем в WebP
    await pipeline
      .webp({ quality })
      .toFile(outputPath);
    
    return true;
  } catch (error) {
    console.error('Error converting to WebP:', error);
    return false;
  }
}

// Получаем путь к WebP версии
function getWebPPath(imagePath) {
  return imagePath.replace(/\.(jpg|jpeg|png)$/i, '.webp');
}

// Middleware для конвертации изображений в WebP
router.get('/img/:filename', async (req, res, next) => {
  const filename = req.params.filename;
  const imagePath = path.join(__dirname, '../frontend/dist/legacy/img', filename);
  
  try {
    // Проверяем существование файла
    if (!(await fileExists(imagePath))) {
      return res.status(404).send('Image not found');
    }

    // Если клиент поддерживает WebP и файл может быть конвертирован
    if (acceptsWebP(req) && /\.(jpg|jpeg|png)$/i.test(filename)) {
      const webpPath = getWebPPath(imagePath);
      const webpExists = await fileExists(webpPath);
      
      if (!webpExists) {
        // Конвертируем в WebP
        const converted = await convertToWebP(imagePath, webpPath);
        if (converted) {
          // Отдаем WebP версию
          const webpFile = await readFile(webpPath);
          res.setHeader('Content-Type', 'image/webp');
          res.setHeader('Cache-Control', 'public, max-age=31536000');
          res.setHeader('Vary', 'Accept');
          return res.send(webpFile);
        }
      } else {
        // WebP версия уже существует
        const webpFile = await readFile(webpPath);
        res.setHeader('Content-Type', 'image/webp');
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        res.setHeader('Vary', 'Accept');
        return res.send(webpFile);
      }
    }

    // Отдаем оригинальный файл
    const file = await readFile(imagePath);
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
    };
    
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.setHeader('Vary', 'Accept');
    res.send(file);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).send('Image not found');
    }
    console.error('Error serving image:', error);
    next(error);
  }
});

// Роут для оптимизации изображений через query параметры
router.get('/optimize', async (req, res, next) => {
  const imageUrl = req.query.url;
  const width = parseInt(req.query.w) || null;
  const height = parseInt(req.query.h) || null;
  const quality = parseInt(req.query.q) || 80;
  const format = req.query.f || (acceptsWebP(req) ? 'webp' : 'original');

  if (!imageUrl) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    // Парсим URL изображения
    let imagePath;
    if (imageUrl.startsWith('/img/') || imageUrl.startsWith('/legacy/img/')) {
      const filename = path.basename(imageUrl);
      imagePath = path.join(__dirname, '../frontend/dist/legacy/img', filename);
    } else if (imageUrl.startsWith('http')) {
      return res.status(400).json({ error: 'External URLs not supported yet' });
    } else {
      return res.status(400).json({ error: 'Invalid image URL' });
    }

    if (!(await fileExists(imagePath))) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Если запрашивается WebP
    if (format === 'webp' && acceptsWebP(req)) {
      const webpPath = getWebPPath(imagePath);
      let webpExists = await fileExists(webpPath);
      
      // Если нужен ресайз, создаем уникальный путь
      const cacheKey = `${imagePath}-${width}-${height}-${quality}`;
      let outputPath = webpPath;
      
      if (width || height) {
        const ext = path.extname(webpPath);
        const base = path.basename(webpPath, ext);
        const dir = path.dirname(webpPath);
        outputPath = path.join(dir, `${base}-${width || 'auto'}x${height || 'auto'}-q${quality}${ext}`);
        webpExists = await fileExists(outputPath);
      }
      
      if (!webpExists) {
        // Конвертируем с опциями
        const converted = await convertToWebP(imagePath, outputPath, { width, height, quality });
        if (converted) {
          const webpFile = await readFile(outputPath);
          res.setHeader('Content-Type', 'image/webp');
          res.setHeader('Cache-Control', 'public, max-age=31536000');
          res.setHeader('Vary', 'Accept');
          return res.send(webpFile);
        }
      } else {
        const webpFile = await readFile(outputPath);
        res.setHeader('Content-Type', 'image/webp');
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        res.setHeader('Vary', 'Accept');
        return res.send(webpFile);
      }
    }

    // Ресайз оригинального изображения если нужно
    if (width || height) {
      const buffer = await sharp(imagePath)
        .resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .toBuffer();
      
      const ext = path.extname(imagePath).toLowerCase();
      const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
      };
      
      res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.setHeader('Vary', 'Accept');
      return res.send(buffer);
    }

    // Отдаем оригинал
    const file = await readFile(imagePath);
    const ext = path.extname(imagePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.setHeader('Vary', 'Accept');
    res.send(file);
  } catch (error) {
    console.error('Error optimizing image:', error);
    next(error);
  }
});

export default router;






