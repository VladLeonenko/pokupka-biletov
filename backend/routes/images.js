import express from 'express';
import multer from 'multer';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const uploadsRoot = path.resolve(__dirname, '..', 'uploads');
const imagesDir = path.join(uploadsRoot, 'images');

const storage = multer.diskStorage({
  destination: async function (_req, _file, cb) {
    try { await fs.mkdir(imagesDir, { recursive: true }); } catch {}
    cb(null, imagesDir);
  },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.png';
    const base = path.basename(file.originalname || 'image', ext).replace(/[^a-zA-Z0-9-_]+/g, '-').slice(0, 64) || 'image';
    cb(null, `${base}-${Date.now()}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: { 
    fileSize: 50 * 1024 * 1024 // 50MB limit для изображений (обложки товаров могут быть большими)
  }
});

// Accept 'image' or 'img' form field names
router.post('/', upload.any(), async (req, res) => {
  try {
    const files = req.files;
    const file = (Array.isArray(files) && files.length > 0) ? files[0] : req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded. Use field name "image".' });
    const rel = `/uploads/images/${file.filename}`;
    res.json({ url: rel, filename: file.filename });
  } catch (error) {
    res.status(500).json({ error: (error && error.message) ? error.message : 'Upload failed' });
  }
});

export default router;
