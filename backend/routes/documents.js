import express from 'express';
import multer from 'multer';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const uploadsRoot = path.resolve(__dirname, '..', 'uploads');
const documentsDir = path.join(uploadsRoot, 'documents');

const storage = multer.diskStorage({
  destination: async function (_req, _file, cb) {
    try { await fs.mkdir(documentsDir, { recursive: true }); } catch {}
    cb(null, documentsDir);
  },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase() || '';
    const base = path.basename(file.originalname || 'document', ext).replace(/[^a-zA-Z0-9-_]+/g, '-').slice(0, 64) || 'document';
    cb(null, `${base}-${Date.now()}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// GET /api/documents?dealId=:dealId - List documents for a deal
router.get('/', requireAuth, async (req, res) => {
  try {
    const { dealId } = req.query;
    if (!dealId) {
      return res.status(400).json({ error: 'dealId is required' });
    }
    const result = await pool.query(
      'SELECT * FROM deal_documents WHERE deal_id = $1 ORDER BY created_at DESC',
      [dealId]
    );
    res.json(result.rows.map(d => ({
      id: d.id,
      dealId: d.deal_id,
      name: d.name,
      filePath: d.file_path,
      fileSize: d.file_size,
      mimeType: d.mime_type,
      documentType: d.document_type,
      description: d.description,
      uploadedBy: d.uploaded_by,
      createdAt: d.created_at,
    })));
  } catch (err) {
    console.error('Error fetching documents:', err);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// POST /api/documents - Upload document
router.post('/', requireAuth, upload.single('file'), async (req, res) => {
  try {
    const { dealId, name, documentType, description } = req.body;
    const file = req.file;
    
    if (!dealId || !file) {
      return res.status(400).json({ error: 'dealId and file are required' });
    }

    const userId = req.user?.id || null;
    const rel = `/uploads/documents/${file.filename}`;

    const result = await pool.query(
      `INSERT INTO deal_documents (deal_id, name, file_path, file_size, mime_type, document_type, description, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        dealId,
        name || file.originalname,
        rel,
        file.size,
        file.mimetype,
        documentType || 'other',
        description || null,
        userId
      ]
    );

    const d = result.rows[0];
    res.status(201).json({
      id: d.id,
      dealId: d.deal_id,
      name: d.name,
      filePath: d.file_path,
      fileSize: d.file_size,
      mimeType: d.mime_type,
      documentType: d.document_type,
      description: d.description,
      uploadedBy: d.uploaded_by,
      createdAt: d.created_at,
    });
  } catch (err) {
    console.error('Error uploading document:', err);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// DELETE /api/documents/:id - Delete document
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get file path before deleting
    const docResult = await pool.query('SELECT file_path FROM deal_documents WHERE id = $1', [id]);
    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const filePath = docResult.rows[0].file_path;
    const fullPath = path.join(uploadsRoot, filePath.replace('/uploads/', ''));

    // Delete from database
    await pool.query('DELETE FROM deal_documents WHERE id = $1', [id]);

    // Delete file
    try {
      await fs.unlink(fullPath);
    } catch (fileErr) {
      console.warn('Failed to delete file:', fileErr);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting document:', err);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

export default router;



