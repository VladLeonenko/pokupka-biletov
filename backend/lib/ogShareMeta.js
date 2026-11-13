/**
 * Open Graph, который Telegram/WhatsApp реально рисуют карточкой:
 * абсолютный JPEG/PNG, width/height, не SVG.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {Map<string, { width: number; height: number } | null>} */
const dimCache = new Map();

const SITE_SHARE_IMAGE = '/og-cover.jpg';

/**
 * @param {string} filePath
 * @returns {{ width: number; height: number } | null}
 */
export function readRasterSize(filePath) {
  let buf;
  try {
    const fd = fs.openSync(filePath, 'r');
    try {
      buf = Buffer.alloc(64 * 1024);
      const n = fs.readSync(fd, buf, 0, buf.length, 0);
      buf = buf.subarray(0, n);
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return null;
  }
  if (buf.length >= 24 && buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG') {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = buf[i + 1];
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    if (marker === 0xd8 || marker === 0xd9) {
      i += 2;
      continue;
    }
    const seglen = buf.readUInt16BE(i + 2);
    if (seglen < 2) break;
    i += 2 + seglen;
  }
  return null;
}

/**
 * @param {string} absUrl
 * @returns {string | null}
 */
function localPathForUrl(absUrl) {
  let pathname = '';
  try {
    pathname = new URL(absUrl).pathname;
  } catch {
    return null;
  }
  if (pathname === SITE_SHARE_IMAGE) {
    const candidates = [
      path.resolve(__dirname, '../../frontend/public/og-cover.jpg'),
      path.resolve(__dirname, '../../frontend/dist/og-cover.jpg'),
    ];
    return candidates.find((p) => fs.existsSync(p)) || null;
  }
  if (!pathname.startsWith('/uploads/')) return null;
  const rel = pathname.replace(/^\/+/, '');
  const full = path.resolve(__dirname, '..', rel);
  return fs.existsSync(full) ? full : null;
}

/**
 * @param {string} absUrl
 * @returns {{ width: number; height: number } | null}
 */
export function imageDimensions(absUrl) {
  if (dimCache.has(absUrl)) return dimCache.get(absUrl) || null;
  const file = localPathForUrl(absUrl);
  const dims = file ? readRasterSize(file) : null;
  dimCache.set(absUrl, dims);
  return dims;
}

/** @param {string} base @param {unknown} maybeUrl */
function toAbs(base, maybeUrl) {
  const s = maybeUrl != null ? String(maybeUrl).trim() : '';
  if (!s) return '';
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  return `${base}${s.startsWith('/') ? '' : '/'}${s}`;
}

/** @param {unknown} url */
function isShareableRaster(url) {
  const s = String(url || '').trim().toLowerCase().split('?')[0];
  if (!s || s.endsWith('.svg')) return false;
  return /\.(jpe?g|png|webp)$/.test(s) || s.startsWith('/uploads/');
}

/**
 * Баннер (широкий) лучше постера-афиши для карточки мессенджера.
 * @param {{ bannerUrl?: string | null; posterUrl?: string | null } | null | undefined} ctx
 */
export function pickShareImage(ctx) {
  const banner = ctx?.bannerUrl ? String(ctx.bannerUrl).trim() : '';
  const poster = ctx?.posterUrl ? String(ctx.posterUrl).trim() : '';
  if (isShareableRaster(banner)) return banner;
  if (isShareableRaster(poster)) return poster;
  return SITE_SHARE_IMAGE;
}

/**
 * @param {{ base: string; image?: string; alt?: string; escapeHtml: (s: string) => string }} p
 */
export function ogImageMetaTags(p) {
  const abs = toAbs(p.base, p.image) || `${p.base}${SITE_SHARE_IMAGE}`;
  const safe = p.escapeHtml(abs);
  const dims = imageDimensions(abs);
  const lower = abs.toLowerCase().split('?')[0];
  const type = lower.endsWith('.png') ? 'image/png' : lower.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
  const dimTags = dims
    ? `\n    <meta property="og:image:width" content="${dims.width}" />\n    <meta property="og:image:height" content="${dims.height}" />`
    : '';
  const alt = p.alt ? `\n    <meta property="og:image:alt" content="${p.escapeHtml(p.alt)}" />` : '';
  return `<meta property="og:image" content="${safe}" />
    <meta property="og:image:secure_url" content="${safe}" />
    <meta property="og:image:type" content="${type}" />${dimTags}${alt}
    <meta name="twitter:image" content="${safe}" />`;
}

export { SITE_SHARE_IMAGE };
