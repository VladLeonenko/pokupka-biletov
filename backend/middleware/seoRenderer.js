import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const indexPath = path.resolve(__dirname, '../../frontend/dist/index.html');

export async function seoRenderer(req, res, next) {
  // Пропускаем статические файлы и API
  if (req.path.startsWith('/api/') ||
      req.path.startsWith('/legacy/') || 
      req.path.startsWith('/img/') || 
      req.path.startsWith('/css/') ||
      req.path.startsWith('/assets/') ||
      req.path.startsWith('/uploads/')) {
    return next();
  }
  
  if (req.path.match(/\.(jpg|jpeg|png|gif|webp|svg|ico|css|js|woff|woff2|ttf|eot|pdf|zip|json)$/i)) {
    return next();
  }
  
  if (req.method !== 'GET') {
    return next();
  }

  if (!fs.existsSync(indexPath)) {
    console.error('[SSR] index.html not found at:', indexPath);
    return res.status(404).send('Not found');
  }

  try {
    let html = fs.readFileSync(indexPath, 'utf-8');
    const seoTags = await generateSeoTags(req.path);
    
    if (seoTags) {
      html = html.replace('</head>', `${seoTags}\n  </head>`);
      console.log('[SSR] ✓ Dynamic meta for:', req.path);
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
    res.setHeader('Vary', 'Accept-Encoding');
    
    res.send(html);
  } catch (err) {
    console.error('[SSR] Error:', err);
    next(err);
  }
}

async function generateSeoTags(url) {
  let metaTags = '';

  try {
    // Кейсы портфолио
    if (url.startsWith('/cases/')) {
      const slug = url.replace('/cases/', '').replace(/\/$/, '');
      const caseData = await getCaseData(slug);
      
      if (caseData) {
        const title = caseData.seoTitle || caseData.title || 'Кейс';
        const description = caseData.seoDescription || caseData.summary || '';
        const ogImage = caseData.ogImageUrl || caseData.heroImageUrl || '';
        const canonical = `https://prime-coder.ru/cases/${slug}`;

        metaTags = `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    ${ogImage ? `<meta property="og:image" content="https://prime-coder.ru${ogImage}" />` : ''}
    <meta property="og:site_name" content="Primecoder" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    ${ogImage ? `<meta name="twitter:image" content="https://prime-coder.ru${ogImage}" />` : ''}`;
      }
    }
    
    // Блог
    else if (url.startsWith('/blog/') && url !== '/blog' && url !== '/blog/') {
      const slug = url.replace('/blog/', '').replace(/\/$/, '');
      const postData = await getBlogPostData(slug);
      
      if (postData) {
        const title = postData.seoTitle || postData.title || 'Статья';
        const description = postData.seoDescription || postData.excerpt || '';
        const ogImage = postData.ogImageUrl || postData.imageUrl || '';
        const canonical = `https://prime-coder.ru/blog/${slug}`;

        metaTags = `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    ${ogImage ? `<meta property="og:image" content="https://prime-coder.ru${ogImage}" />` : ''}
    <meta property="og:site_name" content="Primecoder" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    ${ogImage ? `<meta name="twitter:image" content="https://prime-coder.ru${ogImage}" />` : ''}`;
      }
    }
  } catch (err) {
    console.error('[SSR] Error generating tags:', err.message);
  }

  return metaTags;
}

async function getCaseData(slug) {
  try {
    const response = await fetch(`http://localhost:4000/api/public/cases/${slug}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.error('[SSR] Error fetching case:', err.message);
    return null;
  }
}

async function getBlogPostData(slug) {
  try {
    const response = await fetch(`http://localhost:4000/api/public/blog/${slug}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.error('[SSR] Error fetching blog:', err.message);
    return null;
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
