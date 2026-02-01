import express from 'express';
import multer from 'multer';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pool from '../db.js';
import FileSyncService from '../services/FileSyncService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const uploadsRoot = path.resolve(__dirname, '..', 'uploads');
const imagesDir = path.join(uploadsRoot, 'images');

// Создаем директорию при старте
(async () => {
  try {
    await fs.mkdir(imagesDir, { recursive: true });
  } catch (err) {
    console.error('[Images] Failed to create uploads directory:', err);
  }
})();

const storage = multer.diskStorage({
  destination: async function (_req, _file, cb) {
    try { 
      await fs.mkdir(imagesDir, { recursive: true }); 
    } catch (err) {
      console.error('[Images] Failed to create directory:', err);
    }
    cb(null, imagesDir);
  },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.png';
    const base = path.basename(file.originalname || 'image', ext)
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .slice(0, 64) || 'image';
    cb(null, `${base}-${Date.now()}${ext}`);
  }
});

// Валидация типов файлов
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Только изображения разрешены (jpeg, jpg, png, gif, webp, svg)'));
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: { 
    fileSize: 10 * 1024 * 1024 // 10MB limit (было 50MB, уменьшил для безопасности)
  }
});

// POST /api/images - Загрузка изображения
router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен. Используйте поле "image".' });
    }

    const file = req.file;
    const rel = `/uploads/images/${file.filename}`;
    const fullPath = path.join(imagesDir, file.filename);

    // Проверяем что файл действительно существует
    try {
      await fs.access(fullPath);
    } catch (err) {
      console.error('[Images] File not found after upload:', fullPath);
      return res.status(500).json({ error: 'Файл не был сохранен' });
    }

    // Сохраняем информацию в БД
    let dbRecord = null;
    try {
      const result = await pool.query(
        `INSERT INTO images (url, filename, size, mime_type, uploaded_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING id, url, filename, size, uploaded_at`,
        [rel, file.filename, file.size, file.mimetype]
      );
      dbRecord = result.rows[0];
    } catch (dbError) {
      console.error('[Images] Database error (non-critical):', dbError);
      // Не падаем если БД недоступна, просто возвращаем URL
    }

    // АВТОМАТИЧЕСКАЯ синхронизация в frontend/dist/uploads/images/
    // Выполняется асинхронно, не блокирует ответ
    FileSyncService.syncFile(file.filename).catch(err => {
      console.error('[Images] FileSync error (non-critical):', err.message);
    });

    res.json({ 
      url: rel, 
      filename: file.filename,
      size: file.size,
      mimeType: file.mimetype,
      id: dbRecord?.id
    });
  } catch (error) {
    console.error('[Images] Upload error:', error);
    
    // Обработка специфичных ошибок multer
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Файл слишком большой. Максимальный размер: 10MB' });
      }
      if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ error: 'Неожиданное поле. Используйте поле "image".' });
      }
    }
    
    res.status(500).json({ 
      error: error.message || 'Ошибка загрузки файла' 
    });
  }
});

// GET /api/images - Получить список загруженных изображений
router.get('/', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const result = await pool.query(
      `SELECT id, url, filename, size, mime_type, uploaded_at, created_at
       FROM images
       WHERE url IS NOT NULL
       ORDER BY uploaded_at DESC, created_at DESC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit), parseInt(offset)]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('[Images] Error fetching images:', error);
    res.status(500).json({ error: 'Ошибка получения списка изображений' });
  }
});

// GET /api/images/:id - Получить информацию об изображении
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, url, filename, size, mime_type, uploaded_at, created_at
       FROM images
       WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Изображение не найдено' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('[Images] Error fetching image:', error);
    res.status(500).json({ error: 'Ошибка получения изображения' });
  }
});

export default router;
