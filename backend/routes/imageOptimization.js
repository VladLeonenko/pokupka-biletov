import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { promisify } from 'util';
import crypto from 'crypto';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const stat = promisify(fs.stat);

const uploadsRoot = path.resolve(__dirname, '..', 'uploads');
const cacheRoot = path.join(uploadsRoot, '.cache');
const legacyImgRoot = path.resolve(__dirname, '../../frontend/dist/legacy/img');
const frontendDistRoot = path.resolve(__dirname, '../../frontend/dist');
const frontendPublicRoot = path.resolve(__dirname, '../../frontend/public');

const ALLOWED_HOST_SUFFIXES = [
  'biletvsem.ru',
  'biletvsem.com',
  'www.biletvsem.ru',
  'www.biletvsem.com',
  'localhost',
  '127.0.0.1',
];

function acceptsFormat(req, mime) {
  const accept = req.headers.accept || '';
  return accept.includes(mime) || accept.includes('*/*') || accept === '';
}

async function fileExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

function resolveLocalPath(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return null;
  let u = imageUrl.trim();
  try {
    if (u.startsWith('http://') || u.startsWith('https://')) {
      const parsed = new URL(u);
      u = parsed.pathname;
    }
  } catch {
    return null;
  }
  if (u.startsWith('/uploads/')) {
    const rel = u.replace(/^\/uploads\//, '');
    if (rel.includes('..')) return null;
    return path.join(uploadsRoot, rel);
  }
  if (u.startsWith('/placeholders/')) {
    const filename = path.basename(u);
    if (!filename || filename.includes('..')) return null;
    // Prefer built dist (prod), fallback to public (dev / before build).
    const inDist = path.join(frontendDistRoot, 'placeholders', filename);
    const inPublic = path.join(frontendPublicRoot, 'placeholders', filename);
    try {
      if (fs.existsSync(inDist)) return inDist;
    } catch {
      /* ignore */
    }
    return inPublic;
  }
  if (u.startsWith('/img/') || u.startsWith('/legacy/img/')) {
    const filename = path.basename(u);
    return path.join(legacyImgRoot, filename);
  }
  return null;
}

function isAllowedExternal(urlStr) {
  try {
    const u = new URL(urlStr);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    const host = u.hostname.toLowerCase();
    if (ALLOWED_HOST_SUFFIXES.some((h) => host === h || host.endsWith(`.${h}`))) return true;
    // Same-site posters often on CDN with our uploads proxied — allow common image CDNs used by tickets
    if (
      host.endsWith('yandex.net') ||
      host.endsWith('yandex.ru') ||
      host.endsWith('ticketscloud.ru') ||
      host.endsWith('intickets.ru') ||
      host.endsWith('kassir.ru') ||
      host.endsWith('profticket.ru')
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function ensureCacheDir() {
  await mkdir(cacheRoot, { recursive: true });
}

function cacheKey(inputKey, format, width, height, quality) {
  const h = crypto
    .createHash('sha1')
    .update(`${inputKey}|${format}|${width || ''}|${height || ''}|${quality}`)
    .digest('hex');
  return path.join(cacheRoot, `${h}.${format}`);
}

async function convertBuffer(inputBuffer, format, { width, height, quality }) {
  let pipeline = sharp(inputBuffer, { failOn: 'none' });
  if (width || height) {
    pipeline = pipeline.resize(width || null, height || null, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }
  if (format === 'avif') {
    return pipeline.avif({ quality: quality || 65, effort: 4 }).toBuffer();
  }
  if (format === 'webp') {
    return pipeline.webp({ quality: quality || 80 }).toBuffer();
  }
  return pipeline.toBuffer();
}

async function loadSourceBuffer(imageUrl) {
  const local = resolveLocalPath(imageUrl);
  if (local && (await fileExists(local))) {
    return { buffer: await readFile(local), key: local };
  }
  if ((imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) && isAllowedExternal(imageUrl)) {
    const localFromAbs = resolveLocalPath(imageUrl);
    if (localFromAbs && (await fileExists(localFromAbs))) {
      return { buffer: await readFile(localFromAbs), key: localFromAbs };
    }
    const res = await fetch(imageUrl, {
      headers: { 'User-Agent': 'biletvsem-image-optimizer/1.0', Accept: 'image/*' },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) throw new Error(`fetch ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    return { buffer: buf, key: imageUrl };
  }
  return null;
}

/**
 * GET /api/images/optimize?url=&f=webp|avif&w=&h=&q=
 */
router.get('/optimize', async (req, res, next) => {
  const imageUrl = String(req.query.url || '').trim();
  const width = parseInt(String(req.query.w || ''), 10) || null;
  const height = parseInt(String(req.query.h || ''), 10) || null;
  const quality = parseInt(String(req.query.q || ''), 10) || null;
  let format = String(req.query.f || '').toLowerCase();

  if (!imageUrl) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }
  if (imageUrl.includes('..')) {
    return res.status(400).json({ error: 'Invalid url' });
  }

  if (!format || format === 'auto') {
    if (acceptsFormat(req, 'image/avif')) format = 'avif';
    else if (acceptsFormat(req, 'image/webp')) format = 'webp';
    else format = 'original';
  }

  if (!['webp', 'avif', 'original'].includes(format)) {
    return res.status(400).json({ error: 'Invalid format' });
  }

  try {
    await ensureCacheDir();
    const source = await loadSourceBuffer(imageUrl);
    if (!source) {
      return res.status(404).json({ error: 'Image not found' });
    }

    if (format === 'original') {
      const ext = path.extname(imageUrl).toLowerCase();
      const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.avif': 'image/avif',
        '.svg': 'image/svg+xml',
      };
      res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Vary', 'Accept');
      return res.send(source.buffer);
    }

    const outPath = cacheKey(source.key, format, width, height, quality || (format === 'avif' ? 65 : 80));
    if (await fileExists(outPath)) {
      const cached = await readFile(outPath);
      res.setHeader('Content-Type', format === 'avif' ? 'image/avif' : 'image/webp');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Vary', 'Accept');
      return res.send(cached);
    }

    const converted = await convertBuffer(source.buffer, format, {
      width,
      height,
      quality: quality || (format === 'avif' ? 65 : 80),
    });
    await writeFile(outPath, converted).catch(() => {});

    res.setHeader('Content-Type', format === 'avif' ? 'image/avif' : 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Vary', 'Accept');
    return res.send(converted);
  } catch (error) {
    console.error('[imageOptimization]', error.message || error);
    next(error);
  }
});

/** Legacy: GET /api/images/img/:filename */
router.get('/img/:filename', async (req, res, next) => {
  try {
    const filename = path.basename(req.params.filename);
    const imageUrl = `/legacy/img/${filename}`;
    const source = await loadSourceBuffer(imageUrl);
    if (!source) return res.status(404).send('Image not found');
    await ensureCacheDir();
    const format = acceptsFormat(req, 'image/webp') ? 'webp' : 'original';
    if (format === 'original') {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      return res.send(source.buffer);
    }
    const outPath = cacheKey(source.key, 'webp', null, null, 80);
    let out;
    if (await fileExists(outPath)) {
      out = await readFile(outPath);
    } else {
      out = await convertBuffer(source.buffer, 'webp', { quality: 80 });
      await writeFile(outPath, out).catch(() => {});
    }
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.setHeader('Vary', 'Accept');
    return res.send(out);
  } catch (error) {
    next(error);
  }
});

export default router;

/** Pre-generate webp (+ optional avif) siblings next to an uploaded file */
export async function pregenerateUploadVariants(fullPath, { avif = true } = {}) {
  try {
    if (!fullPath || /\.svg$/i.test(fullPath)) return;
    const buf = await readFile(fullPath);
    const base = fullPath.replace(/\.(jpe?g|png|gif|webp)$/i, '');
    const webpBuf = await convertBuffer(buf, 'webp', { quality: 80 });
    await writeFile(`${base}.webp`, webpBuf);
    if (avif) {
      const avifBuf = await convertBuffer(buf, 'avif', { quality: 65 });
      await writeFile(`${base}.avif`, avifBuf);
    }
  } catch (e) {
    console.error('[imageOptimization] pregenerate:', e.message || e);
  }
}
