import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.resolve(__dirname, '..', 'uploads');
const ogDir = path.join(uploadsRoot, 'og');

function slugify(input) {
  return String(input || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .toLowerCase() || 'image';
}

router.post('/og-image', async (req, res) => {
  try {
    const { title, logoUrl, theme = 'dark', fontSize = '86px' } = req.body || {};
    if (!title) return res.status(400).json({ error: 'title is required' });

    const encodedTitle = encodeURIComponent(String(title));
    const logoParam = logoUrl ? `&images=${encodeURIComponent(String(logoUrl))}` : '';
    const remoteUrl = `https://og-image.vercel.app/${encodedTitle}.png?theme=${encodeURIComponent(String(theme))}&md=0&fontSize=${encodeURIComponent(String(fontSize))}${logoParam}`;

    const resp = await fetch(remoteUrl);
    if (!resp.ok) return res.status(502).json({ error: 'Failed to render OG image' });
    const arrayBuf = await resp.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    await fs.mkdir(ogDir, { recursive: true });
    const fileName = `${slugify(title)}-${Date.now()}.png`;
    const filePath = path.join(ogDir, fileName);
    await fs.writeFile(filePath, buffer);

    // Served by express.static('/uploads') in app.js
    const publicUrl = `/uploads/og/${fileName}`;
    res.json({ url: publicUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;




