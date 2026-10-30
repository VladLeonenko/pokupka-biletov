/**
 * React SSR for money ticket URLs (renderToString + Emotion critical CSS).
 * Bundle: frontend/dist-ssr/renderTickets.js (cd frontend && npm run build:ssr).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { siteBaseUrl } from '../siteConfig.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const SSR_BUNDLE = path.join(REPO_ROOT, 'frontend/dist-ssr/renderTickets.js');

export function isReactSsrTicketsPath(pathname) {
  const p = String(pathname || '').replace(/\/+$/, '') || '/';
  if (p === '/') return true;
  if (p.startsWith('/ticket/')) return true;
  return false;
}

let renderTicketsPageFn = null;
let loadAttempted = false;
let loadedMtime = 0;

async function loadRenderer() {
  if (!fs.existsSync(SSR_BUNDLE)) {
    if (!loadAttempted) {
      console.warn(
        '[ticket-react-ssr] Bundle missing:',
        SSR_BUNDLE,
        '— run: cd frontend && npm run build:ssr',
      );
    }
    loadAttempted = true;
    return null;
  }
  try {
    const { mtimeMs } = fs.statSync(SSR_BUNDLE);
    if (renderTicketsPageFn && loadedMtime === mtimeMs) return renderTicketsPageFn;
    const mod = await import(`${pathToFileURL(SSR_BUNDLE).href}?t=${mtimeMs}`);
    renderTicketsPageFn = mod.renderTicketsPage;
    loadedMtime = mtimeMs;
    if (typeof renderTicketsPageFn !== 'function') {
      console.error('[ticket-react-ssr] renderTicketsPage export missing');
      renderTicketsPageFn = null;
      return null;
    }
    loadAttempted = true;
    console.log('[ticket-react-ssr] Loaded', SSR_BUNDLE);
    return renderTicketsPageFn;
  } catch (err) {
    console.error('[ticket-react-ssr] Failed to load bundle:', err);
    return null;
  }
}

/**
 * @returns {Promise<{ html: string, css: string, stateScript: string, rootAttr: string }|null>}
 */
export async function renderReactTicketsSsr(input) {
  const render = await loadRenderer();
  if (!render) return null;
  try {
    return render({
      ...input,
      baseUrl: input.baseUrl || siteBaseUrl(),
    });
  } catch (err) {
    console.error('[ticket-react-ssr] render failed for', input?.url, err);
    return null;
  }
}

/** Inject Emotion CSS + React HTML into Vite index shell. Mutual exclusion vs string SSR in #root. */
export function injectReactTicketsSsrIntoHtml(html, result) {
  if (!result?.html) return html;
  let out = html;
  if (result.css) {
    if (out.includes('</head>')) {
      out = out.replace('</head>', `${result.css}\n</head>`);
    }
  }
  const rootInner = `<div id="root" ${result.rootAttr || 'data-react-ssr-home="1"'}>${result.html}</div>`;
  const withRoot = out.replace(
    /<div id="root"[^>]*>[\s\S]*?<\/div>\s*(?=<script)/i,
    `${rootInner}\n    `,
  );
  if (withRoot !== out) {
    out = withRoot;
  } else {
    out = out.replace(
      /<div id="root">\s*<div class="loading">Загрузка\.\.\.<\/div>\s*<\/div>/i,
      rootInner,
    );
  }
  if (result.stateScript) {
    if (out.includes('</body>')) {
      out = out.replace('</body>', `${result.stateScript}\n</body>`);
    } else {
      out += result.stateScript;
    }
  }
  return out;
}
